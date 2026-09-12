import { uid } from "./ids";
import {
  fn_claim_slot,
  fn_confirm_bug,
  fn_open_tournament,
  fn_post_bounty,
  fn_ship_release,
  fn_topup,
} from "./money";
import type { DB, DeviceProfile, Profile, Severity } from "./types";

const hours = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const android: DeviceProfile = {
  os: "Android",
  os_version: "14",
  device: "Pixel 7",
  ram_gb: 8,
  screen: "1080x2400",
  locale: "en-IN",
  browser: "Chrome 128",
};

const empty = (): DB => ({
  profiles: [],
  wallets: [],
  ledger: [],
  apps: [],
  testKits: [],
  bounties: [],
  escrows: [],
  claims: [],
  submissions: [],
  bugReports: [],
  issues: [],
  evidence: [],
  reproductions: [],
  follows: [],
  events: [],
  releases: [],
  grievances: [],
  rewards: [],
  redemptions: [],
  topups: [],
  trustEvents: [],
  badges: [],
  tournaments: [],
});

function addUser(
  d: DB,
  handle: string,
  name: string,
  trust: number,
  extra: Partial<Profile> = {}
) {
  const id = uid(`user-${handle}`);
  d.profiles.push({
    id,
    handle,
    display_name: name,
    email: `${handle}@testr.dev`,
    password: handle === "mira" ? "demo-dev" : handle === "ananya" ? "demo-tester" : "testr",
    avatar_url: `https://api.dicebear.com/9.x/initials/svg?seed=${handle}&backgroundColor=1a73e8&textColor=ffffff`,
    trust_score: trust,
    tier: trust >= 85 ? "expert" : trust >= 70 ? "trusted" : trust >= 40 ? "verified" : "open",
    xp: 0,
    level: 1,
    accuracy_streak: 0,
    best_streak: 0,
    device_profile: { ...android, device: extra.display_name ? `${name}'s phone` : android.device },
    interests: ["productivity", "fintech", "mobile"],
    is_pro: handle === "mira",
    pro_until: handle === "mira" ? hours(-24 * 20) : null,
    created_at: hours(800),
    ...extra,
  });
  d.wallets.push({ id: uid(`wallet-${handle}`), owner_id: id, balance: 0 });
  return id;
}

export function buildSeed(): DB {
  const d = empty();
  const names: [string, string, number][] = [
    ["mira", "Mira Shah", 68],
    ["ananya", "Ananya Iyer", 74],
    ["rohan", "Rohan Mehta", 91],
    ["kav", "Kavya Nair", 52],
    ["dev_s", "Dev Sen", 44],
    ["neel", "Neel Joshi", 33],
    ["priya", "Priya Rao", 81],
    ["arjun", "Arjun Kapoor", 22],
    ["isha", "Isha Bansal", 61],
    ["vikram", "Vikram Das", 88],
    ["sara", "Sara Khan", 47],
    ["adi", "Aditya Ghosh", 15],
    ["nisha", "Nisha Patel", 73],
    ["om", "Om Reddy", 39],
    ["tara", "Tara Gill", 56],
    ["yash", "Yash Jain", 64],
    ["meera", "Meera Kulkarni", 29],
    ["farah", "Farah Ali", 77],
    ["leo", "Leo D'Souza", 41],
    ["ria", "Ria Bose", 19],
    ["kunal", "Kunal Shah", 83],
    ["zara", "Zara Ahmed", 58],
    ["amit", "Amit Verma", 36],
    ["diya", "Diya Menon", 70],
    ["harsh", "Harsh Malhotra", 12],
  ];
  const ids: Record<string, string> = {};
  for (const [h, n, t] of names) ids[h] = addUser(d, h, n, t);

  const packs = ["pack-10000", "pack-3000", "pack-1200", "pack-500"] as const;
  for (const h of Object.keys(ids)) {
    fn_topup(d, ids[h], "pack-10000");
    fn_topup(d, ids[h], packs[h.length % 4]);
  }
  fn_topup(d, ids.mira, "pack-3000");

  const appDefs = [
    ["noteflow", "NoteFlow", "NoteFlow Labs", "Capture thoughts. Ship them.", "productivity", ["web", "apk"], true, "mira"],
    ["paytrack", "PayTrack", "Rohan", "Desktop expense intelligence.", "finance", ["desktop"], false, "rohan"],
    ["atlaschat", "AtlasChat", "Kavya", "Team chat that stays out of the way.", "communication", ["web", "ios"], true, "kav"],
    ["leafledger", "LeafLedger", "Priya", "Carbon accounting for small teams.", "climate", ["web"], false, "priya"],
    ["pulsefit", "PulseFit", "Vikram", "Workouts that adapt to your week.", "health", ["apk", "ios"], true, "vikram"],
    ["orbitdesk", "OrbitDesk", "Farah", "A calmer issue tracker.", "devtools", ["web", "desktop"], false, "farah"],
    ["kitemail", "KiteMail", "Nisha", "Inbox zero without the cult.", "productivity", ["web"], false, "nisha"],
    ["sandboxar", "SandboxAR", "Kunal", "AR mockups on a table.", "design", ["apk"], false, "kunal"],
    ["riverbank", "RiverBank", "Diya", "Kids' pocket-money ledger.", "finance", ["apk", "web"], true, "diya"],
    ["tinywiki", "TinyWiki", "Isha", "A wiki that fits in a tab.", "productivity", ["web"], false, "isha"],
    ["glowcart", "GlowCart", "Yash", "D2C storefronts in an afternoon.", "commerce", ["web", "apk"], false, "yash"],
    ["driftnotes", "DriftNotes", "Zara", "Voice notes that don't get lost.", "productivity", ["ios", "apk"], false, "zara"],
  ] as const;

  for (const [slug, name, , tagline, cat, platforms, verified, owner] of appDefs) {
    const id = uid(`app-${slug}`);
    d.apps.push({
      id,
      owner_id: ids[owner],
      name,
      slug,
      icon_url: `https://api.dicebear.com/9.x/shapes/svg?seed=${slug}&backgroundColor=e8f0fe`,
      tagline,
      category: cat,
      platforms: [...platforms],
      tester_rating: 4.2 + (slug.length % 8) / 10,
      is_verified: verified,
      created_at: hours(400 + slug.length),
    });
    d.testKits.push({
      id: uid(`kit-${slug}`),
      app_id: id,
      artifact_path: (platforms as readonly string[]).includes("apk") ? `builds/${slug}.apk` : null,
      external_url: `https://${slug}.example.app/beta`,
      instructions_md: `## ${name} Test Kit\n1. Open the beta link\n2. Sign in with tester credentials\n3. Do not use production data.`,
      instructions_file_path: null,
      credentials_encrypted: `tester+${slug}@testr.dev / Kit-${slug.slice(0, 4)}!`,
      created_at: hours(200),
    });
  }

  d.rewards.push(
    {
      id: uid("rw-bob1"),
      title: "BoB savings bonus 0.25%",
      description: "Quarter-point extra on a new BoB savings account.",
      partner: "Bank of Baroda",
      kind: "bob",
      cost_coins: 400,
      inventory: 40,
      image_url: "",
      is_active: true,
    },
    {
      id: uid("rw-bob2"),
      title: "BoB debit card annual fee waiver",
      description: "Waive the first-year fee on a BoB debit card.",
      partner: "Bank of Baroda",
      kind: "bob",
      cost_coins: 600,
      inventory: 20,
      image_url: "",
      is_active: true,
    },
    {
      id: uid("rw-nf"),
      title: "NoteFlow Pro — 3 months",
      description: "Full sync and OCR on NoteFlow.",
      partner: "NoteFlow",
      kind: "app",
      cost_coins: 250,
      inventory: 80,
      image_url: "",
      is_active: true,
    },
    {
      id: uid("rw-pt"),
      title: "PayTrack desktop license",
      description: "Lifetime seat for PayTrack desktop.",
      partner: "PayTrack",
      kind: "app",
      cost_coins: 350,
      inventory: 25,
      image_url: "",
      is_active: true,
    },
    {
      id: uid("rw-amz"),
      title: "Amazon.in ₹250 gift card",
      description: "Closed-loop partner gift card. Not cash.",
      partner: "Amazon",
      kind: "giftcard",
      cost_coins: 500,
      inventory: 15,
      image_url: "",
      is_active: true,
    },
    {
      id: uid("rw-flip"),
      title: "Flipkart ₹200 gift card",
      description: "Partner offer. Non-cash redeemable.",
      partner: "Flipkart",
      kind: "giftcard",
      cost_coins: 400,
      inventory: 18,
      image_url: "",
      is_active: true,
    },
    {
      id: uid("rw-pro"),
      title: "testr Pro — 1 month",
      description: "AI triage, private bounties, verified badge.",
      partner: "testr",
      kind: "pro",
      cost_coins: 499,
      inventory: 99,
      image_url: "",
      is_active: true,
    },
    {
      id: uid("rw-starbucks"),
      title: "Starbucks ₹300",
      description: "Partner beverage credit.",
      partner: "Starbucks",
      kind: "giftcard",
      cost_coins: 550,
      inventory: 12,
      image_url: "",
      is_active: true,
    },
    {
      id: uid("rw-atlas"),
      title: "AtlasChat Team — 2 months",
      description: "Discount on AtlasChat paid plan.",
      partner: "AtlasChat",
      kind: "app",
      cost_coins: 180,
      inventory: 40,
      image_url: "",
      is_active: true,
    },
    {
      id: uid("rw-pulse"),
      title: "PulseFit coach pack",
      description: "In-app coach credits.",
      partner: "PulseFit",
      kind: "app",
      cost_coins: 220,
      inventory: 30,
      image_url: "",
      is_active: true,
    },
    {
      id: uid("rw-bob3"),
      title: "BoB UPI cashback coupon",
      description: "Partner UPI offer. Not a cash-out.",
      partner: "Bank of Baroda",
      kind: "bob",
      cost_coins: 150,
      inventory: 60,
      image_url: "",
      is_active: true,
    },
    {
      id: uid("rw-pro3"),
      title: "testr Pro — 3 months",
      description: "Quarter of Pro billed in coins.",
      partner: "testr",
      kind: "pro",
      cost_coins: 1299,
      inventory: 20,
      image_url: "",
      is_active: true,
    }
  );

  const app = (slug: string) => d.apps.find((a) => a.slug === slug)!;
  const sev = { critical: 400, major: 200, minor: 60 };

  const bountySpecs: {
    slug: string;
    title: string;
    mode: "guided" | "open" | "both";
    tier: "open" | "verified" | "trusted" | "expert";
    slots: number;
    start: number;
    max: number;
    pool: number;
    hoursLeft: number;
    heating?: boolean;
    demo?: boolean;
    script?: string[];
  }[] = [
    {
      slug: "noteflow",
      title: "NoteFlow Android share-sheet crash",
      mode: "both",
      tier: "verified",
      slots: 5,
      start: 80,
      max: 140,
      pool: 400,
      hoursLeft: 18,
      demo: true,
      script: [
        "Install the beta APK and sign in with kit credentials.",
        "Create a note with a checklist of 12 items and a photo.",
        "Share the note to WhatsApp via the Android share sheet.",
        "Force-kill and reopen. Confirm the note still has the photo.",
      ],
    },
    {
      slug: "noteflow",
      title: "Web editor undo stack",
      mode: "guided",
      tier: "open",
      slots: 8,
      start: 40,
      max: 80,
      pool: 0,
      hoursLeft: 40,
      script: ["Open web editor", "Type 3 paragraphs", "Undo 20 times", "Redo"],
    },
    {
      slug: "paytrack",
      title: "CSV import of 10k rows",
      mode: "open",
      tier: "trusted",
      slots: 4,
      start: 120,
      max: 200,
      pool: 800,
      hoursLeft: 10,
      heating: true,
    },
    { slug: "atlaschat", title: "Emoji reactions on threads", mode: "guided", tier: "open", slots: 6, start: 30, max: 50, pool: 0, hoursLeft: 28 },
    { slug: "leafledger", title: "Scope-3 estimate edge cases", mode: "both", tier: "expert", slots: 3, start: 220, max: 320, pool: 600, hoursLeft: 50 },
    { slug: "pulsefit", title: "Heart-rate pairing on Pixel", mode: "guided", tier: "verified", slots: 5, start: 70, max: 110, pool: 0, hoursLeft: 12, heating: true },
    { slug: "orbitdesk", title: "Keyboard-only triage", mode: "open", tier: "trusted", slots: 4, start: 100, max: 160, pool: 500, hoursLeft: 22 },
    { slug: "kitemail", title: "Offline send queue", mode: "both", tier: "open", slots: 7, start: 25, max: 60, pool: 200, hoursLeft: 8 },
    { slug: "sandboxar", title: "Low-light plane detect", mode: "guided", tier: "verified", slots: 4, start: 90, max: 140, pool: 0, hoursLeft: 33 },
    { slug: "riverbank", title: "Allowance calendar DST", mode: "open", tier: "open", slots: 6, start: 35, max: 70, pool: 240, hoursLeft: 16 },
    { slug: "tinywiki", title: "Markdown table paste", mode: "guided", tier: "open", slots: 5, start: 20, max: 40, pool: 0, hoursLeft: 60 },
    { slug: "glowcart", title: "UPI intent on mid-range Androids", mode: "both", tier: "verified", slots: 6, start: 80, max: 150, pool: 500, hoursLeft: 9, heating: true },
    { slug: "driftnotes", title: "Background dictation dropouts", mode: "open", tier: "trusted", slots: 3, start: 110, max: 180, pool: 400, hoursLeft: 27 },
    { slug: "paytrack", title: "Recurring split bills", mode: "guided", tier: "open", slots: 5, start: 45, max: 90, pool: 0, hoursLeft: 44 },
    { slug: "atlaschat", title: "Guest link expiry", mode: "open", tier: "verified", slots: 4, start: 60, max: 100, pool: 300, hoursLeft: 14 },
    { slug: "pulsefit", title: "Fasted-run GPS drift", mode: "both", tier: "expert", slots: 3, start: 200, max: 280, pool: 700, hoursLeft: 36 },
    { slug: "orbitdesk", title: "CSV export of comments", mode: "guided", tier: "open", slots: 8, start: 25, max: 55, pool: 0, hoursLeft: 70 },
    { slug: "kitemail", title: "Snooze across timezones", mode: "open", tier: "trusted", slots: 4, start: 130, max: 190, pool: 450, hoursLeft: 11 },
    { slug: "glowcart", title: "COD order edits", mode: "guided", tier: "verified", slots: 5, start: 75, max: 120, pool: 0, hoursLeft: 20 },
    { slug: "tinywiki", title: "Public vs private pages", mode: "both", tier: "open", slots: 6, start: 30, max: 70, pool: 180, hoursLeft: 5 },
  ];

  const testers = ["ananya", "rohan", "kav", "dev_s", "neel", "priya", "isha", "sara", "nisha", "tara", "yash", "farah", "leo", "kunal", "zara", "diya"];
  let demoBountyId = "";

  bountySpecs.forEach((spec, i) => {
    const a = app(spec.slug);
    let b;
    try {
      b = fn_post_bounty(d, a.owner_id, {
      app_id: a.id,
      title: spec.title,
      description: `Find regressions in ${spec.title.toLowerCase()}. Out of scope: visual polish unless it blocks a flow.`,
      mode: spec.mode,
      script: (spec.script ?? ["Open the app", "Complete the primary flow", "Check logs", "Report anything unexpected"]).map(
        (instruction, order) => ({ order: order + 1, instruction })
      ),
      focus_tags: spec.title.split(" ").slice(0, 3),
      out_of_scope: ["Copy tweaks", "Brand colors"],
      requirements: {
        platforms: a.platforms,
        os: a.platforms.includes("apk") ? "Android" : a.platforms.includes("ios") ? "iOS" : "Web",
        ram_gb: spec.tier === "expert" ? 8 : 4,
        locales: ["en-IN"],
      },
      trust_tier: spec.tier,
      slots: spec.slots,
      reward_start: spec.start,
      reward_max: spec.max,
      step_amount: spec.heating ? 10 : 20,
      step_interval_min: spec.heating ? 1 : 30,
      bug_pool: spec.pool,
      severity_payouts: sev,
      expires_at: hours(-spec.hoursLeft),
      is_private: false,
    });
    b.created_at = hours(70 - i);
    if (spec.heating) {
      b.status = "heating";
      b.reward_current = spec.start + (spec.heating ? 10 : 20) * 2;
      b.last_step_at = hours(0.02);
    }
    if (spec.demo) demoBountyId = b.id;

    const take = spec.demo ? 4 : Math.min(spec.slots - (i % 3 === 0 ? 1 : 0), 4);
    const claimants = testers
      .filter((h) => ids[h] !== a.owner_id && !(spec.demo && h === "ananya"))
      .slice(i % 5, i % 5 + take);
    for (const h of claimants) {
      try {
        const claim = fn_claim_slot(d, b.id, ids[h]);
        claim.claimed_at = hours(20 - (i % 12));
        if (!spec.demo) {
          const sub = d.submissions.find((s) => s.claim_id === claim.id)!;
          sub.status = "submitted";
          sub.submitted_at = hours(12 - (i % 8));
          sub.time_on_task_sec = 900 + i * 40;
          sub.step_notes = sub.step_notes.map((n) => ({
            ...n,
            note: n.step_order === 1 ? "Installed fine." : "Saw a hitch here.",
          }));
          claim.status = "submitted";
        }
      } catch {
        /* trust/device skip */
      }
    }
    } catch {
      /* skip underfunded bounty */
    }
  });

  const titles: [string, Severity, string][] = [
    ["Share sheet crashes on Pixel 7", "critical", "Chooser closes and NoteFlow force-stops."],
    ["Share sheet crash after photo attach", "critical", "Same crash once a photo is on the note."],
    ["Crash when sharing checklist", "critical", "Stack overflow in ShareCompat."],
    ["Undo deletes the photo", "major", "Ctrl+Z removes the image without a confirm."],
    ["Undo drops attachments", "major", "Image gone after 3 undos."],
    ["Sync conflict duplicates notes", "major", "Two copies after airplane mode."],
    ["Contrast on checklist ticks", "minor", "Ticks disappear in dark theme."],
    ["Haptic missing on drag", "minor", "No feedback when reordering."],
    ["CSV import hangs at 9,800 rows", "critical", "UI freezes, no progress."],
    ["CSV header mapping off-by-one", "major", "Last column dropped."],
    ["Split bill rounding", "minor", "Paise leftover on 3-way split."],
    ["Reaction picker clipped", "major", "Bottom row unreachable on iPhone SE."],
    ["Thread mark-unread fails", "minor", "Still shows as read."],
    ["Scope-3 NaN on empty vendor", "critical", "Dashboard whitescreens."],
    ["HRM disconnect after 12 min", "major", "Pixel Watch drops."],
    ["GPS drift in flyovers", "major", "Route jumps 400m."],
    ["Keyboard trap in filter chip", "minor", "Tab skips the clear button."],
    ["Offline send never flushes", "critical", "Queued mail stuck."],
    ["AR plane lost under 50 lux", "major", "Tracking dies in a bedroom."],
    ["DST double-pays allowance", "critical", "Two credits on the DST night."],
    ["Table paste strips alignment", "minor", "Markdown tables flatten."],
    ["UPI intent fails on Go 6", "critical", "Returns RESULT_CANCELED."],
    ["Dictation cuts after lock", "major", "Last 8 seconds missing."],
    ["Guest link lives past expiry", "critical", "Still 200 after TTL."],
    ["COD edit resets coupon", "major", "Discount vanishes."],
  ];

  const submitted = d.submissions.filter((s) => s.status === "submitted");
  titles.forEach((t, i) => {
    const sub = submitted[i % Math.max(1, submitted.length)];
    if (!sub) return;
    const id = uid(`bug-${i}`);
    d.bugReports.push({
      id,
      submission_id: sub.id,
      bounty_id: sub.bounty_id,
      tester_id: sub.tester_id,
      issue_id: null,
      title: t[0],
      body: t[2],
      repro_steps: ["Open the build", "Repeat the flow twice", "Watch for the failure"],
      proposed_severity: t[1],
      final_severity: null,
      is_first_finder: false,
      unlocked_by: [],
      status: "pending",
      reject_reason: null,
      reject_note: null,
      payout: 0,
      created_at: hours(10 - (i % 9)),
      console_logs: t[1] === "critical"
        ? [{ t: Date.now(), level: "error" as const, message: "Uncaught TypeError: Chooser closed unexpectedly" }]
        : [],
    });
    d.evidence.push({
      id: uid(`ev-${i}`),
      bug_report_id: id,
      submission_id: sub.id,
      storage_path: `/evidence/mock-${i}.png`,
      kind: "image",
      meta: { w: 1080, h: 1920 },
      created_at: hours(10),
    });
  });

  const groups = [
    [0, 1, 2],
    [3, 4],
    [5],
    [8, 9],
    [13],
    [17],
    [19],
    [21],
    [23],
  ];
  groups.forEach((idxs, gi) => {
    const reports = idxs.map((i) => d.bugReports[i]).filter(Boolean);
    if (!reports.length) return;
    const first = reports[0];
    const bounty = d.bounties.find((b) => b.id === first.bounty_id)!;
    const issue = {
      id: uid(`issue-${gi}`),
      bounty_id: first.bounty_id,
      app_id: bounty.app_id,
      title: first.title,
      merged_repro: first.repro_steps,
      env_correlation: reports.length > 1 ? "Seen only on Android 14 · 8GB RAM devices." : null,
      severity: first.proposed_severity,
      first_finder_id: first.tester_id,
      reporter_count: reports.length,
      status: "open" as const,
      is_public: false,
      created_at: first.created_at,
    };
    d.issues.push(issue);
    for (const r of reports) {
      r.issue_id = issue.id;
      r.status = "clustered";
    }
  });

  const confirmable = d.issues.filter((i) => i.reporter_count >= 1).slice(0, 8);
  for (const issue of confirmable) {
    const r = d.bugReports.find((b) => b.issue_id === issue.id);
    if (!r) continue;
    const bounty = d.bounties.find((b) => b.id === r.bounty_id)!;
    try {
      fn_confirm_bug(d, r.id, issue.severity, bounty.owner_id);
    } catch {
      /* escrow floors */
    }
  }

  const nf = app("noteflow");
  const fixed = d.issues.filter((i) => i.app_id === nf.id && i.status === "confirmed").slice(0, 2);
  if (fixed.length) {
    fn_ship_release(
      d,
      nf.id,
      "1.2.0",
      fixed.map((i) => i.id),
      nf.owner_id,
      "Share-sheet crash and undo-photo fixes from testr."
    );
  }
  const pt = app("paytrack");
  const ptIssues = d.issues.filter((i) => i.app_id === pt.id && i.status === "confirmed").slice(0, 1);
  if (ptIssues.length) {
    fn_ship_release(d, pt.id, "0.9.4", ptIssues.map((i) => i.id), pt.owner_id, "CSV import watchdog.");
  }
  const rb = app("riverbank");
  const rbIssues = d.issues.filter((i) => i.app_id === rb.id && i.status === "confirmed").slice(0, 1);
  if (rbIssues.length) {
    fn_ship_release(d, rb.id, "2.0.1", rbIssues.map((i) => i.id), rb.owner_id, "DST allowance guard.");
  }

  for (const h of testers.slice(0, 14)) {
    d.follows.push({
      user_id: ids[h],
      app_id: nf.id,
      created_at: hours(30),
    });
  }

  const demo = d.bounties.find((b) => b.id === demoBountyId);
  if (demo) {
    const existingSubs = d.submissions.filter((s) => s.bounty_id === demo.id && s.status === "submitted");
    const need = Math.max(0, 6 - existingSubs.length);
    const extraTesters = testers.filter(
      (h) =>
        h !== "ananya" &&
        !d.claims.some((c) => c.bounty_id === demo.id && c.tester_id === ids[h]) &&
        ids[h] !== demo.owner_id
    );
    for (let i = 0; i < need && i < extraTesters.length; i++) {
      try {
        if (demo.slots_taken >= demo.slots - 1) break;
        const claim = fn_claim_slot(d, demo.id, ids[extraTesters[i]]);
        const sub = d.submissions.find((s) => s.claim_id === claim.id)!;
        sub.status = "submitted";
        sub.submitted_at = hours(6 - i);
        sub.time_on_task_sec = 1200;
        claim.status = "submitted";
        const variants: [string, Severity][] = [
          ["Share sheet crashes on Pixel 7", "critical"],
          ["Chooser ANR while sharing", "critical"],
          ["Undo deletes the photo", "major"],
          ["Dark mode tick contrast", "minor"],
          ["Note duplicates after airplane mode", "major"],
          ["Share fails with no photo", "major"],
        ];
        const v = variants[i % variants.length];
        d.bugReports.push({
          id: uid(`demo-bug-${i}`),
          submission_id: sub.id,
          bounty_id: demo.id,
          tester_id: sub.tester_id,
          issue_id: null,
          title: v[0],
          body: "Captured during guided run.",
          repro_steps: ["Open note", "Share", "Observe"],
          proposed_severity: v[1],
          final_severity: null,
          is_first_finder: false,
          unlocked_by: [],
          status: "pending",
          reject_reason: null,
          reject_note: null,
          payout: 0,
          created_at: hours(5 - i),
          console_logs: [{ t: Date.now(), level: "error" as const, message: "ShareCompat: stack overflow in chooser" }],
        });
      } catch {
        /* skip */
      }
    }
    demo.slots_taken = Math.min(4, demo.slots - 1);
    demo.status = "live";
    demo.slots = 5;
  }

  for (const ev of d.events) {
    if (new Date(ev.created_at).getTime() > Date.now() - 1000) {
      ev.created_at = hours(Math.random() * 48);
    }
  }
  d.events.sort((a, b) => b.created_at.localeCompare(a.created_at));

  const hunt = app("glowcart");
  fn_topup(d, hunt.owner_id, "pack-3000");
  fn_open_tournament(d, hunt.owner_id, {
    app_id: hunt.id,
    title: "GlowCart Checkout Hunt",
    prize_pool: 2500,
    hours: 34,
  });
  const live = d.tournaments[d.tournaments.length - 1];
  live.starts_at = hours(14);

  return d;
}

export const DEMO = {
  dev: { email: "mira@testr.dev", password: "demo-dev", handle: "mira" },
  tester: { email: "ananya@testr.dev", password: "demo-tester", handle: "ananya" },
};
