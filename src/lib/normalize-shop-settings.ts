import type { ShopSettings } from "@/types/settings";

function asBool(raw: unknown, defaultValue: boolean): boolean {
  if (raw === false || raw === 0 || raw === "0" || raw === "false") return false;
  if (raw === true || raw === 1 || raw === "1" || raw === "true") return true;
  return defaultValue;
}

/** PHP/API yanıtını ShopSettings tipine çevirir */
export function normalizeShopSettings(raw: Record<string, unknown>): ShopSettings {
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
    ucret_detayi_goster: asBool(raw.ucret_detayi_goster, true),
    fis_yazdir_aktif: asBool(raw.fis_yazdir_aktif, true),
    takip_oneki: (raw.takip_oneki as string | null) ?? null,
    takip_ornek: (raw.takip_ornek as string | null) ?? null,
  };
}
