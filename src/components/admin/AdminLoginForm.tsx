"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAdmin } from "@/lib/auth-api";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import PasswordInput from "./PasswordInput";

export default function AdminLoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/admin";
  const errorRef = useRef<HTMLDivElement>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError(t("errors.requiredFields"));
      return;
    }

    setLoading(true);

    try {
      const result = await loginAdmin(trimmedUser, password);

      if (!result.success) {
        setError(result.message ?? t("errors.wrongPassword"));
        return;
      }

      router.replace(redirect);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("errors.connection")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </span>
          <h1 className="mt-4 text-2xl font-bold text-white">{t("admin.login.title")}</h1>
          <p className="mt-2 text-sm text-slate-400">{t("admin.login.subtitle")}</p>
        </div>

        {error && (
          <div
            ref={errorRef}
            role="alert"
            aria-live="assertive"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-400/50 bg-red-500/20 px-4 py-3 text-sm font-medium text-red-100"
          >
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-300">
              {t("admin.login.username")}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("admin.login.usernamePlaceholder")}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              disabled={loading}
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              {t("admin.login.password")}
            </label>
            <div className="mt-2">
              <PasswordInput
                id="password"
                value={password}
                onChange={setPassword}
                placeholder={t("admin.login.passwordPlaceholder")}
                autoComplete="current-password"
                disabled={loading}
                className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 pr-14 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                toggleClassName="text-slate-400 hover:bg-slate-700 hover:text-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t("admin.login.submitting") : t("admin.login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
