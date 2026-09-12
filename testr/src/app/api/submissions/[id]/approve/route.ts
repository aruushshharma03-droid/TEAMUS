import { handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { tx } from "@/lib/store";
import { fn_approve_session } from "@/lib/money";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await ctx.params;
    return ok(await tx((d) => fn_approve_session(d, id, u.id)));
  } catch (e) {
    return handleError(e);
  }
}
