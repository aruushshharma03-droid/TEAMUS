"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, RightRail } from "@/components/shell";
import { AppCard, type FeedCard } from "@/components/app-card";
import { TournamentBanner } from "@/components/tournament-banner";
import { Coin3D } from "@/components/three/coin";
import { motion } from "motion/react";
import { api } from "@/lib/format";
import { useSession } from "@/lib/session-client";
import { useRealtime } from "@/lib/use-realtime";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const chipsA = [
  { id: "all", label: "All" },
  { id: "web", label: "Web" },
  { id: "apk", label: "APK" },
  { id: "desktop", label: "Desktop" },
  { id: "ios", label: "iOS" },
];
const chipsB = [
  { id: "foryou", label: "For you" },
  { id: "heating", label: "Heating" },
  { id: "new", label: "New" },
  { id: "ending", label: "Ending soon" },
];

export default function HomePage() {
  const { user } = useSession();
  const [filter, setFilter] = useState("all");
  const [cards, setCards] = useState<FeedCard[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ cards: FeedCard[] }>(`/api/feed?filter=${filter}`);
      setCards(data.cards);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [filter]);

  useEffect(() => {
    setCards(null);
    load();
  }, [load]);

  useRealtime(
    useCallback(
      (msg: Record<string, unknown>) => {
        if (msg.channel === "events" || msg.channel === "bounties") load();
      },
      [load]
    )
  );

  return (
    <AppShell right={<RightRail />}>
      {!user && (
        <section className="hero-mesh relative mb-8 overflow-hidden rounded-2xl border px-6 py-14 md:px-12 md:py-20">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{ animation: "mesh 18s ease-in-out infinite" }}
          />

          {/* The coin is the brand mark. It carries the hero, the wallet and every payout. */}
          <div className="pointer-events-none absolute -right-6 top-1/2 hidden -translate-y-1/2 md:block">
            <Coin3D size={300} spin={0.5} />
          </div>

          <div className="relative max-w-2xl">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
              className="font-display text-[34px] leading-[40px] font-bold tracking-tight md:text-[48px] md:leading-[54px]"
            >
              Get your app tested.
              <br />
              <span style={{ color: "var(--gold-deep)" }}>Pay with bugs you found.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, type: "spring", stiffness: 120, damping: 18 }}
              className="mt-4 max-w-xl text-[16px] leading-6 text-muted-foreground"
            >
              Earn test coins finding bugs. Spend them getting your own app tested. Same wallet, both
              directions.
            </motion.p>

            <div className="mt-6 flex flex-wrap gap-6">
              {[
                ["Locked in escrow", "before you test"],
                ["First finder", "takes full payout"],
                ["Fixed in prod", "credited publicly"],
              ].map(([a, b]) => (
                <div key={a}>
                  <p className="font-display text-[15px] font-semibold">{a}</p>
                  <p className="text-xs text-muted-foreground">{b}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                className="h-11 rounded-full border-0 px-7 text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, var(--gold), var(--gold-deep))",
                  color: "#3d2c00",
                }}
              >
                <Link href="/auth">Start hunting</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full px-7">
                <Link href="/auth?next=/bounties/new">Post a bounty</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <TournamentBanner />

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {chipsA.map((c) => (
          <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)} label={c.label} />
        ))}
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {chipsB.map((c) => (
          <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)} label={c.label} />
        ))}
      </div>

      {err && <p className="text-critical">{err}</p>}
      {!cards && (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      )}
      {cards?.length === 0 && (
        <div className="m3-card p-10 text-center">
          <p className="font-medium">No apps in this filter</p>
          <p className="mt-1 text-sm text-muted-foreground">Try All, or post the first bounty.</p>
        </div>
      )}
      <div className="space-y-3">
        {cards?.map((c) => (
          <AppCard key={c.app.slug} card={c} signedOut={!user} />
        ))}
      </div>

      {!user && (
        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            ["1. Earn", "Claim a slot, walk the script, flag bugs with evidence. Confirmed finds pay from escrow."],
            ["2. Spend", "Lock coins when you post a bounty. Unused escrow returns when it expires."],
            ["3. Ship", "Credit testers on the changelog. Hidden bug details unlock in public."],
          ].map(([t, b]) => (
            <div key={t} className="m3-card p-5">
              <h3 className="font-medium">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b}</p>
            </div>
          ))}
        </section>
      )}
    </AppShell>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-sm ${
        active ? "border-transparent bg-primary-container text-primary" : "border-border"
      }`}
    >
      {active && <span>✓</span>}
      {label}
    </button>
  );
}
