import type { ShopSettings } from "@/types/settings";

/** PHP/API yanıtını ShopSettings tipine çevirir */
export function normalizeShopSettings(raw: Record<string, unknown>): ShopSettings {
  const ucretRaw = raw.ucret_detayi_goster;
  const ucret_detayi_goster =
    ucretRaw === false ||
    ucretRaw === 0 ||
    ucretRaw === "0" ||
    ucretRaw === "false"
      ? false
      : true;

  return {
    firma_adi: String(raw.firma_adi ?? "Teknik Servis"),
    adres: (raw.adres as string | null) ?? null,
    telefon: (raw.telefon as string | null) ?? null,
    email: (raw.email as string | null) ?? null,
    logo_url:
      (raw.logo_url as string | null) ??
      (raw.logo_path as string | null) ??
      null,
    default_locale: raw.default_locale as string | undefined,
    ucret_detayi_goster,
    takip_oneki: (raw.takip_oneki as string | null) ?? null,
    takip_ornek: (raw.takip_ornek as string | null) ?? null,
  };
}
