import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // Only allow dev origins in development (not needed in production)
  ...(isDev && {
    allowedDevOrigins: [
      process.env.REPLIT_DEV_DOMAIN ?? "",
      `*.${process.env.REPLIT_DEV_DOMAIN ?? ""}`,
      "*.replit.dev",
      "*.spock.replit.dev",
    ].filter(Boolean),
  }),

  // Production hardening
  poweredByHeader: false,
  compress: true,

  // Image optimisation — allow Blockstream QR API
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.qrserver.com",
      },
    ],
  },
};

export default nextConfig;
