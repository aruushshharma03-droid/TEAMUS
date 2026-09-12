import { db } from "@/lib/store";
import { fail, ok } from "@/lib/http";
import { getSessionUser } from "@/lib/session";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const d = db();
  const b = d.bounties.find((x) => x.id === id);
  if (!b) return fail("NOT_FOUND", "Bounty not found", 404);
  const kit = d.testKits.find((k) => k.app_id === b.app_id);
  if (!kit) return fail("NOT_FOUND", "No test kit", 404);
  const viewer = await getSessionUser();
  const active = viewer
    ? d.claims.some((c) => c.bounty_id === b.id && c.tester_id === viewer.id && c.status === "active")
    : false;
  const owner = viewer?.id === b.owner_id;
  return ok({
    artifact_path: kit.artifact_path,
    external_url: kit.external_url,
    instructions_md: kit.instructions_md,
    credentials: active || owner ? kit.credentials_encrypted : null,
  });
}
