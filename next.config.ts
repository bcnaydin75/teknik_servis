import type { NextConfig } from "next";

const phpApiBase =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost/teknik_servis_projesi/backend";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["192.168.1.85"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${phpApiBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
