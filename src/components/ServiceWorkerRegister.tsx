"use client";

import { useEffect } from "react";

const RELOAD_KEY = "ts-sw-reloaded";

function shouldAutoReload(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const name = err instanceof Error ? err.name : "";
  return (
    name === "ChunkLoadError" ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

function reloadOnceForSkew() {
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === "1") return;
    sessionStorage.setItem(RELOAD_KEY, "1");
  } catch {
    /* ignore */
  }
  window.location.reload();
}

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Deploy sonrası eski JS chunk hatası → bir kez yenile
    const onError = (event: ErrorEvent) => {
      if (shouldAutoReload(event.error ?? event.message)) {
        reloadOnceForSkew();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (shouldAutoReload(event.reason)) {
        reloadOnceForSkew();
      }
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    // Bu oturumda sayfa başarıyla açıldıysa bayrağı temizle
    const clearFlag = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        /* ignore */
      }
    }, 2500);

    if (!("serviceWorker" in navigator)) {
      return () => {
        window.clearTimeout(clearFlag);
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRejection);
      };
    }

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => void r.unregister());
      });
      return () => {
        window.clearTimeout(clearFlag);
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRejection);
      };
    }

    // Sadece güncellemede yenile (ilk SW kurulumunda değil)
    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (hadController) reloadOnceForSkew();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let updateTimer: number | undefined;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => {
          void reg.update();
          updateTimer = window.setInterval(() => void reg.update(), 60_000);
        })
        .catch(() => {
          /* sessiz — PWA opsiyonel */
        });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      window.clearTimeout(clearFlag);
      if (updateTimer) window.clearInterval(updateTimer);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
