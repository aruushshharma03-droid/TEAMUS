"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/format";
import { useSession } from "@/lib/session-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const interests = ["productivity", "fintech", "health", "games", "devtools", "climate", "commerce"];

export default function DevicePage() {
  const [os, setOs] = useState("Android");
  const [os_version, setV] = useState("14");
  const [device, setDevice] = useState("Pixel 7");
  const [ram_gb, setRam] = useState(8);
  const [screen, setScreen] = useState("1080x2400");
  const [locale, setLocale] = useState("en-IN");
  const [picked, setPicked] = useState<string[]>(["productivity"]);
  const [err, setErr] = useState<string | null>(null);
  const { refresh } = useSession();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-[20px] font-medium">Your device profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This is how we match you to bounties. It cannot be skipped — eligibility, claims and “matches you” all read from it.
      </p>
      <div className="mt-6 grid gap-3">
        <label className="text-xs">OS
          <select className="mt-1 h-10 w-full rounded-full border px-3" value={os} onChange={(e) => setOs(e.target.value)}>
            {["Android", "iOS", "Windows", "macOS", "Web"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <Input value={os_version} onChange={(e) => setV(e.target.value)} placeholder="OS version" className="h-10 rounded-full px-4" />
        <Input value={device} onChange={(e) => setDevice(e.target.value)} placeholder="Device" className="h-10 rounded-full px-4" />
        <label className="text-xs">RAM
          <select className="mt-1 h-10 w-full rounded-full border px-3" value={ram_gb} onChange={(e) => setRam(Number(e.target.value))}>
            {[4, 6, 8, 12, 16].map((n) => (
              <option key={n} value={n}>{n} GB</option>
            ))}
          </select>
        </label>
        <Input value={screen} onChange={(e) => setScreen(e.target.value)} placeholder="Screen" className="h-10 rounded-full px-4" />
        <Input value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="Locale" className="h-10 rounded-full px-4" />
        <div className="flex flex-wrap gap-2">
          {interests.map((i) => (
            <button
              key={i}
              onClick={() => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))}
              className={`h-8 rounded-full border px-3 text-sm ${picked.includes(i) ? "bg-primary-container text-primary" : ""}`}
            >
              {i}
            </button>
          ))}
        </div>
        {err && <p className="text-sm text-critical">{err}</p>}
        <Button
          className="h-10 rounded-full"
          onClick={async () => {
            try {
              await api("/api/profile/device", {
                method: "PATCH",
                body: JSON.stringify({ os, os_version, device, ram_gb, screen, locale, interests: picked }),
              });
              await refresh();
              router.push("/");
            } catch (e) {
              setErr((e as Error).message);
            }
          }}
        >
          Save and enter testr
        </Button>
      </div>
    </div>
  );
}
