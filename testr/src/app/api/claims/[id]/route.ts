import { db } from "@/lib/store";
import { fail, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { handleError } from "@/lib/http";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await ctx.params;
    const d = db();
    const claim = d.claims.find((c) => c.id === id);
    if (!claim || (claim.tester_id !== u.id && d.bounties.find((b) => b.id === claim.bounty_id)?.owner_id !== u.id))
      return fail("NOT_FOUND", "Claim not found", 404);
    const bounty = d.bounties.find((b) => b.id === claim.bounty_id)!;
    const app = d.apps.find((a) => a.id === bounty.app_id)!;
    const sub = d.submissions.find((s) => s.claim_id === claim.id)!;
    const bugs = d.bugReports.filter((b) => b.submission_id === sub.id);
    const kit = d.testKits.find((k) => k.app_id === app.id);
    const evidence = d.evidence.filter((e) => e.submission_id === sub.id);
    return ok({ claim, bounty, app, submission: sub, bugs, kit, evidence });
  } catch (e) {
    return handleError(e);
  }
}
