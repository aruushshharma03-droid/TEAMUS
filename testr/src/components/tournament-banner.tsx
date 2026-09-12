"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { TiltCard } from "@/components/tilt-card";

type T = {
  id: string;
  title: string;
  prize_pool: number;
  ends_at: string;
  status: "live" | "settled";
  entrants: number;
  app?: { name: string; icon_url: string } | null;
};

function left(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "closing";
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

/** Live hunts sit above the feed — the escrowed prize is the hook. */
export function TournamentBanner() {
  const [t, setT] = useState<T | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    api<{ tournaments: T[] }>("/api/tournaments")
      .then((d) => setT(d.tournaments.find((x) => x.status === "live") ?? null))
      .catch(() => {});
  }, []);
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  if (!t) return null;

  return (
    <TiltCard className="game-surface gold-sweep mb-5" max={5}>
      <Link href={`/tournaments/${t.id}`} className="relative flex flex-wrap items-center gap-3 p-5">
        {t.app && (
          <img
            src={t.app.icon_url}
            alt=""
            className="size-12 shrink-0 rounded-xl border border-[var(--gold-line)]"
          />
        )}
        <div className="min-w-0">
          <p
            className="flex items-center gap-2 text-[11px] font-medium tracking-wide uppercase"
            style={{ color: "var(--gold-deep)" }}
          >
            <span className="size-1.5 animate-[pulse-dot_1.6s_ease_infinite] rounded-full bg-critical" />
            Live bug hunt · {left(t.ends_at)}
          </p>
          <p className="font-display truncate text-[20px] leading-7 font-semibold" style={{ color: "var(--game-ink)" }}>
            {t.title}
          </p>
          <p className="font-num text-xs" style={{ color: "var(--game-ink)", opacity: 0.8 }}>
            ⬡{t.prize_pool.toLocaleString("en-IN")} locked in escrow · {t.entrants} hunters
          </p>
        </div>
        <Button
          className="gold-pulse ml-auto h-10 shrink-0 rounded-full border-0 text-xs font-semibold"
          style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-deep))", color: "#3d2c00" }}
        >
          Enter the hunt
        </Button>
      </Link>
    </TiltCard>
  );
}
