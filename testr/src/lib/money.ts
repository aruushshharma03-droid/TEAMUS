import { publish } from "./bus";
import { nowIso, uid } from "./ids";
import { onBugConfirmed, onSessionApproved, onShipped } from "./xp";
import {
  MoneyError,
  TIER_FLOORS,
  TIER_TRUST,
  TOPUP_PACKAGES,
  type Bounty,
  type BugReport,
  type DB,
  type LedgerType,
  type Profile,
  type Severity,
  type Tournament,
  type TrustTier,
} from "./types";

function walletOf(d: DB, ownerId: string) {
  const w = d.wallets.find((x) => x.owner_id === ownerId);
  if (!w) throw new MoneyError("NO_WALLET", "Wallet not found");
  return w;
}

function profile(d: DB, id: string) {
  const p = d.profiles.find((x) => x.id === id);
  if (!p) throw new MoneyError("NO_USER", "User not found");
  return p;
}

function writeLedger(
  d: DB,
  row: {
    from_wallet: string | null;
    to_wallet: string | null;
    amount: number;
    type: LedgerType;
    ref_table?: string;
    ref_id?: string;
    memo: string;
  }
) {
  if (!Number.isInteger(row.amount) || row.amount <= 0) {
    throw new MoneyError("BAD_AMOUNT", "Amount must be a positive whole coin");
  }
  if (row.from_wallet) {
    const w = d.wallets.find((x) => x.id === row.from_wallet);
    if (!w || w.balance < row.amount)
      throw new MoneyError("INSUFFICIENT_BALANCE", "Insufficient balance");
    w.balance -= row.amount;
  }
  if (row.to_wallet) {
    const w = d.wallets.find((x) => x.id === row.to_wallet);
    if (!w) throw new MoneyError("NO_WALLET", "Credit wallet missing");
    w.balance += row.amount;
  }
  d.ledger.push({
    id: uid(),
    from_wallet: row.from_wallet,
    to_wallet: row.to_wallet,
    amount: row.amount,
    type: row.type,
    ref_table: row.ref_table ?? null,
    ref_id: row.ref_id ?? null,
    memo: row.memo,
    created_at: nowIso(),
  });
}

function applyTrust(d: DB, userId: string, delta: number, reason: string, ref?: { table: string; id: string }) {
  const p = profile(d, userId);
  p.trust_score = Math.max(0, p.trust_score + delta);
  d.trustEvents.push({
    id: uid(),
    user_id: userId,
    delta,
    reason,
    ref_table: ref?.table ?? null,
    ref_id: ref?.id ?? null,
    created_at: nowIso(),
  });
  fn_recompute_tier(d, userId);
}

export function fn_recompute_tier(d: DB, userId: string) {
  const p = profile(d, userId);
  const s = p.trust_score;
  p.tier = s >= 85 ? "expert" : s >= 70 ? "trusted" : s >= 40 ? "verified" : "open";
}

export function fn_topup(d: DB, p_user: string, p_package: string) {
  const pack = TOPUP_PACKAGES[p_package];
  if (!pack) throw new MoneyError("BAD_PACKAGE", "Unknown top-up package");
  const w = walletOf(d, p_user);
  const topupId = uid();
  const ref = `BOB-TXN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  d.topups.push({
    id: topupId,
    user_id: p_user,
    package_id: p_package,
    inr_amount: pack.inr,
    coins: pack.coins,
    status: "success",
    mock_ref: ref,
    created_at: nowIso(),
  });
  writeLedger(d, {
    from_wallet: null,
    to_wallet: w.id,
    amount: pack.coins,
    type: "TOPUP",
    ref_table: "topups",
    ref_id: topupId,
    memo: `Bank of Baroda ${ref} · ${pack.label}`,
  });
  publish({ channel: "wallets", event: "UPDATE", row: { owner_id: p_user, balance: w.balance } });
  return { balance: w.balance, ref, coins: pack.coins };
}

export function fn_post_bounty(
  d: DB,
  actor: string,
  input: {
    app_id: string;
    title: string;
    description: string;
    mode: Bounty["mode"];
    script: Bounty["script"];
    focus_tags: string[];
    out_of_scope: string[];
    requirements: Bounty["requirements"];
    trust_tier: TrustTier;
    slots: number;
    reward_start: number;
    reward_max: number;
    step_amount: number;
    step_interval_min: number;
    bug_pool: number;
    severity_payouts: Bounty["severity_payouts"];
    expires_at: string;
    is_private: boolean;
    kit?: Partial<{
      artifact_path: string | null;
      external_url: string | null;
      instructions_md: string;
      credentials_encrypted: string | null;
    }>;
  }
) {
  const floor = TIER_FLOORS[input.trust_tier];
  if (input.reward_start < floor || input.reward_max < floor) {
    throw new MoneyError(
      "REWARD_BELOW_TIER_FLOOR",
      `Reward below tier floor ⬡${floor} for ${input.trust_tier}`
    );
  }
  if (input.reward_max < input.reward_start) {
    throw new MoneyError("BAD_REWARD", "Max reward must be ≥ start reward");
  }
  const required = input.slots * input.reward_max + input.bug_pool;
  const ownerW = walletOf(d, actor);
  if (ownerW.balance < required) {
    throw new MoneyError(
      "INSUFFICIENT_BALANCE",
      `Need ⬡${required} to lock escrow; available ⬡${ownerW.balance}`
    );
  }
  const bountyId = uid();
  const escrowId = uid();
  const bounty: Bounty = {
    id: bountyId,
    app_id: input.app_id,
    owner_id: actor,
    title: input.title,
    description: input.description,
    mode: input.mode,
    script: input.script,
    focus_tags: input.focus_tags,
    out_of_scope: input.out_of_scope,
    requirements: input.requirements,
    trust_tier: input.trust_tier,
    slots: input.slots,
    slots_taken: 0,
    reward_start: input.reward_start,
    reward_max: input.reward_max,
    reward_current: input.reward_start,
    step_amount: input.step_amount,
    step_interval_min: input.step_interval_min,
    last_step_at: nowIso(),
    bug_pool: input.bug_pool,
    severity_payouts: input.severity_payouts,
    escrow_id: escrowId,
    expires_at: input.expires_at,
    status: "live",
    is_private: input.is_private,
    created_at: nowIso(),
  };
  d.bounties.push(bounty);
  d.escrows.push({
    id: escrowId,
    bounty_id: bountyId,
    owner_wallet: ownerW.id,
    amount_locked: required,
    amount_spent: 0,
    status: "held",
  });
  writeLedger(d, {
    from_wallet: ownerW.id,
    to_wallet: null,
    amount: required,
    type: "ESCROW_HOLD",
    ref_table: "escrows",
    ref_id: escrowId,
    memo: `Escrow lock for ${input.title}`,
  });
  if (input.kit) {
    d.testKits.push({
      id: uid(),
      app_id: input.app_id,
      artifact_path: input.kit.artifact_path ?? null,
      external_url: input.kit.external_url ?? "https://app.example.com/beta",
      instructions_md: input.kit.instructions_md ?? "Install and sign in with the provided tester account.",
      instructions_file_path: null,
      credentials_encrypted: input.kit.credentials_encrypted ?? null,
      created_at: nowIso(),
    });
  }
  const ev = {
    id: uid(),
    type: "BOUNTY_OPENED" as const,
    actor_id: actor,
    app_id: input.app_id,
    bounty_id: bountyId,
    issue_id: null,
    payload: { title: input.title, reward: input.reward_start },
    created_at: nowIso(),
  };
  d.events.push(ev);
  publish({ channel: "events", event: "INSERT", row: ev });
  publish({ channel: "bounties", event: "UPDATE", row: bounty });
  publish({
    channel: "wallets",
    event: "UPDATE",
    row: { owner_id: actor, balance: ownerW.balance },
  });
  return bounty;
}

function deviceMatches(p: Profile, req: Bounty["requirements"]) {
  const dp = p.device_profile;
  if (!dp) return false;
  if (req.os && dp.os.toLowerCase() !== req.os.toLowerCase()) return false;
  if (req.ram_gb && dp.ram_gb < req.ram_gb) return false;
  if (req.locales?.length && !req.locales.includes(dp.locale)) return false;
  return true;
}

export function fn_claim_slot(d: DB, p_bounty: string, p_user: string) {
  const b = d.bounties.find((x) => x.id === p_bounty);
  if (!b) throw new MoneyError("NOT_FOUND", "Bounty not found");
  if (!["live", "heating"].includes(b.status))
    throw new MoneyError("NOT_CLAIMABLE", `Bounty is ${b.status}`);
  if (new Date(b.expires_at).getTime() < Date.now())
    throw new MoneyError("BOUNTY_EXPIRED", "Bounty expired");
  if (b.slots_taken >= b.slots) throw new MoneyError("SLOT_TAKEN", "Slot taken");
  if (d.claims.some((c) => c.bounty_id === b.id && c.tester_id === p_user))
    throw new MoneyError("ALREADY_CLAIMED", "Already claimed");
  const tester = profile(d, p_user);
  if (tester.trust_score < TIER_TRUST[b.trust_tier])
    throw new MoneyError("TRUST_TOO_LOW", `Trust ${TIER_TRUST[b.trust_tier]}+ required`);
  if (!deviceMatches(tester, b.requirements))
    throw new MoneyError("DEVICE_MISMATCH", "Device does not match bounty requirements");
  b.slots_taken += 1;
  if (b.status === "heating") b.status = "live";
  const claim: import("./types").Claim = {
    id: uid(),
    bounty_id: b.id,
    tester_id: p_user,
    claimed_at: nowIso(),
    expires_at: nowIso(2 * 60 * 60 * 1000),
    status: "active",
  };
  d.claims.push(claim);
  d.submissions.push({
    id: uid(),
    claim_id: claim.id,
    bounty_id: b.id,
    tester_id: p_user,
    step_notes: b.script.map((s) => ({
      step_order: s.order,
      note: "",
      flagged_bug_id: null,
    })),
    env: tester.device_profile ?? {
      os: "unknown",
      os_version: "",
      device: "",
      ram_gb: 0,
      screen: "",
      locale: "en-IN",
    },
    time_on_task_sec: 0,
    quality_flags: {},
    status: "draft",
    submitted_at: null,
    extra_bugs: [],
  });
  if (b.slots_taken >= b.slots) {
    b.status = "filled";
    const ev = {
      id: uid(),
      type: "BOUNTY_FILLED" as const,
      actor_id: p_user,
      app_id: b.app_id,
      bounty_id: b.id,
      issue_id: null,
      payload: { slots: b.slots },
      created_at: nowIso(),
    };
    d.events.push(ev);
    publish({ channel: "events", event: "INSERT", row: ev });
  }
  publish({ channel: "bounties", event: "UPDATE", row: b });
  return claim;
}

export function fn_confirm_bug(d: DB, p_bug: string, p_severity: string, p_actor: string) {
  const bug = d.bugReports.find((x) => x.id === p_bug);
  if (!bug) throw new MoneyError("NOT_FOUND", "Bug not found");
  const bounty = d.bounties.find((x) => x.id === bug.bounty_id)!;
  if (bounty.owner_id !== p_actor)
    throw new MoneyError("FORBIDDEN", "Only the bounty owner can confirm");
  if (!["critical", "major", "minor"].includes(p_severity))
    throw new MoneyError("BAD_SEVERITY", "Invalid severity");
  const severity = p_severity as Severity;
  if (bug.status === "confirmed") throw new MoneyError("ALREADY_CONFIRMED", "Already confirmed");

  let issue = bug.issue_id ? d.issues.find((i) => i.id === bug.issue_id) : undefined;
  if (!issue) {
    issue = {
      id: uid(),
      bounty_id: bounty.id,
      app_id: bounty.app_id,
      title: bug.title,
      merged_repro: bug.repro_steps,
      env_correlation: null,
      severity,
      first_finder_id: bug.tester_id,
      reporter_count: 1,
      status: "confirmed",
      is_public: false,
      created_at: bug.created_at,
    };
    d.issues.push(issue);
    bug.issue_id = issue.id;
  }

  const reports = d.bugReports
    .filter(
      (r) =>
        r.issue_id === issue!.id &&
        ["pending", "clustered", "confirmed"].includes(r.status)
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const first = reports[0];
  const payoutFull = bounty.severity_payouts[severity];
  const payoutConfirm = Math.floor(payoutFull * 0.2);
  const toPay: { report: BugReport; amount: number; first: boolean }[] = [];
  for (const r of reports) {
    if (r.status === "confirmed") continue;
    const firstFinder = r.id === first.id;
    toPay.push({
      report: r,
      amount: firstFinder ? payoutFull : payoutConfirm,
      first: firstFinder,
    });
  }
  const total = toPay.reduce((s, x) => s + x.amount, 0);
  const escrow = d.escrows.find((e) => e.id === bounty.escrow_id);
  if (!escrow) throw new MoneyError("NO_ESCROW", "Escrow missing");
  const remaining = escrow.amount_locked - escrow.amount_spent;
  if (total > remaining) {
    throw new MoneyError(
      "INSUFFICIENT_ESCROW",
      `Escrow shortfall ⬡${total - remaining}. Downgrade severity or top up.`
    );
  }

  for (const item of toPay) {
    const tw = walletOf(d, item.report.tester_id);
    writeLedger(d, {
      from_wallet: null,
      to_wallet: tw.id,
      amount: item.amount,
      type: item.first ? "ESCROW_RELEASE" : "CONFIRM_REWARD",
      ref_table: "bug_reports",
      ref_id: item.report.id,
      memo: item.first
        ? `First finder · ${severity} · ${bug.title}`
        : `Confirmation reward · ${severity}`,
    });
    item.report.status = "confirmed";
    item.report.final_severity = severity;
    item.report.payout = item.amount;
    item.report.is_first_finder = item.first;
    // Paying is what opens the report: the dev bought the body, repro steps and evidence.
    if (!item.report.unlocked_by.includes(p_actor)) item.report.unlocked_by.push(p_actor);
    applyTrust(d, item.report.tester_id, item.first ? 3 : 1, item.first ? "first_finder" : "confirmer", {
      table: "bug_reports",
      id: item.report.id,
    });
    const matched = item.report.proposed_severity === severity;
    if (matched) {
      applyTrust(d, item.report.tester_id, 2, "severity_matched", {
        table: "bug_reports",
        id: item.report.id,
      });
    }
    const order: Severity[] = ["minor", "major", "critical"];
    if (order.indexOf(item.report.proposed_severity) - order.indexOf(severity) > 1) {
      applyTrust(d, item.report.tester_id, -4, "severity_downgraded", {
        table: "bug_reports",
        id: item.report.id,
      });
    }
    onBugConfirmed(d, item.report.tester_id, bounty.app_id, severity, {
      firstFinder: item.first,
      severityMatched: matched,
    });
    publish({
      channel: "wallets",
      event: "UPDATE",
      row: { owner_id: item.report.tester_id, balance: tw.balance },
    });
    publish({
      channel: "toast",
      event: "PAYOUT",
      row: {
        owner_id: item.report.tester_id,
        amount: item.amount,
        memo: item.first ? "First finder payout" : "Confirmation reward",
      },
    });
  }
  escrow.amount_spent += total;
  issue.severity = severity;
  issue.status = "confirmed";
  issue.first_finder_id = first.tester_id;
  issue.reporter_count = reports.length;
  const ev = {
    id: uid(),
    type: "BUG_CONFIRMED" as const,
    actor_id: p_actor,
    app_id: bounty.app_id,
    bounty_id: bounty.id,
    issue_id: issue.id,
    payload: {
      title: issue.title,
      severity,
      handle: profile(d, first.tester_id).handle,
    },
    created_at: nowIso(),
  };
  d.events.push(ev);
  publish({ channel: "events", event: "INSERT", row: ev });
  publish({ channel: "bounties", event: "UPDATE", row: bounty });
  return { paid: total, remaining: escrow.amount_locked - escrow.amount_spent };
}

export function fn_reject_bug(
  d: DB,
  p_bug: string,
  p_reason: BugReport["reject_reason"],
  p_note: string,
  p_actor: string
) {
  const bug = d.bugReports.find((x) => x.id === p_bug);
  if (!bug) throw new MoneyError("NOT_FOUND", "Bug not found");
  const bounty = d.bounties.find((x) => x.id === bug.bounty_id)!;
  if (bounty.owner_id !== p_actor) throw new MoneyError("FORBIDDEN", "Not owner");
  const tester = profile(d, bug.tester_id);
  if (tester.trust_score >= TIER_TRUST[bounty.trust_tier] && !p_note?.trim()) {
    throw new MoneyError("REJECT_REASON_REQUIRED", "Written reason required for this tester");
  }
  bug.status = "rejected";
  bug.reject_reason = p_reason;
  bug.reject_note = p_note;
  if (p_reason === "not_a_bug") applyTrust(d, bug.tester_id, -2, "rejected_not_a_bug");
  return bug;
}

export function fn_expire_bounty(d: DB, p_bounty: string) {
  const b = d.bounties.find((x) => x.id === p_bounty);
  if (!b || b.status === "settled") return;
  const escrow = d.escrows.find((e) => e.id === b.escrow_id);
  if (escrow && escrow.status === "held") {
    const refund = escrow.amount_locked - escrow.amount_spent;
    const ownerW = d.wallets.find((w) => w.id === escrow.owner_wallet)!;
    if (refund > 0) {
      writeLedger(d, {
        from_wallet: null,
        to_wallet: ownerW.id,
        amount: refund,
        type: "REFUND",
        ref_table: "escrows",
        ref_id: escrow.id,
        memo: `Unspent escrow returned · ${b.title}`,
      });
      publish({
        channel: "wallets",
        event: "UPDATE",
        row: { owner_id: b.owner_id, balance: ownerW.balance },
      });
    }
    escrow.status = "refunded";
  }
  for (const c of d.claims.filter((c) => c.bounty_id === b.id && c.status === "active")) {
    c.status = "expired";
  }
  b.status = "settled";
  const ev = {
    id: uid(),
    type: "BOUNTY_EXPIRED" as const,
    actor_id: b.owner_id,
    app_id: b.app_id,
    bounty_id: b.id,
    issue_id: null,
    payload: { title: b.title },
    created_at: nowIso(),
  };
  d.events.push(ev);
  publish({ channel: "events", event: "INSERT", row: ev });
  publish({ channel: "bounties", event: "UPDATE", row: b });
}

export function fn_escalate_rewards(d: DB) {
  const raised: Bounty[] = [];
  for (const b of d.bounties) {
    if (!["live", "heating"].includes(b.status)) continue;
    if (b.slots_taken !== 0) continue;
    if (!b.step_amount || !b.step_interval_min) continue;
    if (b.reward_current >= b.reward_max) continue;
    const elapsed = Date.now() - new Date(b.last_step_at).getTime();
    if (elapsed < b.step_interval_min * 60_000) continue;
    b.reward_current = Math.min(b.reward_current + b.step_amount, b.reward_max);
    b.status = "heating";
    b.last_step_at = nowIso();
    const ev = {
      id: uid(),
      type: "REWARD_RAISED" as const,
      actor_id: b.owner_id,
      app_id: b.app_id,
      bounty_id: b.id,
      issue_id: null,
      payload: { reward_current: b.reward_current, title: b.title },
      created_at: nowIso(),
    };
    d.events.push(ev);
    publish({ channel: "events", event: "INSERT", row: ev });
    publish({ channel: "bounties", event: "UPDATE", row: b });
    raised.push(b);
  }
  return raised;
}

export function fn_redeem(d: DB, p_user: string, p_reward: string) {
  const reward = d.rewards.find((r) => r.id === p_reward);
  if (!reward || !reward.is_active) throw new MoneyError("NOT_FOUND", "Reward not found");
  if (reward.inventory <= 0) throw new MoneyError("SOLD_OUT", "Out of inventory");
  const w = walletOf(d, p_user);
  if (w.balance < reward.cost_coins)
    throw new MoneyError("INSUFFICIENT_BALANCE", "Not enough coins");
  writeLedger(d, {
    from_wallet: w.id,
    to_wallet: null,
    amount: reward.cost_coins,
    type: "REDEEM",
    ref_table: "rewards_catalog",
    ref_id: reward.id,
    memo: `Redeemed ${reward.title}`,
  });
  reward.inventory -= 1;
  const code = `${reward.kind.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const row = {
    id: uid(),
    user_id: p_user,
    reward_id: reward.id,
    coins_spent: reward.cost_coins,
    code,
    created_at: nowIso(),
  };
  d.redemptions.push(row);
  if (reward.kind === "pro") {
    const p = profile(d, p_user);
    p.is_pro = true;
    p.pro_until = nowIso(30 * 24 * 3600 * 1000);
  }
  publish({ channel: "wallets", event: "UPDATE", row: { owner_id: p_user, balance: w.balance } });
  return row;
}

export function fn_ship_release(
  d: DB,
  p_app: string,
  p_version: string,
  p_issue_ids: string[],
  p_actor: string,
  notes = ""
) {
  const app = d.apps.find((a) => a.id === p_app);
  if (!app || app.owner_id !== p_actor) throw new MoneyError("FORBIDDEN", "Not app owner");
  const credited = new Set<string>();
  for (const id of p_issue_ids) {
    const issue = d.issues.find((i) => i.id === id);
    if (!issue || issue.app_id !== p_app) continue;
    issue.status = "fixed";
    issue.is_public = true;
    for (const r of d.bugReports.filter((b) => b.issue_id === id)) credited.add(r.tester_id);
  }
  const ids = [...credited];
  const rel = {
    id: uid(),
    app_id: p_app,
    version: p_version,
    notes,
    issue_ids: p_issue_ids,
    credited_user_ids: ids,
    shipped_at: nowIso(),
  };
  d.releases.push(rel);
  for (const uid_ of ids) {
    applyTrust(d, uid_, 1, "fixed_in_prod", { table: "releases", id: rel.id });
    onShipped(d, uid_);
    d.badges.push({
      user_id: uid_,
      kind: "fixed_in_prod",
      app_id: p_app,
      created_at: nowIso(),
    });
  }
  const ev = {
    id: uid(),
    type: "SHIPPED" as const,
    actor_id: p_actor,
    app_id: p_app,
    bounty_id: null,
    issue_id: p_issue_ids[0] ?? null,
    payload: {
      version: p_version,
      credits: ids.map((i) => profile(d, i).handle),
      count: p_issue_ids.length,
    },
    created_at: nowIso(),
  };
  d.events.push(ev);
  publish({ channel: "events", event: "INSERT", row: ev });
  return rel;
}

export function fn_resolve_grievance(d: DB, p_grievance: string, p_uphold: boolean, p_admin: string) {
  const g = d.grievances.find((x) => x.id === p_grievance);
  if (!g) throw new MoneyError("NOT_FOUND", "Grievance not found");
  const bug = d.bugReports.find((b) => b.id === g.bug_report_id)!;
  const bounty = d.bounties.find((b) => b.id === bug.bounty_id)!;
  g.resolved_by = p_admin;
  g.resolved_at = nowIso();
  if (p_uphold) {
    g.status = "upheld";
    const escrow = d.escrows.find((e) => e.id === bounty.escrow_id)!;
    const amount = bounty.severity_payouts[bug.proposed_severity];
    const remaining = escrow.amount_locked - escrow.amount_spent;
    if (amount > remaining)
      throw new MoneyError("INSUFFICIENT_ESCROW", `Escrow shortfall ⬡${amount - remaining}`);
    const tw = walletOf(d, g.tester_id);
    writeLedger(d, {
      from_wallet: null,
      to_wallet: tw.id,
      amount,
      type: "FORCED_RELEASE",
      ref_table: "grievances",
      ref_id: g.id,
      memo: "Grievance upheld · forced payout",
    });
    escrow.amount_spent += amount;
    bug.status = "confirmed";
    bug.payout = amount;
    applyTrust(d, g.tester_id, 2, "grievance_upheld");
    const app = d.apps.find((a) => a.id === bounty.app_id)!;
    app.tester_rating = Math.max(1, Math.round((app.tester_rating - 0.2) * 10) / 10);
    publish({ channel: "wallets", event: "UPDATE", row: { owner_id: g.tester_id, balance: tw.balance } });
  } else {
    g.status = "denied";
    applyTrust(d, g.tester_id, -3, "grievance_denied");
  }
  return g;
}

export function expireClaims(d: DB) {
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  for (const c of d.claims) {
    if (c.status !== "active") continue;
    if (new Date(c.expires_at).getTime() > Date.now()) continue;
    c.status = "abandoned";
    const b = d.bounties.find((x) => x.id === c.bounty_id);
    if (b && b.slots_taken > 0 && ["live", "heating", "filled"].includes(b.status)) {
      b.slots_taken -= 1;
      if (b.status === "filled") b.status = "live";
      publish({ channel: "bounties", event: "UPDATE", row: b });
    }
    const abandons = d.claims.filter(
      (x) =>
        x.tester_id === c.tester_id &&
        x.status === "abandoned" &&
        new Date(x.claimed_at).getTime() >= weekAgo
    ).length;
    if (abandons >= 2) applyTrust(d, c.tester_id, -3, "second_abandonment_week");
  }
}

/**
 * Pays the bounty's base reward for a completed guided session. Escrow locks
 * slots x reward_max + bug_pool at post time; without this the per-slot portion could only
 * ever return to the dev as a refund, and a tester who found nothing earned nothing.
 */
export function fn_approve_session(d: DB, p_submission: string, p_actor: string) {
  const sub = d.submissions.find((s) => s.id === p_submission);
  if (!sub) throw new MoneyError("NOT_FOUND", "Submission not found");
  if (sub.status !== "submitted")
    throw new MoneyError("NOT_SUBMITTED", `Session is ${sub.status}`);
  const bounty = d.bounties.find((b) => b.id === sub.bounty_id);
  if (!bounty) throw new MoneyError("NOT_FOUND", "Bounty not found");
  if (bounty.owner_id !== p_actor)
    throw new MoneyError("FORBIDDEN", "Only the bounty owner can approve a session");

  const escrow = d.escrows.find((e) => e.id === bounty.escrow_id);
  if (!escrow) throw new MoneyError("NO_ESCROW", "Escrow missing");
  const amount = bounty.reward_current;
  const remaining = escrow.amount_locked - escrow.amount_spent;
  if (amount > remaining)
    throw new MoneyError("INSUFFICIENT_ESCROW", `Escrow shortfall \u2b21${amount - remaining}`);

  const tw = walletOf(d, sub.tester_id);
  writeLedger(d, {
    from_wallet: null,
    to_wallet: tw.id,
    amount,
    type: "ESCROW_RELEASE",
    ref_table: "submissions",
    ref_id: sub.id,
    memo: `Session approved \u00b7 ${bounty.title}`,
  });
  escrow.amount_spent += amount;
  sub.status = "reviewed";
  applyTrust(d, sub.tester_id, 2, "session_approved", { table: "submissions", id: sub.id });
  onSessionApproved(d, sub.tester_id);
  publish({ channel: "wallets", event: "UPDATE", row: { owner_id: sub.tester_id, balance: tw.balance } });
  publish({
    channel: "toast",
    event: "PAYOUT",
    row: { owner_id: sub.tester_id, amount, memo: "Session approved" },
  });
  publish({ channel: "submissions", event: "UPDATE", row: sub });
  return { paid: amount, remaining: escrow.amount_locked - escrow.amount_spent };
}

const PODIUM = [0.5, 0.3, 0.2];

/**
 * A bug hunt locks its prize pool the same way a bounty does. This is the part a Discord
 * server cannot do: the prize provably exists before anyone spends an evening hunting.
 */
export function fn_open_tournament(
  d: DB,
  actor: string,
  input: { app_id: string; title: string; prize_pool: number; hours: number }
) {
  if (!Number.isInteger(input.prize_pool) || input.prize_pool < 100)
    throw new MoneyError("BAD_POOL", "Prize pool must be at least \u2b21100");
  const app = d.apps.find((a) => a.id === input.app_id);
  if (!app) throw new MoneyError("NOT_FOUND", "App not found");
  const w = walletOf(d, actor);
  if (w.balance < input.prize_pool)
    throw new MoneyError(
      "INSUFFICIENT_BALANCE",
      `Need \u2b21${input.prize_pool} to lock the prize pool; available \u2b21${w.balance}`
    );

  const id = uid();
  const escrowId = uid();
  d.escrows.push({
    id: escrowId,
    bounty_id: id,
    owner_wallet: w.id,
    amount_locked: input.prize_pool,
    amount_spent: 0,
    status: "held",
  });
  writeLedger(d, {
    from_wallet: w.id,
    to_wallet: null,
    amount: input.prize_pool,
    type: "ESCROW_HOLD",
    ref_table: "escrows",
    ref_id: escrowId,
    memo: `Prize pool locked \u00b7 ${input.title}`,
  });
  const t: Tournament = {
    id,
    app_id: input.app_id,
    owner_id: actor,
    title: input.title,
    prize_pool: input.prize_pool,
    splits: PODIUM,
    escrow_id: escrowId,
    starts_at: nowIso(),
    ends_at: nowIso(input.hours * 3600_000),
    status: "live",
    created_at: nowIso(),
  };
  d.tournaments.push(t);
  publish({ channel: "tournaments", event: "INSERT", row: t });
  publish({ channel: "wallets", event: "UPDATE", row: { owner_id: actor, balance: w.balance } });
  return t;
}

const HUNT_POINTS: Record<Severity, number> = { critical: 100, major: 50, minor: 15 };

/** Confirmed bugs on the tournament's app, inside its window, severity- and first-finder-weighted. */
export function tournamentStandings(d: DB, t: Tournament) {
  const from = new Date(t.starts_at).getTime();
  const to = new Date(t.ends_at).getTime();
  const scores = new Map<string, { points: number; bugs: number; criticals: number }>();
  for (const b of d.bugReports) {
    if (b.status !== "confirmed" || !b.final_severity) continue;
    const bounty = d.bounties.find((x) => x.id === b.bounty_id);
    if (!bounty || bounty.app_id !== t.app_id) continue;
    const at = new Date(b.created_at).getTime();
    if (at < from || at > to) continue;
    const pts = Math.round(HUNT_POINTS[b.final_severity] * (b.is_first_finder ? 1 : 0.25));
    const cur = scores.get(b.tester_id) ?? { points: 0, bugs: 0, criticals: 0 };
    cur.points += pts;
    cur.bugs += 1;
    if (b.final_severity === "critical") cur.criticals += 1;
    scores.set(b.tester_id, cur);
  }
  const entrants = scores.size;
  return [...scores.entries()]
    .map(([user_id, v]) => {
      const p = d.profiles.find((x) => x.id === user_id);
      return {
        user_id,
        handle: p?.handle ?? "unknown",
        display_name: p?.display_name ?? "Unknown",
        avatar_url: p?.avatar_url ?? "",
        level: p?.level ?? 1,
        ...v,
      };
    })
    .sort((a, b) => b.points - a.points || b.criticals - a.criticals)
    .map((row, i) => ({ ...row, rank: i + 1, prize: prizeFor(t, i, entrants) }));
}

function prizeFor(t: Tournament, index: number, entrants: number) {
  if (index >= Math.min(3, entrants)) return 0;
  return Math.floor(t.prize_pool * t.splits[index]);
}

export function fn_settle_tournament(d: DB, p_tournament: string) {
  const t = d.tournaments.find((x) => x.id === p_tournament);
  if (!t) throw new MoneyError("NOT_FOUND", "Tournament not found");
  if (t.status === "settled") throw new MoneyError("ALREADY_SETTLED", "Already settled");
  const escrow = d.escrows.find((e) => e.id === t.escrow_id);
  if (!escrow) throw new MoneyError("NO_ESCROW", "Escrow missing");

  for (const row of tournamentStandings(d, t).slice(0, 3)) {
    if (row.prize <= 0) continue;
    const tw = walletOf(d, row.user_id);
    writeLedger(d, {
      from_wallet: null,
      to_wallet: tw.id,
      amount: row.prize,
      type: "TOURNAMENT_PRIZE",
      ref_table: "tournaments",
      ref_id: t.id,
      memo: `${t.title} \u00b7 rank ${row.rank}`,
    });
    escrow.amount_spent += row.prize;
    grantPodium(d, row.user_id, t.app_id);
    publish({ channel: "wallets", event: "UPDATE", row: { owner_id: row.user_id, balance: tw.balance } });
    publish({
      channel: "toast",
      event: "PAYOUT",
      row: { owner_id: row.user_id, amount: row.prize, memo: `${t.title} \u00b7 rank ${row.rank}` },
    });
  }

  // Unclaimed places return to the organiser: the pool never evaporates.
  const leftover = escrow.amount_locked - escrow.amount_spent;
  if (leftover > 0) {
    const ownerW = d.wallets.find((w) => w.id === escrow.owner_wallet)!;
    writeLedger(d, {
      from_wallet: null,
      to_wallet: ownerW.id,
      amount: leftover,
      type: "REFUND",
      ref_table: "escrows",
      ref_id: escrow.id,
      memo: `Unclaimed prize pool returned \u00b7 ${t.title}`,
    });
    escrow.amount_spent += leftover;
    publish({ channel: "wallets", event: "UPDATE", row: { owner_id: t.owner_id, balance: ownerW.balance } });
  }
  escrow.status = "settled";
  t.status = "settled";
  publish({ channel: "tournaments", event: "UPDATE", row: t });
  return t;
}

function grantPodium(d: DB, userId: string, appId: string) {
  if (d.badges.some((b) => b.user_id === userId && b.kind === "tournament_podium")) return;
  d.badges.push({
    user_id: userId,
    kind: "tournament_podium",
    app_id: appId,
    created_at: nowIso(),
  });
  publish({ channel: "toast", event: "ACHIEVEMENT", row: { owner_id: userId, kind: "tournament_podium" } });
}

export function conservation(d: DB) {
  const mint = d.ledger.filter((l) => l.type === "TOPUP").reduce((s, l) => s + l.amount, 0);
  const burn = d.ledger.filter((l) => l.type === "REDEEM").reduce((s, l) => s + l.amount, 0);
  const escrowHeld = d.escrows
    .filter((e) => e.status === "held")
    .reduce((s, e) => s + (e.amount_locked - e.amount_spent), 0);
  const walletSum = d.wallets.reduce((s, w) => s + w.balance, 0);
  return { mint, burn, escrowHeld, walletSum, ok: walletSum + escrowHeld === mint - burn };
}
