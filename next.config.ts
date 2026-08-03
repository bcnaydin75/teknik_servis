import type { NextConfig } from "next";
import { getApiBaseUrl } from "./src/lib/api-config";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["192.168.1.85"],
  async rewrites() {
    /** Vercel / yerel Next → cPanel (veya Laragon) PHP; MySQL yalnızca PHP tarafında */
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
