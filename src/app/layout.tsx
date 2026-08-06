import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppProviders from "@/components/AppProviders";
import AppleSplashLinks from "@/components/AppleSplashLinks";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

/** Build sırasında API'ye bağlanılmaz; sayfalar istek anında render edilir */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Teknik Servis | Cihaz Durumu Sorgulama",
  description:
    "Takip kodunuz ile cihazınızın tamir durumunu, değişen parçaları ve ücret bilgilerini anında görüntüleyin.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Teknik Servis",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

const criticalBootCss = `
html,body{background-color:#0f172a;color-scheme:dark;margin:0;min-height:100%;}
html.admin-boot-light,html.admin-boot-light body{background-color:#f8fafc;color-scheme:light;}
html.admin-boot-light{--boot-splash-bg:#f8fafc;}
@keyframes boot-spin{to{transform:rotate(360deg)}}
`;

/**
 * İlk boyamadan önce çalışır — admin'de beyaz flash'ı keser.
 * Müşteri sayfasında açık tema; admin'de localStorage / varsayılan koyu.
 */
const themeBootScript = `
(function(){
  try {
    var p=location.pathname||'';
    var isAdmin=p.indexOf('/admin')===0;
    var dark=true;
    var c='#0f172a';
    if(!isAdmin){
      dark=false;
      c='#f8fafc';
    } else {
      var t=localStorage.getItem('teknik-servis-admin-theme')||'dark';
      dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
      c=dark?'#0f172a':'#f8fafc';
    }
    var root=document.documentElement;
    root.style.backgroundColor=c;
    root.style.colorScheme=dark?'dark':'light';
    root.classList.toggle('admin-dark', isAdmin && dark);
    root.classList.toggle('admin-boot-light', !dark);
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', c);
    function paintBody(){
      if(document.body){
        document.body.style.backgroundColor=c;
      }
      var splash=document.getElementById('app-boot-splash');
      if(splash) splash.style.backgroundColor=c;
      root.style.setProperty('--boot-splash-bg', c);
    }
    paintBody();
    if(!document.body) document.addEventListener('DOMContentLoaded', paintBody);
  } catch(e) {
    document.documentElement.style.backgroundColor='#0f172a';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#0f172a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <AppleSplashLinks />
        <style dangerouslySetInnerHTML={{ __html: criticalBootCss }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body
        suppressHydrationWarning
        className="flex min-h-dvh flex-col font-sans"
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
