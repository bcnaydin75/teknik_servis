"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AdminTheme = "light" | "dark" | "system";

type AdminThemeContextValue = {
  theme: AdminTheme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: AdminTheme) => void;
};

const STORAGE_KEY = "teknik-servis-admin-theme";

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

function resolveTheme(theme: AdminTheme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AdminTheme | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored);
    }
    setResolvedTheme(resolveTheme(stored ?? "system"));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setResolvedTheme(resolveTheme(theme));
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted || theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolvedTheme(resolveTheme("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, mounted]);

  const setTheme = useCallback((next: AdminTheme) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
    setResolvedTheme(resolveTheme(next));
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return (
    <AdminThemeContext.Provider value={value}>
      <div className={resolvedTheme === "dark" ? "admin-dark min-h-screen" : "min-h-screen"}>
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): AdminThemeContextValue {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) {
    throw new Error("useAdminTheme yalnızca admin panelinde kullanılabilir.");
  }
  return ctx;
}
