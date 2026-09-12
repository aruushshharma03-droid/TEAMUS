import { cookies } from "next/headers";
import { ok } from "@/lib/http";

export async function POST() {
  const jar = await cookies();
  jar.set("testr_session", "", { path: "/", maxAge: 0 });
  return ok({ ok: true });
}
