import { z } from "zod";
import { fail, handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { db, tx } from "@/lib/store";
import { fn_post_bounty } from "@/lib/money";
import { qualifyCount } from "@/lib/queries";

const schema = z.object({
  app_id: z.string(),
  title: z.string().min(4),
  description: z.string(),
  mode: z.enum(["guided", "open", "both"]),
  script: z.array(z.object({ order: z.number(), instruction: z.string() })),
  focus_tags: z.array(z.string()),
  out_of_scope: z.array(z.string()),
  requirements: z.object({
    platforms: z.array(z.string()),
    os: z.string().optional(),
    min_os: z.string().optional(),
    ram_gb: z.number().optional(),
    storage_mb: z.number().optional(),
    hardware: z.array(z.string()).optional(),
    locales: z.array(z.string()).optional(),
    offline: z.boolean().optional(),
  }),
  trust_tier: z.enum(["open", "verified", "trusted", "expert"]),
  slots: z.number().int().min(1),
  reward_start: z.number().int(),
  reward_max: z.number().int(),
  step_amount: z.number().int(),
  step_interval_min: z.number().int(),
  bug_pool: z.number().int(),
  severity_payouts: z.object({
    critical: z.number(),
    major: z.number(),
    minor: z.number(),
  }),
  duration_hours: z.number().optional(),
  is_private: z.boolean().optional(),
  kit: z
    .object({
      external_url: z.string().nullable().optional(),
      instructions_md: z.string().optional(),
      credentials_encrypted: z.string().nullable().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return fail("BAD_REQUEST", parsed.error.message);
    const hours = parsed.data.duration_hours ?? 48;
    const bounty = await tx((d) =>
      fn_post_bounty(d, u.id, {
        ...parsed.data,
        is_private: parsed.data.is_private ?? false,
        expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
      })
    );
    return ok({ bounty, qualify: qualifyCount(db(), parsed.data.trust_tier, parsed.data.requirements) });
  } catch (e) {
    return handleError(e);
  }
}
