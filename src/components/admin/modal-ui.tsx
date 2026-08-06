"use client";

import { useEffect, type RefObject } from "react";

/**
 * Modal kısayolları: Esc → kapat, Enter → form kaydet
 * (textarea içinde Enter satır kırar)
 */
export function useModalHotkeys(options: {
  open: boolean;
  onClose: () => void;
  formRef?: RefObject<HTMLFormElement | null>;
  disabled?: boolean;
}) {
  const { open, onClose, formRef, disabled } = options;

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Enter" || disabled || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === "TEXTAREA") return;
      if (target.tagName === "SELECT") return;
      if (target.isContentEditable) return;

      const form =
        formRef?.current ??
        (target.closest("form") as HTMLFormElement | null);
      if (!form) return;

      e.preventDefault();
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, formRef, disabled]);
}

export const modalBackdropClass =
  "absolute inset-0 bg-slate-950/70 backdrop-blur-sm";

export const modalTitleClass =
  "text-lg font-bold text-slate-900 dark:text-slate-100";

export const modalLabelClass =
  "block text-sm font-medium text-slate-700 dark:text-slate-300";

export const modalInputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500/50 dark:focus:bg-slate-800 dark:focus:ring-blue-500/10";

export const modalPrimaryBtnClass =
  "flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600";

export const modalSecondaryBtnClass =
  "flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800";

export const modalCloseBtnClass =
  "rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200";

export const modalCardClass =
  "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900";

/** Overlay — alt menünün üstünde (nav z-60) */
export const modalOverlayClass =
  "fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4";

/** Mobil sheet: gövde kayar, footer sabit */
export const modalSheetClass =
  "relative flex max-h-[min(92dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-700/80";

export const modalSheetBodyClass =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 sm:px-6 sm:pt-6";

export const modalSheetFooterClass =
  "shrink-0 border-t border-slate-100 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 dark:border-slate-800 dark:bg-slate-900";

export const modalPanelClass =
  "relative flex max-h-[min(92dvh,100%)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-700/80";

export const modalPanelBodyClass =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 pb-4";

export const modalPanelFooterClass =
  "shrink-0 border-t border-slate-100 px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800";

export function ModalCloseButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={modalCloseBtnClass}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
