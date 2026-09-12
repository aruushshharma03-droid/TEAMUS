import { z } from "zod";
import { fail, handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { tx } from "@/lib/store";
import { fn_resolve_grievance } from "@/lib/money";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await ctx.params;
    const body = z.object({ uphold: z.boolean() }).safeParse(await req.json());
    if (!body.success) return fail("BAD_REQUEST", "uphold required");
    const g = await tx((d) => fn_resolve_grievance(d, id, body.data.uphold, u.id));
    return ok({ grievance: g });
  } catch (e) {
    return handleError(e);
  }
}
