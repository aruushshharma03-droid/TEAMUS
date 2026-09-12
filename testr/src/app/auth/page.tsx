"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/format";
import { useSession } from "@/lib/session-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Suspense } from "react";

function AuthInner() {
  const [email, setEmail] = useState("ananya@testr.dev");
  const [password, setPassword] = useState("demo-tester");
  const [handle, setHandle] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { refresh } = useSession();
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/";

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const data = await api<{ user: { needs_device: boolean } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          handle: mode === "up" ? handle : undefined,
          display_name: handle,
        }),
      });
      await refresh();
      router.push(data.user.needs_device ? "/onboarding/device" : next);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border p-8">
        <Link href="/" className="text-lg font-medium">
          ⬡ testr
        </Link>
        <h1 className="mt-6 text-[20px] font-medium">
          {mode === "in" ? "Sign in" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">One account. Earn and spend in the same wallet.</p>
        <div className="mt-6 space-y-3">
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 rounded-full px-4" />
          {mode === "up" && (
            <Input placeholder="Handle" value={handle} onChange={(e) => setHandle(e.target.value)} className="h-10 rounded-full px-4" />
          )}
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 rounded-full px-4"
          />
          {err && <p className="text-sm text-critical">{err}</p>}
          <Button className="h-10 w-full rounded-full" onClick={submit} disabled={busy}>
            {busy ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
          </Button>
          <Button variant="outline" className="h-10 w-full rounded-full" disabled>
            Continue with Google (connect Supabase OAuth)
          </Button>
        </div>
        <p className="mt-6 text-sm">
          Demo · tester{" "}
          <button className="text-primary" onClick={() => { setEmail("ananya@testr.dev"); setPassword("demo-tester"); }}>
            ananya@testr.dev / demo-tester
          </button>
          <br />
          Demo · developer{" "}
          <button className="text-primary" onClick={() => { setEmail("mira@testr.dev"); setPassword("demo-dev"); }}>
            mira@testr.dev / demo-dev
          </button>
        </p>
        <button className="mt-4 text-sm text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Need an account?" : "Already have one?"}
        </button>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthInner />
    </Suspense>
  );
}
