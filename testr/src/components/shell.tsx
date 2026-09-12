"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle, Menu, Search, Settings, Wallet, Home, Plus, User, Inbox, Trophy } from "lucide-react";
import { useSession } from "@/lib/session-client";
import { Coin } from "@/lib/format";
import { LevelRing } from "@/components/reputation";
import { RewardToasts } from "@/components/reward-toasts";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

const items = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/tournaments", label: "Hunts", icon: Trophy },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/bounties/new", label: "Post a bounty", icon: Plus },
  { href: "/dashboard", label: "Dashboard", icon: Inbox },
];

export function AppShell({
  children,
  right,
  hideHeroSearch = false,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  hideHeroSearch?: boolean;
}) {
  const path = usePathname();
  const { user } = useSession();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [inbox, setInbox] = useState(0);
  useEffect(() => {
    if (!user) return;
    api<{ pending?: number }>("/api/dashboard")
      .then((d) => setInbox(d.pending ?? 0))
      .catch(() => {});
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <RewardToasts />
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background px-3 md:px-4">
        <button className="grid size-10 place-items-center rounded-full hover:bg-muted md:hidden" aria-label="Menu">
          <Menu className="size-5" />
        </button>
        <Link href="/" className="flex shrink-0 items-center gap-1.5 text-[20px] font-medium tracking-tight">
          <span className="text-primary">⬡</span> testr
        </Link>
        {!hideHeroSearch && (
          <div className="mx-auto hidden min-w-0 max-w-xl flex-1 sm:block">
            <label className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && q.trim()) router.push(`/?q=${encodeURIComponent(q.trim())}`);
                }}
                placeholder="Search apps, bounties, testers"
                className="h-10 w-full rounded-full bg-[#f1f3f4] pr-4 pl-10 text-sm outline-none transition focus:bg-white focus:shadow-[0_1px_6px_rgba(32,33,36,.28)] dark:bg-[#3c4043] dark:focus:bg-[#2d2e30]"
              />
            </label>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            className="grid size-10 place-items-center rounded-full hover:bg-muted"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Settings className="size-5 text-muted-foreground" />
          </button>
          <a
            href="https://github.com"
            className="grid size-10 place-items-center rounded-full hover:bg-muted"
            aria-label="Help"
          >
            <HelpCircle className="size-5 text-muted-foreground" />
          </a>
          {user ? (
            <Link href={`/u/${user.handle}`} aria-label="Your profile">
              <LevelRing src={user.avatar_url} xp={user.xp ?? 0} size={34} />
            </Link>
          ) : (
            <Button asChild className="h-10 rounded-full px-5">
              <Link href="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] gap-4 px-3 py-4 md:px-6">
        <nav className="hidden w-16 shrink-0 flex-col gap-1 xl:w-64 lg:flex">
          {items.map((it) => {
            const active = path === it.href || (it.href !== "/" && path.startsWith(it.href));
            return (
              <Link
                key={it.href}
                href={it.href}
                data-active={active}
                className="nav-pill flex items-center gap-3 rounded-full px-4 py-2.5 text-sm hover:bg-muted"
              >
                <it.icon className="size-5" />
                <span className="hidden xl:inline">{it.label}</span>
                {it.href === "/dashboard" && inbox > 0 && (
                  <span className="ml-auto hidden font-num text-xs xl:inline">{inbox}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main>
        {right && <aside className="hidden w-[300px] shrink-0 lg:block">{right}</aside>}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background lg:hidden">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="flex flex-1 flex-col items-center py-2 text-[10px]">
            <it.icon className="size-5" />
            {it.label}
          </Link>
        ))}
        <Link href={user ? `/u/${user.handle}` : "/auth"} className="flex flex-1 flex-col items-center py-2 text-[10px]">
          <User className="size-5" />
          You
        </Link>
      </nav>
    </div>
  );
}

export function RightRail() {
  const { user } = useSession();
  const [wallet, setWallet] = useState<{ balance: number; escrow: number; trust: number; tier: string } | null>(null);
  useEffect(() => {
    if (!user) return;
    api<typeof wallet>("/api/wallet").then(setWallet).catch(() => {});
  }, [user]);
  return (
    <div className="space-y-4">
      <div className="m3-card p-4">
        <p className="text-xs text-muted-foreground">Available</p>
        {user && wallet ? (
          <>
            <div className="mt-1 text-2xl">
              <Coin n={wallet.balance} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              In escrow <span className="font-num text-foreground">⬡{wallet.escrow}</span>
            </p>
            <Button asChild className="mt-3 h-10 w-full rounded-full">
              <Link href="/wallet">Add coins</Link>
            </Button>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Sign in to see your wallet.</p>
        )}
      </div>
      {user && wallet && (
        <div className="m3-card p-4">
          <p className="text-xs text-muted-foreground">Trust · {wallet.tier}</p>
          <p className="font-num text-lg">{wallet.trust}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(100, wallet.trust)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {wallet.trust < 40
              ? `${40 - wallet.trust} to Verified`
              : wallet.trust < 70
                ? `${70 - wallet.trust} to Trusted`
                : wallet.trust < 85
                  ? `${85 - wallet.trust} to Expert`
                  : "Expert unlocked"}
          </p>
        </div>
      )}
      <SeasonBoard />
    </div>
  );
}

type Board = {
  season_ends_at: string;
  top: Array<{ rank: number; handle: string; display_name: string; avatar_url: string; xp: number; level: number }>;
  you: { rank: number; xp: number; level: number } | null;
};

function seasonLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "ending now";
  const days = Math.floor(ms / 86400_000);
  const hrs = Math.floor((ms % 86400_000) / 3600_000);
  return days > 0 ? `${days}d ${hrs}h left` : `${hrs}h left`;
}

/** Real XP standings. Replaces the three hardcoded handles that used to live here. */
function SeasonBoard() {
  const [b, setB] = useState<Board | null>(null);
  useEffect(() => {
    api<Board>("/api/leaderboard")
      .then(setB)
      .catch(() => {});
  }, []);
  if (!b) return null;
  return (
    <div className="m3-card p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium">Season leaderboard</p>
        <p className="font-num text-[11px] text-muted-foreground">{seasonLeft(b.season_ends_at)}</p>
      </div>
      <ol className="mt-3 space-y-2">
        {b.top.slice(0, 5).map((r) => (
          <li key={r.handle} className="flex items-center gap-2 text-sm">
            <span className="w-4 shrink-0 text-center font-num text-xs text-muted-foreground">{r.rank}</span>
            <img src={r.avatar_url} alt="" className="size-6 shrink-0 rounded-full" />
            <Link href={`/u/${r.handle}`} className="truncate hover:underline">
              @{r.handle}
            </Link>
            <span className="ml-auto shrink-0 font-num text-xs">
              Lv{r.level} · {r.xp.toLocaleString("en-IN")}
            </span>
          </li>
        ))}
      </ol>
      {b.you && (
        <p className="mt-3 border-t pt-2 font-num text-xs text-muted-foreground">
          You · rank {b.you.rank} · Lv{b.you.level} · {b.you.xp.toLocaleString("en-IN")} XP
        </p>
      )}
    </div>
  );
}
