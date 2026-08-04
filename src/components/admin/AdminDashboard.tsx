"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { checkAuth } from "@/lib/auth-api";
import { archiveDevice, fetchDashboardStats, fetchDevices } from "@/lib/admin-api";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import type { DashboardStats, DeviceListItem } from "@/types/admin";
import type { Permissions } from "@/lib/permissions";
import AdminShell from "./AdminShell";
import StatCards from "./StatCards";
import DeviceTable from "./DeviceTable";
import DeviceSearchBar from "./DeviceSearchBar";
import AddDeviceModal from "./AddDeviceModal";
import EditDeviceModal from "./EditDeviceModal";

const emptyStats: DashboardStats = {
  toplam_cihaz: 0,
  aktif_tamir: 0,
  teslime_hazir: 0,
  bekleyen_cihaz: 0,
  bugunku_tamir: 0,
  pos_cirosu_bugun: 0,
  pos_satis_sayisi_bugun: 0,
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [showPosStats, setShowPosStats] = useState(true);
  const [canSeeCosts, setCanSeeCosts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<DeviceListItem | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<DeviceListItem | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const loadData = useCallback(async (q?: string) => {
    setError(null);
    setLoading(true);

    try {
      const [authRes, devicesRes, statsRes] = await Promise.all([
        checkAuth(),
        fetchDevices({ q: q || undefined }),
        fetchDashboardStats(),
      ]);

      const perms = authRes.data?.permissions as Permissions | undefined;
      setShowPosStats(Boolean(perms?.pos || perms?.see_finance));
      setCanSeeCosts(Boolean(perms?.see_costs));

      if (!devicesRes.success || !devicesRes.data) {
        setError(devicesRes.message ?? t("admin.dashboard.loadFailed"));
        return;
      }

      setDevices(devicesRes.data.devices);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      } else if (devicesRes.data.stats) {
        setStats({ ...emptyStats, ...devicesRes.data.stats });
      }
    } catch {
      setError(t("errors.connectionLaragon"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadData(debouncedQuery);
  }, [loadData, debouncedQuery]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleAddSuccess(takipKodu: string) {
    setToast(t("admin.dashboard.deviceAdded", { code: takipKodu }));
    loadData(debouncedQuery);
    window.open(`/admin/receipt/${encodeURIComponent(takipKodu)}`, "_blank");
  }

  function handleEditSuccess(message?: string) {
    setToast(message ?? t("admin.dashboard.deviceUpdated"));
    loadData(debouncedQuery);
  }

  function handleClearSearch() {
    setSearchInput("");
  }

  async function confirmArchive() {
    if (!archiveTarget) return;

    setArchiving(true);
    const res = await archiveDevice(archiveTarget.id);
    setArchiving(false);
    setArchiveTarget(null);

    if (res.success) {
      setToast(t("admin.dashboard.archived", { code: archiveTarget.takip_kodu }));
      loadData(debouncedQuery);
    } else {
      setToast(res.message ?? t("admin.dashboard.archiveFailed"));
    }
  }

  return (
    <>
      <AdminShell
        title={t("admin.dashboard.title")}
        subtitle={t("admin.dashboard.subtitle")}
        action={
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t("admin.dashboard.addDevice")}
          </button>
        }
      >
        <div className="space-y-8">
          {!loading && !error && (
            <StatCards stats={stats} showPosStats={showPosStats} />
          )}

          <section>
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("admin.dashboard.deviceList")}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/admin/archive"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  {t("nav.archive")}
                </Link>
                <button
                  type="button"
                  onClick={() => loadData(debouncedQuery)}
                  disabled={loading}
                  className="text-sm font-medium text-blue-600 transition hover:text-blue-700 disabled:opacity-50 dark:text-blue-400"
                >
                  {t("common.refresh")}
                </button>
              </div>
            </div>

            <div className="mb-4">
              <DeviceSearchBar
                value={searchInput}
                onChange={setSearchInput}
                onClear={handleClearSearch}
              />
            </div>

            {debouncedQuery && (
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                {t("admin.dashboard.searchLabel")}{" "}
                <span className="font-medium text-slate-700 dark:text-slate-300">&quot;{debouncedQuery}&quot;</span>
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
                onEdit={setEditDevice}
                onArchive={setArchiveTarget}
                showCosts={canSeeCosts}
              />
            )}
          </section>
        </div>
      </AdminShell>

      <AddDeviceModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      <EditDeviceModal
        device={editDevice}
        onClose={() => setEditDevice(null)}
        onSuccess={handleEditSuccess}
        canSeeCosts={canSeeCosts}
      />

      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("admin.modals.archive.title")}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {t("admin.modals.archive.body", {
                code: archiveTarget.takip_kodu,
                model: archiveTarget.cihaz_modeli,
              })}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                disabled={archiving}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={confirmArchive}
                disabled={archiving}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {archiving ? t("common.archiving") : t("common.archive")}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-4 right-4 z-50 rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-medium text-white shadow-xl sm:text-left lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm">
          {toast}
        </div>
      )}

      <button
        type="button"
        onClick={() => setAddModalOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 touch-manipulation items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 active:scale-95 lg:hidden"
        aria-label={t("admin.shell.addDeviceAria")}
      >
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </>
  );
}
