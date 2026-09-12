import { z } from "zod";
import { fail, handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { db, tx } from "@/lib/store";
import { fn_open_tournament, tournamentStandings } from "@/lib/money";

export async function GET() {
  try {
    const d = db();
    return ok({
      tournaments: d.tournaments.map((t) => ({
        ...t,
        app: d.apps.find((a) => a.id === t.app_id),
        entrants: tournamentStandings(d, t).length,
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = z
      .object({
        app_id: z.string(),
        title: z.string().min(3),
        prize_pool: z.number().int().min(100),
        hours: z.number().int().min(1).max(336),
      })
      .safeParse(await req.json());
    if (!body.success) return fail("BAD_REQUEST", "Invalid tournament");
    return ok(await tx((d) => fn_open_tournament(d, u.id, body.data)));
  } catch (e) {
    return handleError(e);
  }
}
