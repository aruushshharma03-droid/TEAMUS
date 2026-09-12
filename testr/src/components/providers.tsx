"use client";

import { SessionProvider } from "@/lib/session-client";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
