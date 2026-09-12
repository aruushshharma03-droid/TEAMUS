import { db } from "@/lib/store";
import { fail, handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { bugForViewer } from "@/lib/queries";

export async function GET(_: Request, ctx: { params: Promise<{ bountyId: string }> }) {
  try {
    const u = await requireUser();
    const { bountyId } = await ctx.params;
    const d = db();
    const bounty = d.bounties.find((b) => b.id === bountyId);
    if (!bounty || bounty.owner_id !== u.id) return fail("FORBIDDEN", "Owner only", 403);
    const app = d.apps.find((a) => a.id === bounty.app_id)!;
    const escrow = d.escrows.find((e) => e.id === bounty.escrow_id);
    const submissions = d.submissions
      .filter((s) => s.bounty_id === bountyId && s.status !== "draft")
      .map((s) => {
        const tester = d.profiles.find((p) => p.id === s.tester_id);
        return {
          ...s,
          tester: tester && {
            handle: tester.handle,
            display_name: tester.display_name,
            avatar_url: tester.avatar_url,
            trust_score: tester.trust_score,
            tier: tester.tier,
            level: tester.level,
            accuracy_streak: tester.accuracy_streak,
          },
          bugs: d.bugReports.filter((b) => b.submission_id === s.id).map((b) => bugForViewer(d, b, u)),
          base_reward: bounty.reward_current,
        };
      });
    const issues = d.issues
      .filter((i) => i.bounty_id === bountyId)
      .map((issue) => {
        const reports = d.bugReports.filter((b) => b.issue_id === issue.id);
        const dist = { critical: 0, major: 0, minor: 0 };
        for (const r of reports) dist[r.proposed_severity]++;
        const first = reports.sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
        const payoutFull = bounty.severity_payouts[issue.severity];
        const others = Math.max(0, reports.length - 1);
        const total = payoutFull + others * Math.floor(payoutFull * 0.2);
        return {
          ...issue,
          // Sealed until paid for: redaction happens here, not in the component.
          reports: reports.map((r) => ({
            ...bugForViewer(d, r, u),
            handle: d.profiles.find((p) => p.id === r.tester_id)?.handle,
            unlock_cost: bounty.severity_payouts[r.proposed_severity],
          })),
          dist,
          first_finder: d.profiles.find((p) => p.id === (first?.tester_id ?? issue.first_finder_id))?.handle,
          payoutFull,
          confirmPay: Math.floor(payoutFull * 0.2),
          total,
          remaining: (escrow?.amount_locked ?? 0) - (escrow?.amount_spent ?? 0),
          overdraw: total > (escrow?.amount_locked ?? 0) - (escrow?.amount_spent ?? 0),
        };
      });
    return ok({
      bounty,
      app,
      escrow,
      submissions,
      issues,
      unclustered: d.bugReports.filter((b) => b.bounty_id === bountyId && b.status === "pending").length,
    });
  } catch (e) {
    return handleError(e);
  }
}
