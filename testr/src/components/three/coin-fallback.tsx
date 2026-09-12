"use client";

/**
 * The CSS coin. Deliberately kept in its own module with ZERO three.js imports.
 *
 * This is used by the shell's reward flourishes, which render on every page — if it lived
 * alongside the WebGL scene, importing it would drag @react-three/fiber and three.js onto the
 * critical path of every route.
 */
export function CoinFallback({ size = 96 }: { size?: number }) {
  return (
    <div
      aria-hidden
      className="grid place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 34% 28%, #ffe08a, #f9ab00 52%, #b06000 100%)",
        boxShadow: "0 10px 30px -12px rgba(249,171,0,.7), inset 0 2px 6px rgba(255,255,255,.55)",
      }}
    >
      <span
        className="font-display"
        style={{ fontSize: size * 0.42, color: "#7a4400", lineHeight: 1 }}
      >
        ⬡
      </span>
    </div>
  );
}
