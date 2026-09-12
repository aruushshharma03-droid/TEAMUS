import { resetDb } from "@/lib/store";
import { fail, ok } from "@/lib/http";

export async function POST() {
  if (process.env.ALLOW_DEMO_RESET === "0") {
    return fail("DISABLED", "Reset disabled", 403);
  }
  resetDb();
  return ok({ ok: true });
}

export async function GET() {
  return POST();
}
