# testr

A social software-testing marketplace with its own coin economy. One account, one wallet: earn coins finding bugs, spend the same coins getting your own app tested.

Google Material 3 UI. Escrow locks at `reward_max`. Every balance change writes a ledger row. Bank of Baroda is a **mocked coin-purchase surface only** — not the escrow custodian.

## Run locally

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local   # optional - everything works without keys
npm run build
npm start
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). For development with hot reload use `npm run dev` instead (same port, slower first load per page).

Demo data is seeded automatically into `data/store.json` on first run. Visit `/dev/reset` any time to restore it.

## Demo logins (HackBattle, two windows)

Reset first: visit `/dev/reset` or `POST /api/dev/reset`.

| Window | Role | Email | Password |
|---|---|---|---|
| A | Developer (NoteFlow, Pro, triage) | `mira@testr.dev` | `demo-dev` |
| B | Tester (trust 74, matching Android device) | `ananya@testr.dev` | `demo-tester` |

### Three-minute script

1. **A+B** — public feed is the landing page. Look for a heating bounty.
2. **A** — Wallet → Add coins → mocked Bank of Baroda sheet → balance springs up.
3. **A** — Post a bounty. Escrow locks. **B** sees the card appear live (SSE).
4. **B** — Claim NoteFlow’s last slot. The **Test Kit** pane gives the build link, run instructions and test credentials; B runs it on their own device, walks the script, attaches a screenshot and pastes the console output, then submits.
5. **A** — Dashboard → bounty triage. Reports arrive **sealed**: A sees the title, severity and B’s reputation, but not the write-up. Confirm as Major to pay from escrow — the report unlocks and **B** gets a payout toast. Approve the session separately to pay the base reward.
6. **A** — Ship a release. Bug details unlock on the app page.
7. **B** — Wallet → Redeem a coupon.

## Test workspace

`/test/[claimId]` is a split view: **Test Kit** on the left (build link, install instructions, revealed credentials, your captured environment), report tool on the right. The tester runs the real build on their own device — there is no emulator and no iframe, because neither works against an app you do not control.

Evidence is a screenshot upload plus pasted console/logcat output, which is parsed into levelled log lines and stored on the bug report.

## Pay to unlock

A bug report is **sealed** until the dev pays out on it. Before paying, the bounty owner sees the title, the proposed severity, the evidence count, and the reporter's **trust, level, accuracy streak and badges** — nothing else. Paying releases the payout from escrow and unlocks the write-up, repro steps and screenshots.

The redaction is server-side (`bugForViewer` in `src/lib/queries.ts`); the sealed body is never sent to the browser. Reputation is therefore the only thing a dev can underwrite the decision with, which is what makes the progression system load-bearing rather than decorative.

## Game layer

- **XP and levels** are separate from trust, so progression never moves the economic gate. Level 5+ hunters see new bounties ten minutes before the open feed.
- **Achievements** (First blood, Critical hitter, Polyglot, Perfect score, Podium, Fixed in prod) fire off real ledger events.
- **Accuracy streak** counts consecutive severity calls the dev accepted unchanged — it rewards honest severity proposals, which is the behaviour the economy needs.
- **Bug hunts** (`/tournaments`) are time-boxed events whose prize pool is locked in escrow at open time, scored severity-weighted with a 50/30/20 podium. Settling pays the podium and refunds anything unclaimed.

## Money rules

- Coins are whole integers. No floats.
- `TOPUP` mints, `REDEEM` burns. Escrow is internal.
- `POST /api/wallet/topup` waits ~3s and calls `fn_topup`. There is no BoB gateway.
- Conservation: `wallet balances + remaining escrow = topups − redemptions`.
- XP, levels, streaks and badges never move coins — only escrow does.

```bash
npm test
```

## API

All routes return `{ data }` or `{ error: { code, message } }`.

Feed, apps, bounties, claim, kit, submissions, session approve, dashboard, triage, confirm/reject, wallet, topup, rewards, follows, profile, upload, leaderboard, tournaments, AI cluster (402 if not Pro), grievances, releases, realtime SSE at `GET /api/realtime`.

Cron: `GET /api/cron/tick` every 5 minutes once the project is claimed on Vercel (add a cron in project settings pointing at that path). Locally you can hit it by hand.

## Supabase

SQL lives in `supabase/migrations/`. The hackathon runtime uses the TypeScript ledger in `src/lib/money.ts` plus a JSON store so the demo works without credentials. Point `NEXT_PUBLIC_SUPABASE_*` at a project when you are ready to cut over; clients are in `src/lib/supabase/`.

## Stack

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Motion · Zod · optional Supabase / Claude.
