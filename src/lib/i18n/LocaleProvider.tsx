"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_BCP47,
  normalizeLocale,
  type Locale,
} from "./config";
import { localeMessages } from "./locales";
import { createTranslator } from "./translate";
import { fetchPublicSettings } from "@/lib/settings-api";
import { setClientLocale } from "@/lib/api-locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  bcp47: string;
  ready: boolean;
  /** Müşteri sayfasında ücret detayı gösterilsin mi (varsayılan: evet) */
  showCostDetail: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);
  const [showCostDetail, setShowCostDetail] = useState(true);

  const loadLocale = useCallback(async () => {
    try {
      const res = await fetchPublicSettings();
      if (res.success && res.data) {
        if (res.data.default_locale) {
          const next = normalizeLocale(res.data.default_locale);
          setLocaleState(next);
          setClientLocale(next);
        }
        setShowCostDetail(res.data.ucret_detayi_goster !== false);
      }
    } catch {
      /* keep default */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    loadLocale();
  }, [loadLocale]);

  useEffect(() => {
    function onLocaleChanged(e: Event) {
      const detail = (e as CustomEvent<{ locale: string }>).detail;
      if (detail?.locale) {
        setLocaleState(normalizeLocale(detail.locale));
      } else {
        loadLocale();
      }
    }
    window.addEventListener("site-locale-changed", onLocaleChanged);
    return () => window.removeEventListener("site-locale-changed", onLocaleChanged);
  }, [loadLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setClientLocale(next);
    window.dispatchEvent(
      new CustomEvent("site-locale-changed", { detail: { locale: next } })
    );
  }, []);

  const t = useMemo(
    () => createTranslator(localeMessages[locale], locale),
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      bcp47: LOCALE_BCP47[locale],
      ready,
      showCostDetail,
    }),
    [locale, setLocale, t, ready, showCostDetail]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

export function useTranslation() {
  const { t, locale, bcp47, setLocale, ready, showCostDetail } = useLocale();
  return { t, locale, bcp47, setLocale, ready, showCostDetail };
}
