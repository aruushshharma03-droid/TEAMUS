import { db } from "@/lib/store";
import { fail, ok } from "@/lib/http";
import { getSessionUser } from "@/lib/session";
import { matchesDevice, publicBugBody } from "@/lib/queries";

export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const d = db();
  const app = d.apps.find((a) => a.slug === slug);
  if (!app) return fail("NOT_FOUND", "App not found", 404);
  const viewer = await getSessionUser();
  const owner = d.profiles.find((p) => p.id === app.owner_id)!;
  const bounties = d.bounties.filter((b) => b.app_id === app.id && (!b.is_private || viewer?.id === app.owner_id));
  const issues = d.issues
    .filter((i) => i.app_id === app.id)
    .map((issue) => {
      const reports = d.bugReports.filter((b) => b.issue_id === issue.id);
      const sample = reports[0];
      const pub = sample ? publicBugBody(d, sample.id, viewer) : null;
      return {
        ...issue,
        first_finder: d.profiles.find((p) => p.id === issue.first_finder_id)?.handle,
        repros: d.reproductions.filter((r) => r.issue_id === issue.id).length,
        excerpt: pub?.hidden ? null : sample?.body ?? null,
        hidden: pub?.hidden ?? !issue.is_public,
        payout: reports.reduce((s, r) => s + r.payout, 0),
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const releases = d.releases
    .filter((r) => r.app_id === app.id)
    .map((r) => ({
      ...r,
      credits: r.credited_user_ids.map((id) => d.profiles.find((p) => p.id === id)?.handle),
    }));
  const kit = d.testKits.find((k) => k.app_id === app.id);
  const stats = {
    bugs: d.bugReports.filter((b) => d.bounties.find((x) => x.id === b.bounty_id)?.app_id === app.id).length,
    critical: d.issues.filter((i) => i.app_id === app.id && i.severity === "critical").length,
    testers: new Set(d.claims.filter((c) => d.bounties.find((b) => b.id === c.bounty_id)?.app_id === app.id).map((c) => c.tester_id)).size,
    coins: d.escrows
      .filter((e) => d.bounties.find((b) => b.id === e.bounty_id)?.app_id === app.id)
      .reduce((s, e) => s + e.amount_spent, 0),
    rating: app.tester_rating,
  };
  return ok({
    app,
    owner,
    bounties: bounties.map((b) => ({
      ...b,
      match: matchesDevice(viewer, b.requirements),
      following: viewer ? d.follows.some((f) => f.user_id === viewer.id && f.app_id === app.id) : false,
    })),
    issues,
    releases,
    kit: kit
      ? { id: kit.id, has_artifact: !!kit.artifact_path, external_url: kit.external_url }
      : null,
    stats,
    following: viewer ? d.follows.some((f) => f.user_id === viewer.id && f.app_id === app.id) : false,
    isOwner: viewer?.id === app.owner_id,
  });
}
