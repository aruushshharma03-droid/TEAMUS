"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell";
import { api, Coin } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session-client";

type Dash = {
  balance: number;
  pending: number;
  asTester: { bugs: number; claims: number };
  apps: Array<{
    id: string;
    name: string;
    slug: string;
    bounties: Array<{ id: string; title: string; status: string; slots: number; slots_taken: number; pending: number }>;
  }>;
};

export default function DashboardPage() {
  const { user } = useSession();
  const [d, setD] = useState<Dash | null>(null);
  useEffect(() => {
    api<Dash>("/api/dashboard").then(setD).catch(() => setD(null));
  }, [user]);

  return (
    <AppShell>
      <h1 className="text-[20px] font-medium">Developer dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Same account as tester. Review clustered issues, approve payouts from escrow, or jump back to the feed to earn.
      </p>
      {d && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="m3-card p-4">
              <p className="text-xs text-muted-foreground">Wallet</p>
              <Coin n={d.balance} className="text-2xl" />
            </div>
            <div className="m3-card p-4">
              <p className="text-xs text-muted-foreground">Reports awaiting your call</p>
              <p className="font-num text-2xl">{d.pending}</p>
            </div>
            <div className="m3-card p-4">
              <p className="text-xs text-muted-foreground">You as tester</p>
              <p className="font-num text-2xl">{d.asTester.bugs} confirmed</p>
              <p className="text-xs text-muted-foreground">{d.asTester.claims} sessions claimed</p>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button asChild className="h-10 rounded-full">
              <Link href="/bounties/new">Post a bounty</Link>
            </Button>
            <Button asChild variant="outline" className="h-10 rounded-full">
              <Link href="/">Earn coins testing</Link>
            </Button>
          </div>
          <ul className="mt-6 space-y-3">
            {d.apps.map((a) => (
              <li key={a.id} className="m3-card p-4">
                <div className="flex items-center justify-between">
                  <Link href={`/apps/${a.slug}`} className="font-medium">
                    {a.name}
                  </Link>
                </div>
                {a.bounties.map((b) => (
                  <Link key={b.id} href={`/triage/${b.id}`} className="mt-2 flex justify-between text-sm">
                    <span>
                      {b.title} · {b.status} · {b.slots_taken}/{b.slots}
                    </span>
                    <span className="font-num">{b.pending} pending</span>
                  </Link>
                ))}
                {a.bounties.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No bounties yet.</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}
