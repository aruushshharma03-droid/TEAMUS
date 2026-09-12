"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ACHIEVEMENTS, type AchievementKind } from "@/lib/types";
import { CoinFallback } from "@/components/three/coin-fallback";

export type Burst = { id: number; amount: number; memo: string };
export type Rank =
  | { id: number; kind: "level"; level: number }
  | { id: number; kind: "achievement"; achievement: AchievementKind };

/**
 * Transient reward set-pieces.
 *
 * These deliberately use the CSS 3D coin rather than the WebGL one: a payout fires on every
 * confirm and session approval, and mounting/tearing down a canvas for a 1.6s flourish is the
 * kind of churn that janks a live demo. Real WebGL is reserved for the persistent surfaces
 * (hero, wallet vault, podium) where the canvas stays mounted.
 */
export function PayoutBursts({ items }: { items: Burst[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-3">
      <AnimatePresence>
        {items.map((b) => (
          <motion.div
            key={b.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="game-surface gold-sweep flex items-center gap-4 px-6 py-4"
          >
            <div
              style={{
                transformStyle: "preserve-3d",
                animation: reduce ? undefined : "coin-spin 1.1s cubic-bezier(.3,.8,.4,1) 2",
              }}
            >
              <CoinFallback size={52} />
            </div>
            <div>
              <p
                className="font-display text-[26px] leading-7 font-bold"
                style={{ color: "var(--game-ink)" }}
              >
                +<span className="font-num">{b.amount.toLocaleString("en-IN")}</span>
              </p>
              <p className="text-xs" style={{ color: "var(--game-ink)", opacity: 0.8 }}>
                {b.memo}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Level-ups and achievements get the full centre-stage treatment. */
export function RankFlourish({ item, onDismiss }: { item: Rank | null; onDismiss: () => void }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(32,33,36,.55)] p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7, rotateX: -25 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="game-surface gold-sweep w-full max-w-sm p-8 text-center"
            style={{ perspective: 900 }}
            onClick={(e) => e.stopPropagation()}
          >
            {item.kind === "level" ? (
              <>
                <div className={reduce ? "" : "float-soft"} style={{ display: "inline-block" }}>
                  <CoinFallback size={104} />
                </div>
                <p
                  className="mt-4 text-[11px] font-medium tracking-[0.2em] uppercase"
                  style={{ color: "var(--gold-deep)" }}
                >
                  Level up
                </p>
                <p
                  className="font-display text-[52px] leading-[56px] font-bold"
                  style={{ color: "var(--game-ink)" }}
                >
                  <span className="font-num">{item.level}</span>
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--game-ink)", opacity: 0.8 }}>
                  New perks unlocked at this rank
                </p>
              </>
            ) : (
              <>
                <div
                  className={reduce ? "" : "float-soft"}
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 104,
                    height: 104,
                    margin: "0 auto",
                    borderRadius: 24,
                    background: "linear-gradient(135deg, var(--gold), var(--gold-deep))",
                    boxShadow: "0 12px 34px -14px var(--gold)",
                    fontSize: 46,
                    color: "#3d2c00",
                  }}
                >
                  {ACHIEVEMENTS[item.achievement].icon}
                </div>
                <p
                  className="mt-4 text-[11px] font-medium tracking-[0.2em] uppercase"
                  style={{ color: "var(--gold-deep)" }}
                >
                  Achievement unlocked
                </p>
                <p
                  className="font-display text-[30px] leading-9 font-bold"
                  style={{ color: "var(--game-ink)" }}
                >
                  {ACHIEVEMENTS[item.achievement].label}
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--game-ink)", opacity: 0.8 }}>
                  {ACHIEVEMENTS[item.achievement].blurb}
                </p>
              </>
            )}
            <button
              onClick={onDismiss}
              className="mt-6 h-10 w-full rounded-full text-sm font-semibold"
              style={{ background: "var(--game-ink)", color: "var(--gold-soft)" }}
            >
              Nice
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
