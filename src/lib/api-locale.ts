import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "./i18n/config";

const STORAGE_KEY = "site-locale";

export function getClientLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  return normalizeLocale(localStorage.getItem(STORAGE_KEY) ?? document.documentElement.lang);
}

export function setClientLocale(locale: Locale): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, locale);
  }
}

export function apiHeaders(extra?: HeadersInit): HeadersInit {
  return {
    Accept: "application/json",
    "X-Locale": getClientLocale(),
    ...extra,
  };
}
