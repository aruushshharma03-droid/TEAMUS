import { z } from "zod";
import { fail, handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { tx } from "@/lib/store";
import { fn_topup } from "@/lib/money";
import { TOPUP_PACKAGES } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = z.object({ package_id: z.string() }).safeParse(await req.json());
    if (!body.success || !TOPUP_PACKAGES[body.data.package_id])
      return fail("BAD_PACKAGE", "Unknown package");
    await new Promise((r) => setTimeout(r, 3000));
    const result = await tx((d) => fn_topup(d, u.id, body.data.package_id));
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
