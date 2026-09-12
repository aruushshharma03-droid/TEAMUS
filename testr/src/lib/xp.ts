import { publish } from "./bus";
import { nowIso } from "./ids";
import type { AchievementKind, DB, Severity } from "./types";

/**
 * XP is progression only. It never mints, burns or moves coins — the ledger invariant in
 * money.ts#conservation depends on TOPUP and REDEEM being the sole mint/burn paths, so
 * everything in this file pays in levels, badges and perks instead.
 */

const SEVERITY_XP: Record<Severity, number> = { critical: 120, major: 60, minor: 20 };

/** Level N starts at 50 * N * (N - 1) XP: 0, 100, 300, 600, 1000, ... */
export function levelFor(xp: number) {
  return Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2);
}

export function levelFloor(level: number) {
  return 50 * level * (level - 1);
}

/** Fraction of the way from this level's floor to the next one, for progress rings. */
export function levelProgress(xp: number) {
  const level = levelFor(xp);
  const floor = levelFloor(level);
  const next = levelFloor(level + 1);
  return { level, floor, next, pct: Math.round((100 * (xp - floor)) / Math.max(1, next - floor)) };
}

/** Level 5+ hunters see new bounties before everyone else. Costs the platform nothing. */
export const EARLY_ACCESS_LEVEL = 5;
export const EARLY_ACCESS_MIN = 10;

export function awardXp(d: DB, userId: string, amount: number, reason: string) {
  const p = d.profiles.find((x) => x.id === userId);
  if (!p || amount <= 0) return;
  const before = p.level;
  p.xp += amount;
  p.level = levelFor(p.xp);
  publish({ channel: "toast", event: "XP", row: { owner_id: userId, amount, reason } });
  if (p.level > before) {
    publish({ channel: "toast", event: "LEVEL_UP", row: { owner_id: userId, level: p.level } });
  }
}

export function grantBadge(d: DB, userId: string, kind: AchievementKind, appId: string) {
  if (d.badges.some((b) => b.user_id === userId && b.kind === kind)) return;
  d.badges.push({ user_id: userId, kind, app_id: appId, created_at: nowIso() });
  publish({ channel: "toast", event: "ACHIEVEMENT", row: { owner_id: userId, kind } });
}

/**
 * Called after a bug report is confirmed and paid. Moves XP, the severity-accuracy streak and
 * any achievements the confirmation just unlocked.
 */
export function onBugConfirmed(
  d: DB,
  userId: string,
  appId: string,
  severity: Severity,
  opts: { firstFinder: boolean; severityMatched: boolean }
) {
  const base = SEVERITY_XP[severity];
  awardXp(d, userId, opts.firstFinder ? base : Math.round(base * 0.2), "bug_confirmed");
  if (opts.severityMatched) awardXp(d, userId, 15, "severity_accepted");

  const p = d.profiles.find((x) => x.id === userId);
  if (p) {
    p.accuracy_streak = opts.severityMatched ? p.accuracy_streak + 1 : 0;
    p.best_streak = Math.max(p.best_streak, p.accuracy_streak);
    if (p.accuracy_streak >= 10) grantBadge(d, userId, "perfect_score", appId);
  }

  if (opts.firstFinder) grantBadge(d, userId, "first_blood", appId);

  const confirmed = d.bugReports.filter((b) => b.tester_id === userId && b.status === "confirmed");
  if (confirmed.filter((b) => b.final_severity === "critical").length >= 3) {
    grantBadge(d, userId, "critical_hitter", appId);
  }
  const apps = new Set(
    confirmed
      .map((b) => d.bounties.find((x) => x.id === b.bounty_id)?.app_id)
      .filter(Boolean) as string[]
  );
  if (apps.size >= 5) grantBadge(d, userId, "polyglot", appId);
}

export function onSessionApproved(d: DB, userId: string) {
  awardXp(d, userId, 40, "session_approved");
}

export function onShipped(d: DB, userId: string) {
  awardXp(d, userId, 25, "fixed_in_prod");
}

export function leaderboard(d: DB, limit = 10) {
  return [...d.profiles]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit)
    .map((p, i) => ({
      rank: i + 1,
      handle: p.handle,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      xp: p.xp,
      level: p.level,
      tier: p.tier,
    }));
}

export function rankOf(d: DB, userId: string) {
  const sorted = [...d.profiles].sort((a, b) => b.xp - a.xp);
  return sorted.findIndex((p) => p.id === userId) + 1;
}
