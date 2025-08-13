import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App Router is enabled by default in Next.js 13+
  swcMinify: true,
  experimental: {
    forceSwcTransforms: true,
  },
};

export default nextConfig;
