"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { fetchInventory, fetchSuppliers, saveInventoryItem } from "@/lib/admin-api";
import type { InventoryItem, SupplierItem } from "@/types/admin";
import AdminShell from "./AdminShell";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatCurrency } from "@/lib/i18n/format";
import { runAfterEffect } from "@/lib/run-after-effect";
import {
  ModalCloseButton,
  modalBackdropClass,
  modalInputClass,
  modalLabelClass,
  modalPanelClass,
  modalPrimaryBtnClass,
  modalSecondaryBtnClass,
  useModalHotkeys,
} from "./modal-ui";

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
  const formRef = useRef<HTMLFormElement>(null);

  const closeForm = useCallback(() => {
    if (saving) return;
    setShowForm(false);
    setEditing(null);
  }, [saving]);

  useModalHotkeys({
    open: showForm,
    onClose: closeForm,
    formRef,
    disabled: saving,
  });

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
    setShowForm(true);
  }

  function openEditForm(item: InventoryItem) {
    setEditing(item);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);

    try {
      const response = await saveInventoryItem({
        action: editing ? "update" : "add",
        id: editing?.id,
        part_name: String(form.get("part_name") ?? "").trim(),
        buy_price: parseFloat(String(form.get("buy_price") ?? "0")) || 0,
        sell_price: parseFloat(String(form.get("sell_price") ?? "0")) || 0,
        stock_quantity: parseInt(String(form.get("stock_quantity") ?? "0"), 10) || 0,
        supplier_id: form.get("supplier_id") ? parseInt(String(form.get("supplier_id")), 10) : null,
      });

      if (!response.success) {
        setToast(response.message ?? t("admin.inventory.saveFailed"));
        return;
      }

      setToast(editing ? t("admin.inventory.updated") : t("admin.inventory.added"));
      setShowForm(false);
      setEditing(null);
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
        {loading && (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
            <svg className="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/80">
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t("admin.inventory.partName")}</th>
                    {showCosts && <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t("admin.inventory.cost")}</th>}
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t("admin.inventory.sellPrice")}</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t("admin.inventory.supplier")}</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t("admin.inventory.stock")}</th>
                    {showCosts && <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t("admin.inventory.margin")}</th>}
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t("admin.inventory.action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {items.map((item) => {
                    const margin = item.buy_price != null ? item.sell_price - item.buy_price : 0;
                    const lowStock = item.stock_quantity <= 3;

                    return (
                      <tr key={item.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-700/40">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{item.part_name}</td>
                        {showCosts && (
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{formatCurrency(item.buy_price ?? 0, locale)}</td>
                        )}
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          {formatCurrency(item.sell_price, locale)}
                        </td>
                        <td className="px-6 py-4 text-slate-700 dark:text-white">{item.supplier_name ?? t("common.dash")}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                              lowStock
                                ? "bg-red-50 text-red-700 ring-red-200"
                                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            }`}
                          >
                            {t("common.pieces", { count: item.stock_quantity })}
                          </span>
                        </td>
                        {showCosts && (
                          <td className="px-6 py-4 text-emerald-600">{formatCurrency(margin, locale)}</td>
                        )}
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => openEditForm(item)}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-blue-900/40 dark:hover:text-blue-300"
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
              <p className="px-6 py-12 text-center text-sm text-slate-500">
                {t("admin.inventory.emptyAddHint")}
              </p>
            )}
          </div>
        )}
      </AdminShell>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t("common.close")}
            className={modalBackdropClass}
            onClick={closeForm}
          />

          <div className={modalPanelClass}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {editing ? t("admin.inventory.editStock") : t("admin.inventory.addStockModal")}
              </h2>
              <ModalCloseButton onClick={closeForm} label={t("common.close")} />
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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
                  <input
                    id="buy_price"
                    name="buy_price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={editing?.buy_price ?? 0}
                    disabled={saving}
                    className={`mt-1.5 ${modalInputClass}`}
                  />
                </div>
                )}
                {!showCosts && <input type="hidden" name="buy_price" value={editing?.buy_price ?? 0} />}
                <div>
                  <label htmlFor="sell_price" className={modalLabelClass}>
                    {t("admin.inventory.sellCurrency")}
                  </label>
                  <input
                    id="sell_price"
                    name="sell_price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={editing?.sell_price ?? 0}
                    disabled={saving}
                    className={`mt-1.5 ${modalInputClass}`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="supplier_id" className={modalLabelClass}>{t("admin.inventory.supplier")}</label>
                <select
                  id="supplier_id"
                  name="supplier_id"
                  defaultValue={editing?.supplier_id ?? ""}
                  disabled={saving}
                  className={`mt-1.5 ${modalInputClass}`}
                >
                  <option value="">{t("common.notSelected")}</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.firma_adi}</option>
                  ))}
                </select>
                {!editing && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t("admin.inventory.supplierHint")}</p>}
              </div>

              <div>
                <label htmlFor="stock_quantity" className={modalLabelClass}>
                  {t("admin.inventory.quantity")}
                </label>
                <input
                  id="stock_quantity"
                  name="stock_quantity"
                  type="number"
                  min="0"
                  defaultValue={editing?.stock_quantity ?? 0}
                  disabled={saving}
                  className={`mt-1.5 ${modalInputClass}`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className={modalSecondaryBtnClass}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={modalPrimaryBtnClass}
                >
                  {saving ? t("common.saving") : t("common.save")}
                </button>
              </div>
            </form>
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
