"use client";

import type { CustomerCheckData } from "@/types/admin";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatDateLong } from "@/lib/i18n/format";

interface CustomerAlertProps {
  data: CustomerCheckData | null;
}

export default function CustomerAlert({ data }: CustomerAlertProps) {
  const { t, locale } = useTranslation();

  if (!data) return null;

  const hasWarranty = data.aktif_garantiler.length > 0;
  const isRisky = data.riskli_musteri;

  if (!hasWarranty && !isRisky) return null;

  return (
    <div className="space-y-3">
      {isRisky && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-bold text-red-800">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {t("admin.customerAlert.riskyTitle")}
          </p>
          {data.risk_notu && (
            <p className="mt-1 text-sm text-red-700">{data.risk_notu}</p>
          )}
        </div>
      )}

      {hasWarranty && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-900">{t("admin.customerAlert.warrantyTitle")}</p>
          <ul className="mt-2 space-y-1.5">
            {data.aktif_garantiler.map((g) => (
              <li key={g.id} className="text-sm text-amber-800">
                {t("admin.customerAlert.warrantyItem", {
                  part: g.parca_adi,
                  model: g.cihaz_modeli,
                  code: g.takip_kodu,
                  months: g.garanti_ay,
                  date: formatDateLong(g.bitis_tarihi, locale),
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
