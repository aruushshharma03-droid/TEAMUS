import { db } from "@/lib/store";
import { fail, ok } from "@/lib/http";
import { getSessionUser } from "@/lib/session";
import { matchesDevice } from "@/lib/queries";
import { TIER_TRUST as TT } from "@/lib/types";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const d = db();
  const b = d.bounties.find((x) => x.id === id);
  if (!b) return fail("NOT_FOUND", "Bounty not found", 404);
  const viewer = await getSessionUser();
  const app = d.apps.find((a) => a.id === b.app_id)!;
  const escrow = d.escrows.find((e) => e.id === b.escrow_id);
  return ok({
    bounty: b,
    app,
    escrow,
    match: matchesDevice(viewer, b.requirements),
    trustOk: (viewer?.trust_score ?? 0) >= TT[b.trust_tier],
    already: viewer ? d.claims.some((c) => c.bounty_id === b.id && c.tester_id === viewer.id) : false,
    viewer,
  });
}
