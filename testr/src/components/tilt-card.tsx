"use client";

import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Mouse-tracked 3D tilt. Generalised from the one-off handler that used to live inline in the
 * wallet page so the vault, hunter card and hunt banners all share one implementation.
 *
 * Writes --rx/--ry (rotation) and --hx/--hy (highlight origin) as custom properties; the visual
 * treatment comes from .tilt / .tilt-sheen / .holo in globals.css.
 */
export function TiltCard({
  children,
  className = "",
  max = 8,
  sheen = true,
  holo = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  /** Maximum rotation in degrees on each axis. */
  max?: number;
  sheen?: boolean;
  holo?: boolean;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || reduce) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${x * max * 2}deg`);
    el.style.setProperty("--rx", `${-y * max * 2}deg`);
    el.style.setProperty("--hx", `${50 + x * 60}%`);
    el.style.setProperty("--hy", `${50 + y * 60}%`);
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--hx", "50%");
    el.style.setProperty("--hy", "50%");
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={style}
      className={`relative ${reduce ? "" : "tilt"} ${sheen ? "tilt-sheen" : ""} ${holo ? "holo" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
