import type { NextConfig } from "next";

// ✅ CORRECT — standalone removed
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;