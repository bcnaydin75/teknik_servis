"use client";

import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { useAdminTheme } from "@/components/AdminThemeProvider";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AdminLoginSkeleton() {
  const { t } = useTranslation();
  const { resolvedTheme } = useAdminTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="relative flex min-h-app items-center justify-center px-4 px-safe py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 overflow-hidden ${
          isDark ? "bg-slate-950" : "bg-slate-100"
        }`}
      >
        {isDark ? (
          <>
            <div className="absolute -left-1/4 -top-1/4 h-[520px] w-[520px] rounded-full bg-violet-600/30 blur-[120px]" />
            <div className="absolute -bottom-1/4 -right-1/4 h-[480px] w-[480px] rounded-full bg-blue-600/25 blur-[120px]" />
          </>
        ) : (
          <>
            <div className="absolute -left-1/4 -top-1/4 h-[520px] w-[520px] rounded-full bg-blue-200/40 blur-[120px]" />
            <div className="absolute -bottom-1/4 -right-1/4 h-[480px] w-[480px] rounded-full bg-slate-300/50 blur-[120px]" />
          </>
        )}
      </div>

      <div className="relative z-10">
        <LoadingSpinner size="lg" label={t("admin.login.loading")} />
      </div>
    </div>
  );
}
