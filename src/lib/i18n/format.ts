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

/** Input gösterimi: 200000 → "200.000" (TR binlik ayırıcı) */
export function formatMoneyInput(value: number | string): string {
  const raw =
    typeof value === "number"
      ? Number.isFinite(value)
        ? String(value)
        : ""
      : value;
  if (!raw) return "";

  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const [intPart, decPart] = normalized.split(".");
  const digits = intPart.replace(/\D/g, "");
  if (!digits) return decPart != null ? `0,${decPart.replace(/\D/g, "").slice(0, 2)}` : "";

  const withDots = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (decPart == null) return withDots;
  const decimals = decPart.replace(/\D/g, "").slice(0, 2);
  return decimals.length > 0 ? `${withDots},${decimals}` : `${withDots},`;
}

/** "200.000,50" / "200000" → number */
export function parseMoneyInput(raw: string): number {
  const cleaned = raw.replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
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
