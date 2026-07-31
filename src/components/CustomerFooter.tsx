"use client";

import { useTranslation } from "@/lib/i18n/LocaleProvider";

export default function CustomerFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
      <p>{t("customer.footer.copyright", { year })}</p>
    </footer>
  );
}
