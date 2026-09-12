import assert from "node:assert";
import { buildSeed } from "../src/lib/seed";
import {
  conservation,
  fn_approve_session,
  fn_claim_slot,
  fn_confirm_bug,
  fn_open_tournament,
  fn_post_bounty,
  fn_redeem,
  fn_settle_tournament,
  fn_topup,
  tournamentStandings,
} from "../src/lib/money";
import { MoneyError } from "../src/lib/types";

function run() {
  const d = buildSeed();
  const c = conservation(d);
  assert.equal(c.ok, true, `conservation ${JSON.stringify(c)}`);

  for (const w of d.wallets) {
    const rows = d.ledger.filter((l) => l.to_wallet === w.id || l.from_wallet === w.id);
    const sum = rows.reduce((s, l) => s + (l.to_wallet === w.id ? l.amount : 0) - (l.from_wallet === w.id ? l.amount : 0), 0);
    assert.equal(w.balance, sum, `wallet ${w.owner_id} ${w.balance} != ${sum}`);
  }

  const mira = d.profiles.find((p) => p.handle === "mira")!;
  const ananya = d.profiles.find((p) => p.handle === "ananya")!;
  const app = d.apps.find((a) => a.owner_id === mira.id)!;

  try {
    fn_post_bounty(d, mira.id, {
      app_id: app.id,
      title: "too cheap for expert",
      description: "x",
      mode: "open",
      script: [],
      focus_tags: [],
      out_of_scope: [],
      requirements: { platforms: ["web"] },
      trust_tier: "expert",
      slots: 1,
      reward_start: 20,
      reward_max: 20,
      step_amount: 0,
      step_interval_min: 30,
      bug_pool: 0,
      severity_payouts: { critical: 400, major: 200, minor: 60 },
      expires_at: new Date(Date.now() + 86400_000).toISOString(),
      is_private: false,
    });
    assert.fail("floor");
  } catch (e) {
    assert.ok(e instanceof MoneyError && e.code === "REWARD_BELOW_TIER_FLOOR");
  }

  const live = d.bounties.find((b) => b.slots_taken < b.slots && ["live", "heating"].includes(b.status));
  if (live) {
    const low = d.profiles.find((p) => p.handle === "harsh")!;
    try {
      live.trust_tier = "expert";
      fn_claim_slot(d, live.id, low.id);
      assert.fail("trust");
    } catch (e) {
      assert.ok(e instanceof MoneyError);
    }
  }

  fn_topup(d, mira.id, "pack-500");
  const c2 = conservation(d);
  assert.equal(c2.ok, true, JSON.stringify(c2));

  const reward = d.rewards[0];
  fn_topup(d, ananya.id, "pack-1200");
  fn_redeem(d, ananya.id, reward.id);
  const c3 = conservation(d);
  assert.equal(c3.ok, true, JSON.stringify(c3));

  // A completed guided session pays its base reward out of the same escrow.
  const claimable = d.bounties.find(
    (b) => b.slots_taken < b.slots && ["live", "heating"].includes(b.status) && b.trust_tier === "open"
  );
  if (claimable) {
    const claim = fn_claim_slot(d, claimable.id, ananya.id);
    const sub = d.submissions.find((s) => s.claim_id === claim.id)!;

    // Not payable until the tester actually submits.
    assert.throws(
      () => fn_approve_session(d, sub.id, claimable.owner_id),
      (e: unknown) => e instanceof MoneyError && e.code === "NOT_SUBMITTED"
    );

    sub.status = "submitted";
    assert.throws(
      () => fn_approve_session(d, sub.id, ananya.id),
      (e: unknown) => e instanceof MoneyError && e.code === "FORBIDDEN",
      "only the bounty owner approves"
    );

    const before = d.wallets.find((w) => w.owner_id === ananya.id)!.balance;
    const { paid } = fn_approve_session(d, sub.id, claimable.owner_id);
    assert.equal(paid, claimable.reward_current, "base reward is the current step");
    assert.equal(d.wallets.find((w) => w.owner_id === ananya.id)!.balance, before + paid);
    const cSession = conservation(d);
    assert.equal(cSession.ok, true, `session approval ${JSON.stringify(cSession)}`);

    // Paying twice for one session must not be possible.
    assert.throws(
      () => fn_approve_session(d, sub.id, claimable.owner_id),
      (e: unknown) => e instanceof MoneyError && e.code === "NOT_SUBMITTED"
    );
  }

  // A tournament locks its prize pool up front and settles out of that lock.
  const huntApp = d.apps.find((a) => a.owner_id === mira.id)!;
  fn_topup(d, mira.id, "pack-3000");
  const miraBefore = d.wallets.find((w) => w.owner_id === mira.id)!.balance;
  const hunt = fn_open_tournament(d, mira.id, {
    app_id: huntApp.id,
    title: "Test hunt",
    prize_pool: 1000,
    hours: 24,
  });
  assert.equal(
    d.wallets.find((w) => w.owner_id === mira.id)!.balance,
    miraBefore - 1000,
    "prize pool leaves the wallet at open time"
  );
  const cHunt = conservation(d);
  assert.equal(cHunt.ok, true, `tournament open ${JSON.stringify(cHunt)}`);

  const standings = tournamentStandings(d, hunt);
  const podium = standings.slice(0, 3).reduce((s, r) => s + r.prize, 0);
  fn_settle_tournament(d, hunt.id);
  const cSettled = conservation(d);
  assert.equal(cSettled.ok, true, `tournament settle ${JSON.stringify(cSettled)}`);
  const huntEscrow = d.escrows.find((e) => e.id === hunt.escrow_id)!;
  assert.equal(huntEscrow.status, "settled");
  assert.equal(
    huntEscrow.amount_spent,
    huntEscrow.amount_locked,
    "every locked coin is either a prize or refunded"
  );
  assert.ok(podium <= 1000, "podium never exceeds the pool");
  assert.throws(
    () => fn_settle_tournament(d, hunt.id),
    (e: unknown) => e instanceof MoneyError && e.code === "ALREADY_SETTLED"
  );

  // Everything above must balance. Snapshot before the escrow-overdraw case below, which
  // deliberately corrupts an escrow row to reach the INSUFFICIENT_ESCROW branch.
  const final = conservation(d);
  assert.equal(final.ok, true, `final ${JSON.stringify(final)}`);

  const bug = d.bugReports.find((b) => b.status === "clustered" || b.status === "pending");
  if (bug) {
    const bounty = d.bounties.find((x) => x.id === bug.bounty_id)!;
    const escrow = d.escrows.find((e) => e.id === bounty.escrow_id)!;
    const spent = escrow.amount_spent;
    escrow.amount_spent = escrow.amount_locked;
    try {
      fn_confirm_bug(d, bug.id, "critical", bounty.owner_id);
      assert.fail("escrow");
    } catch (e) {
      assert.ok(e instanceof MoneyError && e.code === "INSUFFICIENT_ESCROW");
    }
    escrow.amount_spent = spent;
  }

  console.log("ledger tests passed", conservation(d));
}

run();
