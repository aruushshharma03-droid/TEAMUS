import { handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { tx } from "@/lib/store";
import { fn_redeem } from "@/lib/money";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await ctx.params;
    const row = await tx((d) => fn_redeem(d, u.id, id));
    return ok({ redemption: row });
  } catch (e) {
    return handleError(e);
  }
}
