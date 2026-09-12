"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/format";

export type SessionUser = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  trust_score: number;
  tier: string;
  xp: number;
  level: number;
  accuracy_streak: number;
  is_pro: boolean;
  device_profile: unknown;
  needs_device: boolean;
} | null;

const Ctx = createContext<{
  user: SessionUser;
  refresh: () => Promise<void>;
  setUser: (u: SessionUser) => void;
}>({ user: null, refresh: async () => {}, setUser: () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser>(null);
  const refresh = async () => {
    const data = await api<{ user: SessionUser }>("/api/auth/me");
    setUser(data.user);
  };
  useEffect(() => {
    refresh().catch(() => setUser(null));
  }, []);
  return <Ctx.Provider value={{ user, refresh, setUser }}>{children}</Ctx.Provider>;
}

export function useSession() {
  return useContext(Ctx);
}
