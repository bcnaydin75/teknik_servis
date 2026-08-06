"use client";

import { useEffect } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const msg = error?.message ?? "";
    if (
      /chunk|dynamically imported module|Failed to fetch/i.test(msg) ||
      error?.name === "ChunkLoadError"
    ) {
      // Eski deploy kalıntısı — soft reset yetmez, tam yenile
      window.location.reload();
    }
  }, [error]);

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center"
      style={{ backgroundColor: "#0f172a" }}
    >
      <LoadingSpinner size="md" />
      <div>
        <h1 className="text-lg font-semibold text-white">Sayfa yüklenemedi</h1>
        <p className="mt-1 text-sm text-slate-400">
          Yenilemeyi deneyin veya geri dönün.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900"
        >
          Yenile
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200"
        >
          Tekrar dene
        </button>
      </div>
    </div>
  );
}
