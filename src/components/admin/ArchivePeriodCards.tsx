"use client";

import type { ArchivePeriod } from "@/types/admin";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

interface ArchivePeriodCardsProps {
  periods: ArchivePeriod[];
  totalArchived: number;
  selected: { year: number; month: number } | null;
  onSelect: (period: { year: number; month: number } | null) => void;
}

export default function ArchivePeriodCards({
  periods,
  totalArchived,
  selected,
  onSelect,
}: ArchivePeriodCardsProps) {
  const { t } = useTranslation();

  const byYear = periods.reduce<Record<number, ArchivePeriod[]>>((acc, p) => {
    if (!acc[p.year]) acc[p.year] = [];
    acc[p.year].push(p);
    return acc;
  }, {});

  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a);

  function isSelected(p: ArchivePeriod) {
    return selected?.year === p.year && selected?.month === p.month;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            selected === null
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-700"
          }`}
        >
          {t("common.all")}
          <span className="ml-1.5 text-xs opacity-80">({totalArchived})</span>
        </button>
      </div>

      {years.map((year) => (
        <div key={year}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {year}
          </p>
          <div className="flex flex-wrap gap-2">
            {byYear[year].map((p) => (
              <button
                key={`${p.year}-${p.month}`}
                type="button"
                onClick={() => onSelect({ year: p.year, month: p.month })}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  isSelected(p)
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-blue-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600 dark:hover:ring-blue-500"
                }`}
              >
                {p.label}
                <span className="ml-1.5 text-xs opacity-80">({p.count})</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
