import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Erzeugt einen minimalen, selbst-lauffähigen Server-Build für das Docker-Image.
  output: "standalone",
  experimental: {
    // Server Actions werden hinter dem Docker-/Reverse-Proxy-Host aufgerufen.
    serverActions: {
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()),
    },
  },
};

export default nextConfig;
