import { z } from "zod";
import { fail, handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { db, persist } from "@/lib/store";
import { uid, nowIso } from "@/lib/ids";
import { publish } from "@/lib/bus";

const schema = z.object({
  claim_id: z.string().optional(),
  submission_id: z.string().optional(),
  step_notes: z
    .array(
      z.object({
        step_order: z.number(),
        note: z.string(),
        flagged_bug_id: z.string().nullable(),
      })
    )
    .optional(),
  bugs: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string(),
        body: z.string(),
        repro_steps: z.array(z.string()),
        proposed_severity: z.enum(["critical", "major", "minor"]),
        from_step: z.number().optional(),
        screenshots: z.array(z.string()).optional(),
        extra: z.boolean().optional(),
        console_logs: z
          .array(
            z.object({
              t: z.number(),
              level: z.enum(["log", "info", "warn", "error"]),
              message: z.string(),
            })
          )
          .optional(),
      })
    )
    .optional(),
  env: z.record(z.string(), z.unknown()).optional(),
  time_on_task_sec: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return fail("BAD_REQUEST", "Invalid submission");
    const d = db();
    const sub = parsed.data.submission_id
      ? d.submissions.find((s) => s.id === parsed.data.submission_id)
      : parsed.data.claim_id
        ? d.submissions.find((s) => s.claim_id === parsed.data.claim_id)
        : undefined;
    if (!sub) return fail("NOT_FOUND", "Draft not found", 404);
    if (sub.tester_id !== u.id) return fail("FORBIDDEN", "Not your submission", 403);
    if (parsed.data.step_notes) sub.step_notes = parsed.data.step_notes;
    if (parsed.data.time_on_task_sec) sub.time_on_task_sec = parsed.data.time_on_task_sec;
    if (parsed.data.env) sub.env = { ...sub.env, ...parsed.data.env } as typeof sub.env;
    const bugs = parsed.data.bugs ?? [];
    for (const b of bugs) {
      const existing = b.id ? d.bugReports.find((x) => x.id === b.id) : undefined;
      if (existing && existing.tester_id === u.id && existing.status === "pending") {
        Object.assign(existing, {
          title: b.title,
          body: b.body,
          repro_steps: b.repro_steps,
          proposed_severity: b.proposed_severity,
          console_logs: b.console_logs ?? existing.console_logs,
        });
      } else {
        const id = uid();
        d.bugReports.push({
          id,
          submission_id: sub.id,
          bounty_id: sub.bounty_id,
          tester_id: u.id,
          issue_id: null,
          title: b.title,
          body: b.body,
          repro_steps: b.repro_steps,
          proposed_severity: b.proposed_severity,
          final_severity: null,
          is_first_finder: false,
          unlocked_by: [],
          status: "pending",
          reject_reason: null,
          reject_note: null,
          payout: 0,
          created_at: nowIso(),
          console_logs: b.console_logs ?? [],
        });
        if (b.extra) sub.extra_bugs.push(id);
        if (b.from_step) {
          const note = sub.step_notes.find((n) => n.step_order === b.from_step);
          if (note) note.flagged_bug_id = id;
        }
        for (const path of b.screenshots ?? []) {
          d.evidence.push({
            id: uid(),
            bug_report_id: id,
            submission_id: sub.id,
            storage_path: path,
            kind: "image",
            meta: {},
            created_at: nowIso(),
          });
        }
      }
    }
    persist();
    publish({ channel: "submissions", event: "UPDATE", row: sub });
    return ok({
      submission: sub,
      bugs: d.bugReports.filter((b) => b.submission_id === sub.id),
    });
  } catch (e) {
    return handleError(e);
  }
}
