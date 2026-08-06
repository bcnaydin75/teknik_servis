import type { Metadata, Viewport } from "next";
import { AdminThemeProvider } from "@/components/AdminThemeProvider";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

/** Admin PWA: ana ekrana eklenince müşteri sayfası değil yönetim açılır */
export const metadata: Metadata = {
  title: "Teknik Servis | Yönetim Paneli",
  description: "Teknik servis yönetim paneli",
  applicationName: "Teknik Servis Yönetim",
  manifest: "/admin-manifest.webmanifest?v=8",
  appleWebApp: {
    capable: true,
    title: "Yönetim",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminThemeProvider>{children}</AdminThemeProvider>;
}
