import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().split("T")[0],
  },
  // Server Actions habilitadas por padrão no Next.js 15.
  // bodySizeLimit elevado para aceitar upload de PDF de research (padrão é 1 MB).
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
  serverExternalPackages: ["pdf-parse"],
  // Imagens de domínios externos se necessário
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
