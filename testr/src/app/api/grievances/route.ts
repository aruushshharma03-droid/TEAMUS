import { z } from "zod";
import { fail, handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { db, persist } from "@/lib/store";
import { uid, nowIso } from "@/lib/ids";

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = z.object({ bug_report_id: z.string(), reason: z.string().min(8) }).safeParse(await req.json());
    if (!body.success) return fail("BAD_REQUEST", "Reason required");
    const d = db();
    const bug = d.bugReports.find((b) => b.id === body.data.bug_report_id);
    if (!bug || bug.tester_id !== u.id) return fail("FORBIDDEN", "Not your report", 403);
    if (bug.status !== "rejected") return fail("BAD_STATE", "Only rejected reports can be appealed");
    if (d.grievances.some((g) => g.bug_report_id === bug.id))
      return fail("ALREADY", "One appeal is allowed");
    const g = {
      id: uid(),
      bug_report_id: bug.id,
      tester_id: u.id,
      reason: body.data.reason,
      status: "open" as const,
      ai_recommendation: null,
      resolved_by: null,
      resolution_note: null,
      created_at: nowIso(),
      resolved_at: null,
    };
    d.grievances.push(g);
    persist();
    return ok({ grievance: g });
  } catch (e) {
    return handleError(e);
  }
}
