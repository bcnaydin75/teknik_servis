"use client";

import { useTranslation } from "@/lib/i18n/LocaleProvider";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/10 ${className ?? ""}`}
      aria-hidden
    />
  );
}

export default function AdminLoginSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="relative flex min-h-app items-center justify-center px-4 px-safe py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-slate-950">
        <div className="absolute -left-1/4 -top-1/4 h-[520px] w-[520px] rounded-full bg-violet-600/30 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[480px] w-[480px] rounded-full bg-blue-600/25 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div
          className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/6 px-6 pb-12 pt-6 backdrop-blur-md sm:px-8 sm:pb-14 sm:pt-8"
          role="status"
          aria-live="polite"
          aria-label={t("admin.login.loading")}
        >
          <div className="mb-6 flex flex-col items-center gap-3">
            <Shimmer className="h-14 w-14 rounded-2xl" />
            <Shimmer className="h-7 w-48" />
            <Shimmer className="h-4 w-56" />
          </div>
          <div className="space-y-5">
            <div>
              <Shimmer className="mb-2 h-4 w-24" />
              <Shimmer className="h-12 w-full" />
            </div>
            <div>
              <Shimmer className="mb-2 h-4 w-16" />
              <Shimmer className="h-12 w-full" />
            </div>
            <Shimmer className="h-12 w-full" />
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">{t("admin.login.loading")}</p>
        </div>
      </div>
    </div>
  );
}
