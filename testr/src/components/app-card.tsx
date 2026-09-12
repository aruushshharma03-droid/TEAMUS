"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Coin, relativeTime } from "@/lib/format";
import { Check, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session-client";

export type FeedCard = {
  app: {
    name: string;
    slug: string;
    icon_url: string;
    tagline: string;
    is_verified: boolean;
    platforms: string[];
  };
  owner: { handle: string; display_name: string };
  openCount: number;
  rewardMin: number;
  rewardMax: number;
  slots: number;
  testers: number;
  bugs: number;
  heating: boolean;
  match: { ok: boolean; reason: string };
  latest?: {
    type: string;
    created_at: string;
    payload: Record<string, unknown>;
  } | null;
  latestHandle?: string | null;
};

const eventLine = (c: FeedCard) => {
  const t = c.latest?.type;
  const p = c.latest?.payload ?? {};
  if (t === "BUG_CONFIRMED") return `@${c.latestHandle} found a ${String(p.severity ?? "").toUpperCase()} bug`;
  if (t === "REWARD_RAISED") return `Reward heating up · ⬡${p.reward_current}`;
  if (t === "BOUNTY_OPENED") return `New bounty · ${p.title}`;
  if (t === "SHIPPED") return `Shipped v${p.version} · ${p.count} fixes`;
  if (t === "BOUNTY_FILLED") return `All slots claimed`;
  if (t === "BOUNTY_EXPIRED") return `Bounty expired`;
  return "Quiet so far";
};

export function AppCard({ card, signedOut }: { card: FeedCard; signedOut?: boolean }) {
  const { user } = useSession();
  return (
    <motion.article
      layout
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="m3-card overflow-hidden"
    >
      <Link href={`/apps/${card.app.slug}`} className="block p-4">
        <div className="flex gap-3">
          <img src={card.app.icon_url} alt="" className="size-12 rounded-lg border" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-[16px] font-medium">{card.app.name}</h3>
              {card.app.is_verified && <span className="text-primary" title="Verified">✓</span>}
              {card.heating && <HeatBadge />}
            </div>
            <p className="text-xs text-muted-foreground">
              @{card.owner.handle}
            </p>
            <p className="mt-1 truncate text-sm">{card.app.tagline}</p>
          </div>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{card.app.platforms.join(" · ")}</span>
          {user ? (
            card.match.ok ? (
              <span className="inline-flex items-center gap-1 text-success">
                <Check className="size-3" /> matches your device
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <TriangleAlert className="size-3" /> you don&apos;t match
              </span>
            )
          ) : null}
        </p>
        <p className="mt-2 font-num text-xs text-muted-foreground">
          {card.openCount} open bounties · ⬡ {card.rewardMin}–{card.rewardMax} · {card.slots} slots ·{" "}
          {card.testers.toLocaleString()} testers · {card.bugs} bugs
        </p>
      </Link>
      <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs">
        <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <span className="size-1.5 animate-[pulse-dot_1.6s_ease_infinite] rounded-full bg-critical" />
          <span className="truncate">
            {eventLine(card)}
            {card.latest ? ` · ${relativeTime(card.latest.created_at)}` : ""}
          </span>
        </p>
        {signedOut ? (
          <Button asChild variant="outline" className="h-8 rounded-full text-xs">
            <Link href="/auth">Sign in to test</Link>
          </Button>
        ) : (
          <Button asChild className="h-8 rounded-full text-xs">
            <Link href={`/apps/${card.app.slug}`}>Claim</Link>
          </Button>
        )}
      </div>
    </motion.article>
  );
}

/**
 * "Heating up" used to be a plain text label. A bounty nobody has claimed is raising its own
 * price, so it should visibly rise.
 */
function HeatBadge() {
  return (
    <span
      className="relative inline-flex items-center gap-1 overflow-hidden rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        background: "linear-gradient(135deg, var(--gold), var(--gold-deep))",
        color: "#3d2c00",
      }}
      title="No claims yet - the reward is stepping up toward its max"
    >
      <span className="heat-wave" aria-hidden>
        &#9650;
      </span>
      heating
    </span>
  );
}
