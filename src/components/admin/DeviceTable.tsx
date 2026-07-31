"use client";

import Link from "next/link";
import type { DeviceListItem } from "@/types/admin";
import { STATUS_COLORS } from "@/types/repair";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatCurrency, formatDate, statusKey } from "@/lib/i18n/format";
import WhatsAppButton from "./WhatsAppButton";

type DeviceTableProps =
  | {
      devices: DeviceListItem[];
      variant?: "active";
      onEdit: (device: DeviceListItem) => void;
      onArchive: (device: DeviceListItem) => void;
      onRestore?: never;
      emptyMessage?: string;
    }
  | {
      devices: DeviceListItem[];
      variant: "archived";
      onRestore: (device: DeviceListItem) => void;
      onPermanentDelete: (device: DeviceListItem) => void;
      onEdit?: never;
      onArchive?: never;
      emptyMessage?: string;
    };

function DeviceActions(props: DeviceTableProps & { device: DeviceListItem }) {
  const { t } = useTranslation();
  const { device } = props;
  const isArchived = props.variant === "archived";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isArchived ? (
        <>
          <button
            type="button"
            onClick={() => props.onRestore(device)}
            className="min-h-[36px] touch-manipulation rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300"
          >
            {t("admin.deviceTable.restore")}
          </button>
          <button
            type="button"
            onClick={() => props.onPermanentDelete(device)}
            className="min-h-[36px] touch-manipulation rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
          >
            {t("admin.deviceTable.permanentDelete")}
          </button>
        </>
      ) : (
        <>
          <WhatsAppButton device={device} />
          <button
            type="button"
            onClick={() => props.onEdit(device)}
            className="min-h-[36px] touch-manipulation rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-blue-900/40 dark:hover:text-blue-300"
          >
            {t("common.edit")}
          </button>
          <button
            type="button"
            onClick={() => props.onArchive(device)}
            className="min-h-[36px] touch-manipulation rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:bg-slate-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
          >
            {t("common.archive")}
          </button>
        </>
      )}
    </div>
  );
}

function DeviceMobileCards(props: DeviceTableProps) {
  const { t, locale } = useTranslation();
  const { devices } = props;
  const isArchived = props.variant === "archived";

  return (
    <div className="space-y-3 md:hidden">
      {devices.map((device) => (
        <article
          key={device.id}
          className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${
            device.riskli_musteri ? "border-red-200 bg-red-50/30 dark:border-red-900/50 dark:bg-red-900/10" : ""
          } ${isArchived ? "opacity-90" : ""}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                {device.takip_kodu}
              </p>
              <p className="mt-1 truncate font-medium text-slate-900 dark:text-white">
                {device.musteri_adi}
                {device.riskli_musteri && (
                  <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                    {t("admin.deviceTable.risk")}
                  </span>
                )}
              </p>
              {device.musteri_telefon && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{device.musteri_telefon}</p>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${STATUS_COLORS[device.cihaz_durumu]}`}
            >
              {t(statusKey(device.cihaz_durumu))}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
              <p className="text-slate-400">{t("admin.deviceTable.device")}</p>
              <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">{device.cihaz_modeli}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
              <p className="text-slate-400">{t("admin.deviceTable.total")}</p>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                {formatCurrency(device.toplam_ucret, locale)}
              </p>
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            {t("admin.deviceTable.updated")}: {formatDate(device.guncelleme_tarihi, locale, { day: "numeric", month: "short", year: "numeric" })}
          </p>

          {!isArchived && (
            <Link
              href={`/admin/receipt/${encodeURIComponent(device.takip_kodu)}`}
              target="_blank"
              className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              {t("admin.deviceTable.printReceiptArrow")}
            </Link>
          )}

          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
            <DeviceActions {...props} device={device} />
          </div>
        </article>
      ))}
    </div>
  );
}

export default function DeviceTable(props: DeviceTableProps) {
  const { t, locale } = useTranslation();
  const { devices, emptyMessage } = props;
  const isArchived = props.variant === "archived";
  const defaultEmpty = t("admin.deviceTable.empty");

  if (devices.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-800">
        <p className="text-slate-500 dark:text-slate-400">{emptyMessage ?? defaultEmpty}</p>
      </div>
    );
  }

  return (
    <>
      <DeviceMobileCards {...props} />

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/80">
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t("admin.deviceTable.trackingCode")}</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t("admin.deviceTable.customer")}</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t("admin.deviceTable.device")}</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t("admin.deviceTable.status")}</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t("admin.deviceTable.total")}</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t("admin.deviceTable.updated")}</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t("admin.deviceTable.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {devices.map((device) => (
                <tr
                  key={device.id}
                  className={`transition hover:bg-slate-50/50 dark:hover:bg-slate-700/40 ${
                    device.riskli_musteri ? "bg-red-50/30 dark:bg-red-900/10" : ""
                  } ${isArchived ? "opacity-80" : ""}`}
                >
                  <td className="px-6 py-4">
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {device.takip_kodu}
                    </span>
                    {!isArchived && (
                      <Link
                        href={`/admin/receipt/${encodeURIComponent(device.takip_kodu)}`}
                        target="_blank"
                        className="mt-1 block text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {t("admin.deviceTable.printReceipt")}
                      </Link>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-white">{device.musteri_adi}</p>
                      {device.riskli_musteri && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                          {t("admin.deviceTable.risk")}
                        </span>
                      )}
                    </div>
                    {device.musteri_telefon && (
                      <p className="text-xs text-slate-400">{device.musteri_telefon}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{device.cihaz_modeli}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_COLORS[device.cihaz_durumu]}`}
                    >
                      {t(statusKey(device.cihaz_durumu))}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {formatCurrency(device.toplam_ucret, locale)}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    {formatDate(device.guncelleme_tarihi, locale, { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-6 py-4">
                    <DeviceActions {...props} device={device} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
