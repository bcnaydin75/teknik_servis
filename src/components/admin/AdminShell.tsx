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
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [menuOpen]);

  // Klavye / input odakta fixed alt menüyü gizle (iOS yukarı zıplatmasın)
  useEffect(() => {
    const isField = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };

    const syncKeyboard = () => {
      const vv = window.visualViewport;
      const byViewport = vv ? Math.max(0, window.innerHeight - vv.height) > 80 : false;
      const byFocus = isField(document.activeElement);
      document.documentElement.classList.toggle("admin-keyboard-open", byViewport || byFocus);
    };

    syncKeyboard();
    window.visualViewport?.addEventListener("resize", syncKeyboard);
    window.visualViewport?.addEventListener("scroll", syncKeyboard);
    window.addEventListener("focusin", syncKeyboard);
    window.addEventListener("focusout", syncKeyboard);
    return () => {
      window.visualViewport?.removeEventListener("resize", syncKeyboard);
      window.visualViewport?.removeEventListener("scroll", syncKeyboard);
      window.removeEventListener("focusin", syncKeyboard);
      window.removeEventListener("focusout", syncKeyboard);
      document.documentElement.classList.remove("admin-keyboard-open");
    };
  }, []);

  return (
    <div className="relative min-h-dvh bg-slate-50 dark:bg-slate-950">
      <div className="flex min-h-dvh">
        <AdminSidebar
          mobileOpen={menuOpen}
          onMobileClose={() => setMenuOpen(false)}
        />

        <main className="flex min-w-0 flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
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

          <div className="flex-1 p-4 pb-6 sm:p-6">{children}</div>
        </main>
      </div>

      <AdminMobileNav onOpenMenu={() => setMenuOpen(true)} />
    </div>
  );
}
