"use client";

import { api } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AppShell } from "@/components/shell";

export default function ResetPage() {
  const [ok, setOk] = useState<string | null>(null);
  return (
    <AppShell>
      <h1 className="text-[20px] font-medium">Demo reset</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Reseeds the in-memory ledger to the staged HackBattle state: NoteFlow 4/5 slots, dense feed, demo logins.
      </p>
      <Button
        className="mt-4 h-10 rounded-full"
        onClick={async () => {
          await api("/api/dev/reset", { method: "POST" });
          setOk("Seed restored. Sign in as mira / ananya.");
        }}
      >
        Reset database
      </Button>
      {ok && <p className="mt-3 text-success">{ok}</p>}
    </AppShell>
  );
}
