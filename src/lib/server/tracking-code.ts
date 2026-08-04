import { Tables } from "./db-tables";
import { getSupabaseAdmin } from "./supabase";

const PREFIX_LEN = 3;

function normalizeLetters(value: string): string {
  return value
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/[^A-Z0-9\s]/g, "")
    .trim();
}

/** Firma adından 3 harfli dükkan kodu (AYP, SXT vb.) */
export function deriveShopTrackingPrefix(firmaAdi: string, username: string): string {
  const words = normalizeLetters(firmaAdi).split(/\s+/).filter(Boolean);

  if (words.length >= 3) {
    return `${words[0][0] ?? "X"}${words[1][0] ?? "X"}${words[2][0] ?? "X"}`.slice(
      0,
      PREFIX_LEN
    );
  }

  if (words.length >= 2) {
    const a = words[0][0] ?? "X";
    const b = words[1][0] ?? "X";
    const c = words[1][1] ?? words[0][1] ?? "X";
    return `${a}${b}${c}`.slice(0, PREFIX_LEN);
  }

  if (words.length === 1 && words[0].length >= PREFIX_LEN) {
    return words[0].slice(0, PREFIX_LEN);
  }

  const fromUser = normalizeLetters(username).replace(/\s/g, "");
  if (fromUser.length >= PREFIX_LEN) {
    return fromUser.slice(0, PREFIX_LEN);
  }

  return (fromUser + "XXX").slice(0, PREFIX_LEN);
}

export async function allocateUniqueShopPrefix(
  firmaAdi: string,
  username: string
): Promise<string> {
  const db = getSupabaseAdmin();
  const base = deriveShopTrackingPrefix(firmaAdi, username);

  for (let i = 0; i < 36; i++) {
    const candidate =
      i === 0 ? base : `${base.slice(0, 2)}${i.toString(36).toUpperCase()}`;
    const { data } = await db
      .from(Tables.dukkanAyarlari)
      .select("id")
      .eq("takip_oneki", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }

  return `Z${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

export async function ensureShopTrackingPrefix(tenantId: number): Promise<string> {
  const db = getSupabaseAdmin();

  const { data: shop } = await db
    .from(Tables.dukkanAyarlari)
    .select("takip_oneki, firma_adi, tenant_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (shop?.takip_oneki) return shop.takip_oneki;

  const { data: owner } = await db
    .from(Tables.yoneticiKullanicilar)
    .select("username, ad_soyad")
    .eq("id", tenantId)
    .maybeSingle();

  const prefix = await allocateUniqueShopPrefix(
    shop?.firma_adi ?? owner?.ad_soyad ?? "Servis",
    owner?.username ?? `shop${tenantId}`
  );

  await db
    .from(Tables.dukkanAyarlari)
    .update({ takip_oneki: prefix, guncelleme_tarihi: new Date().toISOString() })
    .eq("tenant_id", tenantId);

  return prefix;
}

/** Örn. AYP-26-001 (Mehmet), SXT-26-001 (Serap) */
export async function generateNextTrackingCode(tenantId: number): Promise<string> {
  const db = getSupabaseAdmin();
  const shopPrefix = await ensureShopTrackingPrefix(tenantId);
  const year = new Date().getFullYear().toString().slice(-2);
  const fullPrefix = `${shopPrefix}-${year}-`;

  const { data: last } = await db
    .from(Tables.tamirKayitlari)
    .select("takip_kodu")
    .eq("tenant_id", tenantId)
    .like("takip_kodu", `${fullPrefix}%`)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  let seq = 1;
  const match = last?.takip_kodu?.match(/-(\d+)$/);
  if (match) seq = parseInt(match[1], 10) + 1;

  return `${fullPrefix}${String(seq).padStart(3, "0")}`;
}

export function formatTrackingCodeExample(prefix: string): string {
  const year = new Date().getFullYear().toString().slice(-2);
  return `${prefix}-${year}-001`;
}
