"use client";

import { FormEvent, useState } from "react";
import { addDevice, checkCustomer } from "@/lib/admin-api";
import type { CustomerCheckData } from "@/types/admin";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import CustomerAlert from "./CustomerAlert";

interface AddDeviceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (takipKodu: string) => void;
}

export default function AddDeviceModal({ open, onClose, onSuccess }: AddDeviceModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerCheckData | null>(null);
  const [showDevicePassword, setShowDevicePassword] = useState(false);

  if (!open) return null;

  async function handleCustomerCheck(telefon: string, adSoyad: string) {
    if (!telefon && !adSoyad) {
      setCustomerInfo(null);
      return;
    }
    const res = await checkCustomer({
      telefon: telefon || undefined,
      ad_soyad: adSoyad || undefined,
    });
    if (res.success) setCustomerInfo(res.data ?? null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setError(null);
    setLoading(true);

    const form = new FormData(formEl);

    try {
      const response = await addDevice({
        ad_soyad: String(form.get("ad_soyad") ?? "").trim(),
        telefon: String(form.get("telefon") ?? "").trim() || undefined,
        email: String(form.get("email") ?? "").trim() || undefined,
        cihaz_modeli: String(form.get("cihaz_modeli") ?? "").trim(),
        aciklama: String(form.get("aciklama") ?? "").trim() || undefined,
        imei_no: String(form.get("imei_no") ?? "").trim() || undefined,
        cihaz_sifresi: String(form.get("cihaz_sifresi") ?? "").trim() || undefined,
      });

      if (!response.success) {
        setError(response.message ?? t("admin.modals.addDevice.addFailed"));
        return;
      }

      const takipKodu = (response.data?.takip_kodu as string) ?? "";
      formEl.reset();
      setCustomerInfo(null);
      setShowDevicePassword(false);
      onSuccess(takipKodu);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.connectionShort"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label={t("common.close")} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:p-6 dark:bg-slate-900">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("admin.modals.addDevice.title")}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("admin.modals.addDevice.subtitle")}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <CustomerAlert data={customerInfo} />

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="ad_soyad" className="block text-sm font-medium text-slate-700">{t("admin.modals.addDevice.customerName")}</label>
            <input
              id="ad_soyad"
              name="ad_soyad"
              required
              disabled={loading}
              onBlur={(e) => handleCustomerCheck(
                (document.getElementById("telefon") as HTMLInputElement)?.value ?? "",
                e.target.value
              )}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="telefon" className="block text-sm font-medium text-slate-700">{t("admin.modals.addDevice.phone")}</label>
              <input
                id="telefon"
                name="telefon"
                disabled={loading}
                placeholder={t("admin.settings.firma.phonePlaceholder")}
                onBlur={(e) => handleCustomerCheck(
                  e.target.value,
                  (document.getElementById("ad_soyad") as HTMLInputElement)?.value ?? ""
                )}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">{t("admin.modals.addDevice.email")}</label>
              <input id="email" name="email" type="email" disabled={loading} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>

          <div>
            <label htmlFor="cihaz_modeli" className="block text-sm font-medium text-slate-700">{t("admin.modals.addDevice.deviceModel")}</label>
            <input id="cihaz_modeli" name="cihaz_modeli" required disabled={loading} placeholder={t("admin.modals.addDevice.deviceModelPlaceholder")} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="imei_no" className="block text-sm font-medium text-slate-700">{t("admin.modals.addDevice.imei")}</label>
              <input id="imei_no" name="imei_no" disabled={loading} placeholder={t("admin.modals.addDevice.imeiPlaceholder")} maxLength={20} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label htmlFor="cihaz_sifresi" className="block text-sm font-medium text-slate-700">{t("admin.modals.addDevice.devicePassword")}</label>
              <div className="relative mt-1.5">
                <input
                  id="cihaz_sifresi"
                  name="cihaz_sifresi"
                  type={showDevicePassword ? "text" : "password"}
                  disabled={loading}
                  placeholder={t("admin.modals.addDevice.devicePasswordPlaceholder")}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-11 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowDevicePassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showDevicePassword ? t("common.hide") : t("common.show")}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {showDevicePassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="aciklama" className="block text-sm font-medium text-slate-700">{t("admin.modals.addDevice.faultNote")}</label>
            <textarea id="aciklama" name="aciklama" rows={3} disabled={loading} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20" />
          </div>

          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{t("common.cancel")}</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{loading ? t("common.saving") : t("admin.modals.addDevice.saveAndPrint")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
