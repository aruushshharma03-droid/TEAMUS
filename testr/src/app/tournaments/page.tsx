"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell";
import { api, Coin } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/session-client";

type T = {
  id: string;
  title: string;
  prize_pool: number;
  ends_at: string;
  status: "live" | "settled";
  entrants: number;
  app_id: string;
  app?: { name: string; icon_url: string; slug: string } | null;
};

function left(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const h = Math.floor(ms / 3600_000);
  return h > 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h left`;
}

export default function TournamentsPage() {
  const { user } = useSession();
  const [list, setList] = useState<T[] | null>(null);
  const [apps, setApps] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [appId, setAppId] = useState("");
  const [pool, setPool] = useState(2000);
  const [hours, setHours] = useState(48);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ tournaments: T[] }>("/api/tournaments")
      .then((d) => setList(d.tournaments))
      .catch((e) => setErr((e as Error).message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    api<{ apps: { id: string; name: string }[] }>("/api/dashboard")
      .then((d) => {
        setApps(d.apps);
        setAppId((a) => a || d.apps[0]?.id || "");
      })
      .catch(() => {});
  }, [user]);

  const live = list?.filter((t) => t.status === "live") ?? [];
  const past = list?.filter((t) => t.status === "settled") ?? [];

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-bold">Bug hunts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Time-boxed hunts with a prize pool locked in escrow before anyone starts. Severity-weighted
            scoring; the podium splits 50/30/20.
          </p>
        </div>
        {user && apps.length > 0 && (
          <Button className="h-10 rounded-full" onClick={() => setOpen(true)}>
            Host a hunt
          </Button>
        )}
      </header>

      {err && <p className="mt-4 text-sm text-critical">{err}</p>}

      <h2 className="mt-8 font-display text-[16px] font-semibold">Live</h2>
      <div className="mt-2 space-y-3">
        {live.length === 0 && (
          <div className="m3-card p-8 text-center text-sm text-muted-foreground">
            No hunts running right now.
          </div>
        )}
        {live.map((t) => (
          <Link key={t.id} href={`/tournaments/${t.id}`} className="game-surface relative flex items-center gap-3 p-4">
            {t.app && <img src={t.app.icon_url} alt="" className="size-10 rounded-lg border" />}
            <div className="min-w-0">
              <p className="font-display truncate text-[18px] font-semibold" style={{ color: "var(--game-ink)" }}>{t.title}</p>
              <p className="game-muted font-num text-xs">
                {t.app?.name} · {t.entrants} hunters · {left(t.ends_at)}
              </p>
            </div>
            <span className="ml-auto shrink-0 text-lg">
              <Coin n={t.prize_pool} />
            </span>
          </Link>
        ))}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="mt-8 font-display text-[16px] font-semibold">Settled</h2>
          <div className="mt-2 space-y-2">
            {past.map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="m3-card flex items-center gap-3 p-3 text-sm opacity-70"
              >
                <span className="truncate">{t.title}</span>
                <span className="ml-auto shrink-0 font-num text-xs">⬡{t.prize_pool} paid out</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(32,33,36,.6)] p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6">
            <h2 className="font-medium">Host a bug hunt</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              The prize pool leaves your wallet now and is held in escrow until you settle.
            </p>

            <label className="mt-4 block text-xs text-muted-foreground">App</label>
            <select
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="mt-1 h-10 w-full rounded-full border bg-background px-4 text-sm"
            >
              {apps.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-xs text-muted-foreground">Title</label>
            <Input
              className="mt-1 h-10 rounded-full px-4"
              placeholder="Checkout Hunt"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground">Prize pool</label>
                <Input
                  className="mt-1 h-10 rounded-full px-4 font-num"
                  type="number"
                  value={pool}
                  onChange={(e) => setPool(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">Hours</label>
                <Input
                  className="mt-1 h-10 rounded-full px-4 font-num"
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                />
              </div>
            </div>

            <p className="mt-3 font-num text-xs text-muted-foreground">
              🥇 ⬡{Math.floor(pool * 0.5)} · 🥈 ⬡{Math.floor(pool * 0.3)} · 🥉 ⬡{Math.floor(pool * 0.2)}
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" className="h-10 rounded-full" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                className="h-10 rounded-full"
                disabled={busy || !title.trim() || !appId}
                onClick={async () => {
                  setBusy(true);
                  setErr(null);
                  try {
                    await api("/api/tournaments", {
                      method: "POST",
                      body: JSON.stringify({ app_id: appId, title, prize_pool: pool, hours }),
                    });
                    setOpen(false);
                    setTitle("");
                    load();
                  } catch (e) {
                    setErr((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Locking escrow…" : `Lock ⬡${pool} & open`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
