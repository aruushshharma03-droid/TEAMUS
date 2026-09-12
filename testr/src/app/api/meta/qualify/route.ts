import { db } from "@/lib/store";
import { getSessionUser } from "@/lib/session";
import { qualifyCount } from "@/lib/queries";
import { ok } from "@/lib/http";
import type { TrustTier } from "@/lib/types";

export async function GET(req: Request) {
  const u = await getSessionUser();
  const q = new URL(req.url).searchParams;
  const tier = (q.get("tier") ?? "open") as TrustTier;
  const count = qualifyCount(db(), tier, {
    ram_gb: q.get("ram") ? Number(q.get("ram")) : undefined,
    os: q.get("os") ?? undefined,
  });
  return ok({ count, me: u?.handle ?? null });
}
