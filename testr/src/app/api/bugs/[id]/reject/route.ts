import { z } from "zod";
import { handleError, fail, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { tx } from "@/lib/store";
import { fn_reject_bug } from "@/lib/money";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await ctx.params;
    const body = z
      .object({
        reason: z.enum(["not_reproducible", "out_of_scope", "already_known", "not_a_bug"]),
        note: z.string().optional().default(""),
      })
      .safeParse(await req.json());
    if (!body.success) return fail("BAD_REQUEST", "Reason required");
    const bug = await tx((d) => fn_reject_bug(d, id, body.data.reason, body.data.note, u.id));
    return ok({ bug });
  } catch (e) {
    return handleError(e);
  }
}
