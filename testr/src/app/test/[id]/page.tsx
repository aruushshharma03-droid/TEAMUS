"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, Coin } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { ConsoleLine, Severity } from "@/lib/types";

type Data = {
  claim: { id: string; expires_at: string };
  bounty: {
    id: string;
    title: string;
    mode: string;
    script: { order: number; instruction: string }[];
    out_of_scope: string[];
    reward_current: number;
    severity_payouts: Record<Severity, number>;
  };
  app: { name: string; slug: string };
  submission: {
    id: string;
    step_notes: { step_order: number; note: string; flagged_bug_id: string | null }[];
    time_on_task_sec: number;
    env: Record<string, unknown>;
  };
  bugs: Array<{ id: string; title: string; proposed_severity: Severity }>;
  kit: { external_url: string | null; instructions_md: string; credentials_encrypted: string | null } | null;
};

/** Console/logcat output the tester pastes in. One line in, one ConsoleLine out. */
function parseLogs(raw: string): ConsoleLine[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-80)
    .map((message, i) => ({
      t: i,
      level: /error|exception|fatal|crash/i.test(message)
        ? ("error" as const)
        : /warn/i.test(message)
          ? ("warn" as const)
          : ("log" as const),
      message,
    }));
}

export default function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Data | null>(null);
  const [active, setActive] = useState(1);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sev, setSev] = useState<Severity>("major");
  const [repro, setRepro] = useState("");
  const [rawLogs, setRawLogs] = useState("");
  const [shots, setShots] = useState<string[]>([]);
  const [left, setLeft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const started = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    started.current = Date.now();
  }, []);

  const load = useCallback(() => {
    api<Data>(`/api/claims/${id}`).then((d) => {
      setData(d);
      const firstOpen = d.submission.step_notes.find((n) => !n.note)?.step_order ?? 1;
      setActive(firstOpen);
    });
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => {
      if (!data) return;
      const ms = new Date(data.claim.expires_at).getTime() - Date.now();
      const m = Math.max(0, Math.floor(ms / 60000));
      setLeft(`${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(t);
  }, [data]);

  const logs = useMemo(() => parseLogs(rawLogs), [rawLogs]);

  const estimate = useMemo(() => {
    if (!data) return 0;
    let n = data.bounty.reward_current;
    for (const s of ["critical", "major", "minor"] as Severity[]) {
      n += data.bugs.filter((b) => b.proposed_severity === s).length * data.bounty.severity_payouts[s];
    }
    return n;
  }, [data]);

  const attach = async (files: FileList | null) => {
    if (!files?.length) return;
    const paths: string[] = [];
    for (const f of Array.from(files)) {
      try {
        const up = await api<{ path: string }>("/api/upload", {
          method: "POST",
          body: JSON.stringify({
            bucket: "evidence",
            filename: f.name,
            contentType: f.type || "image/png",
            size: f.size,
          }),
        });
        paths.push(up.path);
      } catch (e) {
        setErr((e as Error).message);
      }
    }
    setShots((s) => [...s, ...paths]);
  };

  const saveNote = async () => {
    if (!data) return;
    await api("/api/submissions", {
      method: "POST",
      body: JSON.stringify({
        submission_id: data.submission.id,
        step_notes: data.submission.step_notes,
        time_on_task_sec: Math.round((Date.now() - started.current) / 1000),
      }),
    });
  };

  const report = async () => {
    if (!data || !title.trim()) {
      setErr("Add a short title");
      return;
    }
    if (shots.length === 0) {
      setErr("Attach at least one screenshot — the dev pays to open this report");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api("/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          submission_id: data.submission.id,
          step_notes: data.submission.step_notes.map((n) =>
            n.step_order === active ? { ...n, note: n.note || body || title } : n
          ),
          bugs: [
            {
              title,
              body,
              repro_steps: repro.split("\n").filter(Boolean),
              proposed_severity: sev,
              from_step: active,
              screenshots: shots,
              console_logs: logs,
            },
          ],
        }),
      });
      setSaved(true);
      setTitle("");
      setBody("");
      setRepro("");
      setRawLogs("");
      setShots([]);
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!data) return;
    setBusy(true);
    try {
      await api("/api/submissions", {
        method: "POST",
        body: JSON.stringify({
          submission_id: data.submission.id,
          time_on_task_sec: Math.round((Date.now() - started.current) / 1000),
          step_notes: data.submission.step_notes,
        }),
      });
      await api(`/api/submissions/${data.submission.id}/submit`, { method: "POST" });
      router.push("/");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return <p className="p-8 text-sm text-muted-foreground">Opening test session…</p>;
  }

  const step = data.bounty.script.find((s) => s.order === active);
  const target = data.kit?.external_url ?? null;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3">
        <Link href="/" className="font-medium">
          ⬡ testr
        </Link>
        <span className="truncate text-sm text-muted-foreground">
          {data.app.name} · {data.bounty.title}
        </span>
        <span className="ml-auto font-num text-sm">{left} left</span>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Test Kit — the tester runs the real build on their own device */}
        <section className="min-h-0 overflow-y-auto p-5">
          <h1 className="text-[20px] font-medium">Test Kit · {data.app.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Run the build on your own device, then work the steps on the right.
          </p>

          <div className="m3-card mt-4 p-4">
            <p className="text-xs font-medium text-muted-foreground">Target build</p>
            {target ? (
              <>
                <a
                  href={target}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block truncate text-primary"
                >
                  {target}
                </a>
                <Button asChild className="mt-3 h-10 rounded-full">
                  <a href={target} target="_blank" rel="noopener noreferrer">
                    Open the app
                  </a>
                </Button>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No build link on this kit.</p>
            )}
          </div>

          <div className="m3-card mt-3 p-4">
            <p className="text-xs font-medium text-muted-foreground">Install &amp; run</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{data.kit?.instructions_md}</p>
          </div>

          {data.kit?.credentials_encrypted && (
            <div className="m3-card mt-3 p-4">
              <p className="text-xs font-medium text-muted-foreground">Test credentials</p>
              {showCreds ? (
                <p className="mt-2 font-num text-sm">{data.kit.credentials_encrypted}</p>
              ) : (
                <Button
                  variant="outline"
                  className="mt-2 h-9 rounded-full"
                  onClick={() => setShowCreds(true)}
                >
                  Reveal credentials
                </Button>
              )}
            </div>
          )}

          <div className="m3-card mt-3 p-4">
            <p className="text-xs font-medium text-muted-foreground">Your environment</p>
            <p className="mt-2 font-num text-xs">
              {Object.entries(data.submission.env)
                .filter(([, v]) => v)
                .map(([k, v]) => `${k}: ${String(v)}`)
                .join(" · ")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Attached to every bug you file, so the dev can correlate environments.
            </p>
          </div>

          {data.bounty.out_of_scope.length > 0 && (
            <div className="m3-card mt-3 p-4">
              <p className="text-xs font-medium text-muted-foreground">Out of scope</p>
              <p className="mt-2 text-sm">{data.bounty.out_of_scope.join(", ")}</p>
            </div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col overflow-y-auto border-t lg:border-t-0 lg:border-l">
          <div className="border-b p-3">
            <p className="font-num text-xs">
              {data.bounty.script.map((s) => (s.order <= active ? "●" : "○")).join("──")} {active}/
              {data.bounty.script.length}
            </p>
            <p className="mt-2 text-sm font-medium">{step?.instruction}</p>
            <Textarea
              className="mt-2"
              placeholder="How did it go?"
              value={data.submission.step_notes.find((n) => n.step_order === active)?.note ?? ""}
              onChange={(e) => {
                const step_notes = data.submission.step_notes.map((n) =>
                  n.step_order === active ? { ...n, note: e.target.value } : n
                );
                setData({ ...data, submission: { ...data.submission, step_notes } });
              }}
              onBlur={saveNote}
            />
            <div className="mt-2 flex gap-2">
              {active > 1 && (
                <Button variant="ghost" className="h-9 rounded-full" onClick={() => setActive(active - 1)}>
                  Back
                </Button>
              )}
              {active < data.bounty.script.length && (
                <Button
                  variant="outline"
                  className="h-9 rounded-full"
                  onClick={() => {
                    saveNote();
                    setActive(active + 1);
                  }}
                >
                  Next step
                </Button>
              )}
            </div>
          </div>

          <div className="p-3">
            <h2 className="text-sm font-medium">Report a bug</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              The dev pays to open this report — your evidence is what makes that worth it. First finder
              of a clustered issue gets the full payout.
            </p>
            <Input
              className="mt-3 h-10 rounded-full px-4"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="mt-2 flex gap-1">
              {(["critical", "major", "minor"] as Severity[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSev(s)}
                  className={`h-8 flex-1 rounded-full border text-xs capitalize ${sev === s ? "bg-primary-container text-primary" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <Textarea className="mt-2" placeholder="What happened" value={body} onChange={(e) => setBody(e.target.value)} />
            <Textarea
              className="mt-2"
              placeholder="Repro steps, one per line"
              value={repro}
              onChange={(e) => setRepro(e.target.value)}
            />

            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(e) => attach(e.target.files)}
            />
            <Button
              variant="outline"
              className="mt-2 h-9 w-full rounded-full"
              onClick={() => fileRef.current?.click()}
            >
              Attach screenshot
            </Button>
            {shots.length > 0 && (
              <p className="mt-1 font-num text-[11px] text-success">
                {shots.length} attached
                <button className="ml-2 underline" onClick={() => setShots([])}>
                  clear
                </button>
              </p>
            )}

            <Textarea
              className="mt-2 font-mono text-[11px]"
              placeholder="Paste console / logcat output (optional)"
              value={rawLogs}
              onChange={(e) => setRawLogs(e.target.value)}
            />
            {logs.length > 0 && (
              <p className="mt-1 font-num text-[11px] text-muted-foreground">
                {logs.length} lines · {logs.filter((l) => l.level === "error").length} errors
              </p>
            )}

            {err && <p className="mt-2 text-xs text-critical">{err}</p>}
            {saved && <p className="mt-2 text-xs text-success">Bug filed with evidence attached.</p>}
            <Button className="mt-3 h-10 w-full rounded-full" disabled={busy} onClick={report}>
              {busy ? "Filing…" : "Flag bug + attach evidence"}
            </Button>
          </div>

          <div className="mt-auto border-t p-3">
            <p className="text-xs text-muted-foreground">Payout estimator · pending review</p>
            <p className="text-lg">
              <Coin n={estimate} />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {data.bugs.length} bugs flagged · base reward ⬡{data.bounty.reward_current} on session
              approval
            </p>
            <Button className="mt-3 h-10 w-full rounded-full" disabled={busy} onClick={submit}>
              Submit session
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
