"use client";

import { useEffect, useState } from "react";
import { useAdminTheme, type AdminTheme } from "@/components/AdminThemeProvider";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

type ThemeToggleProps = {
  showLabels?: boolean;
};

export default function ThemeToggle({ showLabels = false }: ThemeToggleProps) {
  const { t } = useTranslation();
  const { theme, resolvedTheme, setTheme } = useAdminTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700" />;
  }

  const isDark = resolvedTheme === "dark";

  if (showLabels) {
    return (
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "light" as AdminTheme, labelKey: "admin.theme.light" },
            { id: "dark" as AdminTheme, labelKey: "admin.theme.dark" },
            { id: "system" as AdminTheme, labelKey: "admin.theme.system" },
          ] as const
        ).map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              theme === id
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? t("admin.settings.tema.light") : t("admin.settings.tema.dark")}
      title={isDark ? t("admin.settings.tema.light") : t("admin.settings.tema.dark")}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      {isDark ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
