import { db } from "@/lib/store";
import { getSessionUser } from "@/lib/session";
import { fail, ok } from "@/lib/http";
import { publicBugBody } from "@/lib/queries";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const viewer = await getSessionUser();
  const row = publicBugBody(db(), id, viewer);
  if (!row) return fail("NOT_FOUND", "Bug not found", 404);
  return ok({ bug: row });
}
