import { db } from "@/lib/store";
import { ok } from "@/lib/http";
import { conservation, fn_escalate_rewards, expireClaims, fn_expire_bounty } from "@/lib/money";
import { persist } from "@/lib/store";

export async function GET() {
  const d = db();
  fn_escalate_rewards(d);
  expireClaims(d);
  for (const b of d.bounties) {
    if (new Date(b.expires_at).getTime() < Date.now() && b.status !== "settled") fn_expire_bounty(d, b.id);
  }
  persist();
  return ok({ conservation: conservation(d) });
}
