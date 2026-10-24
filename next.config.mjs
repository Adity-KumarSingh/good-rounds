import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Pin the project root (a stray lockfile in a parent folder otherwise confuses file tracing).
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  experimental: {
    // Winner proof screenshots are uploaded through server actions.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
