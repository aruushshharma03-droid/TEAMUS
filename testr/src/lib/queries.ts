import type { BugReport, DB, DeviceProfile, Profile } from "./types";
import { TIER_TRUST } from "./types";
import { EARLY_ACCESS_LEVEL, EARLY_ACCESS_MIN } from "./xp";

/**
 * Level perk: high-level hunters see a bounty during its first minutes, before it reaches the
 * open feed. Costs the platform nothing and makes levelling worth something.
 */
function canSeeYet(b: { created_at: string }, viewer: Profile | null) {
  const age = Date.now() - new Date(b.created_at).getTime();
  if (age >= EARLY_ACCESS_MIN * 60_000) return true;
  return (viewer?.level ?? 0) >= EARLY_ACCESS_LEVEL;
}

export function matchesDevice(p: Profile | null, req: { platforms?: string[]; os?: string; ram_gb?: number; locales?: string[] } | undefined) {
  if (!p?.device_profile || !req) return { ok: false, reason: "Add a device profile" };
  const dp = p.device_profile;
  if (req.os && dp.os.toLowerCase() !== req.os.toLowerCase())
    return { ok: false, reason: `Needs ${req.os}` };
  if (req.ram_gb && dp.ram_gb < req.ram_gb)
    return { ok: false, reason: `Needs ${req.ram_gb}GB RAM` };
  if (req.locales?.length && !req.locales.includes(dp.locale))
    return { ok: false, reason: "Locale mismatch" };
  return { ok: true, reason: "matches your device" };
}

/**
 * Bug reports have two locks on the same field, and both are enforced here rather than in the UI.
 *
 *  1. Pay-to-unlock. The bounty owner sees the title, severity and the reporter's reputation, but
 *     the body, repro steps and evidence stay sealed until they pay out on it. Reputation is what
 *     they underwrite the decision with.
 *  2. Responsible disclosure. Everyone else stays locked out until the dev ships a fix.
 *
 * The reporter always sees their own work.
 */
export function canReadBugDetail(d: DB, bug: BugReport, viewer: Profile | null) {
  if (!viewer) return false;
  if (viewer.id === bug.tester_id) return true;
  const bounty = d.bounties.find((b) => b.id === bug.bounty_id);
  if (bounty && viewer.id === bounty.owner_id) return bug.unlocked_by.includes(viewer.id);
  const issue = bug.issue_id ? d.issues.find((i) => i.id === bug.issue_id) : null;
  return issue?.is_public === true;
}

/** The sealed view: enough to judge the reporter, never enough to act on the finding. */
export function sealedBug(d: DB, bug: BugReport) {
  const tester = d.profiles.find((p) => p.id === bug.tester_id);
  const confirmed = d.bugReports.filter(
    (b) => b.tester_id === bug.tester_id && b.status === "confirmed"
  );
  return {
    id: bug.id,
    bounty_id: bug.bounty_id,
    issue_id: bug.issue_id,
    title: bug.title,
    proposed_severity: bug.proposed_severity,
    final_severity: bug.final_severity,
    status: bug.status,
    created_at: bug.created_at,
    payout: bug.payout,
    is_first_finder: bug.is_first_finder,
    locked: true,
    body: null,
    repro_steps: [] as string[],
    console_logs: [] as BugReport["console_logs"],
    evidence_count: d.evidence.filter((e) => e.bug_report_id === bug.id).length,
    log_count: bug.console_logs.length,
    error_count: bug.console_logs.filter((l) => l.level === "error").length,
    reporter: tester
      ? {
          handle: tester.handle,
          display_name: tester.display_name,
          avatar_url: tester.avatar_url,
          trust_score: tester.trust_score,
          tier: tester.tier,
          level: tester.level,
          xp: tester.xp,
          accuracy_streak: tester.accuracy_streak,
          best_streak: tester.best_streak,
          confirmed_bugs: confirmed.length,
          criticals: confirmed.filter((b) => b.final_severity === "critical").length,
          badges: d.badges.filter((b) => b.user_id === tester.id).map((b) => b.kind),
        }
      : null,
  };
}

/** Full view, with the same reporter block attached so the UI renders one shape either way. */
export function unsealedBug(d: DB, bug: BugReport) {
  return {
    ...sealedBug(d, bug),
    locked: false,
    body: bug.body,
    repro_steps: bug.repro_steps,
    console_logs: bug.console_logs,
    evidence: d.evidence.filter((e) => e.bug_report_id === bug.id),
    reject_reason: bug.reject_reason,
    reject_note: bug.reject_note,
  };
}

export function bugForViewer(d: DB, bug: BugReport, viewer: Profile | null) {
  return canReadBugDetail(d, bug, viewer) ? unsealedBug(d, bug) : sealedBug(d, bug);
}

export function publicBugBody(d: DB, bugId: string, viewer: Profile | null) {
  const bug = d.bugReports.find((b) => b.id === bugId);
  if (!bug) return null;
  const allowed = canReadBugDetail(d, bug, viewer);
  return {
    ...bug,
    body: allowed ? bug.body : null,
    repro_steps: allowed ? bug.repro_steps : [],
    hidden: !allowed,
  };
}

export function feedCards(d: DB, viewer: Profile | null, filter: string) {
  return d.apps
    .map((app) => {
      const bounties = d.bounties.filter(
        (b) =>
          b.app_id === app.id &&
          !b.is_private &&
          ["live", "heating", "filled"].includes(b.status) &&
          canSeeYet(b, viewer)
      );
      const latest = d.events
        .filter((e) => e.app_id === app.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      const owner = d.profiles.find((p) => p.id === app.owner_id)!;
      const rewards = bounties.map((b) => b.reward_current);
      const match = bounties[0]
        ? matchesDevice(viewer, bounties[0].requirements)
        : { ok: false, reason: "No open bounty" };
      return {
        app,
        owner,
        bounties,
        openCount: bounties.length,
        rewardMin: rewards.length ? Math.min(...rewards) : 0,
        rewardMax: bounties.length ? Math.max(...bounties.map((b) => b.reward_max)) : 0,
        slots: bounties.reduce((s, b) => s + (b.slots - b.slots_taken), 0),
        testers: d.claims.filter((c) => bounties.some((b) => b.id === c.bounty_id)).length,
        bugs: d.bugReports.filter((b) => d.bounties.find((x) => x.id === b.bounty_id)?.app_id === app.id).length,
        latest,
        latestHandle: latest?.actor_id
          ? d.profiles.find((p) => p.id === latest.actor_id)?.handle
          : null,
        match,
        heating: bounties.some((b) => b.status === "heating"),
      };
    })
    .filter((c) => {
      if (filter === "web") return c.app.platforms.includes("web");
      if (filter === "apk") return c.app.platforms.includes("apk");
      if (filter === "desktop") return c.app.platforms.includes("desktop");
      if (filter === "ios") return c.app.platforms.includes("ios");
      if (filter === "heating") return c.heating;
      if (filter === "new")
        return new Date(c.app.created_at).getTime() > Date.now() - 20 * 86400_000;
      if (filter === "foryou" && viewer) {
        return (
          c.match.ok ||
          viewer.interests.some((i) => c.app.category.includes(i) || i.includes(c.app.category))
        );
      }
      if (filter === "ending") {
        return c.bounties.some(
          (b) => new Date(b.expires_at).getTime() < Date.now() + 12 * 3600_000
        );
      }
      return true;
    })
    .sort((a, b) => {
      const at = a.latest?.created_at ?? a.app.created_at;
      const bt = b.latest?.created_at ?? b.app.created_at;
      return bt.localeCompare(at);
    });
}

export function qualifyCount(d: DB, tier: keyof typeof TIER_TRUST, req?: { ram_gb?: number; os?: string }) {
  const min = TIER_TRUST[tier];
  return d.profiles.filter((p) => {
    if (p.trust_score < min) return false;
    if (req?.ram_gb && (p.device_profile?.ram_gb ?? 0) < req.ram_gb) return false;
    if (req?.os && p.device_profile?.os !== req.os) return false;
    return true;
  }).length;
}

export function captureEnv(dp: DeviceProfile | null): DeviceProfile {
  return (
    dp ?? {
      os: "Web",
      os_version: "desktop",
      device: "Browser",
      ram_gb: 8,
      screen: "1440x900",
      locale: "en-IN",
      browser: "Chrome",
    }
  );
}
