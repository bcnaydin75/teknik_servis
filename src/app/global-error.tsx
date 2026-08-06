"use client";

import { useEffect } from "react";

/**
 * Root layout hatalarını yakala (Next.js global-error zorunlu html/body içerir).
 * "This page couldn't load" İngilizce ekranı yerine Türkçe göster.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#e2e8f0",
          fontFamily: "system-ui, sans-serif",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Sayfa yüklenemedi</h1>
          <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 20px" }}>
            Yenilemeyi deneyin veya geri dönün.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                border: 0,
                borderRadius: 12,
                padding: "10px 18px",
                background: "#fff",
                color: "#0f172a",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Yenile
            </button>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                borderRadius: 12,
                padding: "10px 18px",
                background: "transparent",
                color: "#e2e8f0",
                border: "1px solid #475569",
                cursor: "pointer",
              }}
            >
              Tekrar dene
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
