"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

interface PasswordInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
  toggleClassName?: string;
}

export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  autoComplete,
  className = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-14 dark:border-slate-600 dark:bg-slate-900 dark:text-white",
  toggleClassName = "text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200",
}: PasswordInputProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  function toggleVisibility(e: React.SyntheticEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setVisible((v) => !v);
  }

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={className}
      />
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        onPointerUp={toggleVisibility}
        disabled={disabled}
        aria-label={visible ? t("common.hide") : t("common.show")}
        aria-pressed={visible}
        className={`absolute right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-lg transition disabled:opacity-60 ${toggleClassName}`}
      >
        {visible ? (
          <svg className="pointer-events-none h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="pointer-events-none h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}
