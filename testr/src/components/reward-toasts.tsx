"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRealtime } from "@/lib/use-realtime";
import { useSession } from "@/lib/session-client";
import type { AchievementKind } from "@/lib/types";
import { PayoutBursts, RankFlourish, type Burst, type Rank } from "@/components/reward-flourish";

/**
 * Payouts, XP and achievement unlocks all arrive on the same `toast` channel. Mounted once in the
 * shell so a reward lands wherever the user happens to be.
 *
 * Payouts and rank events get the set-pieces in reward-flourish.tsx; plain XP stays a quiet toast
 * so the frequent, low-stakes event doesn't compete with the big ones.
 */
export function RewardToasts() {
  const { user, refresh } = useSession();
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [rank, setRank] = useState<Rank | null>(null);
  const queue = useRef<Rank[]>([]);
  const seq = useRef(0);

  const nextRank = useCallback(() => {
    setRank(queue.current.shift() ?? null);
  }, []);

  useRealtime(
    useCallback(
      (msg: Record<string, unknown>) => {
        if (msg.channel !== "toast") return;
        const row = msg.row as Record<string, unknown>;
        if (!user || row.owner_id !== user.id) return;
        const id = ++seq.current;

        if (msg.event === "PAYOUT") {
          setBursts((b) => [...b, { id, amount: Number(row.amount), memo: String(row.memo) }]);
          setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 2600);
          refresh();
        }
        if (msg.event === "XP") {
          toast(`+${row.amount} XP`, { description: String(row.reason).replaceAll("_", " ") });
        }
        if (msg.event === "LEVEL_UP") {
          const item: Rank = { id, kind: "level", level: Number(row.level) };
          setRank((cur) => (cur ? (queue.current.push(item), cur) : item));
          refresh();
        }
        if (msg.event === "ACHIEVEMENT") {
          const item: Rank = { id, kind: "achievement", achievement: row.kind as AchievementKind };
          setRank((cur) => (cur ? (queue.current.push(item), cur) : item));
        }
      },
      [user, refresh]
    )
  );

  // Rank flourishes are celebratory, not blocking — they clear themselves.
  useEffect(() => {
    if (!rank) return;
    const t = setTimeout(nextRank, 4200);
    return () => clearTimeout(t);
  }, [rank, nextRank]);

  return (
    <>
      <PayoutBursts items={bursts} />
      <RankFlourish item={rank} onDismiss={nextRank} />
    </>
  );
}
