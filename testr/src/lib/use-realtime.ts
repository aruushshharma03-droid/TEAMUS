"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useSession } from "@/lib/session-client";

export function useRealtime(onMsg: (msg: Record<string, unknown>) => void) {
  const { user } = useSession();
  useEffect(() => {
    let es: EventSource | null = null;
    const connect = () => {
      es = new EventSource("/api/realtime");
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.channel === "toast" && msg.row?.owner_id === user?.id) {
            toast.success(`+⬡${msg.row.amount} ${msg.row.memo}`);
          }
          onMsg(msg);
        } catch {
          /* ignore */
        }
      };
    };
    connect();
    const onFocus = () => {
      es?.close();
      connect();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      es?.close();
    };
  }, [onMsg, user?.id]);
}
