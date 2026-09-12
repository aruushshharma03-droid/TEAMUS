import { db, persist } from "@/lib/store";
import { fail, handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { uid, nowIso } from "@/lib/ids";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await ctx.params;
    const d = db();
    if (!d.issues.find((i) => i.id === id)) return fail("NOT_FOUND", "Issue not found", 404);
    if (!d.reproductions.some((r) => r.issue_id === id && r.user_id === u.id)) {
      d.reproductions.push({ id: uid(), issue_id: id, user_id: u.id, created_at: nowIso() });
      persist();
    }
    return ok({ count: d.reproductions.filter((r) => r.issue_id === id).length });
  } catch (e) {
    return handleError(e);
  }
}
