import type { DeviceStatus } from "@/types/repair";
import type { Locale } from "./config";
import { LOCALE_BCP47 } from "./config";

export function formatCurrency(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_BCP47[locale], {
    style: "currency",
    currency: "TRY",
  }).format(amount);
}

/** Mobil kartlar için daha kısa tutar (₺60.000) */
export function formatCurrencyCompact(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_BCP47[locale], {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(
  dateStr: string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(LOCALE_BCP47[locale], options).format(
    new Date(dateStr)
  );
}

export function formatDateTime(dateStr: string, locale: Locale): string {
  return formatDate(dateStr, locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateLong(dateStr: string, locale: Locale): string {
  return formatDate(dateStr, locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusKey(status: DeviceStatus): string {
  return `status.${status}`;
}
