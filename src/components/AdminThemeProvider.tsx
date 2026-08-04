"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

export type AdminTheme = "light" | "dark" | "system";

type AdminThemeContextValue = {
  theme: AdminTheme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: AdminTheme) => void;
};

const STORAGE_KEY = "teknik-servis-admin-theme";

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

function readStoredTheme(): AdminTheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as AdminTheme | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return "dark";
}

function resolveTheme(theme: AdminTheme): "light" | "dark" {
  if (theme === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

function subscribeSystemTheme(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSystemSnapshot() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getServerSystemSnapshot(): "light" | "dark" {
  return "dark";
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>("dark");
  const [hydrated, setHydrated] = useState(false);
  const systemPref = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemSnapshot,
    getServerSystemSnapshot
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      setThemeState(readStoredTheme());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? systemPref : theme;

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.style.backgroundColor =
      resolvedTheme === "dark" ? "#0f172a" : "#f8fafc";
  }, [hydrated, resolvedTheme]);

  const setTheme = useCallback((next: AdminTheme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return (
    <AdminThemeContext.Provider value={value}>
      <div
        className={
          resolvedTheme === "dark"
            ? "admin-dark min-h-screen bg-slate-950 text-slate-100"
            : "min-h-screen bg-slate-50 text-slate-900"
        }
      >
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

/** Client hydration tamamlandı mı (SSR uyumsuzluğu önlemek için). */
export function useClientMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
