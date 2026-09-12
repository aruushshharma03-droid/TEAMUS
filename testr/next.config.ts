import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: "api.dicebear.com" }],
  },
};

export default nextConfig;
