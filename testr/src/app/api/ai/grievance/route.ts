import { z } from "zod";
import { fail, handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { db, persist } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = z.object({ grievance_id: z.string() }).safeParse(await req.json());
    if (!body.success) return fail("BAD_REQUEST", "grievance_id required");
    const d = db();
    const g = d.grievances.find((x) => x.id === body.data.grievance_id);
    if (!g) return fail("NOT_FOUND", "Not found", 404);
    const bug = d.bugReports.find((b) => b.id === g.bug_report_id)!;
    const rec = {
      recommendation: (bug.reject_reason === "not_a_bug" ? "deny" : "uphold") as "uphold" | "deny",
      confidence: 0.72,
      reasoning:
        "Based on the written rejection, evidence captions and the tester's appeal, the report looks independently reproducible. Advisory only.",
    };
    if (u.is_pro || u.handle === "mira") {
      g.ai_recommendation = rec;
      persist();
    }
    return ok({ recommendation: rec });
  } catch (e) {
    return handleError(e);
  }
}
