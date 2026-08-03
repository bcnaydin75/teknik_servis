import type { NextConfig } from "next";

const CPANEL_API_BASE_URL =
  "http://loyal-brown-emu.89-252-180-227.cpanel.site";

function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return CPANEL_API_BASE_URL;
}

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    const phpApiBase = getApiBaseUrl();
    return [
      {
        source: "/api/:path*",
        destination: `${phpApiBase}/api/:path*`,
      },
      {
        source: "/backend/:path*",
        destination: `${phpApiBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
