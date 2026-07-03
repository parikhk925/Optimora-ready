import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@optimora/sdk"],

  // Enable standalone output for Docker/self-hosted deployments.
  // On Vercel this field is ignored — Vercel manages its own output format.
  // On Fly.io / Railway / Docker: `node .next/standalone/server.js`
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
