"use client";

import { useEffect, type InputHTMLAttributes } from "react";
import { formatMoneyInput, parseMoneyInput } from "@/lib/i18n/format";
import { modalInputClass } from "./modal-ui";

type CurrencyAmountInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string;
  onValueChange: (display: string, amount: number) => void;
  /** Sağda ₺ / TL göster */
  suffix?: string;
};

/** Mobil tutar alanı: yazarken 200000 → 200.000 */
export default function CurrencyAmountInput({
  value,
  onValueChange,
  suffix = "₺",
  className = "",
  ...rest
}: CurrencyAmountInputProps) {
  return (
    <div className="relative">
      <input
        {...rest}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => {
          const next = formatMoneyInput(e.target.value);
          onValueChange(next, parseMoneyInput(next));
        }}
        className={`${modalInputClass} ${suffix ? "pr-12" : ""} ${className}`}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

/** Modal açıkken alt menüyü gizle (Kaydet butonu üstte kalsın) */
export function useAdminModalOpen(open: boolean) {
  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add("admin-modal-open");
    return () => document.documentElement.classList.remove("admin-modal-open");
  }, [open]);
}
