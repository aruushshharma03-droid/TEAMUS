"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/shell";
import { api, Coin, relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useRealtime } from "@/lib/use-realtime";
import { useSession } from "@/lib/session-client";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TiltCard } from "@/components/tilt-card";
import { Coin3D } from "@/components/three/coin";

type Wallet = {
  balance: number;
  escrow: number;
  earned: number;
  ledger: Array<{ id: string; type: string; memo: string; amount: number; sign: number; created_at: string }>;
  escrowCards: Array<{ bounty_id: string; title: string; amount_locked: number; amount_spent: number }>;
  trust: number;
  tier: string;
  name: string;
  is_pro: boolean;
};

const packs = [
  { id: "pack-500", coins: 500, inr: 499, tag: "" },
  { id: "pack-1200", coins: 1200, inr: 999, tag: "POPULAR" },
  { id: "pack-3000", coins: 3000, inr: 2199, tag: "save 27%" },
  { id: "pack-10000", coins: 10000, inr: 6999, tag: "save 30%" },
];

export default function WalletPage() {
  const { user } = useSession();
  const [w, setW] = useState<Wallet | null>(null);
  const [rewards, setRewards] = useState<{ id: string; title: string; description: string; partner: string; kind: string; cost_coins: number }[]>([]);
  const [filter, setFilter] = useState("all");
  const [bob, setBob] = useState<typeof packs[0] | null>(null);
  const [phase, setPhase] = useState<"form" | "spin" | "ok">("form");
  const [code, setCode] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Wallet>("/api/wallet").then(setW).catch(() => setW(null));
    api<{ rewards: typeof rewards }>("/api/rewards").then((d) => setRewards(d.rewards));
  }, []);
  useEffect(() => { load(); }, [load]);
  useRealtime(useCallback((msg: Record<string, unknown>) => {
    if (msg.channel === "wallets") load();
  }, [load]));

  const pay = async () => {
    if (!bob) return;
    setPhase("spin");
    try {
      await api("/api/wallet/topup", { method: "POST", body: JSON.stringify({ package_id: bob.id }) });
      setPhase("ok");
      load();
    } catch {
      setPhase("form");
    }
  };

  return (
    <AppShell>
      {!user && <p>Sign in to open your wallet. <Link className="text-primary" href="/auth">Sign in</Link></p>}
      {w && (
        <>
          {/* The vault. Same tilt primitive as the hunter card and hunt banners. */}
          <TiltCard
            className="gold-sweep overflow-hidden rounded-2xl p-6"
            max={7}
            sheen={false}
            style={{
              background: "linear-gradient(135deg, #23292e 0%, #2f2a1b 48%, #1b1d21 100%)",
              color: "white",
              boxShadow: "0 24px 60px -28px rgba(249,171,0,.55)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                background:
                  "radial-gradient(460px circle at var(--hx, 30%) var(--hy, 20%), rgba(253,214,99,.35), transparent 48%)",
              }}
            />
            <div className="relative flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <p
                  className="text-[11px] font-medium tracking-[0.18em] uppercase"
                  style={{ color: "var(--gold)" }}
                >
                  testr wallet
                </p>
                <p className="mt-1 text-sm opacity-90">
                  {w.name} · trust {w.trust} · {w.tier}
                </p>
                <p className="mt-6 font-num text-5xl tracking-tight">
                  <Coin n={w.balance} style={{ color: "#ffffff" }} />
                </p>
                <p className="mt-2 font-num text-sm opacity-90">
                  Escrow ⬡{w.escrow} · lifetime earned ⬡{w.earned}
                </p>
              </div>
              {/* Re-mounts on balance change, so the coin spins up whenever coins land. */}
              <div className="hidden shrink-0 sm:block">
                <Coin3D key={w.balance} size={132} spin={1.1} />
              </div>
            </div>
          </TiltCard>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              className="h-10 rounded-full border-0 font-semibold"
              style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-deep))", color: "#3d2c00" }}
              onClick={() => { setBob(packs[1]); setPhase("form"); }}
            >
              Add coins
            </Button>
            <Button variant="outline" className="h-10 rounded-full" asChild><Link href="#redeem">Redeem</Link></Button>
            <Button variant="outline" className="h-10 rounded-full" asChild><Link href="/bounties/new">Post a bounty</Link></Button>
          </div>

          <Tabs defaultValue="activity" className="mt-8">
            <TabsList className="rounded-full">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="escrow">Escrow</TabsTrigger>
              <TabsTrigger value="redeem">Redeem</TabsTrigger>
              <TabsTrigger value="pro">Pro</TabsTrigger>
            </TabsList>
            <TabsContent value="activity" className="mt-4 space-y-2">
              {w.ledger.map((l) => (
                <div key={l.id} className="flex items-center justify-between border-b py-2 text-sm">
                  <div>
                    <p>{l.memo}</p>
                    <p className="text-xs text-muted-foreground">{l.type} · {relativeTime(l.created_at)}</p>
                  </div>
                  <span className={`font-num ${l.sign > 0 ? "text-success" : "text-critical"}`}>
                    {l.sign > 0 ? "+" : "−"}⬡{l.amount}
                  </span>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="escrow" className="mt-4 space-y-3">
              {w.escrowCards.map((e) => (
                <div key={e.bounty_id} className="m3-card p-4">
                  <p className="font-medium">{e.title}</p>
                  <p className="font-num text-xs">locked {e.amount_locked} · paid {e.amount_spent} · remaining {e.amount_locked - e.amount_spent}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: `${(100 * e.amount_spent) / e.amount_locked}%`,
                        background: "linear-gradient(90deg, var(--gold-deep), var(--gold))",
                      }}
                    />
                  </div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="redeem" className="mt-4" id="redeem">
              <div className="mb-3 flex gap-2 overflow-x-auto">
                {["all", "bob", "app", "giftcard"].map((f) => (
                  <button key={f} onClick={() => setFilter(f)} className={`h-8 rounded-full border px-3 text-sm ${filter === f ? "bg-primary-container text-primary" : ""}`}>
                    {f === "all" ? "All" : f === "bob" ? "Bank of Baroda" : f === "app" ? "Apps on testr" : "Gift cards"}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {rewards.filter((r) => filter === "all" || r.kind === filter).map((r) => {
                  const unaffordable = w.balance < r.cost_coins;
                  return (
                    <div key={r.id} className={`m3-card p-4 ${unaffordable ? "opacity-50" : ""}`}>
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.partner} · {r.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <Coin n={r.cost_coins} />
                        <Button
                          className="h-10 rounded-full"
                          disabled={unaffordable}
                          onClick={async () => {
                            const d = await api<{ redemption: { code: string } }>(`/api/rewards/${r.id}/redeem`, { method: "POST" });
                            setCode(d.redemption.code);
                            load();
                          }}
                        >
                          Get
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {code && <p className="mt-3 text-sm">Coupon <span className="font-num">{code}</span></p>}
              <p className="mt-6 text-xs text-muted-foreground">
                Coins are closed-loop and redeem for goods and offers only. They are not redeemable for cash and are not a payment instrument.
              </p>
            </TabsContent>
            <TabsContent value="pro" className="mt-4 m3-card p-5">
              <h3 className="font-medium">testr Pro · ₹499/mo</h3>
              <ul className="mt-3 list-disc pl-5 text-sm">
                <li>Verified badge</li>
                <li>AI triage clustering</li>
                <li>Private bounties</li>
                <li>Spend analytics</li>
                <li>GST invoices</li>
              </ul>
              <p className="mt-3 text-sm">{w.is_pro ? "You are on Pro." : "Subscribe from the redeem catalog with coins."}</p>
            </TabsContent>
          </Tabs>
        </>
      )}

      {bob && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(32,33,36,.6)] p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 text-[#202124]">
            <div className="flex items-center justify-between">
              <p className="text-lg font-medium" style={{ color: "#f57c00" }}>Bank of Baroda</p>
              <span className="rounded-full bg-[#fff3e0] px-2 py-0.5 text-[11px]">Secure · 256-bit</span>
            </div>
            {phase === "form" && (
              <>
                <p className="mt-4 text-sm">Payee testr technologies · ₹{bob.inr} for ⬡{bob.coins} test coins</p>
                <div className="mt-4 space-y-2 text-sm">
                  <label className="flex gap-2"><input type="radio" defaultChecked name="m" /> Savings · XX4291 · ₹1,24,300.00</label>
                  <label className="flex gap-2"><input type="radio" name="m" /> Debit card · •••• 4412</label>
                  <label className="flex gap-2"><input type="radio" name="m" /> UPI · mira@okbob</label>
                </div>
                <p className="mt-3 text-[11px] text-[#5f6368]">Simulated rail only. No Bank of Baroda API is called.</p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" className="h-10 rounded-full" onClick={() => setBob(null)}>Cancel</Button>
                  <Button className="h-10 rounded-full bg-[#f57c00] hover:bg-[#ef6c00]" onClick={pay}>Pay ₹{bob.inr}</Button>
                </div>
              </>
            )}
            {phase === "spin" && <p className="py-10 text-center text-sm">Processing with Bank of Baroda…</p>}
            {phase === "ok" && (
              <div className="py-8 text-center">
                <p className="text-success">Payment successful</p>
                <Button className="mt-4 h-10 rounded-full" onClick={() => setBob(null)}>Done</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
