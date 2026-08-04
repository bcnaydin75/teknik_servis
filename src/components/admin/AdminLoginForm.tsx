"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAdmin } from "@/lib/auth-api";
import { ADMIN_BRAND_LOGO } from "@/lib/brand";
import { LOCALES, LOCALE_FLAGS, type Locale } from "@/lib/i18n/config";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { fetchPublicSettings } from "@/lib/settings-api";
import type { ShopSettings } from "@/types/settings";
import PasswordInput from "./PasswordInput";

const REMEMBER_USERNAME_KEY = "admin_login_remember_username";
const LOGIN_FAILURES_KEY = "admin_login_failures";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
/** Varsayılan kapalı; production'da açmak için NEXT_PUBLIC_ENABLE_LOGIN_LOCKOUT=true */
const LOGIN_LOCKOUT_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_LOGIN_LOCKOUT === "true";

type FailureRecord = {
  count: number;
  lockedUntil?: number;
};

function readFailures(): FailureRecord {
  if (!LOGIN_LOCKOUT_ENABLED) return { count: 0 };
  try {
    const raw = localStorage.getItem(LOGIN_FAILURES_KEY);
    if (!raw) return { count: 0 };
    const parsed = JSON.parse(raw) as FailureRecord;
    if (parsed.lockedUntil && Date.now() > parsed.lockedUntil) {
      return { count: 0 };
    }
    return parsed;
  } catch {
    return { count: 0 };
  }
}

function recordFailure(): FailureRecord {
  if (!LOGIN_LOCKOUT_ENABLED) return { count: 0 };
  const current = readFailures();
  const count = current.count + 1;
  const next: FailureRecord =
    count >= MAX_LOGIN_ATTEMPTS
      ? { count, lockedUntil: Date.now() + LOCKOUT_MS }
      : { count };
  try {
    localStorage.setItem(LOGIN_FAILURES_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

function clearFailures() {
  try {
    localStorage.removeItem(LOGIN_FAILURES_KEY);
  } catch {
    /* ignore */
  }
}

function isLockedOut(): boolean {
  if (!LOGIN_LOCKOUT_ENABLED) return false;
  const record = readFailures();
  return Boolean(record.lockedUntil && Date.now() < record.lockedUntil);
}

function AdminLoginBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-slate-950">
      <div className="absolute -left-1/4 -top-1/4 h-[520px] w-[520px] rounded-full bg-violet-600/30 blur-[120px]" />
      <div className="absolute -bottom-1/4 -right-1/4 h-[480px] w-[480px] rounded-full bg-blue-600/25 blur-[120px]" />
      <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[100px]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-transparent to-slate-950/50" />
    </div>
  );
}

export default function AdminLoginForm() {
  const { t, locale, setLocale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/admin";
  const errorRef = useRef<HTMLDivElement>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [shop, setShop] = useState<ShopSettings | null>(null);

  const shopName = shop?.firma_adi ?? t("customer.hero.defaultShopName");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_USERNAME_KEY);
      if (saved) {
        setUsername(saved);
        setRememberMe(true);
      }
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  useEffect(() => {
    fetchPublicSettings()
      .then((res) => {
        if (res.success && res.data) setShop(res.data);
      })
      .catch(() => {
        /* backend kapalı — varsayılan ikon kullanılır */
      });
  }, []);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (isLockedOut()) {
      setError(t("admin.login.tooManyAttempts"));
      return;
    }

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError(t("errors.requiredFields"));
      return;
    }

    setLoading(true);

    try {
      const result = await loginAdmin(trimmedUser, password, rememberMe);

      if (!result.success) {
        recordFailure();
        if (isLockedOut()) {
          setError(t("admin.login.tooManyAttempts"));
        } else {
          setError(result.message ?? t("errors.wrongPassword"));
        }
        return;
      }

      clearFailures();

      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_USERNAME_KEY, trimmedUser);
        } else {
          localStorage.removeItem(REMEMBER_USERNAME_KEY);
        }
      } catch {
        /* ignore */
      }

      router.replace(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.connection"));
    } finally {
      setLoading(false);
    }
  }

  function handleLocaleChange(next: Locale) {
    setLocale(next);
  }

  return (
    <div className="relative flex min-h-app flex-col items-center justify-center px-4 px-safe py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <AdminLoginBackground />

      <div className="relative z-10 mb-4 flex w-full max-w-md items-center justify-between gap-3">
        <Link
          href="/"
          className="text-sm font-medium text-slate-400 transition hover:text-white"
        >
          {t("admin.login.backToCustomer")}
        </Link>
        <div className="flex items-center">
          <label className="sr-only" htmlFor="login-locale">
            {t("admin.settings.dil.title")}
          </label>
          <select
            id="login-locale"
            value={locale}
            onChange={(e) => handleLocaleChange(e.target.value as Locale)}
            disabled={loading}
            className="h-9 cursor-pointer rounded-lg border border-white/20 bg-white/10 px-2.5 text-sm text-slate-200 backdrop-blur-md outline-none transition hover:bg-white/15 focus:border-blue-400/50 disabled:opacity-60"
          >
            {LOCALES.map((loc) => (
              <option key={loc} value={loc} className="bg-slate-900 text-white">
                {LOCALE_FLAGS[loc]} {t(`languages.${loc}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/[0.06] px-6 pb-12 pt-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md sm:px-8 sm:pb-14 sm:pt-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.12] via-white/[0.02] to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-1/2 -top-1/2 h-full w-full rounded-full bg-violet-500/[0.07] blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-1/2 -right-1/2 h-full w-full rounded-full bg-blue-500/[0.07] blur-3xl"
          />

          <span className="absolute bottom-4 right-4 z-10 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-slate-300 backdrop-blur-md sm:bottom-6 sm:right-6">
            {t("admin.login.versionBadge")}
          </span>

          <div className={`relative z-[1] ${loading ? "pointer-events-none opacity-70" : ""}`}>
            {error && (
              <div
                ref={errorRef}
                role="alert"
                aria-live="assertive"
                className="mb-5 flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-500/[0.08] px-4 py-3 text-sm font-medium text-red-100 backdrop-blur-md"
              >
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0 text-red-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {info && !error && (
              <div
                role="status"
                className="mb-5 flex items-start gap-3 rounded-xl border border-blue-400/25 bg-blue-500/[0.08] px-4 py-3 text-sm text-blue-100 backdrop-blur-md"
              >
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0 text-blue-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{info}</span>
              </div>
            )}

            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full shadow-lg shadow-blue-900/40 ring-2 ring-white/15">
                <Image
                  src={ADMIN_BRAND_LOGO}
                  alt={shopName}
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>

              {shop?.firma_adi && (
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                  {shop.firma_adi}
                </p>
              )}

              <h1 className="text-2xl font-bold text-white">{t("admin.login.title")}</h1>
              <p className="mt-2 text-sm text-slate-400">{t("admin.login.subtitle")}</p>
            </div>

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
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-base text-white placeholder:text-slate-400 outline-none backdrop-blur-sm transition focus:border-blue-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
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
                    className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 pr-14 text-base text-white placeholder:text-slate-400 outline-none backdrop-blur-sm transition focus:border-blue-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                    toggleClassName="text-slate-300 hover:bg-white/10 hover:text-white"
                  />
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex cursor-pointer select-none items-start gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500/30 focus:ring-offset-0"
                    />
                    <span>
                      <span className="block text-slate-300">{t("admin.login.rememberMe")}</span>
                      <span className="block text-xs text-slate-500">{t("admin.login.rememberMeHint")}</span>
                    </span>
                  </label>
                  <Link
                    href="/admin/forgot-password"
                    className="self-end text-sm font-medium text-blue-400 transition hover:text-blue-300 sm:self-auto"
                  >
                    {t("admin.login.forgotPassword")}
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative w-full overflow-hidden rounded-xl border border-white/20 bg-gradient-to-r from-blue-600/90 to-indigo-600/90 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-900/25 backdrop-blur-sm transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && (
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-pulse bg-white/10"
                  />
                )}
                <span className="relative inline-flex items-center justify-center gap-2">
                  {loading && (
                    <svg
                      className="h-5 w-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  )}
                  {loading ? t("admin.login.submitting") : t("admin.login.submit")}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
