"use client";

import type { DashboardStats } from "@/types/admin";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatCurrency } from "@/lib/i18n/format";

interface StatCardsProps {
  stats: DashboardStats;
  showPosStats?: boolean;
}

const cards = [
  {
    key: "bugunku_tamir" as const,
    labelKey: "admin.stats.todayRepairs",
    subKey: "admin.stats.todayRepairsSub",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    text: "text-violet-600",
    format: (v: number) => String(v),
  },
  {
    key: "bekleyen_cihaz" as const,
    labelKey: "admin.stats.pendingDevices",
    subKey: "admin.stats.pendingDevicesSub",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "from-rose-500 to-red-500",
    bg: "bg-rose-50",
    text: "text-rose-600",
    format: (v: number) => String(v),
  },
  {
    key: "pos_cirosu_bugun" as const,
    labelKey: "admin.stats.posRevenueToday",
    subKey: "admin.stats.posRevenueSub",
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    color: "from-cyan-500 to-blue-600",
    bg: "bg-cyan-50",
    text: "text-cyan-600",
    currency: true,
    posOnly: true,
  },
  {
    key: "toplam_cihaz" as const,
    labelKey: "admin.stats.totalDevices",
    subKey: "admin.stats.totalDevicesSub",
    icon: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2",
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    text: "text-blue-600",
    format: (v: number) => String(v),
  },
  {
    key: "aktif_tamir" as const,
    labelKey: "admin.stats.activeRepairs",
    subKey: "admin.stats.activeRepairsSub",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    text: "text-amber-600",
    format: (v: number) => String(v),
  },
  {
    key: "teslime_hazir" as const,
    labelKey: "admin.stats.readyForPickup",
    subKey: "admin.stats.readyForPickupSub",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "from-emerald-500 to-green-600",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    format: (v: number) => String(v),
  },
];

export default function StatCards({ stats, showPosStats = true }: StatCardsProps) {
  const { t, locale } = useTranslation();
  const visibleCards = cards.filter((card) => !card.posOnly || showPosStats);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {visibleCards.map((card) => {
        const value = stats[card.key] as number;
        const displayValue = card.currency
          ? formatCurrency(value, locale)
          : card.format!(value);

        return (
          <div
            key={card.key}
            className="relative isolate rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">
                  {t(card.labelKey)}
                </p>
                <p
                  className={`mt-1 font-bold tabular-nums tracking-tight text-slate-900 dark:text-white ${
                    card.currency
                      ? "truncate text-lg sm:text-2xl lg:text-3xl"
                      : "text-2xl sm:mt-2 sm:text-3xl"
                  }`}
                  title={displayValue}
                >
                  {displayValue}
                </p>
                <p className="mt-0.5 hidden text-xs text-slate-400 sm:block dark:text-slate-500">
                  {t(card.subKey)}
                </p>
                {card.key === "pos_cirosu_bugun" && stats.pos_satis_sayisi_bugun > 0 && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t("common.salesCount", { count: stats.pos_satis_sayisi_bugun })}
                  </p>
                )}
              </div>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${card.bg} dark:bg-slate-700/80`}>
                <svg className={`h-5 w-5 sm:h-6 sm:w-6 ${card.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                </svg>
              </span>
            </div>
            <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-2xl bg-gradient-to-r ${card.color}`} />
          </div>
        );
      })}
    </div>
  );
}
