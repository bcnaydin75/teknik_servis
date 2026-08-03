import type { NextConfig } from "next";
import {
  getApiBaseUrl,
} from "./src/lib/normalize-api-base-url";

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
