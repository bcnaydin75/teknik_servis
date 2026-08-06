"use client";

import { useEffect, useState } from "react";

/**
 * İlk boyamada koyu örtü + spinner.
 * ÖNEMLİ: DOM'dan el.remove() YAPMA — React reconciliation bozulur,
 * sayfa geçişlerinde "This page couldn't load" hatası çıkar.
 */
export default function AppBootSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), 120);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      id="app-boot-splash"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483646,
        background: "var(--boot-splash-bg, #0f172a)",
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "3px solid rgba(148,163,184,0.25)",
          borderTopColor: "#3b82f6",
          borderRadius: "50%",
          animation: "boot-spin 0.7s linear infinite",
        }}
      />
    </div>
  );
}
