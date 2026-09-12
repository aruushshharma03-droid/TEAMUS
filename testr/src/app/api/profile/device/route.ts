import { z } from "zod";
import { fail, handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { persist } from "@/lib/store";

const schema = z.object({
  os: z.string(),
  os_version: z.string(),
  device: z.string(),
  ram_gb: z.number(),
  screen: z.string(),
  locale: z.string(),
  interests: z.array(z.string()).optional(),
});

export async function PATCH(req: Request) {
  try {
    const u = await requireUser();
    const body = schema.safeParse(await req.json());
    if (!body.success) return fail("BAD_REQUEST", "Invalid device profile");
    u.device_profile = {
      os: body.data.os,
      os_version: body.data.os_version,
      device: body.data.device,
      ram_gb: body.data.ram_gb,
      screen: body.data.screen,
      locale: body.data.locale,
    };
    if (body.data.interests) u.interests = body.data.interests;
    persist();
    return ok({ device_profile: u.device_profile, interests: u.interests });
  } catch (e) {
    return handleError(e);
  }
}
