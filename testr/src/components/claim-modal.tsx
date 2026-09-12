"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/lib/session-client";

export function ClaimModal({ bountyId, onClose }: { bountyId: string; onClose: () => void }) {
  const [data, setData] = useState<{
    bounty: {
      title: string;
      mode: string;
      slots: number;
      slots_taken: number;
      reward_current: number;
      severity_payouts: { critical: number; major: number; minor: number };
      trust_tier: string;
    };
    match: { ok: boolean; reason: string };
    trustOk: boolean;
    already: boolean;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { user } = useSession();

  useEffect(() => {
    api<typeof data>(`/api/bounties/${bountyId}`).then(setData);
  }, [bountyId]);

  const claim = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{ claim: { id: string } }>(`/api/bounties/${bountyId}/claim`, { method: "POST" });
      router.push(`/test/${res.claim.id}`);
    } catch (e) {
      setErr((e as Error & { code?: string }).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="rounded-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{data?.bounty.title ?? "Claim"}</DialogTitle>
        </DialogHeader>
        {data && (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">{data.bounty.mode} bounty</p>
            <ul className="space-y-1">
              <li className={data.match.ok ? "text-success" : ""}>{data.match.ok ? "✓" : "✗"} Device · {data.match.reason}</li>
              <li className={data.trustOk ? "text-success" : ""}>{data.trustOk ? "✓" : "✗"} Trust gate · {data.bounty.trust_tier}</li>
              <li className="text-success">✓ Hardware extras</li>
            </ul>
            <p>
              Base reward ⬡{data.bounty.reward_current}. Bug bonuses Critical ⬡{data.bounty.severity_payouts.critical} / Major{" "}
              {data.bounty.severity_payouts.major} / Minor {data.bounty.severity_payouts.minor}.
            </p>
            <p>Time limit 2 hours on this slot.</p>
            <p className="text-xs text-muted-foreground">
              Claiming holds 1 of {data.bounty.slots} slots. Abandoning twice in a week costs trust.
            </p>
            {err && <p className="text-critical">{err}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="h-10 rounded-full" onClick={onClose}>
                Cancel
              </Button>
              <Button className="h-10 rounded-full" disabled={busy || !user} onClick={claim}>
                {busy ? "Claiming…" : "Claim & start"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
