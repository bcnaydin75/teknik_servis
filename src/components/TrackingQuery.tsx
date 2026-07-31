"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { fetchRepairStatus } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import type { RepairData } from "@/types/repair";
import RepairResult from "./RepairResult";

export default function TrackingQuery() {
  const { t } = useTranslation();
  const [takipKodu, setTakipKodu] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RepairData | null>(null);

  const runQuery = useCallback(async (kod: string) => {
    const trimmed = kod.trim();
    if (!trimmed) return;

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const response = await fetchRepairStatus(trimmed);

      if (!response.success || !response.data) {
        setError(response.message ?? t("errors.notFound"));
        return;
      }

      setResult(response.data);
    } catch {
      setError(t("errors.connection"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, "", "/");
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const kod = takipKodu.trim();
    if (!kod) {
      setError(t("customer.tracking.enterCode"));
      return;
    }

    await runQuery(kod);
  }

  return (
    <section className="relative -mt-10 px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-300/20 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            {t("customer.tracking.title")}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {t("customer.tracking.hint")}{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
              {t("customer.tracking.exampleCode")}
            </code>
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="takip-kodu"
                className="block text-sm font-medium text-slate-700"
              >
                {t("customer.tracking.label")}
              </label>
              <input
                id="takip-kodu"
                type="text"
                value={takipKodu}
                onChange={(e) => setTakipKodu(e.target.value.toUpperCase())}
                placeholder={t("customer.tracking.placeholder")}
                disabled={loading}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t("customer.tracking.querying")}
                </>
              ) : (
                <>
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {t("customer.tracking.submit")}
                </>
              )}
            </button>
          </form>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <svg
                className="mt-0.5 h-5 w-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          )}
        </div>

        {result && (
          <div className="mt-8">
            <RepairResult data={result} />
          </div>
        )}
      </div>
    </section>
  );
}
