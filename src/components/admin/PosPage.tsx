"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "./AdminShell";
import { fetchPosItems, searchCariCustomers, submitPosSale } from "@/lib/settings-api";
import type { CariCustomer, PosItem } from "@/types/settings";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatCurrency } from "@/lib/i18n/format";

interface CartLine {
  item: PosItem;
  quantity: number;
}

export default function PosPage() {
  const { t, locale } = useTranslation();
  const [items, setItems] = useState<PosItem[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentType, setPaymentType] = useState<"nakit" | "kart" | "veresiye">("nakit");
  const [customer, setCustomer] = useState<CariCustomer | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<CariCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchPosItems();
    if (res.success && res.data) setItems(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = useMemo(
    () => cart.reduce((sum, c) => sum + c.item.sell_price * c.quantity, 0),
    [cart]
  );

  function addToCart(item: PosItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        if (existing.quantity >= item.stock_quantity) return prev;
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  }

  function updateQty(id: number, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.item.id === id
            ? { ...c, quantity: Math.max(0, Math.min(c.item.stock_quantity, c.quantity + delta)) }
            : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  async function handleSearch(q: string) {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await searchCariCustomers(q);
    if (res.success && res.data) setSearchResults(res.data);
  }

  async function handleCheckout() {
    if (cart.length === 0) { setError(t("admin.pos.emptyCart")); return; }
    if (paymentType === "veresiye" && !customer) { setError(t("admin.pos.creditNeedsCustomer")); return; }
    setSubmitting(true);
    setError(null);
    const res = await submitPosSale({
      items: cart.map((c) => ({ inventory_id: c.item.id, quantity: c.quantity })),
      payment_type: paymentType,
      customer_id: customer?.id,
    });
    setSubmitting(false);
    if (res.success) {
      const amount = formatCurrency(res.data?.total ?? total, locale);
      setMessage(t("admin.pos.saleSuccessAmount", { amount }));
      setCart([]);
      setCustomer(null);
      setSearchQ("");
      load();
    } else setError(res.message ?? t("admin.pos.saleFailed"));
  }

  return (
    <AdminShell title={t("admin.pos.title")} subtitle={t("admin.pos.subtitle")}>
      {message && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="order-2 lg:order-1 lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <p className="text-slate-500">{t("common.loading")}</p>
            ) : items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addToCart(item)}
                className="rounded-xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:ring-blue-400 dark:bg-slate-800 dark:ring-slate-700"
              >
                <p className="font-medium text-slate-900 dark:text-white">{item.part_name}</p>
                <p className="mt-1 text-lg font-bold text-blue-600">{formatCurrency(item.sell_price, locale)}</p>
                <p className="mt-1 text-xs text-slate-500">{t("admin.pos.stock", { qty: item.stock_quantity })}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="order-1 rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 lg:order-2">
          <h3 className="font-bold text-slate-900 dark:text-white">{t("admin.pos.cart")}</h3>
          {cart.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{t("admin.pos.selectProduct")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {cart.map((c) => (
                <li key={c.item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex-1 text-slate-700 dark:text-slate-300">{c.item.part_name}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => updateQty(c.item.id, -1)} className="h-7 w-7 rounded bg-slate-100 dark:bg-slate-700">−</button>
                    <span className="w-6 text-center">{c.quantity}</span>
                    <button type="button" onClick={() => updateQty(c.item.id, 1)} className="h-7 w-7 rounded bg-slate-100 dark:bg-slate-700">+</button>
                  </div>
                  <span className="font-medium">{formatCurrency(c.item.sell_price * c.quantity, locale)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
            <p className="text-lg font-bold text-slate-900 dark:text-white">{t("common.total")}: {formatCurrency(total, locale)}</p>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("admin.pos.payment")}</label>
            <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as typeof paymentType)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
              <option value="nakit">{t("admin.pos.cash")}</option>
              <option value="kart">{t("admin.pos.card")}</option>
              <option value="veresiye">{t("admin.pos.credit")}</option>
            </select>
          </div>

          {paymentType === "veresiye" && (
            <div className="mt-3">
              <input
                value={searchQ}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t("admin.pos.searchCustomer")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              {customer && (
                <p className="mt-2 text-sm text-blue-600">{t("admin.pos.selectedCustomer", { name: customer.ad_soyad })}</p>
              )}
              {searchResults.length > 0 && !customer && (
                <ul className="mt-2 max-h-32 overflow-y-auto rounded-lg ring-1 ring-slate-200 dark:ring-slate-600">
                  {searchResults.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => { setCustomer(c); setSearchResults([]); }} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                        {c.ad_soyad} {c.telefon && `— ${c.telefon}`}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleCheckout}
            disabled={submitting || cart.length === 0}
            className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? t("common.processing") : t("admin.pos.completeSale")}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
