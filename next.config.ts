import type { NextConfig } from "next";

/** API proxy: src/app/api/[...path]/route.ts ve src/app/backend/[...path]/route.ts */
const nextConfig: NextConfig = {
  devIndicators: false,
};

export default nextConfig;
