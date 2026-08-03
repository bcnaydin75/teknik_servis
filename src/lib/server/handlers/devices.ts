import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireSession } from "../auth";
import { jsonFail, jsonOk } from "../api-response";
import { getSupabaseAdmin } from "../supabase";

function parseParts(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapDevice(row: Record<string, unknown>, customer: Record<string, unknown>) {
  return {
    id: row.id,
    musteri_id: row.customer_id,
    takip_kodu: row.takip_kodu,
    musteri_adi: customer.ad_soyad,
    musteri_telefon: customer.telefon ?? null,
    musteri_email: customer.email ?? null,
    riskli_musteri: Boolean(customer.riskli_musteri),
    risk_notu: customer.risk_notu ?? null,
    cihaz_modeli: row.cihaz_modeli,
    cihaz_durumu: row.cihaz_durumu,
    degisen_parcalar: parseParts(row.degisen_parcalar),
    parca_ucreti: Number(row.parca_ucreti ?? 0),
    iscilik_ucreti: Number(row.iscilik_ucreti ?? 0),
    toplam_ucret: Number(row.toplam_ucret ?? 0),
    aciklama: row.aciklama ?? null,
    imei_no: row.imei_no ?? null,
    cihaz_sifresi: row.cihaz_sifresi ?? null,
    olusturma_tarihi: row.olusturma_tarihi,
    guncelleme_tarihi: row.guncelleme_tarihi,
    arsivlendi: Boolean(row.arsivlendi),
    arsiv_tarihi: row.arsiv_tarihi ?? null,
  };
}

function stripCosts<T extends { parca_ucreti: number; iscilik_ucreti: number; toplam_ucret: number }>(
  devices: T[]
): T[] {
  return devices.map((d) => ({
    ...d,
    parca_ucreti: 0,
    iscilik_ucreti: 0,
    toplam_ucret: 0,
  }));
}

export async function handleGetDevices(request: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission("dashboard");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const tenantId = auth.user.tenant_id;
  const db = getSupabaseAdmin();
  const sp = request.nextUrl.searchParams;
  const archived = sp.get("archived") === "1";
  const q = (sp.get("q") ?? "").trim();
  const year = parseInt(sp.get("year") ?? "0", 10);
  const month = parseInt(sp.get("month") ?? "0", 10);

  let query = db
    .from("repairs")
    .select("*, customers!inner(*)")
    .eq("tenant_id", tenantId)
    .eq("arsivlendi", archived)
    .order("guncelleme_tarihi", { ascending: false });

  if (q) {
    query = query.or(
      `takip_kodu.ilike.%${q}%,cihaz_modeli.ilike.%${q}%,customers.ad_soyad.ilike.%${q}%`
    );
  }

  const { data: rows, error } = await query;
  if (error) return jsonFail("Veritabanı hatası.", 500);

  let filtered = rows ?? [];
  if (archived && year > 0 && month > 0) {
    filtered = filtered.filter((row) => {
      if (!row.arsiv_tarihi) return false;
      const d = new Date(row.arsiv_tarihi);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }

  let devices = filtered.map((row) => {
    const customer = (row.customers ?? {}) as Record<string, unknown>;
    const { customers: _, ...repair } = row as Record<string, unknown>;
    return mapDevice(repair, customer);
  });

  if (!auth.user.permissions.see_costs) {
    devices = stripCosts(devices);
  }

  const { data: activeRows } = await db
    .from("repairs")
    .select("cihaz_durumu, arsivlendi")
    .eq("tenant_id", tenantId)
    .eq("arsivlendi", false);

  const stats = {
    toplam_cihaz: activeRows?.length ?? 0,
    aktif_tamir:
      activeRows?.filter((r) => r.cihaz_durumu !== "teslim_edildi").length ?? 0,
    teslime_hazir:
      activeRows?.filter((r) => r.cihaz_durumu === "hazir").length ?? 0,
  };

  const payload: Record<string, unknown> = { stats, devices };

  if (archived && !year && !month) {
    const { data: archivedRows } = await db
      .from("repairs")
      .select("arsiv_tarihi")
      .eq("tenant_id", tenantId)
      .eq("arsivlendi", true);

    const periodMap = new Map<string, { year: number; month: number; count: number }>();
    for (const r of archivedRows ?? []) {
      if (!r.arsiv_tarihi) continue;
      const d = new Date(r.arsiv_tarihi);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${m}`;
      const cur = periodMap.get(key) ?? { year: y, month: m, count: 0 };
      cur.count += 1;
      periodMap.set(key, cur);
    }

    const monthNames = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
    ];

    payload.archive_periods = [...periodMap.values()]
      .sort((a, b) => b.year - a.year || b.month - a.month)
      .map((p) => ({
        ...p,
        label: `${monthNames[p.month - 1]} ${p.year}`,
      }));
    payload.total_archived = archivedRows?.length ?? 0;
  }

  return jsonOk({ data: payload });
}

export async function handleDashboardStats(): Promise<NextResponse> {
  const auth = await requirePermission("dashboard");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const tenantId = auth.user.tenant_id;
  const db = getSupabaseAdmin();

  const { data: repairs } = await db
    .from("repairs")
    .select("cihaz_durumu, arsivlendi, olusturma_tarihi")
    .eq("tenant_id", tenantId)
    .eq("arsivlendi", false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = {
    toplam_cihaz: repairs?.length ?? 0,
    aktif_tamir:
      repairs?.filter((r) => r.cihaz_durumu !== "teslim_edildi").length ?? 0,
    teslime_hazir: repairs?.filter((r) => r.cihaz_durumu === "hazir").length ?? 0,
    bekleyen_cihaz:
      repairs?.filter((r) => r.cihaz_durumu === "beklemede").length ?? 0,
    bugunku_tamir:
      repairs?.filter((r) => {
        const d = new Date(r.olusturma_tarihi);
        return d >= today;
      }).length ?? 0,
    pos_cirosu_bugun: 0,
    pos_satis_sayisi_bugun: 0,
  };

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: posToday } = await db
    .from("pos_sales")
    .select("total_amount")
    .eq("tenant_id", tenantId)
    .gte("created_at", today.toISOString())
    .lt("created_at", tomorrow.toISOString());

  stats.pos_cirosu_bugun = (posToday ?? []).reduce(
    (s, r) => s + Number(r.total_amount ?? 0),
    0
  );
  stats.pos_satis_sayisi_bugun = posToday?.length ?? 0;

  return jsonOk({ data: stats });
}

export async function handleAddDevice(request: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission("dashboard");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const tenantId = auth.user.tenant_id;
  const db = getSupabaseAdmin();
  const body = await request.json();
  const adSoyad = (body.ad_soyad ?? "").trim();
  const cihazModeli = (body.cihaz_modeli ?? "").trim();
  const telefon = (body.telefon ?? "").trim() || null;
  const email = (body.email ?? "").trim() || null;
  const imei = (body.imei_no ?? "").trim() || null;
  const cihazSifresi = (body.cihaz_sifresi ?? "").trim() || null;

  if (!adSoyad || !cihazModeli) {
    return jsonFail("Ad soyad ve cihaz modeli zorunludur.", 400);
  }

  let customerId: number | null = null;
  if (telefon) {
    const { data: existing } = await db
      .from("customers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("telefon", telefon)
      .maybeSingle();
    customerId = existing?.id ?? null;
  }

  if (!customerId) {
    const { data: created, error } = await db
      .from("customers")
      .insert({
        tenant_id: tenantId,
        ad_soyad: adSoyad,
        telefon,
        email,
      })
      .select("id")
      .single();
    if (error || !created) return jsonFail("Müşteri oluşturulamadı.", 500);
    customerId = created.id;
  }

  const prefix = `TS-${new Date().getFullYear()}-`;
  const { data: last } = await db
    .from("repairs")
    .select("takip_kodu")
    .eq("tenant_id", tenantId)
    .like("takip_kodu", `${prefix}%`)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  let seq = 1;
  const m = last?.takip_kodu?.match(/-(\d+)$/);
  if (m) seq = parseInt(m[1], 10) + 1;
  const takipKodu = `${prefix}${String(seq).padStart(3, "0")}`;

  const { error: insertErr } = await db.from("repairs").insert({
    tenant_id: tenantId,
    customer_id: customerId,
    takip_kodu: takipKodu,
    cihaz_modeli: cihazModeli,
    imei_no: imei,
    cihaz_sifresi: cihazSifresi,
  });

  if (insertErr) return jsonFail("Cihaz eklenemedi.", 500);

  return jsonOk({ data: { takip_kodu: takipKodu }, message: "Cihaz eklendi." });
}

export async function handleUpdateDevice(request: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission("dashboard");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const tenantId = auth.user.tenant_id;
  const db = getSupabaseAdmin();
  const body = await request.json();
  const id = Number(body.id);

  if (!id) return jsonFail("Geçersiz cihaz.", 400);

  const { data: existing } = await db
    .from("repairs")
    .select("*, customers(*)")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!existing) return jsonFail("Cihaz bulunamadı.", 404);

  const oldParts = parseParts(existing.degisen_parcalar);
  const newPartNames: string[] = Array.isArray(body.degisen_parcalar)
    ? body.degisen_parcalar.map(String)
    : oldParts;
  const inventoryIds: number[] = Array.isArray(body.inventory_ids)
    ? body.inventory_ids.map(Number).filter(Boolean)
    : [];

  if (inventoryIds.length) {
    const { data: items } = await db
      .from("inventory")
      .select("id, part_name, stock_quantity, sell_price")
      .eq("tenant_id", tenantId)
      .in("id", inventoryIds);

    for (const item of items ?? []) {
      if (!oldParts.includes(item.part_name) && item.stock_quantity > 0) {
        await db
          .from("inventory")
          .update({ stock_quantity: item.stock_quantity - 1 })
          .eq("id", item.id);
      }
    }
  }

  const toplam =
    body.toplam_ucret !== undefined
      ? Number(body.toplam_ucret)
      : Number(body.parca_ucreti ?? existing.parca_ucreti) +
        Number(body.iscilik_ucreti ?? existing.iscilik_ucreti) -
        Number(body.indirim ?? 0);

  const newStatus = body.cihaz_durumu ?? existing.cihaz_durumu;

  const { error } = await db
    .from("repairs")
    .update({
      cihaz_durumu: newStatus,
      degisen_parcalar: newPartNames,
      parca_ucreti: Number(body.parca_ucreti ?? existing.parca_ucreti),
      iscilik_ucreti: Number(body.iscilik_ucreti ?? existing.iscilik_ucreti),
      toplam_ucret: Math.max(0, toplam),
      aciklama: body.aciklama ?? existing.aciklama,
      imei_no: body.imei_no ?? existing.imei_no,
      cihaz_sifresi: body.cihaz_sifresi ?? existing.cihaz_sifresi,
      guncelleme_tarihi: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return jsonFail("Güncellenemedi.", 500);

  if (
    newStatus === "teslim_edildi" &&
    existing.cihaz_durumu !== "teslim_edildi" &&
    toplam > 0
  ) {
    await db.from("transactions").insert({
      tenant_id: tenantId,
      type: "income",
      amount: toplam,
      description: `Tamir teslim: ${existing.takip_kodu}`,
    });
  }

  if (Array.isArray(body.warranties) && body.warranties.length) {
    const start = new Date();
    for (const w of body.warranties) {
      const months = Number(w.garanti_ay ?? 3);
      const end = new Date(start);
      end.setMonth(end.getMonth() + months);
      await db.from("warranties").insert({
        tenant_id: tenantId,
        customer_id: existing.customer_id,
        repair_id: id,
        parca_adi: w.parca_adi,
        garanti_ay: months,
        baslangic_tarihi: start.toISOString().slice(0, 10),
        bitis_tarihi: end.toISOString().slice(0, 10),
        takip_kodu: existing.takip_kodu,
        cihaz_modeli: existing.cihaz_modeli,
      });
    }
  }

  return jsonOk({ message: "Cihaz güncellendi." });
}

export async function handleDeleteDevice(request: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission("dashboard");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const tenantId = auth.user.tenant_id;
  const db = getSupabaseAdmin();
  const body = await request.json();
  const id = Number(body.id);
  const action = body.action as string;

  if (!id) return jsonFail("Geçersiz cihaz.", 400);

  if (action === "archive") {
    const { error } = await db
      .from("repairs")
      .update({ arsivlendi: true, arsiv_tarihi: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", tenantId);
    if (error) return jsonFail("Arşivlenemedi.", 500);
    return jsonOk({ message: "Cihaz arşivlendi." });
  }

  if (action === "restore") {
    const { error } = await db
      .from("repairs")
      .update({ arsivlendi: false, arsiv_tarihi: null })
      .eq("id", id)
      .eq("tenant_id", tenantId);
    if (error) return jsonFail("Geri yüklenemedi.", 500);
    return jsonOk({ message: "Cihaz geri yüklendi." });
  }

  if (action === "permanent_delete") {
    const { error } = await db
      .from("repairs")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);
    if (error) return jsonFail("Silinemedi.", 500);
    return jsonOk({ message: "Cihaz kalıcı olarak silindi." });
  }

  return jsonFail("Geçersiz işlem.", 400);
}

export async function handleRepairStatus(
  request: NextRequest
): Promise<NextResponse> {
  const takipKodu = (request.nextUrl.searchParams.get("takip_kodu") ?? "").trim();
  if (!takipKodu) return jsonFail("Takip kodu gereklidir.", 400);

  const db = getSupabaseAdmin();
  const shop = (request.nextUrl.searchParams.get("shop") ?? "").trim();

  let query = db
    .from("repairs")
    .select("*, customers!inner(ad_soyad)")
    .eq("takip_kodu", takipKodu);

  if (shop) {
    const { resolveTenantIdByShopSlug } = await import("../shop-settings");
    const tenantId = await resolveTenantIdByShopSlug(shop);
    if (tenantId) query = query.eq("tenant_id", tenantId);
  }

  const { data: row, error } = await query.maybeSingle();
  if (error || !row) return jsonFail("Kayıt bulunamadı.", 404);

  const customer = row.customers as { ad_soyad: string };
  const settingsTenant = row.tenant_id as number;
  const { getShopSettingsForTenant } = await import("../shop-settings");
  const shopSettings = await getShopSettingsForTenant(settingsTenant);

  let data: Record<string, unknown> = {
    takip_kodu: row.takip_kodu,
    musteri_adi: customer.ad_soyad,
    cihaz_modeli: row.cihaz_modeli,
    cihaz_durumu: row.cihaz_durumu,
    degisen_parcalar: parseParts(row.degisen_parcalar),
    parca_ucreti: Number(row.parca_ucreti ?? 0),
    iscilik_ucreti: Number(row.iscilik_ucreti ?? 0),
    toplam_ucret: Number(row.toplam_ucret ?? 0),
    aciklama: row.aciklama ?? null,
    olusturma_tarihi: row.olusturma_tarihi,
    guncelleme_tarihi: row.guncelleme_tarihi,
  };

  if (!shopSettings.ucret_detayi_goster) {
    data = {
      ...data,
      parca_ucreti: 0,
      iscilik_ucreti: 0,
      toplam_ucret: 0,
    };
  }

  return jsonOk({ data });
}
