import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    process.env.REPLIT_DEV_DOMAIN ?? "",
    `*.${process.env.REPLIT_DEV_DOMAIN ?? ""}`,
    "*.replit.dev",
    "*.spock.replit.dev",
  ].filter(Boolean),
};

export default nextConfig;
