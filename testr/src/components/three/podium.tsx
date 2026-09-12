"use client";

import dynamic from "next/dynamic";

export type PodiumRow = { handle: string; points: number; prize: number };

/** Index is rank-1. Centre is tallest; 2nd left, 3rd right, as a real podium reads. */
const PLACE = [
  { color: "#f9ab00", height: 1.6, x: 0, left: "50%" },
  { color: "#c7ccd1", height: 1.15, x: -1.4, left: "22%" },
  { color: "#b06000", height: 0.85, x: 1.4, left: "78%" },
];

/** Shared HTML label layer — used over the canvas and inside the CSS fallback. */
export function PodiumLabels({ rows }: { rows: PodiumRow[] }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {PLACE.map((p, i) => {
        const r = rows[i];
        if (!r) return null;
        return (
          <div
            key={r.handle}
            className="absolute -translate-x-1/2 text-center"
            style={{ left: p.left, bottom: `${18 + p.height * 26}%` }}
          >
            <p className="font-display text-[13px] font-semibold" style={{ color: "var(--game-ink)" }}>
              @{r.handle}
            </p>
            <p className="font-num text-[12px]" style={{ color: "var(--gold-deep)" }}>
              ⬡{r.prize.toLocaleString("en-IN")}
            </p>
            <p className="font-num text-[10px]" style={{ color: "var(--game-ink)", opacity: 0.7 }}>
              {r.points.toLocaleString("en-IN")} pts
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** CSS stand-in when WebGL is unavailable or motion is reduced. A finished design, not a spinner. */
export function PodiumFallback({ rows }: { rows: PodiumRow[] }) {
  return (
    <div className="flex h-full items-end justify-center gap-3 pb-6">
      {[1, 0, 2].map((i) => {
        const r = rows[i];
        const p = PLACE[i];
        if (!r) return null;
        return (
          <div key={r.handle} className="flex w-24 flex-col items-center">
            <p className="font-display text-[13px] font-semibold" style={{ color: "var(--game-ink)" }}>
              @{r.handle}
            </p>
            <p className="font-num text-[12px]" style={{ color: "var(--gold-deep)" }}>
              ⬡{r.prize.toLocaleString("en-IN")}
            </p>
            <div
              className="mt-1 w-full rounded-t-lg"
              style={{
                height: p.height * 78,
                background: `linear-gradient(180deg, ${p.color}, ${p.color}99)`,
                boxShadow: `0 -6px 24px -10px ${p.color}`,
              }}
            >
              <p className="font-display pt-2 text-center text-xl font-bold" style={{ color: "#3d2c00" }}>
                {i + 1}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const Podium3D = dynamic(() => import("./podium-client").then((m) => m.Podium3DClient), {
  ssr: false,
  loading: () => null,
});

export { PLACE };
