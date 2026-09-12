import { handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/store";

export async function GET(req: Request) {
  try {
    const u = await requireUser();
    const d = db();
    const w = d.wallets.find((x) => x.owner_id === u.id)!;
    const page = Number(new URL(req.url).searchParams.get("page") ?? "0");
    const rows = d.ledger
      .filter((l) => l.to_wallet === w.id || l.from_wallet === w.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const slice = rows.slice(page * 40, page * 40 + 40);
    const escrow = d.escrows
      .filter((e) => e.owner_wallet === w.id && e.status === "held")
      .map((e) => {
        const b = d.bounties.find((x) => x.id === e.bounty_id)!;
        return { ...e, title: b.title, bounty_id: b.id };
      });
    const earned = d.ledger
      .filter((l) => l.to_wallet === w.id && ["ESCROW_RELEASE", "CONFIRM_REWARD", "FORCED_RELEASE"].includes(l.type))
      .reduce((s, l) => s + l.amount, 0);
    return ok({
      balance: w.balance,
      escrow: escrow.reduce((s, e) => s + (e.amount_locked - e.amount_spent), 0),
      earned,
      ledger: slice.map((l) => ({
        ...l,
        sign: l.to_wallet === w.id ? 1 : -1,
      })),
      escrowCards: escrow,
      trust: u.trust_score,
      tier: u.tier,
      name: u.display_name,
      is_pro: u.is_pro,
    });
  } catch (e) {
    return handleError(e);
  }
}
