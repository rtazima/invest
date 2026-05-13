import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Actions habilitadas por padrão no Next.js 15
  experimental: {},
  // Imagens de domínios externos se necessário
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
