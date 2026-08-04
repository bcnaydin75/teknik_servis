"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forgotPasswordAdmin } from "@/lib/auth-api";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import PasswordInput from "./PasswordInput";

export default function ForgotPasswordForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim() || !phone.trim() || !password) {
      setError(t("errors.requiredFields"));
      return;
    }
    if (password !== confirm) {
      setError(t("admin.forgotPassword.mismatch"));
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPasswordAdmin({
        username: username.trim(),
        phone: phone.trim(),
        new_password: password,
        confirm_password: confirm,
      });
      if (!res.success) {
        setError(res.message ?? t("admin.forgotPassword.failed"));
        return;
      }
      setSuccess(res.message ?? t("admin.forgotPassword.success"));
      setTimeout(() => router.replace("/admin/login"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.connection"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-app flex-col items-center justify-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-slate-950">
        <div className="absolute -left-1/4 -top-1/4 h-[520px] w-[520px] rounded-full bg-violet-600/30 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[480px] w-[480px] rounded-full bg-blue-600/25 blur-[120px]" />
      </div>

      <div className="relative z-10 mb-4 w-full max-w-md">
        <Link
          href="/admin/login"
          className="text-sm font-medium text-slate-400 transition hover:text-white"
        >
          {t("admin.forgotPassword.backToLogin")}
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/20 bg-white/[0.06] px-6 py-8 shadow-xl backdrop-blur-md sm:px-8">
        <h1 className="text-2xl font-bold text-white">{t("admin.forgotPassword.title")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("admin.forgotPassword.subtitle")}</p>

        {error && (
          <div role="alert" className="mt-5 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="fp-username" className="block text-sm font-medium text-slate-300">
              {t("admin.login.username")}
            </label>
            <input
              id="fp-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={loading || Boolean(success)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
              placeholder={t("admin.login.usernamePlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="fp-phone" className="block text-sm font-medium text-slate-300">
              {t("admin.forgotPassword.phone")}
            </label>
            <input
              id="fp-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              disabled={loading || Boolean(success)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
              placeholder={t("admin.forgotPassword.phonePlaceholder")}
            />
            <p className="mt-1.5 text-xs text-slate-500">{t("admin.forgotPassword.phoneHint")}</p>
          </div>

          <div>
            <label htmlFor="fp-password" className="block text-sm font-medium text-slate-300">
              {t("admin.forgotPassword.newPassword")}
            </label>
            <div className="mt-2">
              <PasswordInput
                id="fp-password"
                value={password}
                onChange={setPassword}
                placeholder={t("admin.forgotPassword.newPasswordPlaceholder")}
                autoComplete="new-password"
                disabled={loading || Boolean(success)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 pr-14 text-white placeholder:text-slate-400 outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                toggleClassName="text-slate-300 hover:bg-white/10 hover:text-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="fp-confirm" className="block text-sm font-medium text-slate-300">
              {t("admin.forgotPassword.confirmPassword")}
            </label>
            <div className="mt-2">
              <PasswordInput
                id="fp-confirm"
                value={confirm}
                onChange={setConfirm}
                placeholder={t("admin.forgotPassword.confirmPasswordPlaceholder")}
                autoComplete="new-password"
                disabled={loading || Boolean(success)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 pr-14 text-white placeholder:text-slate-400 outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                toggleClassName="text-slate-300 hover:bg-white/10 hover:text-white"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">{t("admin.password.hint")}</p>
          </div>

          <button
            type="submit"
            disabled={loading || Boolean(success)}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
          >
            {loading ? t("common.saving") : t("admin.forgotPassword.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
