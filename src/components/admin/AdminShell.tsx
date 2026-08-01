"use client";

import { type ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import AdminMobileNav from "./AdminMobileNav";
import PasswordChangeBanner from "./PasswordChangeBanner";
import ThemeToggle from "@/components/ThemeToggle";
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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <div className="flex min-h-app bg-slate-50 dark:bg-slate-950">
      <AdminSidebar
        mobileOpen={menuOpen}
        onMobileClose={() => setMenuOpen(false)}
      />

      <main className="flex min-w-0 flex-1 flex-col lg:overflow-auto">
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
            <ThemeToggle />
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
            {action}
          </div>
        </header>

        <div className="flex-1 p-4 pb-24 sm:p-6 lg:pb-6">{children}</div>
      </main>

      <AdminMobileNav onOpenMenu={() => setMenuOpen(true)} />
    </div>
  );
}
