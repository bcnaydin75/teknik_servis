"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { fetchSuppliers, saveSupplier } from "@/lib/admin-api";
import type { SupplierItem, SupplierTransaction } from "@/types/admin";
import AdminShell from "./AdminShell";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatCurrency, formatDateTime } from "@/lib/i18n/format";

function ModalCloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

export default function SuppliersPage() {
  const { t, locale } = useTranslation();
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchSuppliers();
    if (res.success && res.data) {
      setSuppliers(res.data.suppliers);
      setTransactions(res.data.transactions);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleAddSupplier(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await saveSupplier({
      action: "add_supplier",
      firma_adi: String(form.get("firma_adi")),
      telefon: String(form.get("telefon") || "") || undefined,
      email: String(form.get("email") || "") || undefined,
      adres: String(form.get("adres") || "") || undefined,
    });
    if (res.success) {
      setToast(t("admin.suppliers.added"));
      setShowForm(false);
      load();
    } else setToast(res.message ?? t("common.error"));
  }

  async function handleAddTx(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await saveSupplier({
      action: "add_transaction",
      supplier_id: parseInt(String(form.get("supplier_id")), 10),
      type: String(form.get("type")),
      amount: parseFloat(String(form.get("amount"))),
      description: String(form.get("description") || "") || undefined,
    });
    if (res.success) {
      setToast(t("admin.suppliers.txRecorded"));
      setShowTxForm(false);
      load();
    } else setToast(res.message ?? t("common.error"));
  }

  const totalDebt = suppliers.reduce((s, x) => s + x.kalan_borc, 0);

  return (
    <>
      <AdminShell
        title={t("admin.suppliers.pageTitle")}
        subtitle={t("admin.suppliers.pageSubtitle")}
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowTxForm(true)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              {t("admin.suppliers.addTransaction")}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {t("admin.suppliers.addSupplier")}
            </button>
          </div>
        }
      >
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white shadow-lg">
          <p className="text-sm text-violet-200">{t("admin.suppliers.totalRemainingDebt")}</p>
          <p className="mt-1 text-3xl font-bold">{formatCurrency(totalDebt, locale)}</p>
        </div>

        {loading ? (
          <p className="text-center text-slate-400">{t("common.loading")}</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="font-bold text-slate-900">{t("admin.suppliers.supplierList")}</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {suppliers.map((s) => (
                  <div key={s.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{s.firma_adi}</p>
                        {s.telefon && <p className="text-xs text-slate-400">{s.telefon}</p>}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          s.kalan_borc > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        {formatCurrency(s.kalan_borc, locale)}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-slate-500">
                      <span>{t("admin.suppliers.debtShort")} {formatCurrency(s.toplam_borc, locale)}</span>
                      <span>{t("admin.suppliers.paymentShort")} {formatCurrency(s.toplam_odeme, locale)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="font-bold text-slate-900">{t("admin.suppliers.recentTransactions")}</h2>
              </div>
              <div className="max-h-96 divide-y divide-slate-50 overflow-y-auto">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-6 py-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{tx.firma_adi}</p>
                      <p className="text-xs text-slate-400">
                        {tx.description ?? t("common.dash")} · {formatDateTime(tx.created_at, locale)}
                      </p>
                    </div>
                    <span className={`font-bold ${tx.type === "borc" ? "text-red-500" : "text-emerald-600"}`}>
                      {tx.type === "borc" ? "+" : "−"}
                      {formatCurrency(tx.amount, locale)}
                    </span>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="px-6 py-8 text-center text-sm text-slate-400">{t("admin.suppliers.noTransactionsYet")}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </AdminShell>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <form
            onSubmit={handleAddSupplier}
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{t("admin.suppliers.newSupplier")}</h3>
              <ModalCloseButton onClick={() => setShowForm(false)} label={t("common.close")} />
            </div>
            <div className="space-y-3">
              <input
                name="firma_adi"
                required
                placeholder={t("admin.suppliers.companyNameRequired")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white"
              />
              <input
                name="telefon"
                placeholder={t("admin.suppliers.phone")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white"
              />
              <input
                name="email"
                placeholder={t("admin.suppliers.email")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white"
              />
              <input
                name="adres"
                placeholder={t("admin.suppliers.address")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {t("common.save")}
              </button>
            </div>
          </form>
        </div>
      )}

      {showTxForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowTxForm(false)}
          />
          <form
            onSubmit={handleAddTx}
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{t("admin.suppliers.addTransactionTitle")}</h3>
              <ModalCloseButton onClick={() => setShowTxForm(false)} label={t("common.close")} />
            </div>
            <div className="space-y-3">
              <select
                name="supplier_id"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="">{t("admin.suppliers.selectSupplier")}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firma_adi}
                  </option>
                ))}
              </select>
              <select
                name="type"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="borc">{t("admin.suppliers.debtPurchase")}</option>
                <option value="odeme">{t("admin.suppliers.paymentType")}</option>
              </select>
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder={t("admin.suppliers.amount")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white"
              />
              <input
                name="description"
                placeholder={t("admin.suppliers.description")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowTxForm(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {t("common.save")}
              </button>
            </div>
          </form>
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
