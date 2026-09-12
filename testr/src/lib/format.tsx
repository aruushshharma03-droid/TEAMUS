"use client";

import { motion, useReducedMotion } from "motion/react";

export function Coin({
  n,
  className = "",
  style,
}: {
  n: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduce = useReducedMotion();
  return (
    <span className={`inline-flex items-center gap-1 font-num text-coin ${className}`} style={style}>
      <span aria-hidden>⬡</span>
      <motion.span
        key={n}
        initial={reduce ? false : { y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 24 }}
      >
        {n.toLocaleString("en-IN")}
      </motion.span>
    </span>
  );
}

export function relativeTime(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error?.message ?? "Request failed") as Error & {
      code?: string;
      extra?: unknown;
    };
    err.code = json.error?.code;
    err.extra = json.error;
    throw err;
  }
  return json.data as T;
}
