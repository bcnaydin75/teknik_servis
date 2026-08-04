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
  manifest: "/admin-manifest.webmanifest",
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

/** İlk boyamada beyaz flash olmasın (JS yüklenmeden önce) */
const themeBootScript = `
(function(){
  try {
    var k='teknik-servis-admin-theme';
    var t=localStorage.getItem(k)||'dark';
    var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)||t!=='light';
    var c=dark?'#0f172a':'#f8fafc';
    document.documentElement.style.backgroundColor=c;
    document.documentElement.style.colorScheme=dark?'dark':'light';
    if(document.body){document.body.style.backgroundColor=c;}
  } catch(e) {
    document.documentElement.style.backgroundColor='#0f172a';
  }
})();
`;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <AdminThemeProvider>{children}</AdminThemeProvider>
    </>
  );
}
