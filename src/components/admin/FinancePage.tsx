"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchFinance } from "@/lib/admin-api";
import type { FinanceSummary, TransactionItem } from "@/types/admin";
import AdminShell from "./AdminShell";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatCurrency, formatDateTime } from "@/lib/i18n/format";
import { runAfterEffect } from "@/lib/run-after-effect";

const emptySummary: FinanceSummary = {
  total_income: 0,
  total_expense: 0,
  net_balance: 0,
};

export default function FinancePage() {
  const { t, locale } = useTranslation();
  const [summary, setSummary] = useState<FinanceSummary>(emptySummary);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFinance = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetchFinance();

      if (!response.success || !response.data) {
        setError(response.message ?? t("admin.finance.loadFailed"));
        return;
      }

      setSummary(response.data.summary);
      setTransactions(response.data.transactions);
    } catch {
      setError(t("errors.connectionShort"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    return runAfterEffect(() => {
      void loadFinance();
    });
  }, [loadFinance]);

  return (
    <AdminShell
      title={t("admin.finance.title")}
      subtitle={t("admin.finance.subtitle")}
      action={
        <button
          type="button"
          onClick={loadFinance}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t("common.refresh")}
        </button>
      }
    >
      {loading && (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-24 dark:border-slate-700 dark:bg-slate-800">
          <svg className="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 p-6 text-white shadow-lg lg:col-span-1">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </span>
                  <p className="text-sm font-medium text-blue-100">{t("admin.finance.netCash")}</p>
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight xl:text-4xl">
                  {formatCurrency(summary.net_balance, locale)}
                </p>
                <p className="mt-2 text-xs text-blue-200">{t("admin.finance.netCashSub")}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm dark:border-emerald-900/50 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{t("admin.finance.totalIncome")}</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">
                    {formatCurrency(summary.total_income, locale)}
                  </p>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                  <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                </span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: summary.total_income + summary.total_expense > 0
                      ? `${(summary.total_income / (summary.total_income + summary.total_expense)) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm dark:border-red-900/50 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{t("admin.finance.totalExpense")}</p>
                  <p className="mt-2 text-2xl font-bold text-red-500">
                    {formatCurrency(summary.total_expense, locale)}
                  </p>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                  <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                  </svg>
                </span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-red-100">
                <div
                  className="h-full rounded-full bg-red-400 transition-all"
                  style={{
                    width: summary.total_income + summary.total_expense > 0
                      ? `${(summary.total_expense / (summary.total_income + summary.total_expense)) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">{t("admin.finance.transactions")}</h2>
                <p className="text-xs text-slate-400">{t("admin.finance.recordCount", { count: transactions.length })}</p>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </span>
                <p className="mt-4 text-sm font-medium text-slate-600">{t("admin.finance.noTransactions")}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {t("admin.finance.noTransactionsHint")}
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-700">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            tx.type === "income"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {tx.type === "income" ? t("admin.finance.income") : t("admin.finance.expense")}
                        </span>
                        <span
                          className={`font-bold ${
                            tx.type === "income" ? "text-emerald-600" : "text-red-500"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "−"}
                          {formatCurrency(tx.amount, locale)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                        {tx.description ?? t("common.dash")}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(tx.created_at, locale)}</p>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-50 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/60">
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t("common.date")}</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("admin.finance.type")}</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("admin.finance.description")}</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">{t("admin.finance.amount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-700/40">
                        <td className="whitespace-nowrap px-6 py-4 text-slate-500 dark:text-slate-400">
                          {formatDateTime(tx.created_at, locale)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                              tx.type === "income"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                tx.type === "income" ? "bg-emerald-500" : "bg-red-400"
                              }`}
                            />
                            {tx.type === "income" ? t("admin.finance.income") : t("admin.finance.expense")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                          {tx.description ?? t("common.dash")}
                        </td>
                        <td
                          className={`whitespace-nowrap px-6 py-4 text-right font-bold ${
                            tx.type === "income" ? "text-emerald-600" : "text-red-500"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "−"}
                          {formatCurrency(tx.amount, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}
