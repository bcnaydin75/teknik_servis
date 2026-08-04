"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  confirmForgotPassword,
  requestForgotPassword,
} from "@/lib/auth-api";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import PasswordInput from "./PasswordInput";

type Step = "request" | "confirm";

export default function ForgotPasswordForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [username, setUsername] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setDone(false);
    if (!username.trim()) {
      setError(t("errors.requiredFields"));
      return;
    }
    setLoading(true);
    try {
      const res = await requestForgotPassword(username.trim());
      if (!res.success || !res.data?.resetToken) {
        setError(res.message ?? t("admin.forgotPassword.failed"));
        return;
      }
      setResetToken(res.data.resetToken);
      setEmailHint(res.data.emailHint ?? "");
      setStep("confirm");
      setInfo(
        t("admin.forgotPassword.codeSent", {
          email: res.data.emailHint ?? "",
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.connection"));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!code.trim() || !password) {
      setError(t("errors.requiredFields"));
      return;
    }
    if (password !== confirm) {
      setError(t("admin.forgotPassword.mismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await confirmForgotPassword({
        resetToken,
        code: code.trim(),
        new_password: password,
        confirm_password: confirm,
      });
      if (!res.success) {
        setError(res.message ?? t("admin.forgotPassword.failed"));
        return;
      }
      setDone(true);
      setInfo(res.message ?? t("admin.forgotPassword.success"));
      setTimeout(() => router.replace("/admin/login"), 1600);
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
        <p className="mt-2 text-sm text-slate-400">
          {step === "request"
            ? t("admin.forgotPassword.subtitleEmail")
            : t("admin.forgotPassword.subtitleCode", { email: emailHint })}
        </p>

        {error && (
          <div role="alert" className="mt-5 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}
        {info && (
          <div role="status" className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {info}
          </div>
        )}

        {step === "request" ? (
          <form onSubmit={handleRequest} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="fp-username" className="block text-sm font-medium text-slate-300">
                {t("admin.login.username")}
              </label>
              <input
                id="fp-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={loading}
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                placeholder={t("admin.login.usernamePlaceholder")}
              />
              <p className="mt-1.5 text-xs text-slate-500">{t("admin.forgotPassword.emailHint")}</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
            >
              {loading ? t("common.processing") : t("admin.forgotPassword.sendCode")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="fp-code" className="block text-sm font-medium text-slate-300">
                {t("admin.forgotPassword.code")}
              </label>
              <input
                id="fp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={loading || done}
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center font-mono text-xl tracking-[0.35em] text-white outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                placeholder="000000"
              />
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
                  disabled={loading || done}
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
                  disabled={loading || done}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 pr-14 text-white placeholder:text-slate-400 outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                  toggleClassName="text-slate-300 hover:bg-white/10 hover:text-white"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">{t("admin.password.hint")}</p>
            </div>

            <button
              type="submit"
              disabled={loading || done}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
            >
              {loading ? t("common.saving") : t("admin.forgotPassword.submit")}
            </button>

            <button
              type="button"
              disabled={loading || done}
              onClick={() => {
                setStep("request");
                setCode("");
                setPassword("");
                setConfirm("");
                setResetToken("");
                setInfo(null);
                setDone(false);
                setError(null);
              }}
              className="w-full text-sm text-slate-400 hover:text-white disabled:opacity-60"
            >
              {t("admin.forgotPassword.resend")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
