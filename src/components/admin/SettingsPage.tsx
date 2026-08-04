"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useAdminTheme } from "@/components/AdminThemeProvider";
import AdminShell from "./AdminShell";
import ThemeToggle from "@/components/ThemeToggle";
import {
  addStaff,
  changePassword,
  deleteStaff,
  fetchShopSettings,
  fetchStaff,
  saveShopSettings,
  updateStaff,
  uploadLogo,
} from "@/lib/settings-api";
import { checkAuth } from "@/lib/auth-api";
import { assignableStaffRoles } from "@/lib/permissions";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { LOCALES, normalizeLocale, type Locale } from "@/lib/i18n/config";
import { runAfterEffect } from "@/lib/run-after-effect";
import PasswordInput from "./PasswordInput";
import type { ShopSettings, StaffMember } from "@/types/settings";

type Tab = "firma" | "personel" | "sifre" | "tema" | "dil";

function validatePasswordT(
  password: string,
  t: (key: string) => string
): string | null {
  if (password.length < 8) return t("admin.password.minLength");
  if (!/[A-Z]/.test(password)) return t("admin.password.uppercase");
  if (!/[0-9]/.test(password)) return t("admin.password.digit");
  return null;
}

export default function SettingsPage() {
  const { t, locale, setLocale } = useTranslation();
  const { theme } = useAdminTheme();
  const [tab, setTab] = useState<Tab>("firma");
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingLocale, setSavingLocale] = useState(false);

  const [newStaff, setNewStaff] = useState({
    username: "",
    password: "",
    role: "teknisyen",
    ad_soyad: "",
    firma_adi: "",
  });
  const [pwdForm, setPwdForm] = useState({ old: "", new: "", confirm: "" });
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [canManageStaff, setCanManageStaff] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [shopRes, staffRes, authRes] = await Promise.all([
      fetchShopSettings(),
      fetchStaff(),
      checkAuth(),
    ]);
    if (shopRes.success && shopRes.data) setShop(shopRes.data);
    if (authRes.success && authRes.data) {
      setCurrentUserId(authRes.data.id ?? null);
      setIsSuperadmin(Boolean(authRes.data.is_superadmin));
      setCanManageStaff(Boolean(authRes.data.permissions?.manage_staff));
      if (authRes.data.is_superadmin) {
        setTab("personel");
        setNewStaff((s) => ({ ...s, role: "admin" }));
      }
    }
    if (staffRes.success && staffRes.data) setStaff(staffRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    return runAfterEffect(() => {
      void load();
    });
  }, [load]);

  async function handleShopSave(e: FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setError(null);
    const res = await saveShopSettings(shop);
    if (res.success) {
      setMessage(t("admin.settings.firma.saved"));
      window.dispatchEvent(new Event("site-locale-changed"));
    } else setError(res.message ?? t("admin.settings.firma.saveFailed"));
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadLogo(file);
    if (res.success && res.data) {
      setShop(res.data);
      setMessage(t("admin.settings.firma.logoUploaded"));
    } else setError(res.message ?? t("admin.settings.firma.logoFailed"));
  }

  async function handleAddStaff(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const pwdErr = validatePasswordT(newStaff.password, t);
    if (pwdErr) { setError(pwdErr); return; }
    if (isSuperadmin && !newStaff.firma_adi.trim()) {
      setError(t("admin.settings.personel.companyNameRequired"));
      return;
    }
    const res = await addStaff({
      username: newStaff.username.trim(),
      password: newStaff.password,
      role: newStaff.role,
      ad_soyad: newStaff.ad_soyad.trim() || undefined,
      firma_adi: isSuperadmin ? newStaff.firma_adi.trim() : undefined,
    });
    if (res.success) {
      setMessage(
        isSuperadmin
          ? t("admin.settings.personel.shopAdminAdded")
          : t("admin.settings.personel.staffAdded")
      );
      setNewStaff({
        username: "",
        password: "",
        role: isSuperadmin ? "admin" : "teknisyen",
        ad_soyad: "",
        firma_adi: "",
      });
      load();
    } else setError(res.message ?? t("admin.settings.personel.addFailed"));
  }

  async function handleResetStaffPassword(s: StaffMember) {
    const pwd = window.prompt(
      t("admin.settings.personel.resetPasswordPrompt", { user: s.username })
    );
    if (pwd == null) return;
    const trimmed = pwd.trim();
    if (!trimmed) return;
    const pwdErr = validatePasswordT(trimmed, t);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    setError(null);
    const res = await updateStaff({
      id: s.id,
      role: s.role,
      ad_soyad: s.ad_soyad,
      aktif: true,
      password: trimmed,
    });
    if (res.success) {
      setMessage(t("admin.settings.personel.passwordReset", { username: s.username }));
    } else {
      setError(res.message ?? t("admin.settings.personel.resetFailed"));
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pwdForm.new !== pwdForm.confirm) { setError(t("admin.settings.sifre.mismatch")); return; }
    const pwdErr = validatePasswordT(pwdForm.new, t);
    if (pwdErr) { setError(pwdErr); return; }
    const res = await changePassword(pwdForm.old, pwdForm.new);
    if (res.success) {
      setMessage(t("admin.settings.sifre.changed"));
      setPwdForm({ old: "", new: "", confirm: "" });
      window.dispatchEvent(new Event("admin-password-changed"));
    } else setError(res.message ?? t("admin.settings.sifre.changeFailed"));
  }

  async function handleLocaleSelect(nextLocale: Locale) {
    if (nextLocale === currentLocale) return;
    setSavingLocale(true);
    setError(null);

    // Geliştirici hesabının dükkan profili yok — panel dilini anında değiştir
    if (!shop || isSuperadmin) {
      setLocale(nextLocale);
      setSavingLocale(false);
      setMessage(t("admin.settings.dil.saved"));
      return;
    }

    const updated = { ...shop, default_locale: nextLocale };
    const res = await saveShopSettings(updated);
    setSavingLocale(false);
    if (res.success) {
      setShop(updated);
      setLocale(nextLocale);
      setMessage(t("admin.settings.dil.saved"));
    } else {
      setError(res.message ?? t("admin.settings.dil.saveFailed"));
    }
  }

  async function confirmDeleteStaff() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    const res = await deleteStaff(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (res.success) {
      setMessage(t("admin.settings.personel.staffDeleted", { username: deleteTarget.username }));
      load();
    } else {
      setError(res.message ?? t("admin.settings.personel.deleteFailed"));
    }
  }

  const tabs: { id: Tab; labelKey: string }[] = [
    { id: "firma", labelKey: "admin.settings.tabs.firma" },
    ...(canManageStaff
      ? [{
          id: "personel" as Tab,
          labelKey: isSuperadmin
            ? "admin.settings.personel.shopManagers"
            : "admin.settings.tabs.personel",
        }]
      : []),
    { id: "sifre", labelKey: "admin.settings.tabs.sifre" },
    { id: "tema", labelKey: "admin.settings.tabs.tema" },
    { id: "dil", labelKey: "admin.settings.tabs.dil" },
  ];

  const roleOptions = assignableStaffRoles(isSuperadmin);

  const currentLocale = normalizeLocale(
    isSuperadmin ? locale : (shop?.default_locale ?? locale)
  );

  const themeModeLabel =
    theme === "system"
      ? t("admin.settings.tema.system")
      : theme === "dark"
        ? t("admin.settings.tema.dark")
        : t("admin.settings.tema.light");

  return (
    <>
    <AdminShell title={t("admin.settings.title")} subtitle={t("admin.settings.subtitle")}>
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => { setTab(tabItem.id); setError(null); setMessage(null); }}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition touch-manipulation ${
              tab === tabItem.id
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-700 dark:hover:text-white"
            }`}
          >
            {t(tabItem.labelKey)}
          </button>
        ))}
      </div>

      {message && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{message}</div>}
      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>}

      {loading ? (
        <p className="text-slate-500 dark:text-slate-400">{t("common.loading")}</p>
      ) : tab === "firma" && isSuperadmin ? (
        <div className="max-w-2xl rounded-2xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
          {t("admin.settings.personel.noShopProfile")}
        </div>
      ) : tab === "firma" && shop ? (
        <form onSubmit={handleShopSave} className="max-w-2xl space-y-5 rounded-2xl bg-white p-6 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <div className="flex items-center gap-4">
            {shop.logo_url ? (
              <Image
                src={shop.logo_url}
                alt={t("admin.settings.firma.logo")}
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded-xl object-contain ring-1 ring-slate-200 dark:ring-slate-600 dark:bg-slate-900"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.classList.remove("hidden");
                }}
              />
            ) : null}
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-300 ${
                shop.logo_url ? "hidden" : ""
              }`}
            >
              {t("admin.settings.firma.logo")}
            </div>
            <label className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
              {t("admin.settings.firma.uploadLogo")}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t("admin.settings.firma.companyName")}</label>
            <input value={shop.firma_adi} onChange={(e) => setShop({ ...shop, firma_adi: e.target.value })} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
          </div>
          {(shop.takip_oneki || shop.takip_ornek) && (
            <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-900/50 dark:ring-slate-700">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("admin.settings.firma.trackingPrefix")}
              </p>
              <p className="mt-1 font-mono text-lg font-bold tracking-wide text-blue-700 dark:text-blue-400">
                {shop.takip_ornek ?? `${shop.takip_oneki}-??-001`}
              </p>
              <p className="mt-1 text-xs text-slate-500">{t("admin.settings.firma.trackingPrefixHint")}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t("admin.settings.firma.address")}</label>
            <textarea value={shop.adres ?? ""} onChange={(e) => setShop({ ...shop, adres: e.target.value })} rows={2} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t("admin.settings.firma.phone")}</label>
              <input value={shop.telefon ?? ""} onChange={(e) => setShop({ ...shop, telefon: e.target.value })} placeholder={t("admin.settings.firma.phonePlaceholder")} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t("admin.settings.firma.email")}</label>
              <input value={shop.email ?? ""} onChange={(e) => setShop({ ...shop, email: e.target.value })} type="email" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("admin.settings.firma.showCostDetail")}
            </p>
            <p className="mt-1 text-xs text-slate-500">{t("admin.settings.firma.showCostDetailHint")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShop({ ...shop, ucret_detayi_goster: true })}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  shop.ucret_detayi_goster !== false
                    ? "bg-blue-700 text-white dark:bg-blue-800"
                    : "bg-slate-100 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-700"
                }`}
              >
                {t("admin.settings.firma.showCostDetailOn")}
              </button>
              <button
                type="button"
                onClick={() => setShop({ ...shop, ucret_detayi_goster: false })}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  shop.ucret_detayi_goster === false
                    ? "bg-blue-700 text-white dark:bg-blue-800"
                    : "bg-slate-100 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-700"
                }`}
              >
                {t("admin.settings.firma.showCostDetailOff")}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">{t("admin.settings.firma.hint")}</p>
          <button type="submit" className="rounded-xl bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 dark:bg-blue-800 dark:hover:bg-blue-700">{t("common.save")}</button>
        </form>
      ) : tab === "personel" ? (
        <div className="space-y-6">
          <form onSubmit={handleAddStaff} className="w-full max-w-2xl min-w-0 space-y-4 overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-6 dark:bg-slate-800 dark:ring-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {isSuperadmin
                ? t("admin.settings.personel.newShopAdmin")
                : t("admin.settings.personel.newStaff")}
            </h3>
            <p className="text-xs text-slate-500">
              {isSuperadmin
                ? t("admin.settings.personel.shopAdminScopeHint")
                : t("admin.settings.personel.staffScopeHint")}
            </p>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <input value={newStaff.ad_soyad} onChange={(e) => setNewStaff({ ...newStaff, ad_soyad: e.target.value })} placeholder={t("admin.settings.personel.fullName")} className="min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
              {isSuperadmin && (
                <div className="min-w-0">
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("admin.settings.personel.companyName")} *
                  </label>
                  <input
                    value={newStaff.firma_adi}
                    onChange={(e) => setNewStaff({ ...newStaff, firma_adi: e.target.value })}
                    placeholder={t("admin.settings.personel.companyNamePlaceholder")}
                    required
                    className="min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              )}
              <input value={newStaff.username} onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })} placeholder={t("admin.settings.personel.username")} required className="min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
              <div className="min-w-0">
                <PasswordInput
                  value={newStaff.password}
                  onChange={(password) => setNewStaff({ ...newStaff, password })}
                  placeholder={t("admin.settings.personel.password")}
                  required
                  className="min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-14 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <select value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })} className="min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-600 dark:bg-slate-900 dark:text-white sm:col-span-2">
                {roleOptions.includes("admin") && (
                  <option value="admin">{t("roles.admin")} — {t("roles.adminDesc")}</option>
                )}
                {!isSuperadmin && (
                  <>
                    <option value="teknisyen">{t("roles.teknisyen")} — {t("roles.teknisyenDesc")}</option>
                    <option value="kasa">{t("roles.kasa")} — {t("roles.kasaDesc")}</option>
                  </>
                )}
              </select>
            </div>
            <p className="text-xs text-slate-500">{t("admin.password.hint")}</p>
            <button type="submit" className="w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto">
              {isSuperadmin
                ? t("admin.settings.personel.addShopAdmin")
                : t("admin.settings.personel.addStaff")}
            </button>
          </form>

          <div className="space-y-3 md:hidden">
            {staff.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {s.ad_soyad ?? t("common.dash")}
                      {s.is_account_owner && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                          {t("admin.settings.personel.accountOwner")}
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-sm text-slate-500 dark:text-slate-400">{s.username}</p>
                    {isSuperadmin && s.firma_adi && (
                      <p className="mt-1 text-sm font-medium text-blue-600 dark:text-blue-400">{s.firma_adi}</p>
                    )}
                  </div>
                  {s.id === currentUserId ? (
                    <span className="text-xs text-slate-400">{t("common.you")}</span>
                  ) : (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => handleResetStaffPassword(s)}
                        className="min-h-[36px] touch-manipulation rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                      >
                        {t("admin.settings.personel.resetPassword")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(s)}
                        className="min-h-[36px] touch-manipulation rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  )}
                </div>
                {!isSuperadmin && (
                <select
                  value={s.role}
                  onChange={async (e) => {
                    await updateStaff({ id: s.id, role: e.target.value, ad_soyad: s.ad_soyad, aktif: true });
                    load();
                  }}
                  disabled={s.id === currentUserId || s.is_account_owner}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="admin">{t("roles.admin")}</option>
                  <option value="teknisyen">{t("roles.teknisyen")}</option>
                  <option value="kasa">{t("roles.kasa")}</option>
                </select>
                )}
                {isSuperadmin && (
                  <p className="mt-2 text-xs text-slate-500">{t("roles.admin")} — {t("admin.settings.personel.accountOwner")}</p>
                )}
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 md:block dark:bg-slate-800 dark:ring-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">{t("admin.settings.personel.nameCol")}</th>
                  {isSuperadmin && (
                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">{t("admin.settings.personel.companyCol")}</th>
                  )}
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">{t("admin.settings.personel.userCol")}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">{t("admin.settings.personel.roleCol")}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">{t("admin.settings.personel.actionsCol")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {staff.map((s) => (
                  <tr key={s.id} className="dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3 text-slate-900 dark:text-white">
                      {s.ad_soyad ?? t("common.dash")}
                      {s.is_account_owner && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                          {t("admin.settings.personel.accountOwner")}
                        </span>
                      )}
                    </td>
                    {isSuperadmin && (
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{s.firma_adi ?? t("common.dash")}</td>
                    )}
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{s.username}</td>
                    <td className="px-4 py-3">
                      {isSuperadmin ? (
                        <span className="text-xs text-slate-500">{t("roles.admin")}</span>
                      ) : (
                      <select
                        value={s.role}
                        onChange={async (e) => {
                          await updateStaff({ id: s.id, role: e.target.value, ad_soyad: s.ad_soyad, aktif: true });
                          load();
                        }}
                        disabled={s.id === currentUserId || s.is_account_owner}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="admin">{t("roles.admin")}</option>
                        <option value="teknisyen">{t("roles.teknisyen")}</option>
                        <option value="kasa">{t("roles.kasa")}</option>
                      </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.id === currentUserId ? (
                        <span className="text-xs text-slate-400">{t("common.you")}</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleResetStaffPassword(s)}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                          >
                            {t("admin.settings.personel.resetPassword")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(s)}
                            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
                          >
                            {t("common.delete")}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === "sifre" ? (
        <form onSubmit={handleChangePassword} className="max-w-md space-y-4 rounded-2xl bg-white p-6 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <PasswordInput
            value={pwdForm.old}
            onChange={(old) => setPwdForm({ ...pwdForm, old })}
            placeholder={t("admin.settings.sifre.current")}
            autoComplete="current-password"
            required
          />
          <PasswordInput
            value={pwdForm.new}
            onChange={(newPwd) => setPwdForm({ ...pwdForm, new: newPwd })}
            placeholder={t("admin.settings.sifre.new")}
            autoComplete="new-password"
            required
          />
          <PasswordInput
            value={pwdForm.confirm}
            onChange={(confirm) => setPwdForm({ ...pwdForm, confirm })}
            placeholder={t("admin.settings.sifre.confirm")}
            autoComplete="new-password"
            required
          />
          <p className="text-xs text-slate-500">{t("admin.password.hint")}</p>
          <button type="submit" className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{t("admin.settings.sifre.submit")}</button>
        </form>
      ) : tab === "dil" ? (
        <div className="max-w-md rounded-2xl bg-white p-6 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">{t("admin.settings.dil.title")}</h3>
          <p className="mt-2 text-sm text-slate-500">{t("admin.settings.dil.description")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {LOCALES.map((loc) => (
              <button
                key={loc}
                type="button"
                disabled={savingLocale}
                onClick={() => handleLocaleSelect(loc)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                  currentLocale === loc
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-600"
                }`}
              >
                {t(`languages.${loc}`)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-md rounded-2xl bg-white p-6 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">{t("admin.settings.tema.title")}</h3>
          <p className="mt-2 text-sm text-slate-500">{t("admin.settings.tema.description")}</p>
          <div className="mt-4">
            <ThemeToggle showLabels />
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {t("admin.settings.tema.current", { mode: themeModeLabel })}
          </p>
        </div>
      )}
    </AdminShell>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("admin.modals.deleteStaff.title")}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {t("admin.modals.deleteStaff.body", {
                username: deleteTarget.username,
                name: deleteTarget.ad_soyad ? ` (${deleteTarget.ad_soyad})` : "",
              })}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={confirmDeleteStaff}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? t("common.deleting") : t("common.permanentDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
