export type TrustTier = "open" | "verified" | "trusted" | "expert";
export type BountyMode = "guided" | "open" | "both";
export type BountyStatus =
  | "draft"
  | "live"
  | "heating"
  | "filled"
  | "reviewing"
  | "expired"
  | "settled";
export type LedgerType =
  | "TOPUP"
  | "ESCROW_HOLD"
  | "ESCROW_RELEASE"
  | "CONFIRM_REWARD"
  | "REFUND"
  | "FORCED_RELEASE"
  | "REDEEM"
  | "SUBSCRIPTION"
  | "TRANSFER"
  | "TOURNAMENT_PRIZE";
export type Severity = "critical" | "major" | "minor";
export type EventType =
  | "BOUNTY_OPENED"
  | "BUG_CONFIRMED"
  | "REWARD_RAISED"
  | "SHIPPED"
  | "BOUNTY_FILLED"
  | "BOUNTY_EXPIRED";

export const TIER_FLOORS: Record<TrustTier, number> = {
  open: 20,
  verified: 50,
  trusted: 100,
  expert: 200,
};

export const TIER_TRUST: Record<TrustTier, number> = {
  open: 0,
  verified: 40,
  trusted: 70,
  expert: 85,
};

export const TOPUP_PACKAGES: Record<
  string,
  { coins: number; inr: number; label: string }
> = {
  "pack-500": { coins: 500, inr: 499, label: "Starter" },
  "pack-1200": { coins: 1200, inr: 999, label: "Popular" },
  "pack-3000": { coins: 3000, inr: 2199, label: "Studio" },
  "pack-10000": { coins: 10000, inr: 6999, label: "Lab" },
};

export type DeviceProfile = {
  os: string;
  os_version: string;
  device: string;
  ram_gb: number;
  screen: string;
  locale: string;
  browser?: string;
};

export type ScriptStep = { order: number; instruction: string };

export type Requirements = {
  platforms: string[];
  os?: string;
  min_os?: string;
  ram_gb?: number;
  storage_mb?: number;
  hardware?: string[];
  locales?: string[];
  offline?: boolean;
};

export type Profile = {
  id: string;
  handle: string;
  display_name: string;
  email: string;
  password: string;
  avatar_url: string;
  trust_score: number;
  tier: TrustTier;
  /** Progression, deliberately separate from trust_score so cosmetics never move the economic gate. */
  xp: number;
  level: number;
  /** Consecutive bugs whose proposed severity the dev accepted unchanged. */
  accuracy_streak: number;
  best_streak: number;
  device_profile: DeviceProfile | null;
  interests: string[];
  is_pro: boolean;
  pro_until: string | null;
  created_at: string;
  headline?: string;
};

export type Wallet = {
  id: string;
  owner_id: string;
  balance: number;
};

export type LedgerRow = {
  id: string;
  from_wallet: string | null;
  to_wallet: string | null;
  amount: number;
  type: LedgerType;
  ref_table: string | null;
  ref_id: string | null;
  memo: string;
  created_at: string;
};

export type App = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  icon_url: string;
  tagline: string;
  category: string;
  platforms: string[];
  tester_rating: number;
  is_verified: boolean;
  created_at: string;
};

export type TestKit = {
  id: string;
  app_id: string;
  artifact_path: string | null;
  external_url: string | null;
  instructions_md: string;
  instructions_file_path: string | null;
  credentials_encrypted: string | null;
  created_at: string;
};

export type Bounty = {
  id: string;
  app_id: string;
  owner_id: string;
  title: string;
  description: string;
  mode: BountyMode;
  script: ScriptStep[];
  focus_tags: string[];
  out_of_scope: string[];
  requirements: Requirements;
  trust_tier: TrustTier;
  slots: number;
  slots_taken: number;
  reward_start: number;
  reward_max: number;
  reward_current: number;
  step_amount: number;
  step_interval_min: number;
  last_step_at: string;
  bug_pool: number;
  severity_payouts: Record<Severity, number>;
  escrow_id: string | null;
  expires_at: string;
  status: BountyStatus;
  is_private: boolean;
  created_at: string;
};

export type Escrow = {
  id: string;
  bounty_id: string;
  owner_wallet: string;
  amount_locked: number;
  amount_spent: number;
  status: "held" | "settled" | "refunded";
};

export type Claim = {
  id: string;
  bounty_id: string;
  tester_id: string;
  claimed_at: string;
  expires_at: string;
  status: "active" | "submitted" | "abandoned" | "expired";
};

export type Submission = {
  id: string;
  claim_id: string;
  bounty_id: string;
  tester_id: string;
  step_notes: {
    step_order: number;
    note: string;
    flagged_bug_id: string | null;
  }[];
  env: DeviceProfile & { timestamp?: string };
  time_on_task_sec: number;
  quality_flags: Record<string, boolean>;
  status: "draft" | "submitted" | "reviewed";
  submitted_at: string | null;
  extra_bugs: string[];
};

export type ConsoleLine = {
  t: number;
  level: "log" | "info" | "warn" | "error";
  message: string;
};

export type BugReport = {
  id: string;
  submission_id: string;
  bounty_id: string;
  tester_id: string;
  issue_id: string | null;
  title: string;
  body: string;
  repro_steps: string[];
  proposed_severity: Severity;
  final_severity: Severity | null;
  is_first_finder: boolean;
  status: "pending" | "clustered" | "confirmed" | "rejected" | "duplicate";
  reject_reason:
    | "not_reproducible"
    | "out_of_scope"
    | "already_known"
    | "not_a_bug"
    | null;
  reject_note: string | null;
  payout: number;
  created_at: string;
  console_logs: ConsoleLine[];
  /** User ids that have paid to unlock the full body/repro/evidence. */
  unlocked_by: string[];
};

export type Issue = {
  id: string;
  bounty_id: string;
  app_id: string;
  title: string;
  merged_repro: string[];
  env_correlation: string | null;
  severity: Severity;
  first_finder_id: string;
  reporter_count: number;
  status: "open" | "confirmed" | "fixed" | "rejected";
  is_public: boolean;
  created_at: string;
};

export type Evidence = {
  id: string;
  bug_report_id: string | null;
  submission_id: string | null;
  storage_path: string;
  kind: "image" | "video" | "file" | "replay";
  meta: Record<string, unknown>;
  created_at: string;
};

export type Reproduction = {
  id: string;
  issue_id: string;
  user_id: string;
  created_at: string;
};

export type Follow = { user_id: string; app_id: string; created_at: string };

export type ActivityEvent = {
  id: string;
  type: EventType;
  actor_id: string | null;
  app_id: string | null;
  bounty_id: string | null;
  issue_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type Release = {
  id: string;
  app_id: string;
  version: string;
  notes: string;
  issue_ids: string[];
  credited_user_ids: string[];
  shipped_at: string;
};

export type Grievance = {
  id: string;
  bug_report_id: string;
  tester_id: string;
  reason: string;
  status: "open" | "upheld" | "denied";
  ai_recommendation: {
    recommendation: "uphold" | "deny";
    confidence: number;
    reasoning: string;
  } | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type Reward = {
  id: string;
  title: string;
  description: string;
  partner: string;
  kind: "bob" | "app" | "giftcard" | "pro";
  cost_coins: number;
  inventory: number;
  image_url: string;
  is_active: boolean;
};

export type Redemption = {
  id: string;
  user_id: string;
  reward_id: string;
  coins_spent: number;
  code: string;
  created_at: string;
};

export type Topup = {
  id: string;
  user_id: string;
  package_id: string;
  inr_amount: number;
  coins: number;
  status: "pending" | "success" | "failed";
  mock_ref: string;
  created_at: string;
};

export type TrustEvent = {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  ref_table: string | null;
  ref_id: string | null;
  created_at: string;
};

export type AchievementKind =
  | "fixed_in_prod"
  | "first_blood"
  | "critical_hitter"
  | "polyglot"
  | "perfect_score"
  | "tournament_podium";

export const ACHIEVEMENTS: Record<AchievementKind, { label: string; blurb: string; icon: string }> = {
  fixed_in_prod: { label: "Fixed in prod", blurb: "A bug you found shipped as a fix", icon: "✓" },
  first_blood: { label: "First blood", blurb: "First to find a confirmed issue", icon: "◉" },
  critical_hitter: { label: "Critical hitter", blurb: "Three confirmed criticals", icon: "▲" },
  polyglot: { label: "Polyglot", blurb: "Confirmed bugs on five different apps", icon: "◆" },
  perfect_score: { label: "Perfect score", blurb: "Ten severity calls accepted in a row", icon: "★" },
  tournament_podium: { label: "Podium", blurb: "Top three in a bug hunt", icon: "♛" },
};

export type Badge = {
  user_id: string;
  kind: AchievementKind;
  app_id: string;
  created_at: string;
};

export type Tournament = {
  id: string;
  app_id: string;
  owner_id: string;
  title: string;
  prize_pool: number;
  /** Share of the pool for places 1..3, must sum to 1. */
  splits: number[];
  escrow_id: string | null;
  starts_at: string;
  ends_at: string;
  status: "live" | "settled";
  created_at: string;
};

export type DB = {
  profiles: Profile[];
  wallets: Wallet[];
  ledger: LedgerRow[];
  apps: App[];
  testKits: TestKit[];
  bounties: Bounty[];
  escrows: Escrow[];
  claims: Claim[];
  submissions: Submission[];
  bugReports: BugReport[];
  issues: Issue[];
  evidence: Evidence[];
  reproductions: Reproduction[];
  follows: Follow[];
  events: ActivityEvent[];
  releases: Release[];
  grievances: Grievance[];
  rewards: Reward[];
  redemptions: Redemption[];
  topups: Topup[];
  trustEvents: TrustEvent[];
  badges: Badge[];
  tournaments: Tournament[];
};

export class MoneyError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
