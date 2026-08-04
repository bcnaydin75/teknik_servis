"use client";

import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import MetaUpdater from "@/components/MetaUpdater";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <MetaUpdater />
      <ServiceWorkerRegister />
      {children}
    </LocaleProvider>
  );
}
