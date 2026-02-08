import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [
    "@vladmandic/human",
    "@google/genai",
    "google-auth-library",
    "gaxios",
    "node-fetch",
    "fetch-blob",
  ],
};

export default nextConfig;
