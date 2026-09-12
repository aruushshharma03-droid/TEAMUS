import type { AchievementKind, ActivityEvent, Bounty, Submission, Tournament } from "./types";

type Listener = (msg: RealtimeMessage) => void;

export type RealtimeMessage =
  | { channel: "events"; event: "INSERT"; row: ActivityEvent }
  | { channel: "bounties"; event: "UPDATE"; row: Bounty }
  | { channel: "wallets"; event: "UPDATE"; row: { owner_id: string; balance: number } }
  | { channel: "submissions"; event: "INSERT" | "UPDATE"; row: Submission }
  | { channel: "tournaments"; event: "INSERT" | "UPDATE"; row: Tournament }
  | { channel: "toast"; event: "PAYOUT"; row: { owner_id: string; amount: number; memo: string } }
  | { channel: "toast"; event: "XP"; row: { owner_id: string; amount: number; reason: string } }
  | { channel: "toast"; event: "LEVEL_UP"; row: { owner_id: string; level: number } }
  | { channel: "toast"; event: "ACHIEVEMENT"; row: { owner_id: string; kind: AchievementKind } };

const g = globalThis as unknown as { __testrBus?: Set<Listener> };
if (!g.__testrBus) g.__testrBus = new Set();

export function subscribe(fn: Listener) {
  g.__testrBus!.add(fn);
  return () => g.__testrBus!.delete(fn);
}

export function publish(msg: RealtimeMessage) {
  for (const fn of g.__testrBus!) {
    try {
      fn(msg);
    } catch {
      /* ignore */
    }
  }
}
