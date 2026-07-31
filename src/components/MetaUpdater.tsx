"use client";

import { useEffect } from "react";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export default function MetaUpdater() {
  const { t, locale } = useTranslation();

  useEffect(() => {
    document.title = t("meta.title");
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", t("meta.description"));
    }
  }, [t, locale]);

  return null;
}
