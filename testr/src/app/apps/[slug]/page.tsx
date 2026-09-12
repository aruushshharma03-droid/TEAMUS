"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell";
import { api, Coin, relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session-client";
import { useRealtime } from "@/lib/use-realtime";
import { ClaimModal } from "@/components/claim-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Payload = {
  app: { id: string; name: string; slug: string; icon_url: string; tagline: string; category: string; is_verified: boolean; tester_rating: number; platforms: string[] };
  owner: { handle: string; is_pro?: boolean };
  bounties: Array<{
    id: string;
    title: string;
    mode: string;
    focus_tags: string[];
    reward_current: number;
    reward_max: number;
    slots: number;
    slots_taken: number;
    expires_at: string;
    trust_tier: string;
    status: string;
    match: { ok: boolean; reason: string };
    requirements: { platforms: string[]; os?: string; ram_gb?: number; storage_mb?: number; hardware?: string[]; locales?: string[]; offline?: boolean };
  }>;
  issues: Array<{
    id: string;
    title: string;
    severity: string;
    first_finder?: string;
    created_at: string;
    repros: number;
    payout: number;
    excerpt: string | null;
    hidden: boolean;
    status: string;
    is_public: boolean;
  }>;
  releases: Array<{ version: string; shipped_at: string; notes: string; credits: (string | undefined)[]; issue_ids: string[] }>;
  stats: { bugs: number; critical: number; testers: number; coins: number; rating: number };
  following: boolean;
  isOwner: boolean;
};

export default function AppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [data, setData] = useState<Payload | null>(null);
  const [claim, setClaim] = useState<string | null>(null);
  const { user } = useSession();

  const load = useCallback(() => {
    api<Payload>(`/api/apps/${slug}`).then(setData);
  }, [slug]);
  useEffect(() => {
    load();
  }, [load]);
  useRealtime(useCallback((msg: Record<string, unknown>) => {
    if (msg.channel === "bounties" || msg.channel === "events") load();
  }, [load]));

  if (!data) return <AppShell><div className="p-8 text-muted-foreground">Loading app…</div></AppShell>;
  const req = data.bounties[0]?.requirements;

  return (
    <AppShell>
      <header className="flex flex-col gap-4 md:flex-row md:items-center">
        <img src={data.app.icon_url} alt="" className="size-[72px] rounded-lg border" />
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-[20px] font-medium">
            {data.app.name}
            {data.app.is_verified && <span className="text-primary">✓</span>}
            {data.owner && <span className="rounded-full bg-primary-container px-2 py-0.5 text-xs text-primary">Pro</span>}
          </h1>
          <p className="text-sm text-muted-foreground">
            @{data.owner.handle} · {data.app.category} · {data.app.tagline}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-full"
            onClick={async () => {
              await api(`/api/follows/${data.app.id}`, { method: "POST" });
              load();
            }}
          >
            {data.following ? "Following" : "Follow"}
          </Button>
          {data.bounties[0] && (
            <Button className="h-10 rounded-full" onClick={() => setClaim(data.bounties[0].id)}>
              Claim a bounty
            </Button>
          )}
        </div>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-5">
        {[
          ["Bugs found", data.stats.bugs],
          ["Critical", data.stats.critical],
          ["Testers", data.stats.testers],
          ["Coins paid", data.stats.coins],
          ["Rating", data.stats.rating.toFixed(1)],
        ].map(([k, v]) => (
          <div key={String(k)} className="m3-card p-3">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="font-num text-lg">{v}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="bounties" className="mt-8">
        <TabsList className="rounded-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bounties">Bounties</TabsTrigger>
          <TabsTrigger value="bugs">Bug finds</TabsTrigger>
          <TabsTrigger value="log">Changelog</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          {req && (
            <div className="m3-card p-5">
              <h3 className="font-medium">Requirements</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {req.platforms.join(", ")} · {req.os} · {req.ram_gb}GB RAM · {req.storage_mb ?? 200}MB ·{" "}
                {(req.hardware ?? []).join(", ") || "no extra hardware"} · {(req.locales ?? []).join(", ")} ·{" "}
                {req.offline ? "offline OK" : "network required"}
              </p>
              <hr className="my-3" />
              <p className="text-sm">
                Your device · {data.bounties[0].match.ok ? (
                  <span className="text-success">✓ {data.bounties[0].match.reason}</span>
                ) : (
                  <span className="text-muted-foreground">⚠ {data.bounties[0].match.reason}</span>
                )}
              </p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="bounties" className="mt-4 space-y-3">
          {data.bounties.map((b) => (
            <div key={b.id} className="m3-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{b.title}</h3>
                  <p className="text-xs text-muted-foreground">{b.focus_tags.join(" · ")} · {b.mode}</p>
                  <p className="mt-2 font-num text-sm">
                    ⬡ {b.reward_current} → max {b.reward_max}
                    <span className="ml-2 text-major">{b.status === "heating" ? "▁▂▃▅" : ""}</span>
                  </p>
                  <p className="mt-1 font-num text-xs">
                    {"●".repeat(b.slots_taken)}
                    {"○".repeat(Math.max(0, b.slots - b.slots_taken))} {b.slots_taken} of {b.slots}
                    {" · "}
                    {relativeTime(b.expires_at).replace("ago", "left")}
                    {" · Trust "}
                    {b.trust_tier}
                  </p>
                </div>
                <div className="flex gap-2">
                  {data.isOwner && (
                    <Button asChild variant="outline" className="h-10 rounded-full">
                      <Link href={`/triage/${b.id}`}>Triage</Link>
                    </Button>
                  )}
                  <Button className="h-10 rounded-full" disabled={!user} onClick={() => setClaim(b.id)}>
                    {user ? "Claim" : "Sign in to test"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="bugs" className="mt-4 space-y-2">
          {data.issues.map((i) => (
            <div
              key={i.id}
              className="m3-card p-4"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: i.severity === "critical" ? "#d93025" : i.severity === "major" ? "#f29900" : "#5f6368",
              }}
            >
              <p className="font-medium">{i.title}</p>
              <p className="text-xs text-muted-foreground">
                @{i.first_finder} · {relativeTime(i.created_at)} · {i.repros} repros · <Coin n={i.payout} />
              </p>
              <p className="mt-2 text-sm">
                {i.hidden ? "🔒 Details hidden until fixed" : i.excerpt}
              </p>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="log" className="mt-4 space-y-3">
          {data.releases.map((r) => (
            <div key={r.version} className="m3-card p-4">
              <p className="text-success">
                ✓ v{r.version} · {relativeTime(r.shipped_at)} · fixed {r.issue_ids.length} bugs found on testr
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                credits {r.credits.filter(Boolean).map((h) => `@${h}`).join(" ")}
              </p>
            </div>
          ))}
          {data.releases.length === 0 && <p className="text-sm text-muted-foreground">No releases yet.</p>}
        </TabsContent>
      </Tabs>

      {claim && (
        <ClaimModal
          bountyId={claim}
          onClose={() => setClaim(null)}
        />
      )}
    </AppShell>
  );
}
