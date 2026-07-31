"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchDevices, permanentDeleteDevice, restoreDevice } from "@/lib/admin-api";
import type { ArchivePeriod, DeviceListItem } from "@/types/admin";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import AdminShell from "./AdminShell";
import ArchivePeriodCards from "./ArchivePeriodCards";
import DeviceSearchBar from "./DeviceSearchBar";
import DeviceTable from "./DeviceTable";

export default function ArchivePage() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [periods, setPeriods] = useState<ArchivePeriod[]>([]);
  const [totalArchived, setTotalArchived] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<{ year: number; month: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<DeviceListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeviceListItem | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetchDevices({
        archived: true,
        q: debouncedQuery || undefined,
        year: selectedPeriod?.year,
        month: selectedPeriod?.month,
      });

      if (!res.success || !res.data) {
        setError(res.message ?? t("admin.archive.loadFailed"));
        return;
      }

      setDevices(res.data.devices);
      setPeriods(res.data.archive_periods ?? []);
      setTotalArchived(res.data.total_archived ?? res.data.devices.length);
    } catch {
      setError(t("errors.connectionShort"));
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, selectedPeriod, t]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleClear() {
    setSearchInput("");
  }

  async function confirmRestore() {
    if (!restoreTarget) return;

    setRestoring(true);
    const res = await restoreDevice(restoreTarget.id);
    setRestoring(false);
    setRestoreTarget(null);

    if (res.success) {
      setToast(t("admin.archive.restored", { code: restoreTarget.takip_kodu }));
      loadData();
    } else {
      setToast(res.message ?? t("admin.archive.restoreFailed"));
    }
  }

  async function confirmPermanentDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    const res = await permanentDeleteDevice(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);

    if (res.success) {
      setToast(t("admin.archive.deleted", { code: deleteTarget.takip_kodu }));
      loadData();
    } else {
      setToast(res.message ?? t("admin.archive.deleteFailed"));
    }
  }

  const periodLabel = selectedPeriod
    ? `${String(selectedPeriod.month).padStart(2, "0")}.${selectedPeriod.year}`
    : null;

  return (
    <>
      <AdminShell
        title={t("admin.archive.title")}
        subtitle={t("admin.archive.subtitle")}
        action={
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {t("admin.archive.backToDashboard")}
          </Link>
        }
      >
        <div className="space-y-6">
          {!loading && periods.length > 0 && (
            <ArchivePeriodCards
              periods={periods}
              totalArchived={totalArchived}
              selected={selectedPeriod}
              onSelect={setSelectedPeriod}
            />
          )}

          <DeviceSearchBar
            value={searchInput}
            onChange={setSearchInput}
            onClear={handleClear}
          />

          {(debouncedQuery || periodLabel) && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {periodLabel && (
                <>
                  {t("admin.archive.period")}{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-300">{periodLabel}</span>
                </>
              )}
              {debouncedQuery && periodLabel && " · "}
              {debouncedQuery && (
                <>
                  {t("admin.dashboard.searchLabel")}{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-300">&quot;{debouncedQuery}&quot;</span>
                </>
              )}
              {" "}— {t("common.results", { count: devices.length })}
            </p>
          )}

          {loading && (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 dark:border-slate-700 dark:bg-slate-800">
              <svg className="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          {!loading && error && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && (
            <DeviceTable
              devices={devices}
              variant="archived"
              onRestore={setRestoreTarget}
              onPermanentDelete={setDeleteTarget}
              emptyMessage={
                selectedPeriod || debouncedQuery
                  ? t("admin.archive.emptyFiltered")
                  : t("admin.archive.empty")
              }
            />
          )}
        </div>
      </AdminShell>

      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("admin.modals.restore.title")}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {t("admin.modals.restore.body", {
                code: restoreTarget.takip_kodu,
                model: restoreTarget.cihaz_modeli,
              })}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setRestoreTarget(null)} disabled={restoring} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                {t("common.cancel")}
              </button>
              <button type="button" onClick={confirmRestore} disabled={restoring} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                {restoring ? t("common.loading") : t("common.restore")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="text-lg font-bold text-red-600 dark:text-red-400">{t("admin.modals.permanentDelete.title")}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {t("admin.modals.permanentDelete.body", {
                code: deleteTarget.takip_kodu,
                model: deleteTarget.cihaz_modeli,
              })}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                {t("common.cancel")}
              </button>
              <button type="button" onClick={confirmPermanentDelete} disabled={deleting} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {deleting ? t("common.deleting") : t("common.permanentDelete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </>
  );
}
