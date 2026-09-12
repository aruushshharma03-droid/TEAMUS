"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/shell";
import { api, Coin } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useRealtime } from "@/lib/use-realtime";
import { ReputationBlock, type Reporter } from "@/components/reputation";
import { Lock, Unlock } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Severity } from "@/lib/types";

type Report = {
  id: string;
  handle?: string;
  proposed_severity: Severity;
  title: string;
  status: string;
  locked: boolean;
  body: string | null;
  repro_steps: string[];
  console_logs: { level: string; message: string }[];
  evidence_count: number;
  log_count: number;
  error_count: number;
  unlock_cost: number;
  reporter: Reporter | null;
};

type Issue = {
  id: string;
  title: string;
  severity: Severity;
  reporter_count: number;
  first_finder?: string;
  created_at: string;
  merged_repro: string[];
  env_correlation: string | null;
  dist: Record<Severity, number>;
  payoutFull: number;
  confirmPay: number;
  total: number;
  remaining: number;
  overdraw: boolean;
  status: string;
  reports: Report[];
};

type Submission = {
  id: string;
  tester?: { handle: string; display_name: string; avatar_url: string; level: number; trust_score: number; accuracy_streak: number };
  time_on_task_sec: number;
  status: string;
  base_reward: number;
  bugs: Report[];
};

type Data = {
  bounty: { id: string; title: string; slots: number; slots_taken: number; status: string; expires_at: string; app_id: string };
  app: { name: string; id: string };
  escrow: { amount_locked: number; amount_spent: number };
  submissions: Submission[];
  issues: Issue[];
  unclustered: number;
};

export default function TriagePage({ params }: { params: Promise<{ bountyId: string }> }) {
  const { bountyId } = use(params);
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"issues" | "subs">("issues");
  const [sel, setSel] = useState<string | null>(null);
  const [sev, setSev] = useState<Severity>("major");
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState<"not_reproducible" | "out_of_scope" | "already_known" | "not_a_bug">("not_reproducible");
  const [note, setNote] = useState("");
  const [ship, setShip] = useState(false);
  const [version, setVersion] = useState("1.3.0");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [proLock, setProLock] = useState<{ submissions: number; would_cluster: number } | null>(null);

  const load = useCallback(async () => {
    setData(await api<Data>(`/api/triage/${bountyId}`));
    try {
      await api("/api/ai/cluster", { method: "POST", body: JSON.stringify({ bounty_id: bountyId }) });
      setData(await api<Data>(`/api/triage/${bountyId}`));
      setProLock(null);
    } catch (e) {
      const extra = e as Error & { extra?: { submissions?: number; would_cluster?: number; code?: string } };
      if (extra.extra?.code === "PRO_REQUIRED" || extra.message.includes("Pro")) {
        setProLock({
          submissions: extra.extra?.submissions ?? 7,
          would_cluster: extra.extra?.would_cluster ?? 4,
        });
      }
    }
  }, [bountyId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(
    useCallback(
      (msg: Record<string, unknown>) => {
        if (msg.channel === "submissions" || msg.channel === "bounties") load();
      },
      [load]
    )
  );

  // Falls back to the first issue so nothing has to be selected during load.
  const issue = data?.issues.find((i) => i.id === sel) ?? data?.issues[0];

  const act = async (fn: () => Promise<unknown>) => {
    setErr(null);
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      {!data ? (
        <p className="p-8 text-muted-foreground">Loading inbox…</p>
      ) : (
        <>
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{data.app.name}</p>
              <h1 className="text-[20px] font-medium">{data.bounty.title}</h1>
              <p className="text-sm text-muted-foreground">
                {data.bounty.status} · {data.bounty.slots_taken}/{data.bounty.slots} slots
              </p>
            </div>
            <Button className="h-10 rounded-full" onClick={() => setShip(true)}>
              Ship a release
            </Button>
          </header>

          <div className="mt-4">
            <p className="text-xs text-muted-foreground">
              ⬡{data.escrow.amount_spent} paid of ⬡{data.escrow.amount_locked} locked · ⬡
              {data.escrow.amount_locked - data.escrow.amount_spent} returns on expiry
            </p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width] duration-500"
                style={{ width: `${(100 * data.escrow.amount_spent) / Math.max(1, data.escrow.amount_locked)}%` }}
              />
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              className={`h-8 rounded-full px-3 text-sm ${tab === "issues" ? "bg-primary-container text-primary" : "border"}`}
              onClick={() => setTab("issues")}
            >
              Issues (AI)
            </button>
            <button
              className={`h-8 rounded-full px-3 text-sm ${tab === "subs" ? "bg-primary-container text-primary" : "border"}`}
              onClick={() => setTab("subs")}
            >
              Sessions ({data.submissions.length})
            </button>
          </div>

          {err && <p className="mt-3 text-sm text-critical">{err}</p>}

          {tab === "issues" && (
            <div className="relative mt-4 grid gap-4 md:grid-cols-[280px_1fr]">
              {proLock && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-sm">
                  <div className="m3-card max-w-sm p-6 text-center">
                    <p className="font-medium">
                      AI would group these {proLock.submissions} submissions into {proLock.would_cluster} issues,
                      merge duplicates, and correlate environments
                    </p>
                    <Button className="mt-4 h-10 rounded-full">Upgrade to Pro ⬥ · ₹499/mo</Button>
                  </div>
                </div>
              )}
              <div className={proLock ? "blur-sm" : ""}>
                <p className="mb-2 text-xs text-muted-foreground">
                  grouped {data.submissions.length} submissions into {data.issues.length} issues
                </p>
                {data.issues.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => {
                      setSel(i.id);
                      setSev(i.severity);
                    }}
                    className={`mb-2 w-full rounded-lg border p-3 text-left ${sel === i.id ? "bg-muted" : ""}`}
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor:
                        i.severity === "critical" ? "#d93025" : i.severity === "major" ? "#f29900" : "#5f6368",
                    }}
                  >
                    <p className="text-sm font-medium">{i.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.reporter_count} testers · @{i.first_finder} · {i.status === "confirmed" ? "paid" : "sealed"}
                    </p>
                  </button>
                ))}
              </div>

              {issue && (
                <div className={proLock ? "blur-sm" : ""}>
                  <h2 className="text-[20px] font-medium">{issue.title}</h2>
                  <p className="mt-2 text-xs">Proposed severity</p>
                  <div className="mt-1 flex gap-3 text-xs">
                    {(["critical", "major", "minor"] as Severity[]).map((s) => (
                      <span key={s}>
                        {issue.dist[s]} {s}
                        <span className="ml-1 inline-block h-2 w-16 bg-muted">
                          <span
                            className="block h-2 bg-primary"
                            style={{ width: `${(100 * issue.dist[s]) / Math.max(1, issue.reporter_count)}%` }}
                          />
                        </span>
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 text-sm font-medium">Your call</p>
                  <div className="mt-1 flex gap-2">
                    {(["critical", "major", "minor"] as Severity[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSev(s)}
                        className={`h-8 rounded-full border px-3 text-xs ${sev === s ? "bg-primary-container text-primary" : ""}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <table className="mt-4 w-full text-sm">
                    <tbody>
                      <tr>
                        <td>First finder @{issue.first_finder}</td>
                        <td className="text-right">
                          <Coin n={issue.payoutFull} />
                        </td>
                      </tr>
                      <tr>
                        <td>Confirmers ×{Math.max(0, issue.reporter_count - 1)} · 20%</td>
                        <td className="text-right">
                          <Coin n={issue.confirmPay * Math.max(0, issue.reporter_count - 1)} />
                        </td>
                      </tr>
                      <tr className={issue.overdraw ? "text-critical" : ""}>
                        <td>Total / remaining escrow</td>
                        <td className="text-right font-num">
                          ⬡{issue.total} / ⬡{issue.remaining}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {issue.overdraw && (
                    <p className="text-sm text-critical">Would overdraw escrow. Downgrade or top up.</p>
                  )}

                  <div className="m3-card mt-4 p-4">
                    <p className="text-xs font-medium">AI merged reproduction</p>
                    <ol className="mt-2 list-decimal pl-4 text-sm">
                      {issue.merged_repro.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                    {issue.env_correlation && (
                      <p className="mt-2 text-xs text-muted-foreground">{issue.env_correlation}</p>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    {issue.reports.map((r) => (
                      <ReportCard key={r.id} r={r} />
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      className="h-10 rounded-full"
                      disabled={busy || issue.overdraw}
                      onClick={() =>
                        act(async () => {
                          const first = issue.reports.find((r) => r.status !== "confirmed") ?? issue.reports[0];
                          await api(`/api/bugs/${first.id}/confirm`, {
                            method: "POST",
                            body: JSON.stringify({ severity: sev }),
                          });
                        })
                      }
                    >
                      {issue.reports.some((r) => r.locked)
                        ? `Break the seal · pay ⬡${issue.total}`
                        : `Confirm & pay ⬡${issue.total}`}
                    </Button>
                    <Button variant="outline" className="h-10 rounded-full" onClick={() => setReject(true)}>
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "subs" && (
            <ul className="mt-4 space-y-3">
              {data.submissions.length === 0 && (
                <li className="m3-card p-6 text-center text-sm text-muted-foreground">
                  No sessions submitted yet.
                </li>
              )}
              {data.submissions.map((s) => (
                <li key={s.id} className="m3-card p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {s.tester?.display_name}{" "}
                        <span className="text-muted-foreground">@{s.tester?.handle}</span>
                      </p>
                      <p className="font-num text-xs text-muted-foreground">
                        Lv{s.tester?.level} · trust {s.tester?.trust_score} ·{" "}
                        {Math.round(s.time_on_task_sec / 60)}m on task · {s.bugs.length} bugs · {s.status}
                      </p>
                    </div>
                    <div className="ml-auto">
                      {s.status === "reviewed" ? (
                        <span className="rounded-full bg-success/10 px-3 py-1 text-xs text-success">
                          Base reward paid
                        </span>
                      ) : (
                        <Button
                          className="h-10 rounded-full"
                          disabled={busy}
                          onClick={() =>
                            act(() => api(`/api/submissions/${s.id}/approve`, { method: "POST" }))
                          }
                        >
                          Approve session · pay ⬡{s.base_reward}
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    The base reward pays for the run itself. Bug payouts are separate, and each
                    report unlocks when you pay it.
                  </p>
                </li>
              ))}
            </ul>
          )}

          {reject && issue && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(32,33,36,.6)] p-4">
              <div className="w-full max-w-md rounded-lg bg-background p-6">
                <h2 className="font-medium">Reject</h2>
                <p className="mt-2 text-sm">
                  A written reason is required when the tester meets your trust gate. One appeal is
                  allowed. An upheld appeal forces payout and drops the app rating.
                </p>
                {(["not_reproducible", "out_of_scope", "already_known", "not_a_bug"] as const).map((r) => (
                  <label key={r} className="mt-2 flex gap-2 text-sm">
                    <input type="radio" checked={reason === r} onChange={() => setReason(r)} />{" "}
                    {r.replaceAll("_", " ")}
                  </label>
                ))}
                <Textarea className="mt-3" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="ghost" className="h-10 rounded-full" onClick={() => setReject(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="h-10 rounded-full"
                    onClick={() =>
                      act(async () => {
                        await api(`/api/bugs/${issue.reports[0].id}/reject`, {
                          method: "POST",
                          body: JSON.stringify({ reason, note }),
                        });
                        setReject(false);
                      })
                    }
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          )}

          {ship && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(32,33,36,.6)] p-4">
              <div className="w-full max-w-md rounded-lg bg-background p-6">
                <h2 className="font-medium">Ship &amp; credit</h2>
                <Input
                  className="mt-3 h-10 rounded-full px-4"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Testers get a Fixed in prod badge. Bug details unlock publicly.
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="ghost" className="h-10 rounded-full" onClick={() => setShip(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="h-10 rounded-full"
                    onClick={() =>
                      act(async () => {
                        await api("/api/releases", {
                          method: "POST",
                          body: JSON.stringify({
                            app_id: data.app.id,
                            version,
                            issue_ids: data.issues.filter((i) => i.status === "confirmed").map((i) => i.id),
                            notes: "testr credits",
                          }),
                        });
                        setShip(false);
                      })
                    }
                  >
                    Ship &amp; credit
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

/**
 * Sealed until paid for. The server never sends the body of a locked report, so there is
 * nothing here to reveal with devtools — the reputation block is all the dev gets to judge on.
 *
 * When payment lands, `locked` flips false and the seal visibly breaks. This is the moment the
 * whole product argument rests on, so it gets the biggest set-piece on the work surfaces.
 */
function ReportCard({ r }: { r: Report }) {
  const reduce = useReducedMotion();
  const wasLocked = useRef(r.locked);
  const [justOpened, setJustOpened] = useState(false);

  useEffect(() => {
    if (wasLocked.current && !r.locked) {
      setJustOpened(true);
      const t = setTimeout(() => setJustOpened(false), 1400);
      wasLocked.current = r.locked;
      return () => clearTimeout(t);
    }
    wasLocked.current = r.locked;
  }, [r.locked]);

  return (
    <div
      className="m3-card p-3 text-sm"
      style={justOpened && !reduce ? { animation: "seal-crack .55s ease-out" } : undefined}
    >
      <div className="flex items-center gap-2">
        <p className="font-medium">{r.title}</p>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground capitalize">
          {r.proposed_severity}
        </span>
      </div>

      {r.reporter && (
        <div className="mt-3">
          <ReputationBlock r={r.reporter} />
        </div>
      )}

      <AnimatePresence mode="wait">
      {r.locked ? (
        <motion.div
          key="sealed"
          exit={reduce ? { opacity: 0 } : { opacity: 0, scaleY: 0.6, filter: "blur(6px)" }}
          transition={{ duration: 0.35 }}
          className="relative mt-3 overflow-hidden rounded-xl p-5 text-center"
          style={{
            border: "1px dashed var(--gold-line)",
            background: "var(--game-ground)",
          }}
        >
          <div
            className="mx-auto grid size-11 place-items-center rounded-full"
            style={{
              background: "linear-gradient(135deg, var(--gold), var(--gold-deep))",
              boxShadow: "0 6px 18px -8px var(--gold)",
            }}
          >
            <Lock className="size-4" style={{ color: "#3d2c00" }} />
          </div>
          <p className="font-display mt-3 text-[17px] font-semibold" style={{ color: "var(--game-ink)" }}>
            Report sealed
          </p>
          <p className="mt-1 font-num text-xs" style={{ color: "var(--game-ink)", opacity: 0.8 }}>
            {r.evidence_count} screenshot{r.evidence_count === 1 ? "" : "s"} · {r.log_count} log lines ·{" "}
            {r.error_count} errors
          </p>
          <p className="mx-auto mt-2 max-w-sm text-xs" style={{ color: "var(--game-ink)", opacity: 0.7 }}>
            Full write-up, repro steps and evidence unlock when you pay out on this issue.
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="open"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scaleY: 0.85 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="mt-3"
        >
          {justOpened && (
            <p
              className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: "var(--gold-soft)", color: "var(--gold-deep)" }}
            >
              <Unlock className="size-3" /> Seal broken · paid from escrow
            </p>
          )}
          <p className="whitespace-pre-wrap">{r.body}</p>
          {r.repro_steps.length > 0 && (
            <ol className="mt-2 list-decimal pl-4 text-sm">
              {r.repro_steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
          {r.evidence_count > 0 && (
            <p className="mt-2 font-num text-xs text-success">
              {r.evidence_count} screenshot{r.evidence_count === 1 ? "" : "s"} attached
            </p>
          )}
          {r.console_logs
            ?.filter((l) => l.level === "error")
            .slice(0, 3)
            .map((l, i) => (
              <p key={i} className="mt-1 font-mono text-[11px] text-critical">
                {l.message}
              </p>
            ))}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
