import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Actions habilitadas por padrão no Next.js 15
  experimental: {},
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  // Imagens de domínios externos se necessário
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
