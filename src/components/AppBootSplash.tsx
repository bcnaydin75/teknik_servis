"use client";

import { useEffect } from "react";

/** HTML gelir gelmez koyu örtü; React boyayınca kaldırılır — CSS gecikmesinde beyaz flash olmasın */
export default function AppBootSplash() {
  useEffect(() => {
    const el = document.getElementById("app-boot-splash");
    if (!el) return;
    // İçerik SSR ile gelmiş olsa bile bir an koyu örtü kalsın; sonra kaldır
    const t = window.setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 120ms ease";
      window.setTimeout(() => el.remove(), 140);
    }, 80);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
