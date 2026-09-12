import { z } from "zod";
import { fail, handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { db, persist } from "@/lib/store";
import { clusterBounty } from "@/lib/cluster";

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = z.object({ bounty_id: z.string() }).safeParse(await req.json());
    if (!body.success) return fail("BAD_REQUEST", "bounty_id required");
    const d = db();
    const bounty = d.bounties.find((b) => b.id === body.data.bounty_id);
    if (!bounty || bounty.owner_id !== u.id) return fail("FORBIDDEN", "Owner only", 403);
    const pending = d.bugReports.filter((b) => b.bounty_id === bounty.id && b.status === "pending");
    const previewGroups = new Set(pending.map((p) => p.title.split(" ").slice(0, 2).join(" "))).size || 4;
    if (!u.is_pro) {
      return Response.json(
        {
          error: {
            code: "PRO_REQUIRED",
            message: "AI clustering is a Pro feature",
            would_cluster: previewGroups,
            submissions: new Set(pending.map((p) => p.submission_id)).size || 7,
          },
        },
        { status: 402 }
      );
    }
    const result = clusterBounty(d, bounty.id);
    persist();
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
