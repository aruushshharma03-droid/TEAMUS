import { handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { tx } from "@/lib/store";
import { fn_claim_slot } from "@/lib/money";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await ctx.params;
    const claim = await tx((d) => fn_claim_slot(d, id, u.id));
    return ok({ claim });
  } catch (e) {
    return handleError(e);
  }
}
