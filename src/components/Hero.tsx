"use client";

import { useEffect, useState } from "react";
import { fetchPublicSettings } from "@/lib/settings-api";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import type { ShopSettings } from "@/types/settings";

export default function Hero() {
  const { t } = useTranslation();
  const [shop, setShop] = useState<ShopSettings | null>(null);

  useEffect(() => {
    fetchPublicSettings().then((res) => {
      if (res.success && res.data) setShop(res.data);
    });
  }, []);

  const firmaAdi = shop?.firma_adi ?? t("customer.hero.defaultShopName");

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 pb-16 pt-[calc(env(safe-area-inset-top,0px)+4rem)] sm:px-6 sm:pb-24 sm:pt-[calc(env(safe-area-inset-top,0px)+6rem)] lg:px-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.25),transparent_50%)]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-4xl text-center">
        <span className="mb-4 inline-flex items-center rounded-full bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-200 ring-1 ring-blue-400/30">
          {firmaAdi}
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          {t("customer.hero.headline")}{" "}
          <span className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
            {t("customer.hero.headlineHighlight")}
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
          {t("customer.hero.description")}
        </p>
        {(shop?.telefon || shop?.adres) && (
          <p className="mx-auto mt-4 text-sm text-slate-400">
            {shop.telefon && <span>{shop.telefon}</span>}
            {shop.telefon && shop.adres && <span className="mx-2">·</span>}
            {shop.adres && <span>{shop.adres}</span>}
          </p>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
              <svg className="h-4 w-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            {t("customer.hero.featureStatus")}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
              <svg className="h-4 w-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            {t("customer.hero.featurePricing")}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
              <svg className="h-4 w-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            {t("customer.hero.featureParts")}
          </div>
        </div>
      </div>
    </section>
  );
}
