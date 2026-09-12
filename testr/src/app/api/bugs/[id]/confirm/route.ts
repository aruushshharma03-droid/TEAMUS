import { z } from "zod";
import { handleError, fail, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { tx } from "@/lib/store";
import { fn_confirm_bug } from "@/lib/money";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await ctx.params;
    const body = z.object({ severity: z.enum(["critical", "major", "minor"]) }).safeParse(await req.json());
    if (!body.success) return fail("BAD_REQUEST", "Severity required");
    const result = await tx((d) => fn_confirm_bug(d, id, body.data.severity, u.id));
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
