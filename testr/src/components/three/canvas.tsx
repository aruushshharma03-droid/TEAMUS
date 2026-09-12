"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";

/** Cheap one-time probe. A machine without WebGL should never see a broken canvas. */
function webglOk() {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Every 3D scene goes through here. The rules, in order of importance:
 *  - if WebGL is missing or the user prefers reduced motion, render `fallback` forever
 *  - stop the render loop when the canvas scrolls out of view
 *  - cap dpr so a retina laptop driving a projector doesn't melt
 *
 * `fallback` must be a finished piece of design, not a spinner — on the machines where this
 * matters, it is the only thing anyone will see.
 */
export function Scene({
  children,
  fallback,
  className = "",
  camera = { position: [0, 0, 4] as [number, number, number], fov: 45 },
  alwaysAnimate = true,
}: {
  children: ReactNode;
  fallback: ReactNode;
  className?: string;
  camera?: { position: [number, number, number]; fov: number };
  /** false = frameloop "demand": the scene only redraws when something invalidates it. */
  alwaysAnimate?: boolean;
}) {
  const reduce = useReducedMotion();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(true);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSupported(webglOk());
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // null = probing. Render the fallback rather than nothing, so there is no layout jump.
  if (supported === null || supported === false || reduce) {
    return (
      <div ref={host} className={className}>
        {fallback}
      </div>
    );
  }

  return (
    <div ref={host} className={className}>
      <Canvas
        dpr={[1, 2]}
        camera={camera}
        frameloop={alwaysAnimate && visible ? "always" : "demand"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%" }}
      >
        {children}
      </Canvas>
    </div>
  );
}
