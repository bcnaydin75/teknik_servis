"use client";

import { type ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import AdminMobileNav from "./AdminMobileNav";
import PasswordChangeBanner from "./PasswordChangeBanner";
import ThemeToggle from "@/components/ThemeToggle";
import AdminUserBadge from "./AdminUserBadge";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

interface AdminShellProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export default function AdminShell({
  title,
  subtitle,
  action,
  children,
}: AdminShellProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState(pathname);
  if (pathname !== menuPath) {
    setMenuPath(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  // Layout viewport yüksekliği — visualViewport kullanma (klavye navbar'ı yukarı iter)
  useEffect(() => {
    const setAppHeight = () => {
      const h = window.innerHeight || document.documentElement.clientHeight;
      document.documentElement.style.setProperty("--app-height", `${Math.round(h)}px`);
    };

    const syncKeyboard = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      // Klavye açıkken alt menüyü gizle (üstte asılı kalmasın)
      const open = window.innerHeight - vv.height > 120;
      document.documentElement.classList.toggle("admin-keyboard-open", open);
    };

    setAppHeight();
    syncKeyboard();
    window.addEventListener("resize", setAppHeight);
    window.visualViewport?.addEventListener("resize", syncKeyboard);
    window.visualViewport?.addEventListener("scroll", syncKeyboard);
    return () => {
      window.removeEventListener("resize", setAppHeight);
      window.visualViewport?.removeEventListener("resize", syncKeyboard);
      window.visualViewport?.removeEventListener("scroll", syncKeyboard);
      document.documentElement.classList.remove("admin-keyboard-open");
    };
  }, []);

  return (
    <div className="flex h-[var(--app-height)] max-h-[var(--app-height)] flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex min-h-0 flex-1">
        <AdminSidebar
          mobileOpen={menuOpen}
          onMobileClose={() => setMenuOpen(false)}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
          <PasswordChangeBanner />

          {/* Mobil üst bar */}
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label={t("nav.openMenu")}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white">{title}</h1>
                {subtitle && (
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <AdminUserBadge compact />
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Masaüstü üst bar */}
          <header className="sticky top-0 z-10 hidden border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 lg:block">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <AdminUserBadge />
                {action}
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 pb-24 sm:p-6 lg:pb-6">{children}</div>
        </main>
      </div>

      <AdminMobileNav onOpenMenu={() => setMenuOpen(true)} />
    </div>
  );
}
