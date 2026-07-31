"use client";

import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import MetaUpdater from "@/components/MetaUpdater";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <MetaUpdater />
      {children}
    </LocaleProvider>
  );
}
