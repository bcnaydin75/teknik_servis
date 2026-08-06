"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { fetchInventory, fetchSuppliers, saveInventoryItem } from "@/lib/admin-api";
import type { InventoryItem, SupplierItem } from "@/types/admin";
import AdminShell from "./AdminShell";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatCurrency, formatMoneyInput, parseMoneyInput } from "@/lib/i18n/format";
import { runAfterEffect } from "@/lib/run-after-effect";
import CurrencyAmountInput, { useAdminModalOpen } from "./CurrencyAmountInput";
import {
  ModalCloseButton,
  modalBackdropClass,
  modalInputClass,
  modalLabelClass,
  modalOverlayClass,
  modalPanelBodyClass,
  modalPanelClass,
  modalPanelFooterClass,
  modalPrimaryBtnClass,
  modalSecondaryBtnClass,
  useModalHotkeys,
} from "./modal-ui";

/** type=number alanında baştaki 0'ı temizle (015 → 15) */
function stripLeadingZeros(el: HTMLInputElement) {
  const raw = el.value;
  if (raw === "" || raw === "-") return;
  // Ondalık değilse
  if (!raw.includes(".") && !raw.includes(",")) {
    const cleaned = raw.replace(/^0+(?=\d)/, "");
    if (cleaned !== raw) el.value = cleaned || "0";
  }
}

export default function InventoryPage() {
  const { t, locale } = useTranslation();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [buyDisplay, setBuyDisplay] = useState("");
  const [sellDisplay, setSellDisplay] = useState("");
  const [qtyDisplay, setQtyDisplay] = useState("");
  /** Düzenlemede: yazılan adet kadar artır veya azalt */
  const [qtyAdjustMode, setQtyAdjustMode] = useState<"increase" | "decrease">("increase");
  const formRef = useRef<HTMLFormElement>(null);

  const closeForm = useCallback(() => {
    if (saving) return;
    setShowForm(false);
    setEditing(null);
    setBuyDisplay("");
    setSellDisplay("");
    setQtyDisplay("");
    setQtyAdjustMode("increase");
  }, [saving]);

  useModalHotkeys({
    open: showForm,
    onClose: closeForm,
    formRef,
    disabled: saving,
  });
  useAdminModalOpen(showForm);

  const showCosts = items.length === 0 || items.some((i) => i.buy_price !== undefined);

  const loadInventory = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetchInventory();

      if (!response.success || !response.data) {
        setError(response.message ?? t("admin.inventory.loadFailed"));
        return;
      }

      setItems(response.data);
      const supRes = await fetchSuppliers();
      if (supRes.success && supRes.data) setSuppliers(supRes.data.suppliers);
    } catch {
      setError(t("errors.connectionShort"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    return runAfterEffect(() => {
      void loadInventory();
    });
  }, [loadInventory]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function openAddForm() {
    setEditing(null);
    setBuyDisplay("");
    setSellDisplay("");
    setQtyDisplay("");
    setQtyAdjustMode("increase");
    setShowForm(true);
  }

  function openEditForm(item: InventoryItem) {
    setEditing(item);
    setBuyDisplay(item.buy_price ? formatMoneyInput(item.buy_price) : "");
    setSellDisplay(item.sell_price ? formatMoneyInput(item.sell_price) : "");
    setQtyDisplay("");
    setQtyAdjustMode("increase");
    setShowForm(true);
  }

  const adjustQty = parseInt(qtyDisplay.replace(/\D/g, "") || "0", 10) || 0;
  const previewStock = editing
    ? Math.max(
        0,
        qtyAdjustMode === "increase"
          ? editing.stock_quantity + adjustQty
          : editing.stock_quantity - adjustQty
      )
    : adjustQty;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const delta = parseInt(qtyDisplay.replace(/\D/g, "") || "0", 10) || 0;
    const stock_quantity = editing
      ? Math.max(
          0,
          qtyAdjustMode === "increase"
            ? editing.stock_quantity + delta
            : editing.stock_quantity - delta
        )
      : delta;

    try {
      const response = await saveInventoryItem({
        action: editing ? "update" : "add",
        id: editing?.id,
        part_name: String(form.get("part_name") ?? "").trim(),
        buy_price: showCosts ? parseMoneyInput(buyDisplay) : editing?.buy_price ?? 0,
        sell_price: parseMoneyInput(sellDisplay),
        stock_quantity,
        supplier_id: form.get("supplier_id") ? parseInt(String(form.get("supplier_id")), 10) : null,
      });

      if (!response.success) {
        setToast(response.message ?? t("admin.inventory.saveFailed"));
        return;
      }

      setToast(editing ? t("admin.inventory.updated") : t("admin.inventory.added"));
      closeForm();
      loadInventory();
    } catch {
      setToast(t("errors.connectionShort"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminShell
        title={t("admin.inventory.title")}
        subtitle={t("admin.inventory.subtitle")}
        action={
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t("admin.inventory.addStock")}
          </button>
        }
      >
        <div className="mb-4 lg:hidden">
          <button
            type="button"
            onClick={openAddForm}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white touch-manipulation active:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {t("admin.inventory.addStock")}
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 dark:border-slate-700 dark:bg-slate-800">
            <svg className="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/80">
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                      {t("admin.inventory.partName")}
                    </th>
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                      {t("admin.inventory.supplier")}
                    </th>
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                      {t("admin.inventory.quantity")}
                    </th>
                    {showCosts && (
                      <>
                        <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          {t("admin.inventory.costCurrency")}
                        </th>
                        <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          {t("admin.inventory.sellCurrency")}
                        </th>
                      </>
                    )}
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {items.map((item) => {
                    const lowStock = item.stock_quantity <= 3;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          {item.part_name}
                        </td>
                        <td className="px-6 py-4 text-slate-700 dark:text-white">
                          {item.supplier_name ?? t("common.dash")}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={
                              lowStock
                                ? "font-semibold text-amber-600 dark:text-amber-400"
                                : "text-slate-700 dark:text-slate-200"
                            }
                          >
                            {t("common.pieces", { count: item.stock_quantity })}
                          </span>
                        </td>
                        {showCosts && (
                          <>
                            <td className="px-6 py-4 text-slate-700 dark:text-slate-200">
                              {formatCurrency(item.buy_price ?? 0, locale)}
                            </td>
                            <td className="px-6 py-4 text-slate-700 dark:text-slate-200">
                              {formatCurrency(item.sell_price ?? 0, locale)}
                            </td>
                          </>
                        )}
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEditForm(item)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            {t("common.edit")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {items.length === 0 && (
              <p className="px-6 py-10 text-center text-sm text-slate-400">{t("admin.inventory.emptyAddHint")}</p>
            )}
          </div>
        )}
      </AdminShell>

      {showForm && (
        <div className={modalOverlayClass}>
          <button
            type="button"
            aria-label={t("common.close")}
            className={modalBackdropClass}
            onClick={closeForm}
          />

          <form ref={formRef} onSubmit={handleSubmit} className={modalPanelClass}>
            <div className={`${modalPanelBodyClass} pt-[max(1.25rem,env(safe-area-inset-top))]`}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {editing ? t("admin.inventory.editStock") : t("admin.inventory.addStockModal")}
                </h2>
                <ModalCloseButton onClick={closeForm} label={t("common.close")} />
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="part_name" className={modalLabelClass}>
                    {t("admin.inventory.partName")} *
                  </label>
                  <input
                    id="part_name"
                    name="part_name"
                    required
                    placeholder={t("admin.inventory.partNamePlaceholder")}
                    defaultValue={editing?.part_name ?? ""}
                    disabled={saving}
                    className={`mt-1.5 ${modalInputClass}`}
                  />
                </div>

                <div className={`grid gap-4 ${showCosts ? "grid-cols-2" : "grid-cols-1"}`}>
                  {showCosts && (
                    <div>
                      <label htmlFor="buy_price" className={modalLabelClass}>
                        {t("admin.inventory.costCurrency")}
                      </label>
                      <div className="mt-1.5">
                        <CurrencyAmountInput
                          id="buy_price"
                          value={buyDisplay}
                          onValueChange={(d) => setBuyDisplay(d)}
                          disabled={saving}
                          placeholder="0"
                          suffix="₺"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label htmlFor="sell_price" className={modalLabelClass}>
                      {t("admin.inventory.sellCurrency")}
                    </label>
                    <div className="mt-1.5">
                      <CurrencyAmountInput
                        id="sell_price"
                        value={sellDisplay}
                        onValueChange={(d) => setSellDisplay(d)}
                        disabled={saving}
                        placeholder="0"
                        suffix="₺"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="supplier_id" className={modalLabelClass}>
                    {t("admin.inventory.supplier")}
                  </label>
                  <select
                    id="supplier_id"
                    name="supplier_id"
                    defaultValue={editing?.supplier_id ?? ""}
                    disabled={saving}
                    className={`mt-1.5 ${modalInputClass}`}
                  >
                    <option value="">{t("common.notSelected")}</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firma_adi}
                      </option>
                    ))}
                  </select>
                  {!editing && (
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {t("admin.inventory.supplierHint")}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="stock_quantity" className={modalLabelClass}>
                    {editing ? t("admin.inventory.adjustQuantity") : t("admin.inventory.quantity")}
                  </label>
                  {editing && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t("admin.inventory.currentStock", { count: editing.stock_quantity })}
                    </p>
                  )}
                  {editing && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setQtyAdjustMode("increase")}
                        className={`min-h-11 rounded-xl text-sm font-semibold touch-manipulation transition ${
                          qtyAdjustMode === "increase"
                            ? "bg-emerald-600 text-white"
                            : "border border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {t("admin.inventory.increaseStock")}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setQtyAdjustMode("decrease")}
                        className={`min-h-11 rounded-xl text-sm font-semibold touch-manipulation transition ${
                          qtyAdjustMode === "decrease"
                            ? "bg-red-600 text-white"
                            : "border border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {t("admin.inventory.decreaseStock")}
                      </button>
                    </div>
                  )}
                  <input
                    id="stock_quantity"
                    name="stock_quantity"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    placeholder="0"
                    value={qtyDisplay}
                    disabled={saving}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
                      setQtyDisplay(digits);
                    }}
                    onBlur={(e) => stripLeadingZeros(e.currentTarget)}
                    className={`mt-2 ${modalInputClass}`}
                  />
                  {editing && (
                    <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t("admin.inventory.stockAfterAdjust", {
                        current: editing.stock_quantity,
                        delta: adjustQty,
                        sign: qtyAdjustMode === "increase" ? "+" : "−",
                        next: previewStock,
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className={`flex gap-3 ${modalPanelFooterClass}`}>
              <button type="button" onClick={closeForm} disabled={saving} className={modalSecondaryBtnClass}>
                {t("common.cancel")}
              </button>
              <button type="submit" disabled={saving} className={modalPrimaryBtnClass}>
                {saving ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[90] rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </>
  );
}
