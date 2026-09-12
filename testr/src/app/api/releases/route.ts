import { z } from "zod";
import { fail, handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { tx } from "@/lib/store";
import { fn_ship_release } from "@/lib/money";

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = z
      .object({
        app_id: z.string(),
        version: z.string(),
        issue_ids: z.array(z.string()),
        notes: z.string().optional(),
      })
      .safeParse(await req.json());
    if (!body.success) return fail("BAD_REQUEST", "Invalid release");
    const rel = await tx((d) =>
      fn_ship_release(d, body.data.app_id, body.data.version, body.data.issue_ids, u.id, body.data.notes)
    );
    return ok({ release: rel });
  } catch (e) {
    return handleError(e);
  }
}
