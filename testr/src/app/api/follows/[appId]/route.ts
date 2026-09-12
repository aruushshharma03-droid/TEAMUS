import { db, persist } from "@/lib/store";
import { handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { nowIso } from "@/lib/ids";

export async function POST(_: Request, ctx: { params: Promise<{ appId: string }> }) {
  try {
    const u = await requireUser();
    const { appId } = await ctx.params;
    const d = db();
    const existing = d.follows.find((f) => f.user_id === u.id && f.app_id === appId);
    if (existing) {
      d.follows = d.follows.filter((f) => f !== existing);
    } else {
      d.follows.push({ user_id: u.id, app_id: appId, created_at: nowIso() });
    }
    persist();
    return ok({ following: !existing });
  } catch (e) {
    return handleError(e);
  }
}
