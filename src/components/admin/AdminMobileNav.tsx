"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { checkAuth } from "@/lib/auth-api";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import {
  ADMIN_NAV_ITEMS,
  filterNavByPermissions,
  isAdminNavActive,
} from "@/lib/admin-nav";
import { DEFAULT_PERMISSIONS, type Permissions } from "@/lib/permissions";

interface AdminMobileNavProps {
  onOpenMenu: () => void;
}

export default function AdminMobileNav({ onOpenMenu }: AdminMobileNavProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [perms, setPerms] = useState<Permissions>(DEFAULT_PERMISSIONS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    checkAuth().then((res) => {
      if (res.success && res.data?.permissions) {
        setPerms(res.data.permissions as Permissions);
      }
    });
  }, []);

  const allowed = filterNavByPermissions(ADMIN_NAV_ITEMS, perms);
  const quickItems = allowed.filter((item) => item.mobileQuick);
  const slots = quickItems.slice(0, 4);

  const nav = (
    <nav
      className="admin-mobile-nav fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
      aria-label={t("nav.menu")}
      style={{
        // iOS PWA: layout viewport altına sabitle (kısa app-height tuzağı yok)
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {slots.map((item) => {
          const active = isAdminNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium transition touch-manipulation ${
                active
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 active:text-slate-900 dark:text-slate-400 dark:active:text-white"
              }`}
            >
              <svg
                className={`h-6 w-6 shrink-0 ${
                  active
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={active ? 2.25 : 2}
                  d={item.icon}
                />
              </svg>
              <span className="truncate">
                {t(item.shortLabelKey ?? item.labelKey)}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium text-slate-500 transition touch-manipulation active:text-slate-900 dark:text-slate-400 dark:active:text-white"
          aria-label={t("nav.openMenu")}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>{t("nav.menu")}</span>
        </button>
      </div>
    </nav>
  );

  // body'ye portal: transform/height ancestor fixed'i bozmasın
  if (!mounted) return null;
  return createPortal(nav, document.body);
}
