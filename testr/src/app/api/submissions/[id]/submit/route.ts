import { fail, handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { db, persist } from "@/lib/store";
import { nowIso } from "@/lib/ids";
import { publish } from "@/lib/bus";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await ctx.params;
    const d = db();
    const sub = d.submissions.find((s) => s.id === id);
    if (!sub || sub.tester_id !== u.id) return fail("NOT_FOUND", "Submission not found", 404);
    const bugs = d.bugReports.filter((b) => b.submission_id === sub.id);
    sub.quality_flags = {
      notes: sub.step_notes.every((n) => n.note.trim().length > 8),
      repro: bugs.every((b) => b.repro_steps.length > 0),
      evidence: true,
      time: sub.time_on_task_sec >= 120,
    };
    sub.status = "submitted";
    sub.submitted_at = nowIso();
    const claim = d.claims.find((c) => c.id === sub.claim_id);
    if (claim) claim.status = "submitted";
    const bounty = d.bounties.find((b) => b.id === sub.bounty_id);
    if (bounty && bounty.status === "filled") bounty.status = "reviewing";
    persist();
    publish({ channel: "submissions", event: "INSERT", row: sub });
    return ok({ submission: sub });
  } catch (e) {
    return handleError(e);
  }
}
