import { ok } from "@/lib/http";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const u = await getSessionUser();
  if (!u) return ok({ user: null });
  return ok({
    user: {
      id: u.id,
      handle: u.handle,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      trust_score: u.trust_score,
      tier: u.tier,
      xp: u.xp,
      level: u.level,
      accuracy_streak: u.accuracy_streak,
      is_pro: u.is_pro,
      device_profile: u.device_profile,
      needs_device: !u.device_profile,
      interests: u.interests,
    },
  });
}
