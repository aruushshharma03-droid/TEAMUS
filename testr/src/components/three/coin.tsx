"use client";

import dynamic from "next/dynamic";
import { CoinFallback } from "./coin-fallback";

/**
 * Public entry point for the coin. This module must stay free of three.js imports — the WebGL
 * scene lives in coin-client.tsx and is only pulled in when <Coin3D> actually renders.
 */
export { CoinFallback };

export const Coin3D = dynamic(() => import("./coin-client").then((m) => m.Coin3DClient), {
  ssr: false,
  loading: () => <CoinFallback />,
});
