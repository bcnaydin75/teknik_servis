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

function applyDocumentTheme(isDark: boolean) {
  const c = isDark ? "#0f172a" : "#f8fafc";
  const root = document.documentElement;
  root.style.backgroundColor = c;
  root.style.colorScheme = isDark ? "dark" : "light";
  root.classList.toggle("admin-dark", isDark);
  root.classList.toggle("admin-boot-light", !isDark);
  document.body.style.backgroundColor = c;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", c);
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
    setThemeState(readStoredTheme());
    setHydrated(true);
  }, []);

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? systemPref : theme;

  useEffect(() => {
    // Hydration öncesi de koyu varsayılanı koru; light seçiliyse hemen uygula
    applyDocumentTheme(resolvedTheme === "dark");
  }, [resolvedTheme, hydrated]);

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
        suppressHydrationWarning
        className={
          resolvedTheme === "dark"
            ? "admin-dark min-h-dvh bg-slate-950 text-slate-100"
            : "min-h-dvh bg-slate-50 text-slate-900"
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
