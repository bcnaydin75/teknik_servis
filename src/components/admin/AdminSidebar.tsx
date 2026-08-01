"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { checkAuth, logoutAdmin } from "@/lib/auth-api";
import { ADMIN_BRAND_LOGO } from "@/lib/brand";
import ThemeToggle from "@/components/ThemeToggle";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import {
  ADMIN_NAV_ITEMS,
  filterNavByPermissions,
  isAdminNavActive,
} from "@/lib/admin-nav";
import { DEFAULT_PERMISSIONS, type Permissions } from "@/lib/permissions";

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function AdminSidebar({
  mobileOpen = false,
  onMobileClose,
}: AdminSidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [perms, setPerms] = useState<Permissions>(DEFAULT_PERMISSIONS);

  useEffect(() => {
    checkAuth().then((res) => {
      if (res.success && res.data?.permissions) {
        setPerms(res.data.permissions as Permissions);
      }
    });
  }, []);

  const navItems = filterNavByPermissions(ADMIN_NAV_ITEMS, perms);

  async function handleLogout() {
    onMobileClose?.();
    await logoutAdmin();
    router.replace("/admin/login");
    router.refresh();
  }

  function handleNavClick() {
    onMobileClose?.();
  }

  const sidebarContent = (
    <>
      <div className="border-b border-slate-800 px-5 py-4 lg:px-6 lg:py-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
              <Image
                src={ADMIN_BRAND_LOGO}
                alt={t("nav.brandTitle")}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{t("nav.brandTitle")}</p>
              <p className="text-xs text-slate-400">{t("nav.brandSubtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {onMobileClose && (
              <button
                type="button"
                onClick={onMobileClose}
                className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
                aria-label={t("nav.closeMenu")}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = isAdminNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={`flex min-h-[44px] touch-manipulation items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-700"
              }`}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-slate-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-4">
        <Link
          href="/"
          onClick={handleNavClick}
          className="flex min-h-[44px] touch-manipulation items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("nav.customerPage")}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-[44px] w-full touch-manipulation items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-red-900/30 hover:text-red-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          {t("nav.logout")}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Masaüstü sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobil drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("nav.navMenu")}>
          <button
            type="button"
            aria-label={t("nav.closeMenu")}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-slate-900 pt-[env(safe-area-inset-top,0px)] shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
