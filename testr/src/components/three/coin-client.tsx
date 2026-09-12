"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { Scene } from "./canvas";
import { CoinFallback } from "./coin-fallback";

/**
 * The testr coin: a gold hexagonal prism. It is the brand mark, so the same object appears on the
 * landing hero, in the wallet vault and wherever else coins matter — repetition reads as identity.
 *
 * Everything three.js-flavoured lives in this file, which is only ever reached through the lazy
 * import in coin.tsx.
 */
function CoinMesh({ spin = 0.6, flip = false }: { spin?: number; flip?: boolean }) {
  const group = useRef<Group>(null);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += dt * (flip ? 6 : spin);
    // A slow bob and a slight lean keep it from reading as a flat spinning disc.
    g.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.08;
    g.rotation.z = Math.sin(state.clock.elapsedTime * 0.6) * 0.06;
  });

  return (
    <group ref={group}>
      <mesh>
        <cylinderGeometry args={[1, 1, 0.18, 6]} />
        <meshStandardMaterial color="#f9ab00" metalness={0.95} roughness={0.22} />
      </mesh>
      {/* Rim, slightly wider and darker so the edge catches the light */}
      <mesh>
        <cylinderGeometry args={[1.04, 1.04, 0.1, 6]} />
        <meshStandardMaterial color="#b06000" metalness={0.9} roughness={0.35} />
      </mesh>
      {/* Raised hex on the face */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.52, 0.52, 0.06, 6]} />
        <meshStandardMaterial color="#fff0c2" metalness={0.8} roughness={0.18} />
      </mesh>
    </group>
  );
}

export function Coin3DClient({
  size = 96,
  spin = 0.6,
  flip = false,
  className = "",
}: {
  size?: number;
  spin?: number;
  flip?: boolean;
  className?: string;
}) {
  return (
    <div className={className} style={{ width: size, height: size }}>
      <Scene
        className="size-full"
        fallback={
          <div className="grid size-full place-items-center">
            <CoinFallback size={size} />
          </div>
        }
        camera={{ position: [0, 0, 3.6], fov: 45 }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[4, 6, 5]} intensity={2.4} />
        <directionalLight position={[-5, -2, -3]} intensity={0.7} color="#8ab4f8" />
        <group rotation={[0.42, 0, 0]}>
          <CoinMesh spin={spin} flip={flip} />
        </group>
      </Scene>
    </div>
  );
}
