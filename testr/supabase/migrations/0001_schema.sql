-- testr schema (Supabase). Apply in order. Runtime demo uses the TypeScript ledger in src/lib/money.ts.

create extension if not exists pgcrypto;

create type trust_tier as enum ('open','verified','trusted','expert');
create type bounty_mode as enum ('guided','open','both');
create type bounty_status as enum ('draft','live','heating','filled','reviewing','expired','settled');
create type ledger_type as enum ('TOPUP','ESCROW_HOLD','ESCROW_RELEASE','CONFIRM_REWARD','REFUND','FORCED_RELEASE','REDEEM','SUBSCRIPTION','TRANSFER');
create type event_type as enum ('BOUNTY_OPENED','BUG_CONFIRMED','REWARD_RAISED','SHIPPED','BOUNTY_FILLED','BOUNTY_EXPIRED');
create type severity as enum ('critical','major','minor');

create table profiles (
  id uuid primary key references auth.users(id),
  handle text unique not null,
  display_name text not null,
  avatar_url text,
  trust_score int default 0,
  tier trust_tier default 'open',
  device_profile jsonb,
  interests text[] default '{}',
  is_pro bool default false,
  pro_until timestamptz,
  created_at timestamptz default now()
);

create table wallets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid unique references profiles(id),
  balance bigint default 0 check (balance >= 0)
);

create table ledger (
  id uuid primary key default gen_random_uuid(),
  from_wallet uuid references wallets(id),
  to_wallet uuid references wallets(id),
  amount bigint not null check (amount > 0),
  type ledger_type not null,
  ref_table text,
  ref_id uuid,
  memo text,
  created_at timestamptz default now()
);

create table apps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id),
  name text not null,
  slug text unique not null,
  icon_url text,
  tagline text,
  category text,
  platforms text[],
  tester_rating numeric default 5.0,
  is_verified bool default false,
  created_at timestamptz default now()
);

create table test_kits (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references apps(id),
  artifact_path text,
  external_url text,
  instructions_md text,
  instructions_file_path text,
  credentials_encrypted text,
  created_at timestamptz default now(),
  check (artifact_path is not null or external_url is not null)
);

create table bounties (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references apps(id),
  owner_id uuid references profiles(id),
  title text,
  description text,
  mode bounty_mode,
  script jsonb default '[]',
  focus_tags text[],
  out_of_scope text[],
  requirements jsonb,
  trust_tier trust_tier,
  slots int,
  slots_taken int default 0,
  reward_start bigint,
  reward_max bigint,
  reward_current bigint,
  step_amount bigint,
  step_interval_min int,
  last_step_at timestamptz,
  bug_pool bigint default 0,
  severity_payouts jsonb,
  escrow_id uuid,
  expires_at timestamptz,
  status bounty_status default 'draft',
  is_private bool default false,
  created_at timestamptz default now()
);

create table escrows (
  id uuid primary key default gen_random_uuid(),
  bounty_id uuid,
  owner_wallet uuid references wallets(id),
  amount_locked bigint not null,
  amount_spent bigint default 0,
  status text check (status in ('held','settled','refunded'))
);

alter table bounties add constraint bounties_escrow_fk foreign key (escrow_id) references escrows(id);

create table claims (
  id uuid primary key default gen_random_uuid(),
  bounty_id uuid references bounties(id),
  tester_id uuid references profiles(id),
  claimed_at timestamptz default now(),
  expires_at timestamptz,
  status text,
  unique (bounty_id, tester_id)
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid unique references claims(id),
  bounty_id uuid references bounties(id),
  tester_id uuid references profiles(id),
  step_notes jsonb,
  env jsonb,
  time_on_task_sec int,
  quality_flags jsonb,
  status text,
  submitted_at timestamptz
);

create table issues (
  id uuid primary key default gen_random_uuid(),
  bounty_id uuid references bounties(id),
  app_id uuid references apps(id),
  title text,
  merged_repro jsonb,
  env_correlation text,
  severity severity,
  first_finder_id uuid references profiles(id),
  reporter_count int,
  status text,
  is_public bool default false,
  created_at timestamptz default now()
);

create table bug_reports (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id),
  bounty_id uuid references bounties(id),
  tester_id uuid references profiles(id),
  issue_id uuid references issues(id),
  title text,
  body text,
  repro_steps jsonb,
  proposed_severity severity,
  final_severity severity,
  is_first_finder bool default false,
  status text,
  reject_reason text,
  reject_note text,
  payout bigint default 0,
  created_at timestamptz default now()
);

create table evidence (
  id uuid primary key default gen_random_uuid(),
  bug_report_id uuid references bug_reports(id),
  submission_id uuid references submissions(id),
  storage_path text,
  kind text,
  meta jsonb,
  created_at timestamptz default now()
);

create table reproductions (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references issues(id),
  user_id uuid references profiles(id),
  created_at timestamptz default now(),
  unique (issue_id, user_id)
);

create table follows (
  user_id uuid references profiles(id),
  app_id uuid references apps(id),
  created_at timestamptz default now(),
  primary key (user_id, app_id)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  type event_type,
  actor_id uuid,
  app_id uuid,
  bounty_id uuid,
  issue_id uuid,
  payload jsonb,
  created_at timestamptz default now()
);

create table releases (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references apps(id),
  version text,
  notes text,
  issue_ids uuid[],
  credited_user_ids uuid[],
  shipped_at timestamptz default now()
);

create table grievances (
  id uuid primary key default gen_random_uuid(),
  bug_report_id uuid unique references bug_reports(id),
  tester_id uuid references profiles(id),
  reason text,
  status text,
  ai_recommendation jsonb,
  resolved_by uuid,
  resolution_note text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table rewards_catalog (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  partner text,
  kind text,
  cost_coins bigint,
  inventory int,
  image_url text,
  is_active bool default true
);

create table redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  reward_id uuid references rewards_catalog(id),
  coins_spent bigint,
  code text,
  created_at timestamptz default now()
);

create table topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  package_id text,
  inr_amount int,
  coins bigint,
  status text,
  mock_ref text,
  created_at timestamptz default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  plan text,
  status text,
  started_at timestamptz,
  expires_at timestamptz
);

create table trust_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  delta int,
  reason text,
  ref_table text,
  ref_id uuid,
  created_at timestamptz default now()
);

create index events_created_at on events (created_at desc);
create index bounties_status_exp on bounties (status, expires_at);
create index bug_reports_issue on bug_reports (issue_id);
create index claims_bounty_status on claims (bounty_id, status);
create index ledger_to on ledger (to_wallet, created_at desc);
create index ledger_from on ledger (from_wallet, created_at desc);
