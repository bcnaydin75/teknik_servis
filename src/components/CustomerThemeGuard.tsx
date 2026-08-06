"use client";

import { useEffect } from "react";

/** Admin boot sınıflarını temizler — müşteri sayfası her zaman açık tema */
export default function CustomerThemeGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "admin-dark");
    root.classList.add("admin-boot-light");
    root.style.backgroundColor = "#f8fafc";
    root.style.colorScheme = "light";
    document.body.style.backgroundColor = "#f8fafc";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#f8fafc");
  }, []);

  return <>{children}</>;
}
