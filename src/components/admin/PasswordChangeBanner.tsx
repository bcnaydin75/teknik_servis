"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { checkAuth } from "@/lib/auth-api";
import { changePassword } from "@/lib/settings-api";
import type { Permissions } from "@/lib/permissions";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { runAfterEffect } from "@/lib/run-after-effect";
import PasswordInput from "./PasswordInput";

function validatePasswordT(
  password: string,
  t: (key: string) => string
): string | null {
  if (password.length < 8) return t("admin.password.minLength");
  if (!/[A-Z]/.test(password)) return t("admin.password.uppercase");
  if (!/[0-9]/.test(password)) return t("admin.password.digit");
  return null;
}

export default function PasswordChangeBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);
  const [form, setForm] = useState({ old: "", new: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshAuth = useCallback(async () => {
    const res = await checkAuth();
    if (res.success && res.data?.must_change_password) {
      setVisible(true);
      const perms = res.data.permissions as Permissions | undefined;
      setHasSettings(Boolean(perms?.settings));
    } else {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    const clear = runAfterEffect(() => {
      void refreshAuth();
    });

    function onPasswordChanged() {
      setVisible(false);
      setModalOpen(false);
      setForm({ old: "", new: "", confirm: "" });
    }

    window.addEventListener("admin-password-changed", onPasswordChanged);
    return () => {
      clear();
      window.removeEventListener("admin-password-changed", onPasswordChanged);
    };
  }, [refreshAuth]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.new !== form.confirm) {
      setError(t("admin.settings.sifre.mismatch"));
      return;
    }

    const pwdErr = validatePasswordT(form.new, t);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }

    setLoading(true);
    const res = await changePassword(form.old, form.new);
    setLoading(false);

    if (res.success) {
      window.dispatchEvent(new Event("admin-password-changed"));
      setVisible(false);
      setModalOpen(false);
    } else {
      setError(res.message ?? t("admin.password.changeFailed"));
    }
  }

  if (!visible) return null;

  return (
    <>
      <div
        role="alert"
        className="border-b border-amber-200 bg-amber-50 px-6 py-3 dark:border-amber-800 dark:bg-amber-950/50"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {t("admin.password.bannerTitle")}
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300/90">
                {t("admin.password.bannerBody")}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => { setModalOpen(true); setError(null); }}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              {t("admin.settings.sifre.submit")}
            </button>
            {hasSettings && (
              <Link
                href="/admin/settings"
                className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
              >
                {t("nav.settings")}
              </Link>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("admin.password.modalTitle")}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("admin.password.hint")}</p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="pwd-old" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("admin.password.currentPassword")}
                </label>
                <div className="mt-1.5">
                  <PasswordInput
                    id="pwd-old"
                    value={form.old}
                    onChange={(old) => setForm((f) => ({ ...f, old }))}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-12 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="pwd-new" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("admin.password.newPassword")}
                </label>
                <div className="mt-1.5">
                  <PasswordInput
                    id="pwd-new"
                    value={form.new}
                    onChange={(newPwd) => setForm((f) => ({ ...f, new: newPwd }))}
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-12 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="pwd-confirm" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("admin.password.confirmPassword")}
                </label>
                <div className="mt-1.5">
                  <PasswordInput
                    id="pwd-confirm"
                    value={form.confirm}
                    onChange={(confirm) => setForm((f) => ({ ...f, confirm }))}
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-12 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={loading}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? t("common.saving") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
