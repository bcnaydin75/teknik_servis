"use client";

import { useEffect } from "react";
import AppBootSplash from "@/components/AppBootSplash";
import MetaUpdater from "@/components/MetaUpdater";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AppBootSplash />
      <MetaUpdater />
      <ServiceWorkerRegister />
      {children}
    </LocaleProvider>
  );
}
