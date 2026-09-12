import { db } from "@/lib/store";
import { handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";

export async function GET() {
  try {
    const u = await requireUser();
    const d = db();
    const apps = d.apps.filter((a) => a.owner_id === u.id);
    const bounties = d.bounties.filter((b) => b.owner_id === u.id);
    const pending = d.bugReports.filter(
      (b) => bounties.some((x) => x.id === b.bounty_id) && ["pending", "clustered"].includes(b.status)
    );
    const wallet = d.wallets.find((w) => w.owner_id === u.id);
    return ok({
      apps: apps.map((a) => ({
        ...a,
        bounties: bounties.filter((b) => b.app_id === a.id).map((b) => ({
          id: b.id,
          title: b.title,
          status: b.status,
          slots_taken: b.slots_taken,
          slots: b.slots,
          pending: pending.filter((p) => p.bounty_id === b.id).length,
        })),
      })),
      pending: pending.length,
      balance: wallet?.balance ?? 0,
      asTester: {
        bugs: d.bugReports.filter((b) => b.tester_id === u.id && b.status === "confirmed").length,
        claims: d.claims.filter((c) => c.tester_id === u.id).length,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
