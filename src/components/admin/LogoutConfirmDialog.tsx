"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { useAdminModalOpen } from "./CurrencyAmountInput";

interface LogoutConfirmDialogProps {
  open: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LogoutConfirmDialog({
  open,
  loading = false,
  onConfirm,
  onCancel,
}: LogoutConfirmDialogProps) {
  const { t } = useTranslation();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const mounted = typeof document !== "undefined";

  useAdminModalOpen(open);

  useEffect(() => {
    if (!open) return;
    // Bir tick sonra odakla — drawer kapansın, Enter yanlışlıkla basılmasın
    const id = window.setTimeout(() => confirmRef.current?.focus(), 50);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!loading) onCancel();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, loading, onCancel]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-confirm-title"
    >
      <button
        type="button"
        aria-label={t("common.cancel")}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          if (!loading) onCancel();
        }}
      />
      <div className="relative flex w-full max-w-md flex-col justify-center rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl dark:bg-slate-900 sm:rounded-2xl sm:pb-6">
        <h2
          id="logout-confirm-title"
          className="text-lg font-bold text-slate-900 dark:text-white"
        >
          {t("nav.logoutConfirmTitle")}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {t("nav.logoutConfirmBody")}
        </p>
        <p className="mt-1 text-xs text-slate-400">{t("nav.logoutConfirmHint")}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t("common.no")}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="min-h-[44px] rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? t("common.loading") : t("common.yes")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
