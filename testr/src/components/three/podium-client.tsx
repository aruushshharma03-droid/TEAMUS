"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { Scene } from "./canvas";
import { PLACE, PodiumFallback, PodiumLabels, type PodiumRow } from "./podium";

function Blocks({ rows }: { rows: PodiumRow[] }) {
  const group = useRef<Group>(null);

  // A slow sway rather than a full spin — the ranks have to stay readable.
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.2;
    }
  });

  return (
    <group ref={group} position={[0, -0.9, 0]}>
      {PLACE.map((p, i) =>
        rows[i] ? (
          <mesh key={rows[i].handle} position={[p.x, p.height / 2, 0]}>
            <boxGeometry args={[1.15, p.height, 1.15]} />
            <meshStandardMaterial color={p.color} metalness={0.85} roughness={0.28} />
          </mesh>
        ) : null
      )}
    </group>
  );
}

/**
 * Labels live in an HTML layer over the canvas rather than as 3D text: drei's <Text> pulls a
 * default font over the network at runtime, and it can't honour the Roboto-Mono-for-every-number
 * rule the design system is built on.
 */
export function Podium3DClient({ rows, className = "" }: { rows: PodiumRow[]; className?: string }) {
  if (!rows.length) return null;
  return (
    <div className={`relative ${className}`}>
      <Scene
        className="size-full"
        fallback={<PodiumFallback rows={rows} />}
        camera={{ position: [0, 1.2, 5.4], fov: 42 }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 6, 4]} intensity={2.2} />
        <directionalLight position={[-4, 2, -3]} intensity={0.6} color="#8ab4f8" />
        <Blocks rows={rows} />
      </Scene>
      <PodiumLabels rows={rows} />
    </div>
  );
}
