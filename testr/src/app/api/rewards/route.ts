import { db } from "@/lib/store";
import { ok } from "@/lib/http";

export async function GET() {
  return ok({ rewards: db().rewards.filter((r) => r.is_active) });
}
