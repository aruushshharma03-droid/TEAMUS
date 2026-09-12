"use client";

import { ACHIEVEMENTS, type AchievementKind } from "@/lib/types";
import { levelProgress } from "@/lib/xp";

export type Reporter = {
  handle: string;
  display_name: string;
  avatar_url: string;
  trust_score: number;
  tier: string;
  level: number;
  xp: number;
  accuracy_streak: number;
  best_streak: number;
  confirmed_bugs: number;
  criticals: number;
  badges: AchievementKind[];
};

/** Avatar with a progress ring showing how far into the current level the hunter is. */
export function LevelRing({
  src,
  xp,
  size = 44,
}: {
  src: string;
  xp: number;
  size?: number;
}) {
  const { level, pct } = levelProgress(xp);
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(var(--primary) ${pct * 3.6}deg, var(--border) 0deg)`,
        }}
      />
      <img
        src={src}
        alt=""
        className="relative rounded-full bg-background"
        style={{ width: size - 6, height: size - 6 }}
      />
      <span className="absolute -right-1 -bottom-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 font-num text-[9px] text-primary-foreground">
        {level}
      </span>
    </span>
  );
}

export function BadgeShelf({ kinds, max = 6 }: { kinds: AchievementKind[]; max?: number }) {
  if (!kinds.length) return <span className="text-xs text-muted-foreground">No badges yet</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {kinds.slice(0, max).map((k) => (
        <span
          key={k}
          title={`${ACHIEVEMENTS[k].label} — ${ACHIEVEMENTS[k].blurb}`}
          className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2 py-0.5 text-[11px] text-primary"
        >
          <span aria-hidden>{ACHIEVEMENTS[k].icon}</span>
          {ACHIEVEMENTS[k].label}
        </span>
      ))}
    </span>
  );
}

/**
 * What the dev underwrites a locked report with. This block is the whole argument for the
 * game layer: reputation is the only thing visible before money moves.
 */
export function ReputationBlock({ r }: { r: Reporter }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <div className="flex items-center gap-3">
        <LevelRing src={r.avatar_url} xp={r.xp} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {r.display_name} <span className="text-muted-foreground">@{r.handle}</span>
          </p>
          <p className="font-num text-xs text-muted-foreground">
            Lv{r.level} · trust {r.trust_score} · {r.tier}
          </p>
        </div>
        {r.accuracy_streak > 0 && (
          <span className="ml-auto shrink-0 rounded-full bg-success/10 px-2 py-0.5 font-num text-[11px] text-success">
            {r.accuracy_streak}× accurate
          </span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[
          ["Confirmed", r.confirmed_bugs],
          ["Critical", r.criticals],
          ["Best streak", r.best_streak],
        ].map(([k, v]) => (
          <div key={String(k)}>
            <p className="font-num text-sm">{v}</p>
            <p className="text-[10px] text-muted-foreground">{k}</p>
          </div>
        ))}
      </div>
      <div className="mt-2">
        <BadgeShelf kinds={r.badges} max={3} />
      </div>
    </div>
  );
}
