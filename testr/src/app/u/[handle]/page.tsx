"use client";

import { use, useEffect, useState } from "react";
import { AppShell } from "@/components/shell";
import { api, Coin, relativeTime } from "@/lib/format";
import { BadgeShelf, LevelRing } from "@/components/reputation";
import { TiltCard } from "@/components/tilt-card";
import { levelProgress } from "@/lib/xp";
import type { AchievementKind, TrustTier } from "@/lib/types";

type Data = {
  profile: {
    handle: string;
    display_name: string;
    avatar_url: string;
    trust_score: number;
    tier: TrustTier;
    xp: number;
    level: number;
    accuracy_streak: number;
    best_streak: number;
    device_profile: { os: string; device: string; ram_gb: number } | null;
    interests: string[];
  };
  stats: { bugs: number; critical: number; apps: number; first: number; avgTime: number };
  badges: { kind: AchievementKind; app_id: string }[];
  finds: Array<{
    title: string;
    hidden?: boolean;
    created_at: string;
    final_severity: string | null;
    payout: number;
  } | null>;
  following: number;
  rank?: number;
};

const NEXT_TIER: Array<[number, string]> = [
  [40, "Verified"],
  [70, "Trusted"],
  [85, "Expert"],
];

export default function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params);
  const [d, setD] = useState<Data | null>(null);

  useEffect(() => {
    api<Data>(`/api/profile/${handle}`).then(setD);
  }, [handle]);

  if (!d)
    return (
      <AppShell>
        <p className="p-8 text-sm text-muted-foreground">Loading hunter card…</p>
      </AppShell>
    );

  const p = d.profile;
  const { level, floor, next, pct } = levelProgress(p.xp);
  const gate = NEXT_TIER.find(([t]) => p.trust_score < t);

  return (
    <AppShell>
      {/* The hunter card — built to be screenshotted, so it has to look right as a still */}
      <TiltCard className="game-surface holo p-6" max={6}>
        <div className="relative flex flex-wrap items-center gap-4">
          <LevelRing src={p.avatar_url} xp={p.xp} size={76} />
          <div className="min-w-0">
            <h1 className="font-display text-[28px] leading-9 font-semibold">{p.display_name}</h1>
            <p className="text-sm" style={{ color: "var(--game-ink)", opacity: 0.75 }}>
              @{p.handle} · {p.tier} · {d.following} following
            </p>
            <p className="mt-1 font-num text-xs" style={{ color: "var(--game-ink)" }}>
              Level {level} · {p.xp.toLocaleString("en-IN")} XP
              {d.rank ? ` · season rank #${d.rank}` : ""}
            </p>
          </div>
          {p.accuracy_streak > 0 && (
            <div className="ml-auto rounded-lg bg-success/10 px-4 py-2 text-center">
              <p className="font-num text-2xl text-success">{p.accuracy_streak}×</p>
              <p className="text-[10px] text-success">severity streak</p>
            </div>
          )}
        </div>

        <div className="relative mt-5">
          <div className="flex justify-between font-num text-[11px]" style={{ color: "var(--game-ink)" }}>
            <span>Lv{level}</span>
            <span>
              {(p.xp - floor).toLocaleString("en-IN")} / {(next - floor).toLocaleString("en-IN")} XP
            </span>
            <span>Lv{level + 1}</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full" style={{ background: "rgba(0,0,0,.12)" }}>
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, var(--gold-deep), var(--gold))",
                boxShadow: "0 0 12px -2px var(--gold)",
              }}
            />
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-2">
          <span className="font-num text-xs" style={{ color: "var(--game-ink)" }}>
            Trust {p.trust_score}
            {gate ? ` · ${gate[0] - p.trust_score} to ${gate[1]}` : " · Expert unlocked"}
          </span>
        </div>
      </TiltCard>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Bugs found", d.stats.bugs],
          ["Critical", d.stats.critical],
          ["Apps tested", d.stats.apps],
          ["First finder", d.stats.first],
          ["Best streak", p.best_streak],
          ["Avg on task", `${Math.round(d.stats.avgTime / 60)}m`],
        ].map(([k, v]) => (
          <div key={String(k)} className="m3-card p-3">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="font-num text-lg">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <p className="font-display text-[16px] font-semibold">Achievements</p>
        <div className="mt-2">
          <BadgeShelf kinds={d.badges.map((b) => b.kind)} max={12} />
        </div>
      </div>

      {p.device_profile && (
        <div className="mt-6">
          <p className="font-display text-[16px] font-semibold">Devices</p>
          <span className="mt-2 inline-block rounded-full border px-3 py-1 text-xs">
            {p.device_profile.device} · {p.device_profile.os} · {p.device_profile.ram_gb}GB
          </span>
        </div>
      )}

      <div className="mt-6">
        <p className="font-display text-[16px] font-semibold">Recent finds</p>
        <ul className="mt-2 space-y-2">
          {d.finds.filter(Boolean).map((f, i) => (
            <li key={i} className="m3-card flex flex-wrap items-center gap-2 p-3 text-sm">
              <span className={f!.hidden ? "text-muted-foreground" : ""}>
                {f!.hidden ? "🔒 Hidden until the fix ships" : f!.title}
              </span>
              {f!.final_severity && (
                <span className="rounded-full border px-2 py-0.5 text-[11px] capitalize">
                  {f!.final_severity}
                </span>
              )}
              <span className="ml-auto flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{relativeTime(f!.created_at)}</span>
                <Coin n={f!.payout} />
              </span>
            </li>
          ))}
          {d.finds.filter(Boolean).length === 0 && (
            <li className="m3-card p-6 text-center text-sm text-muted-foreground">No finds yet.</li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}
