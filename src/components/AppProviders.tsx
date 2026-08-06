"use client";

import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import MetaUpdater from "@/components/MetaUpdater";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import AppBootSplash from "@/components/AppBootSplash";

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
