"use client";

import type { RepairData } from "@/types/repair";
import { STATUS_COLORS } from "@/types/repair";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatCurrency, formatDate, formatDateLong, statusKey } from "@/lib/i18n/format";
import {
  buildCustomerPickupMessage,
  getWhatsAppUrl,
} from "@/lib/whatsapp";

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

function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = `90${digits.slice(1)}`;
  else if (!digits.startsWith("90")) digits = `90${digits}`;
  return `tel:+${digits}`;
}

export default function RepairResult({ data }: RepairResultProps) {
  const { t, locale, showCostDetail } = useTranslation();
  const statusClass = STATUS_COLORS[data.cihaz_durumu];
  const statusLabel = t(statusKey(data.cihaz_durumu));

  const showCosts =
    data.ucret_detayi_goster !== undefined
      ? data.ucret_detayi_goster !== false
      : showCostDetail;

  const araToplam = data.parca_ucreti + data.iscilik_ucreti;
  const indirim = Math.max(0, Math.round((araToplam - data.toplam_ucret) * 100) / 100);
  const hasIndirim = indirim > 0;

  const partsTitle = t("customer.result.replacedParts");
  const emptyParts = t("customer.result.noReplacedParts");
  const isReady = data.cihaz_durumu === "hazir";
  const phone = data.firma_telefon?.trim() || null;
  const callUrl = telHref(phone);
  const waUrl = phone
    ? getWhatsAppUrl(
        phone,
        buildCustomerPickupMessage({
          takipKodu: data.takip_kodu,
          cihazModeli: data.cihaz_modeli,
        })
      )
    : null;
  const warranties = data.garantiler ?? [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50 sm:p-8">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{t("customer.result.trackingCode")}</p>
          <p className="mt-1 font-mono text-xl font-bold tracking-wide text-slate-900">
            {data.takip_kodu}
          </p>
          {data.firma_adi?.trim() && (
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-slate-500">
                {t("customer.result.shop")}:{" "}
              </span>
              <span className="font-semibold text-slate-800">{data.firma_adi.trim()}</span>
            </p>
          )}
        </div>
        <span
          className={`inline-flex w-fit items-center rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ring-inset ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>

      {isReady && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
          <p className="text-base font-bold text-emerald-900">
            {t("customer.result.readyTitle")}
          </p>
          <p className="mt-1 text-sm text-emerald-800/90">
            {t("customer.result.readyBody")}
          </p>
          {(callUrl || waUrl) && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {callUrl && (
                <a
                  href={callUrl}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  {t("customer.result.callShop")}
                </a>
              )}
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1fb855]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  {t("customer.result.whatsappShop")}
                </a>
              )}
            </div>
          )}
          {phone && (
            <p className="mt-3 text-center text-xs text-emerald-800/80 sm:text-left">
              {t("customer.result.shopPhone", { phone })}
            </p>
          )}
        </div>
      )}

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

      {warranties.length > 0 && (
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700/80">
            {t("customer.result.warrantyTitle")}
          </p>
          <ul className="mt-3 space-y-2">
            {warranties.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm ring-1 ring-blue-100"
              >
                <span className="font-medium text-slate-800">{w.parca_adi}</span>
                <span className="text-slate-600">
                  {t("customer.result.warrantyMonths", { months: w.garanti_ay })}
                  {" · "}
                  {t("customer.result.warrantyUntil", {
                    date: formatDate(w.bitis_tarihi, locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                  })}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    w.aktif
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {w.aktif
                    ? t("customer.result.warrantyActive")
                    : t("customer.result.warrantyExpired")}
                </span>
              </li>
            ))}
          </ul>
        </div>
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
