"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { checkCustomer, fetchInventory, updateCustomer, updateDevice } from "@/lib/admin-api";
import type { CustomerCheckData, DeviceListItem, InventoryItem } from "@/types/admin";
import { DEVICE_STATUS_OPTIONS } from "@/types/admin";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatCurrency, statusKey } from "@/lib/i18n/format";
import { runAfterEffect } from "@/lib/run-after-effect";
import CustomerAlert from "./CustomerAlert";
import { useAdminModalOpen } from "./CurrencyAmountInput";
import {
  ModalCloseButton,
  modalBackdropClass,
  modalInputClass,
  modalLabelClass,
  modalOverlayClass,
  modalPrimaryBtnClass,
  modalSecondaryBtnClass,
  useModalHotkeys,
} from "./modal-ui";

interface EditDeviceModalProps {
  device: DeviceListItem | null;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  canSeeCosts?: boolean;
}

export default function EditDeviceModal({ device, onClose, onSuccess, canSeeCosts = true }: EditDeviceModalProps) {
  const { t, locale } = useTranslation();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [iscilikUcreti, setIscilikUcreti] = useState(0);
  const [indirim, setIndirim] = useState(0);
  const [toplamUcret, setToplamUcret] = useState(0);
  const [customerInfo, setCustomerInfo] = useState<CustomerCheckData | null>(null);
  const [riskli, setRiskli] = useState(false);
  const [riskNotu, setRiskNotu] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState<Record<number, number>>({});
  const [garantiVer, setGarantiVer] = useState(false);
  const [warrantyEnabled, setWarrantyEnabled] = useState<Record<number, boolean>>({});
  const [status, setStatus] = useState<string>("");
  const [odemeSekli, setOdemeSekli] = useState<"nakit" | "kart" | "veresiye" | "beklemede">("nakit");
  const [imeiNo, setImeiNo] = useState("");
  const [cihazSifresi, setCihazSifresi] = useState("");
  const [showDevicePassword, setShowDevicePassword] = useState(false);

  const handleClose = useCallback(() => {
    if (!loading) onClose();
  }, [loading, onClose]);

  useModalHotkeys({
    open: Boolean(device),
    onClose: handleClose,
    formRef,
    disabled: loading || inventoryLoading,
  });
  useAdminModalOpen(Boolean(device));

  useEffect(() => {
    if (!device) return;

    return runAfterEffect(() => {
      setError(null);
      setStatus(device.cihaz_durumu);
      setOdemeSekli("nakit");
      setRiskli(device.riskli_musteri);
      setRiskNotu(device.risk_notu ?? "");
      setImeiNo(device.imei_no ?? "");
      setCihazSifresi(device.cihaz_sifresi ?? "");
      setIscilikUcreti(device.iscilik_ucreti);
      setToplamUcret(device.toplam_ucret);
      setInventoryLoading(true);

      const checkParams = device.musteri_telefon
        ? { telefon: device.musteri_telefon }
        : { ad_soyad: device.musteri_adi };
      checkCustomer(checkParams).then((res) => {
        if (res.success && res.data) setCustomerInfo(res.data);
      });

      fetchInventory()
      .then((response) => {
        if (!response.success || !response.data) {
          setError(response.message ?? t("admin.modals.editDevice.stockLoadFailed"));
          return;
        }

        setInventory(response.data);

        const matchedIds = response.data
          .filter((item) => device.degisen_parcalar.includes(item.part_name))
          .map((item) => item.id);

        setSelectedIds(matchedIds);

        const months: Record<number, number> = {};
        const enabled: Record<number, boolean> = {};
        matchedIds.forEach((id) => {
          months[id] = 3;
          enabled[id] = false;
        });
        setWarrantyMonths(months);
        setWarrantyEnabled(enabled);
        setGarantiVer(false);

        const parcaFromStock = response.data
          .filter((item) => matchedIds.includes(item.id))
          .reduce((sum, item) => sum + item.sell_price, 0);

        const hesaplanan = parcaFromStock + device.iscilik_ucreti;
        setIndirim(Math.max(0, Math.round((hesaplanan - device.toplam_ucret) * 100) / 100));
      })
      .catch(() => setError(t("admin.modals.editDevice.stockFetchFailed")))
      .finally(() => setInventoryLoading(false));
    });
  }, [device, t]);

  const selectedItems = useMemo(
    () => inventory.filter((item) => selectedIds.includes(item.id)),
    [inventory, selectedIds]
  );

  const parcaUcreti = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.sell_price, 0),
    [selectedItems]
  );

  const hesaplananToplam = parcaUcreti + iscilikUcreti;

  const [totalBasis, setTotalBasis] = useState({ hesaplananToplam: 0, indirim: 0 });
  if (
    hesaplananToplam !== totalBasis.hesaplananToplam ||
    indirim !== totalBasis.indirim
  ) {
    setTotalBasis({ hesaplananToplam, indirim });
    setToplamUcret(Math.max(0, Math.round((hesaplananToplam - indirim) * 100) / 100));
  }

  function togglePart(id: number) {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!prev.includes(id)) {
        setWarrantyMonths((m) => ({ ...m, [id]: 3 }));
        setWarrantyEnabled((e) => ({ ...e, [id]: garantiVer }));
      }
      return next;
    });
  }

  function handleIndirimChange(value: number) {
    const safe = Math.max(0, Math.min(value, hesaplananToplam));
    setIndirim(safe);
  }

  function handleToplamChange(value: number) {
    const safe = Math.max(0, value);
    setToplamUcret(safe);
    setIndirim(Math.max(0, Math.round((hesaplananToplam - safe) * 100) / 100));
  }

  if (!device) return null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const newStatus = String(form.get("cihaz_durumu"));

    try {
      if (device!.musteri_id) {
        await updateCustomer({
          id: device!.musteri_id,
          riskli_musteri: riskli,
          risk_notu: riskNotu || undefined,
        });
      }

      const warranties =
        newStatus === "teslim_edildi" && garantiVer
          ? selectedItems
              .filter((item) => warrantyEnabled[item.id])
              .map((item) => ({
                parca_adi: item.part_name,
                garanti_ay: warrantyMonths[item.id] ?? 3,
              }))
          : undefined;

      const response = await updateDevice({
        id: device!.id,
        cihaz_durumu: newStatus as DeviceListItem["cihaz_durumu"],
        degisen_parcalar: selectedItems.map((item) => item.part_name),
        inventory_ids: selectedIds,
        parca_ucreti: canSeeCosts ? parcaUcreti : device!.parca_ucreti,
        iscilik_ucreti: canSeeCosts ? iscilikUcreti : device!.iscilik_ucreti,
        indirim: canSeeCosts ? indirim : 0,
        toplam_ucret: canSeeCosts ? toplamUcret : device!.toplam_ucret,
        odeme_sekli:
          newStatus === "teslim_edildi" && device!.cihaz_durumu !== "teslim_edildi"
            ? odemeSekli
            : undefined,
        aciklama: String(form.get("aciklama") ?? "").trim() || undefined,
        imei_no: imeiNo.trim() || undefined,
        cihaz_sifresi: cihazSifresi.trim() || undefined,
        warranties,
      });

      if (!response.success) {
        setError(response.message ?? t("admin.modals.editDevice.updateFailed"));
        return;
      }

      onSuccess(response.message);
      onClose();
    } catch {
      setError(t("errors.connectionShort"));
    } finally {
      setLoading(false);
    }
  }

  const showDeliveryHint = device.cihaz_durumu !== "teslim_edildi";

  return (
    <div className={modalOverlayClass}>
      <button
        type="button"
        aria-label={t("common.close")}
        className={modalBackdropClass}
        onClick={handleClose}
      />

      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-700/80">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700 sm:px-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t("admin.modals.editDevice.title")}</h2>
            <p className="mt-0.5 font-mono text-sm text-blue-600 dark:text-blue-400">{device.takip_kodu}</p>
          </div>
          <ModalCloseButton onClick={handleClose} label={t("common.close")} />
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="grid gap-6 p-6 sm:grid-cols-5 sm:p-8">
            {/* Sol: Durum + Parçalar */}
            <div className="space-y-5 sm:col-span-3">
              <CustomerAlert data={customerInfo} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="imei_no" className={modalLabelClass}>{t("admin.modals.addDevice.imei")}</label>
                  <input id="imei_no" value={imeiNo} onChange={(e) => setImeiNo(e.target.value)} disabled={loading} placeholder={t("admin.modals.addDevice.imeiPlaceholder")} maxLength={20} className={`mt-1.5 font-mono ${modalInputClass}`} />
                </div>
                <div>
                  <label htmlFor="cihaz_sifresi" className={modalLabelClass}>{t("admin.modals.addDevice.devicePassword")}</label>
                  <div className="relative mt-1.5">
                    <input
                      id="cihaz_sifresi"
                      type={showDevicePassword ? "text" : "password"}
                      value={cihazSifresi}
                      onChange={(e) => setCihazSifresi(e.target.value)}
                      disabled={loading}
                      placeholder={t("admin.modals.addDevice.devicePasswordPlaceholder")}
                      className={`pr-11 ${modalInputClass}`}
                    />
                    <button type="button" onClick={() => setShowDevicePassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
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
                <label htmlFor="cihaz_durumu" className={modalLabelClass}>
                  {t("admin.modals.editDevice.status")}
                </label>
                <select
                  id="cihaz_durumu"
                  name="cihaz_durumu"
                  defaultValue={device.cihaz_durumu}
                  disabled={loading}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`mt-1.5 ${modalInputClass}`}
                >
                  {DEVICE_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(statusKey(opt.value))}
                    </option>
                  ))}
                </select>
                {showDeliveryHint && (
                  <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                    {t("admin.modals.editDevice.deliveryHint")}
                  </p>
                )}
                {status === "teslim_edildi" && device.cihaz_durumu !== "teslim_edildi" && (
                  <div className="mt-3">
                    <label htmlFor="odeme_sekli" className={modalLabelClass}>
                      {t("admin.modals.editDevice.paymentMethod")}
                    </label>
                    <select
                      id="odeme_sekli"
                      value={odemeSekli}
                      onChange={(e) =>
                        setOdemeSekli(
                          e.target.value as "nakit" | "kart" | "veresiye" | "beklemede"
                        )
                      }
                      disabled={loading}
                      className={`mt-1.5 ${modalInputClass}`}
                    >
                      <option value="nakit">{t("admin.modals.editDevice.payCash")}</option>
                      <option value="kart">{t("admin.modals.editDevice.payCard")}</option>
                      <option value="veresiye">{t("admin.modals.editDevice.payCredit")}</option>
                      <option value="beklemede">{t("admin.modals.editDevice.payLater")}</option>
                    </select>
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {t("admin.modals.editDevice.paymentHint")}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className={modalLabelClass}>
                  {t("admin.modals.editDevice.stockParts")}
                </label>

                {inventoryLoading ? (
                  <p className="mt-2 text-sm text-slate-400">{t("admin.modals.editDevice.stockLoading")}</p>
                ) : inventory.length === 0 ? (
                  <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    {t("admin.modals.editDevice.stockEmpty")}
                  </p>
                ) : (
                  <div className="mt-2 grid max-h-52 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                    {inventory.map((item) => {
                      const checked = selectedIds.includes(item.id);
                      const outOfStock = item.stock_quantity < 1;

                      return (
                        <label
                          key={item.id}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition ${
                            checked ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-white"
                          } ${outOfStock && !checked ? "opacity-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={loading || (outOfStock && !checked)}
                            onChange={() => togglePart(item.id)}
                            className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">{item.part_name}</p>
                            <p className="text-xs text-slate-500">
                              {formatCurrency(item.sell_price, locale)} · {t("common.pieces", { count: item.stock_quantity })}
                              {outOfStock && !checked && ` · ${t("admin.modals.editDevice.depleted")}`}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {status === "teslim_edildi" && selectedItems.length > 0 && (
                <div className="rounded-xl border border-emerald-300/80 bg-emerald-50 p-4 dark:border-emerald-400/35 dark:bg-slate-800/90">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={garantiVer}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setGarantiVer(on);
                        if (on) {
                          const all: Record<number, boolean> = {};
                          selectedItems.forEach((item) => { all[item.id] = true; });
                          setWarrantyEnabled(all);
                        }
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500 dark:border-slate-400 dark:bg-slate-700 dark:text-emerald-400"
                    />
                    <div>
                      <p className="text-sm font-semibold text-emerald-950 dark:text-white">{t("admin.modals.editDevice.warranty")}</p>
                      <p className="mt-0.5 text-xs text-emerald-800/80 dark:text-slate-200">{t("admin.modals.editDevice.warrantyHint")}</p>
                    </div>
                  </label>

                  {garantiVer && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-emerald-900 dark:text-slate-100">{t("admin.modals.editDevice.warrantyParts")}</p>
                      {selectedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-emerald-100 dark:bg-slate-900/70 dark:ring-slate-600/50"
                        >
                          <label className="flex flex-1 cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={warrantyEnabled[item.id] ?? false}
                              onChange={(e) =>
                                setWarrantyEnabled((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded text-emerald-600 dark:border-slate-500 dark:bg-slate-700"
                            />
                            <span className="truncate text-slate-800 dark:text-white">{item.part_name}</span>
                          </label>
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min={1}
                              max={24}
                              disabled={!warrantyEnabled[item.id]}
                              value={warrantyMonths[item.id] ?? 3}
                              onChange={(e) =>
                                setWarrantyMonths((m) => ({
                                  ...m,
                                  [item.id]: parseInt(e.target.value, 10) || 3,
                                }))
                              }
                              className="w-14 rounded border border-slate-200 bg-white px-2 py-1 text-center text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-900 dark:disabled:text-slate-500"
                            />
                            <span className="text-xs text-slate-600 dark:text-slate-200">{t("common.months")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={riskli}
                    onChange={(e) => setRiskli(e.target.checked)}
                    className="h-4 w-4 rounded text-red-600"
                  />
                  <span className="text-sm font-semibold text-red-700">{t("admin.modals.editDevice.riskyCustomer")}</span>
                </label>
                {riskli && (
                  <input
                    type="text"
                    value={riskNotu}
                    onChange={(e) => setRiskNotu(e.target.value)}
                    placeholder={t("admin.modals.editDevice.riskyNotePlaceholder")}
                    className="mt-2 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
                  />
                )}
              </div>

              <div>
                <label htmlFor="aciklama" className={modalLabelClass}>
                  {t("admin.modals.editDevice.technicianNote")}
                </label>
                <textarea
                  id="aciklama"
                  name="aciklama"
                  rows={2}
                  defaultValue={device.aciklama ?? ""}
                  disabled={loading}
                  className={`mt-1.5 resize-none ${modalInputClass}`}
                />
              </div>
            </div>

            {/* Sağ: Fiyatlandırma / kaydet */}
            <div className="space-y-4 sm:col-span-2">
              {canSeeCosts && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-800/60">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("admin.modals.editDevice.costDetail")}</h3>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{t("admin.modals.editDevice.partsAuto")}</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(parcaUcreti, locale)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">{t("admin.modals.editDevice.labor")}</span>
                    <input
                      id="iscilik_ucreti"
                      type="number"
                      min="0"
                      step="0.01"
                      value={iscilikUcreti || ""}
                      onChange={(e) => setIscilikUcreti(parseFloat(e.target.value) || 0)}
                      disabled={loading}
                      className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-right text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{t("admin.modals.editDevice.subtotal")}</span>
                      <span className="font-medium text-slate-700">{formatCurrency(hesaplananToplam, locale)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-500">{t("admin.modals.editDevice.discount")}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      max={hesaplananToplam}
                      value={indirim || ""}
                      onChange={(e) => handleIndirimChange(parseFloat(e.target.value) || 0)}
                      disabled={loading}
                      placeholder="0"
                      className="w-28 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-right text-sm font-semibold text-orange-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 disabled:opacity-60 dark:border-orange-800/60 dark:bg-orange-950/40 dark:text-orange-300"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-blue-700 p-4 text-white dark:bg-blue-800">
                  <label htmlFor="toplam_ucret" className="block text-xs font-medium text-blue-100/80">
                    {t("admin.modals.editDevice.totalEditable")}
                  </label>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-lg font-bold">₺</span>
                    <input
                      id="toplam_ucret"
                      type="number"
                      min="0"
                      step="0.01"
                      value={toplamUcret || ""}
                      onChange={(e) => handleToplamChange(parseFloat(e.target.value) || 0)}
                      disabled={loading}
                      className="w-full bg-transparent text-2xl font-bold outline-none placeholder:text-blue-200/70"
                    />
                  </div>
                  {indirim > 0 && (
                    <p className="mt-1 text-xs text-blue-100/80">
                      {t("admin.modals.editDevice.discountApplied", { amount: formatCurrency(indirim, locale) })}
                    </p>
                  )}
                </div>
              </div>
              )}

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className={modalSecondaryBtnClass}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading || inventoryLoading}
                  className={modalPrimaryBtnClass}
                >
                  {loading ? t("common.saving") : t("admin.modals.editDevice.update")}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
