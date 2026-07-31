"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { fetchCariDetail, fetchCariList, postCariTransaction, searchCariCustomers } from "@/lib/settings-api";
import type { CariCustomer, CariTransaction } from "@/types/settings";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatCurrency, formatDate } from "@/lib/i18n/format";

export default function CariPage() {
  const { t, locale } = useTranslation();
  const [list, setList] = useState<CariCustomer[]>([]);
  const [selected, setSelected] = useState<CariCustomer | null>(null);
  const [transactions, setTransactions] = useState<CariTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<CariCustomer[]>([]);
  const [txForm, setTxForm] = useState({ amount: "", description: "", type: "odeme" as "borc" | "odeme" });
  const [message, setMessage] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    const res = await fetchCariList();
    if (res.success && res.data) setList(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  async function selectCustomer(c: CariCustomer) {
    setSelected(c);
    const res = await fetchCariDetail(c.id);
    if (res.success && res.data) {
      setSelected(res.data.customer);
      setTransactions(res.data.transactions);
    }
  }

  async function handleSearch(q: string) {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await searchCariCustomers(q);
    if (res.success && res.data) setSearchResults(res.data);
  }

  async function handleTx(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const amount = parseFloat(txForm.amount);
    if (isNaN(amount) || amount <= 0) return;
    const res = await postCariTransaction(txForm.type, {
      customer_id: selected.id,
      amount,
      description: txForm.description || undefined,
    });
    if (res.success) {
      setMessage(t("admin.cari.txSaved"));
      setTxForm({ amount: "", description: "", type: "odeme" });
      selectCustomer(selected);
      loadList();
    }
  }

  return (
    <AdminShell title={t("admin.cari.title")} subtitle={t("admin.cari.subtitle")}>
      {message && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <div className="mb-4">
        <input
          value={searchQ}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t("admin.cari.searchPlaceholder")}
          className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        {searchResults.length > 0 && (
          <ul className="mt-2 max-w-md rounded-xl bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            {searchResults.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => { selectCustomer(c); setSearchResults([]); setSearchQ(c.ad_soyad); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                  {c.ad_soyad} — {t("admin.cari.balanceLabel", { amount: formatCurrency(c.cari_bakiye, locale) })}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">{t("admin.cari.debtors")}</h3>
          </div>
          {loading ? (
            <p className="p-4 text-slate-500">{t("common.loading")}</p>
          ) : list.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">{t("common.noRecords")}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => selectCustomer(c)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selected?.id === c.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{c.ad_soyad}</p>
                      <p className="text-xs text-slate-500">{c.telefon}</p>
                    </div>
                    <span className={`font-bold ${c.cari_bakiye > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatCurrency(c.cari_bakiye, locale)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selected.ad_soyad}</h3>
              <p className="mt-2 text-2xl font-bold text-red-600">
                {t("admin.cari.balanceLabel", { amount: formatCurrency(selected.cari_bakiye, locale) })}
              </p>

              <form onSubmit={handleTx} className="mt-4 space-y-3">
                <select value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value as "borc" | "odeme" })} className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                  <option value="odeme">{t("admin.cari.receivePayment")}</option>
                  <option value="borc">{t("admin.cari.addDebt")}</option>
                </select>
                <input type="number" step="0.01" min="0" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} placeholder={t("admin.cari.amountPlaceholder")} required className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                <input value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} placeholder={t("admin.cari.descriptionPlaceholder")} className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                <button type="submit" className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{t("common.save")}</button>
              </form>
            </div>

            <div className="rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <h4 className="font-medium text-slate-900 dark:text-white">{t("admin.cari.transactions")}</h4>
              </div>
              <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700">
                {transactions.map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div>
                      <p className={tx.type === "borc" ? "text-red-600" : "text-emerald-600"}>
                        {tx.type === "borc" ? t("admin.cari.debt") : t("admin.cari.payment")}
                      </p>
                      <p className="text-xs text-slate-500">{tx.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(tx.amount, locale)}</p>
                      <p className="text-xs text-slate-400">{formatDate(tx.created_at, locale)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
