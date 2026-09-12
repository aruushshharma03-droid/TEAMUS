import { cookies } from "next/headers";
import { db } from "./store";
import type { Profile } from "./types";

export async function getSessionUser(): Promise<Profile | null> {
  const jar = await cookies();
  const id = jar.get("testr_session")?.value;
  if (!id) return null;
  return db().profiles.find((p) => p.id === id) ?? null;
}

export async function requireUser() {
  const u = await getSessionUser();
  if (!u) {
    const err = new Error("UNAUTHENTICATED");
    throw err;
  }
  return u;
}
