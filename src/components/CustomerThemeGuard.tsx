"use client";

import { useEffect } from "react";

/** Eski global dark sınıfını html'den temizler — müşteri sayfası etkilenmesin */
export default function CustomerThemeGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return <>{children}</>;
}
