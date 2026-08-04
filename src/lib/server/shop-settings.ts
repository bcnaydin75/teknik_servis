import { Tables } from "./db-tables";
import { getSupabaseAdmin } from "./supabase";

const ALLOWED_LOCALES = new Set(["tr", "en", "es", "it", "ru"]);

export function normalizeLocale(locale: string | null | undefined): string {
  const v = (locale ?? "tr").toLowerCase().trim();
  return ALLOWED_LOCALES.has(v) ? v : "tr";
}

export interface ShopSettingsRow {
  firma_adi: string;
  adres: string | null;
  telefon: string | null;
  email: string | null;
  logo_url: string | null;
  default_locale: string;
  ucret_detayi_goster: boolean;
  takip_oneki: string | null;
}

export async function resolveTenantIdByShopSlug(
  shop: string
): Promise<number | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from(Tables.yoneticiKullanicilar)
    .select("id, tenant_id")
    .eq("username", shop)
    .maybeSingle();

  if (!data) return null;
  const tid = data.tenant_id ?? data.id;
  return tid > 0 ? tid : data.id;
}

export async function getShopSettingsForTenant(
  tenantId: number,
  options?: { includeLogoQuery?: boolean; shopSlug?: string }
): Promise<ShopSettingsRow> {
  const db = getSupabaseAdmin();

  let row = (
    await db.from(Tables.dukkanAyarlari).select("*").eq("tenant_id", tenantId).maybeSingle()
  ).data;

  if (!row) {
    await db.from(Tables.dukkanAyarlari).insert({
      tenant_id: tenantId,
      firma_adi: "Teknik Servis",
    });
    row = (
      await db.from(Tables.dukkanAyarlari).select("*").eq("tenant_id", tenantId).maybeSingle()
    ).data;
  }

  let logoUrl: string | null = null;
  if (row?.logo_path) {
    if (row.logo_path.startsWith("http")) {
      logoUrl = row.logo_path;
    } else if (options?.includeLogoQuery) {
      const shop = options.shopSlug ? `&shop=${encodeURIComponent(options.shopSlug)}` : "";
      logoUrl = `/api/public_settings.php?action=logo${shop}`;
    }
  }

  return {
    firma_adi: row?.firma_adi ?? "Teknik Servis",
    adres: row?.adres ?? null,
    telefon: row?.telefon ?? null,
    email: row?.email ?? null,
    logo_url: logoUrl,
    default_locale: normalizeLocale(row?.default_locale),
    ucret_detayi_goster: row?.ucret_detayi_goster !== false,
    takip_oneki: row?.takip_oneki ?? null,
  };
}

export async function getDefaultTenantId(): Promise<number | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from(Tables.yoneticiKullanicilar)
    .select("id, tenant_id")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const tid = data.tenant_id ?? data.id;
  return tid > 0 ? tid : data.id;
}
