import { rankOf } from "@/lib/xp";
import { db } from "@/lib/store";
import { fail, ok } from "@/lib/http";
import { publicBugBody } from "@/lib/queries";
import { getSessionUser } from "@/lib/session";

export async function GET(_: Request, ctx: { params: Promise<{ handle: string }> }) {
  const { handle } = await ctx.params;
  const d = db();
  const p = d.profiles.find((x) => x.handle === handle.replace(/^@/, ""));
  if (!p) return fail("NOT_FOUND", "Profile not found", 404);
  const viewer = await getSessionUser();
  const w = d.wallets.find((x) => x.owner_id === p.id);
  const bugs = d.bugReports.filter((b) => b.tester_id === p.id && b.status === "confirmed");
  const finds = bugs.map((b) => publicBugBody(d, b.id, viewer));
  return ok({
    rank: rankOf(d, p.id),
    profile: {
      handle: p.handle,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      trust_score: p.trust_score,
      tier: p.tier,
      xp: p.xp,
      level: p.level,
      accuracy_streak: p.accuracy_streak,
      best_streak: p.best_streak,
      is_pro: p.is_pro,
      device_profile: p.device_profile,
      interests: p.interests,
    },
    stats: {
      bugs: bugs.length,
      critical: bugs.filter((b) => b.final_severity === "critical").length,
      apps: new Set(bugs.map((b) => d.bounties.find((x) => x.id === b.bounty_id)?.app_id)).size,
      coins: viewer?.id === p.id ? (w?.balance ?? 0) : null,
      first: bugs.filter((b) => b.is_first_finder).length,
      avgTime: Math.round(
        d.submissions.filter((s) => s.tester_id === p.id && s.time_on_task_sec).reduce((s, x) => s + x.time_on_task_sec, 0) /
          Math.max(1, d.submissions.filter((s) => s.tester_id === p.id).length)
      ),
    },
    badges: d.badges.filter((b) => b.user_id === p.id),
    finds,
    following: d.follows.filter((f) => f.user_id === p.id).length,
  });
}
