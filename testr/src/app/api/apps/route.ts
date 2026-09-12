import { z } from "zod";
import { db, persist } from "@/lib/store";
import { fail, handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { uid, nowIso } from "@/lib/ids";

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = z
      .object({
        name: z.string().min(2),
        slug: z.string().min(2),
        tagline: z.string(),
        category: z.string(),
        platforms: z.array(z.string()),
      })
      .safeParse(await req.json());
    if (!body.success) return fail("BAD_REQUEST", "Invalid app");
    if (db().apps.some((a) => a.slug === body.data.slug)) return fail("TAKEN", "Slug taken");
    const app = {
      id: uid(),
      owner_id: u.id,
      name: body.data.name,
      slug: body.data.slug.toLowerCase(),
      icon_url: `https://api.dicebear.com/9.x/shapes/svg?seed=${body.data.slug}&backgroundColor=e8f0fe`,
      tagline: body.data.tagline,
      category: body.data.category,
      platforms: body.data.platforms,
      tester_rating: 5,
      is_verified: false,
      created_at: nowIso(),
    };
    db().apps.push(app);
    persist();
    return ok({ app });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET() {
  return ok({ apps: db().apps });
}
