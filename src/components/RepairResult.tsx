"use client";

import type { RepairData } from "@/types/repair";
import { STATUS_COLORS } from "@/types/repair";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatCurrency, formatDateLong, statusKey } from "@/lib/i18n/format";

interface RepairResultProps {
  data: RepairData;
}

function ReplacedPartsBlock({
  parts,
  title,
  emptyLabel,
  boxed = false,
}: {
  parts: string[];
  title: string;
  emptyLabel: string;
  boxed?: boolean;
}) {
  const inner = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      {parts.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {parts.map((parca) => (
            <li
              key={parca}
              className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
            >
              {parca}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{emptyLabel}</p>
      )}
    </>
  );

  if (boxed) {
    return (
      <div className="mt-6 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
        {inner}
      </div>
    );
  }

  return <div className="mt-6">{inner}</div>;
}

export default function RepairResult({ data }: RepairResultProps) {
  const { t, locale, showCostDetail } = useTranslation();
  const statusClass = STATUS_COLORS[data.cihaz_durumu];
  const statusLabel = t(statusKey(data.cihaz_durumu));

  // Dükkan ayarı API'den gelir; public slug yanlış olsa bile kayıtın tenant'ı esas
  const showCosts =
    data.ucret_detayi_goster !== undefined
      ? data.ucret_detayi_goster !== false
      : showCostDetail;

  const araToplam = data.parca_ucreti + data.iscilik_ucreti;
  const indirim = Math.max(0, Math.round((araToplam - data.toplam_ucret) * 100) / 100);
  const hasIndirim = indirim > 0;

  const partsTitle = t("customer.result.replacedParts");
  const emptyParts = t("customer.result.noReplacedParts");

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50 sm:p-8">
      {(data.firma_adi || data.firma_telefon) && (
        <div className="mb-6 border-b border-slate-100 pb-5 text-center sm:text-left">
          {data.firma_adi && (
            <p className="text-lg font-bold text-slate-900">{data.firma_adi}</p>
          )}
          {data.firma_telefon && (
            <p className="mt-1 text-sm text-slate-600">{data.firma_telefon}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{t("customer.result.trackingCode")}</p>
          <p className="mt-1 font-mono text-xl font-bold tracking-wide text-slate-900">
            {data.takip_kodu}
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ring-inset ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("customer.result.customer")}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {data.musteri_adi}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("customer.result.deviceModel")}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {data.cihaz_modeli}
          </p>
        </div>
      </div>

      {showCosts ? (
        <>
          {data.degisen_parcalar.length > 0 && (
            <ReplacedPartsBlock
              parts={data.degisen_parcalar}
              title={partsTitle}
              emptyLabel={emptyParts}
            />
          )}

          <div className="mt-6 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t("customer.result.costDetail")}
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <dt>{t("customer.result.partsCost")}</dt>
                <dd className="font-medium">{formatCurrency(data.parca_ucreti, locale)}</dd>
              </div>
              <div className="flex justify-between text-slate-600">
                <dt>{t("customer.result.laborCost")}</dt>
                <dd className="font-medium">
                  {formatCurrency(data.iscilik_ucreti, locale)}
                </dd>
              </div>
              {hasIndirim && (
                <>
                  <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 text-slate-600">
                    <dt>{t("customer.result.subtotal")}</dt>
                    <dd className="font-medium">{formatCurrency(araToplam, locale)}</dd>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <dt className="flex items-center gap-1.5">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {t("customer.result.discount")}
                    </dt>
                    <dd className="font-semibold">−{formatCurrency(indirim, locale)}</dd>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                <dt>{t("customer.result.total")}</dt>
                <dd className="text-blue-600">{formatCurrency(data.toplam_ucret, locale)}</dd>
              </div>
            </dl>
          </div>
        </>
      ) : (
        <ReplacedPartsBlock
          parts={data.degisen_parcalar}
          title={partsTitle}
          emptyLabel={emptyParts}
          boxed
        />
      )}

      {data.aciklama && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("customer.result.technicianNote")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {data.aciklama}
          </p>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        {t("customer.result.lastUpdate", {
          date: formatDateLong(data.guncelleme_tarihi, locale),
        })}
      </p>
    </div>
  );
}
