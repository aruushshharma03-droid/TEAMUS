"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell";
import { api, Coin } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { LevelRing } from "@/components/reputation";
import { Podium3D } from "@/components/three/podium";
import { levelFloor } from "@/lib/xp";
import { useRealtime } from "@/lib/use-realtime";
import { useSession } from "@/lib/session-client";

type Row = {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  level: number;
  points: number;
  bugs: number;
  criticals: number;
  rank: number;
  prize: number;
};

type Data = {
  tournament: {
    id: string;
    title: string;
    prize_pool: number;
    splits: number[];
    starts_at: string;
    ends_at: string;
    status: "live" | "settled";
    owner_id: string;
  };
  app: { name: string; slug: string; icon_url: string; tagline: string } | null;
  owner: { handle: string } | null;
  standings: Row[];
  escrow: { locked: number; paid: number } | null;
};

function countdown(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useSession();
  const [d, setD] = useState<Data | null>(null);
  const [left, setLeft] = useState("");
  const [now, setNow] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Data>(`/api/tournaments/${id}`)
      .then(setD)
      .catch((e) => setErr((e as Error).message));
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  // The board moves the moment a bug is confirmed anywhere on this app.
  useRealtime(
    useCallback(
      (msg: Record<string, unknown>) => {
        if (msg.channel === "events" || msg.channel === "tournaments" || msg.channel === "wallets") load();
      },
      [load]
    )
  );

  useEffect(() => {
    if (!d) return;
    const tick = () => {
      setLeft(countdown(d.tournament.ends_at));
      setNow(Date.now());
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [d]);

  if (!d) {
    return (
      <AppShell>
        <p className="p-8 text-sm text-muted-foreground">{err ?? "Loading hunt…"}</p>
      </AppShell>
    );
  }

  const t = d.tournament;
  const closed = t.status === "settled" || (now > 0 && new Date(t.ends_at).getTime() <= now);
  const isOwner = user?.id === t.owner_id;

  return (
    <AppShell>
      <section className="game-surface gold-sweep relative p-6 md:p-8">
        <div className="flex flex-wrap items-start gap-4">
          {d.app && <img src={d.app.icon_url} alt="" className="size-14 rounded-lg border" />}
          <div className="min-w-0">
            <p className="game-muted text-xs">
              Bug hunt{d.app ? ` · ${d.app.name}` : ""}
              {d.owner ? ` · hosted by @${d.owner.handle}` : ""}
            </p>
            <h1 className="font-display text-[32px] leading-10 font-bold tracking-tight" style={{ color: "var(--game-ink)" }}>{t.title}</h1>
            <p className="game-muted mt-1 text-sm">
              Severity-weighted scoring. First finder scores full, confirmers score 25%.
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[11px] font-medium tracking-[0.15em] uppercase" style={{ color: "var(--gold-deep)" }}>Prize pool · locked in escrow</p>
            <p className="text-3xl">
              <Coin n={t.prize_pool} />
            </p>
            <p className="mt-1 font-num text-lg" style={{ color: "var(--game-ink)" }}>{closed ? "closed" : left}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {t.splits.map((sp, i) => (
            <span
              key={i}
              className="rounded-full border border-[var(--gold-line)] bg-background/80 px-3 py-1 font-num"
            >
              {MEDAL[i]} {Math.round(sp * 100)}% · ⬡{Math.floor(t.prize_pool * sp)}
            </span>
          ))}
        </div>

        <p className="game-muted mt-4 max-w-2xl text-xs">
          The pool left the host&apos;s wallet when this hunt opened — it is held in escrow, not promised.
          Unclaimed places return to the host at settlement.
        </p>
      </section>

      {err && <p className="mt-4 text-sm text-critical">{err}</p>}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-[18px] font-semibold">
          Leaderboard <span className="text-muted-foreground">· {d.standings.length} hunters</span>
        </h2>
        {d.app && (
          <Button asChild variant="outline" className="h-9 rounded-full text-xs">
            <Link href={`/apps/${d.app.slug}`}>Open bounties</Link>
          </Button>
        )}
      </div>

      {d.standings.length > 0 && (
        <Podium3D
          className="mt-3 h-[260px] w-full"
          rows={d.standings.slice(0, 3).map((r) => ({ handle: r.handle, points: r.points, prize: r.prize }))}
        />
      )}

      <div className="mt-3 space-y-2">
        {d.standings.length === 0 && (
          <div className="m3-card p-8 text-center">
            <p className="font-medium">No confirmed finds yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              First confirmed bug takes the lead — and the biggest share.
            </p>
          </div>
        )}
        {d.standings.map((r) => (
          <div
            key={r.user_id}
            className={`m3-card flex items-center gap-3 p-3 ${r.rank <= 3 ? "border-l-[3px]" : ""}`}
            style={r.rank <= 3 ? { borderLeftColor: ["#f9ab00", "#9aa0a6", "#b06000"][r.rank - 1] } : undefined}
          >
            <span className="w-8 shrink-0 text-center font-num text-sm">
              {r.rank <= 3 ? MEDAL[r.rank - 1] : r.rank}
            </span>
            <LevelRing src={r.avatar_url} xp={levelFloor(r.level)} size={36} />
            <div className="min-w-0 flex-1">
              <Link href={`/u/${r.handle}`} className="truncate text-sm font-medium hover:underline">
                {r.display_name}
              </Link>
              <p className="font-num text-xs text-muted-foreground">
                @{r.handle} · {r.bugs} bugs · {r.criticals} critical
              </p>
            </div>
            <div className="text-right">
              <p className="font-num text-sm">{r.points} pts</p>
              {r.prize > 0 && (
                <p className="font-num text-xs text-coin">
                  {closed ? "won" : "on track"} ⬡{r.prize}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {isOwner && t.status === "live" && (
        <div className="m3-card mt-6 p-4">
          <p className="text-sm font-medium">Settle the hunt</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pays the podium from escrow and returns anything unclaimed to you.
          </p>
          <Button
            className="mt-3 h-10 rounded-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await api(`/api/tournaments/${id}`, { method: "POST" });
                load();
              } catch (e) {
                setErr((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Settling…" : "Settle & pay podium"}
          </Button>
        </div>
      )}

      {d.escrow && (
        <p className="mt-4 font-num text-xs text-muted-foreground">
          Escrow ⬡{d.escrow.paid} paid of ⬡{d.escrow.locked} locked
        </p>
      )}
    </AppShell>
  );
}
