import { z } from "zod";
import { cookies } from "next/headers";
import { fail, ok } from "@/lib/http";
import { db, persist, tx } from "@/lib/store";
import { uid, nowIso } from "@/lib/ids";
import { fn_recompute_tier } from "@/lib/money";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  handle: z.string().min(2).optional(),
  display_name: z.string().optional(),
});

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail("BAD_REQUEST", "Invalid email or password");
  const { email, password, handle, display_name } = body.data;
  const d = db();
  let user = d.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    if (!handle) return fail("NOT_FOUND", "No account for that email. Create one with a handle.");
    if (d.profiles.some((p) => p.handle === handle.replace(/^@/, "")))
      return fail("TAKEN", "Handle taken");
    const id = uid();
    user = {
      id,
      handle: handle.replace(/^@/, ""),
      display_name: display_name || handle,
      email,
      password,
      avatar_url: `https://api.dicebear.com/9.x/initials/svg?seed=${handle}&backgroundColor=1a73e8&textColor=ffffff`,
      trust_score: 0,
      tier: "open",
      xp: 0,
      level: 1,
      accuracy_streak: 0,
      best_streak: 0,
      device_profile: null,
      interests: [],
      is_pro: false,
      pro_until: null,
      created_at: nowIso(),
    };
    await tx((dbx) => {
      dbx.profiles.push(user!);
      dbx.wallets.push({ id: uid(), owner_id: id, balance: 0 });
      fn_recompute_tier(dbx, id);
    });
  } else if (user.password !== password) {
    return fail("BAD_CREDENTIALS", "Wrong password", 401);
  }
  const jar = await cookies();
  jar.set("testr_session", user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  persist();
  return ok({
    user: {
      id: user.id,
      handle: user.handle,
      display_name: user.display_name,
      needs_device: !user.device_profile,
      is_pro: user.is_pro,
    },
  });
}
