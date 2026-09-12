import { createHash, randomUUID } from "crypto";

export function uid(seed?: string): string {
  if (!seed) return randomUUID();
  const hex = createHash("sha256").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function nowIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}
