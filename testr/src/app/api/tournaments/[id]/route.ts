import { fail, handleError, ok } from "@/lib/http";
import { db, tx } from "@/lib/store";
import { requireUser } from "@/lib/session";
import { fn_settle_tournament, tournamentStandings } from "@/lib/money";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const d = db();
    const t = d.tournaments.find((x) => x.id === id);
    if (!t) return fail("NOT_FOUND", "Tournament not found", 404);
    const escrow = d.escrows.find((e) => e.id === t.escrow_id);
    return ok({
      tournament: t,
      app: d.apps.find((a) => a.id === t.app_id),
      owner: d.profiles.find((p) => p.id === t.owner_id),
      standings: tournamentStandings(d, t),
      escrow: escrow && { locked: escrow.amount_locked, paid: escrow.amount_spent },
    });
  } catch (e) {
    return handleError(e);
  }
}

/** Settle and pay the podium. Organiser only; unclaimed places refund to them. */
export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await ctx.params;
    const t = db().tournaments.find((x) => x.id === id);
    if (!t) return fail("NOT_FOUND", "Tournament not found", 404);
    if (t.owner_id !== u.id) return fail("FORBIDDEN", "Organiser only", 403);
    return ok(await tx((d) => fn_settle_tournament(d, id)));
  } catch (e) {
    return handleError(e);
  }
}
