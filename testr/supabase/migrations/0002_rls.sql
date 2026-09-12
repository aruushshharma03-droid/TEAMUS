alter table profiles enable row level security;
alter table wallets enable row level security;
alter table ledger enable row level security;
alter table apps enable row level security;
alter table test_kits enable row level security;
alter table bounties enable row level security;
alter table escrows enable row level security;
alter table claims enable row level security;
alter table submissions enable row level security;
alter table bug_reports enable row level security;
alter table issues enable row level security;
alter table evidence enable row level security;
alter table reproductions enable row level security;
alter table follows enable row level security;
alter table events enable row level security;
alter table releases enable row level security;
alter table grievances enable row level security;
alter table rewards_catalog enable row level security;
alter table redemptions enable row level security;
alter table topups enable row level security;
alter table subscriptions enable row level security;
alter table trust_events enable row level security;

create policy profiles_read on profiles for select using (true);
create policy profiles_write on profiles for update using (auth.uid() = id);

create policy apps_read on apps for select using (true);
create policy apps_write on apps for all using (auth.uid() = owner_id);

create policy events_read on events for select using (true);
create policy releases_read on releases for select using (true);

create policy bounties_read on bounties for select using (is_private = false or owner_id = auth.uid());
create policy bounties_write on bounties for all using (auth.uid() = owner_id);

create policy test_kits_read on test_kits for select using (true);

create policy bugs_read on bug_reports for select using (
  tester_id = auth.uid()
  or exists (select 1 from bounties b where b.id = bounty_id and b.owner_id = auth.uid())
  or exists (select 1 from issues i where i.id = issue_id and i.is_public = true)
);

create policy evidence_read on evidence for select using (
  exists (select 1 from bug_reports br where br.id = bug_report_id and (
    br.tester_id = auth.uid()
    or exists (select 1 from bounties b where b.id = br.bounty_id and b.owner_id = auth.uid())
    or exists (select 1 from issues i where i.id = br.issue_id and i.is_public)
  ))
);

create policy submissions_rw on submissions for all using (
  tester_id = auth.uid()
  or exists (select 1 from bounties b where b.id = bounty_id and b.owner_id = auth.uid())
);

create policy wallets_own on wallets for select using (owner_id = auth.uid());
create policy ledger_own on ledger for select using (
  from_wallet in (select id from wallets where owner_id = auth.uid())
  or to_wallet in (select id from wallets where owner_id = auth.uid())
);
create policy redemptions_own on redemptions for select using (user_id = auth.uid());
create policy topups_own on topups for select using (user_id = auth.uid());
create policy escrow_owner on escrows for select using (
  owner_wallet in (select id from wallets where owner_id = auth.uid())
);

insert into storage.buckets (id, name, public) values
  ('builds', 'builds', false),
  ('evidence', 'evidence', false),
  ('instructions', 'instructions', true),
  ('avatars', 'avatars', true),
  ('icons', 'icons', true)
on conflict do nothing;
