import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_APP_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().split("T")[0],
  },
  // Server Actions habilitadas por padrão no Next.js 15
  experimental: {},
  serverExternalPackages: ["pdf-parse"],
  // Imagens de domínios externos se necessário
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
