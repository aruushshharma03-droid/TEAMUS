import { handleError, ok } from "@/lib/http";
import { db } from "@/lib/store";
import { getSessionUser } from "@/lib/session";
import { leaderboard, rankOf } from "@/lib/xp";

/** Season is a rolling 14-day window; the countdown is what makes the board feel live. */
function seasonEnd() {
  const start = Date.UTC(2026, 0, 1);
  const period = 14 * 24 * 3600_000;
  const elapsed = Date.now() - start;
  return new Date(start + Math.ceil(elapsed / period) * period).toISOString();
}

export async function GET() {
  try {
    const u = await getSessionUser();
    const d = db();
    return ok({
      season_ends_at: seasonEnd(),
      top: leaderboard(d, 10),
      you: u ? { rank: rankOf(d, u.id), xp: u.xp, level: u.level } : null,
    });
  } catch (e) {
    return handleError(e);
  }
}
