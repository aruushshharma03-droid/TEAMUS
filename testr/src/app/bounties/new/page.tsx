"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shell";
import { api, Coin } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TIER_FLOORS, type TrustTier } from "@/lib/types";

const tiers: TrustTier[] = ["open", "verified", "trusted", "expert"];

export default function NewBounty() {
  const [apps, setApps] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [app_id, setApp] = useState("");
  const [title, setTitle] = useState("NoteFlow share-sheet follow-up");
  const [description, setDesc] = useState("Walk the share flow on Android 14.");
  const [guided, setGuided] = useState(true);
  const [open, setOpen] = useState(true);
  const [steps, setSteps] = useState([
    "Install the kit",
    "Create a note with a photo",
    "Share via the system sheet",
    "Relaunch and confirm the photo",
  ]);
  const [tier, setTier] = useState<TrustTier>("verified");
  const [slots, setSlots] = useState(5);
  const [start, setStart] = useState(80);
  const [max, setMax] = useState(140);
  const [esc, setEsc] = useState(true);
  const [pool, setPool] = useState(400);
  const [crit, setCrit] = useState(400);
  const [maj, setMaj] = useState(200);
  const [min, setMin] = useState(60);
  const [link, setLink] = useState("https://noteflow.testr.dev/beta");
  const [instr, setInstr] = useState("Sign in with the tester account. Do not touch production.");
  const [creds, setCreds] = useState("tester@noteflow / Kit-Note!");
  const [showCreds, setShow] = useState(false);
  const [qualify, setQualify] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api<{ apps: { id: string; name: string; slug: string; owner_id?: string }[] }>("/api/apps").then((d) => {
      setApps(d.apps);
      if (d.apps[0]) setApp(d.apps[0].id);
    });
  }, []);
  useEffect(() => {
    fetch(`/api/meta/qualify?tier=${tier}&ram=4&os=Android`)
      .then((r) => r.json())
      .then((j) => setQualify(j.data.count));
  }, [tier]);

  const mode = guided && open ? "both" : guided ? "guided" : "open";
  const lock = slots * max + (open ? pool : 0);
  const floor = TIER_FLOORS[tier];
  const clears = start >= floor && max >= floor;

  const post = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/bounties", {
        method: "POST",
        body: JSON.stringify({
          app_id,
          title,
          description,
          mode,
          script: steps.map((instruction, i) => ({ order: i + 1, instruction })),
          focus_tags: ["share", "android"],
          out_of_scope: ["copy"],
          requirements: { platforms: ["apk", "web"], os: "Android", ram_gb: 4, locales: ["en-IN"] },
          trust_tier: tier,
          slots,
          reward_start: start,
          reward_max: max,
          step_amount: 10,
          step_interval_min: 1,
          bug_pool: open ? pool : 0,
          severity_payouts: { critical: crit, major: maj, minor: min },
          duration_hours: 24,
          kit: { external_url: link, instructions_md: instr, credentials_encrypted: creds },
        }),
      });
      router.push("/");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-8">
          <h1 className="text-[20px] font-medium">Post a bounty</h1>
          <section>
            <h2 className="text-sm font-medium">1 · What are you testing</h2>
            <select className="mt-2 h-10 w-full rounded-full border px-3" value={app_id} onChange={(e) => setApp(e.target.value)}>
              {apps.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <Input className="mt-2 h-10 rounded-full px-4" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea className="mt-2" value={description} onChange={(e) => setDesc(e.target.value)} />
          </section>
          <section>
            <h2 className="text-sm font-medium">2 · Test Kit</h2>
            <Input className="mt-2 h-10 rounded-full px-4" value={link} onChange={(e) => setLink(e.target.value)} placeholder="External beta link" />
            <Textarea className="mt-2" value={instr} onChange={(e) => setInstr(e.target.value)} />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showCreds} onChange={(e) => setShow(e.target.checked)} /> Reveal credentials
            </label>
            {showCreds && <Input className="mt-2 h-10 rounded-full px-4" value={creds} onChange={(e) => setCreds(e.target.value)} />}
          </section>
          <section>
            <h2 className="text-sm font-medium">3 · Bounty type</h2>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <button className={`m3-card p-4 text-left ${guided ? "ring-2 ring-primary" : ""}`} onClick={() => setGuided(!guided)}>
                <p className="font-medium">Guided test</p>
                <p className="text-sm text-muted-foreground">Scripted workflow track.</p>
              </button>
              <button className={`m3-card p-4 text-left ${open ? "ring-2 ring-primary" : ""}`} onClick={() => setOpen(!open)}>
                <p className="font-medium">Open bug bounty</p>
                <p className="text-sm text-muted-foreground">Hunt anything, pay by severity.</p>
              </button>
            </div>
            {guided && (
              <ol className="mt-3 space-y-2">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-num text-xs">{i + 1}</span>
                    <Input className="h-10 rounded-full px-4" value={s} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? e.target.value : x)))} />
                  </li>
                ))}
              </ol>
            )}
            {open && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <label>Critical <Input type="number" value={crit} onChange={(e) => setCrit(+e.target.value)} className="h-10 rounded-full px-3 font-num" /></label>
                <label>Major <Input type="number" value={maj} onChange={(e) => setMaj(+e.target.value)} className="h-10 rounded-full px-3 font-num" /></label>
                <label>Minor <Input type="number" value={min} onChange={(e) => setMin(+e.target.value)} className="h-10 rounded-full px-3 font-num" /></label>
                <label className="col-span-3">Bug pool <Input type="number" value={pool} onChange={(e) => setPool(+e.target.value)} className="h-10 rounded-full px-3 font-num" /></label>
              </div>
            )}
          </section>
          <section>
            <h2 className="text-sm font-medium">4 · Who can test this</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {tiers.map((t) => (
                <button key={t} onClick={() => setTier(t)} className={`m3-card p-3 text-left ${tier === t ? "ring-2 ring-primary" : ""}`}>
                  <p className="capitalize">{t}</p>
                  <p className="font-num text-xs text-muted-foreground">min ⬡{TIER_FLOORS[t]}</p>
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm">{qualify ?? "…"} testers qualify · min reward ⬡{floor}</p>
          </section>
          <section>
            <h2 className="text-sm font-medium">5 · Reward</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label>Slots <Input type="number" value={slots} onChange={(e) => setSlots(+e.target.value)} className="h-10 rounded-full px-3 font-num" /></label>
              <label>Start <Input type="number" value={start} onChange={(e) => setStart(+e.target.value)} className="h-10 rounded-full px-3 font-num" /></label>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={esc} onChange={(e) => setEsc(e.target.checked)} /> Escalation
              </label>
              {esc && <label>Max <Input type="number" value={max} onChange={(e) => setMax(+e.target.value)} className="h-10 rounded-full px-3 font-num" /></label>}
            </div>
            <p className="mt-2 font-num text-sm">⬡{start} ──▁▂▃▅──→ ⬡{max}</p>
            <p className={`text-sm ${clears ? "text-success" : "text-critical"}`}>
              {clears ? `Clears ${tier} floor ⬡${floor}` : `Below ${tier} floor ⬡${floor}`}
            </p>
          </section>
        </div>
        <aside className="h-fit lg:sticky lg:top-20">
          <div className="m3-card p-4">
            <p className="text-xs text-muted-foreground">Escrow</p>
            <p className="mt-2 text-sm">
              {slots} slots × ⬡{max} max {open ? `+ ⬡${pool} pool` : ""} = <Coin n={lock} /> will lock
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Escrow locks at the maximum reward so escalation is always payable. Unused coins return on expiry.
            </p>
            {err && <p className="mt-2 text-sm text-critical">{err}</p>}
            <Button className="mt-4 h-10 w-full rounded-full" disabled={busy || !clears} onClick={post}>
              {busy ? "Locking…" : "Post & lock coins"}
            </Button>
            <Button variant="ghost" className="mt-1 h-10 w-full rounded-full" disabled>
              Save draft
            </Button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
