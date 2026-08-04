import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "../auth";
import { jsonFail, jsonOk } from "../api-response";
import { applyTenantFilter, resolveTenantScope, requireWriteTenantId, withScopedId } from "../tenant-context";
import { Tables } from "../db-tables";
import { generateNextTrackingCode } from "../tracking-code";
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

/** PostgREST filter değerlerini güvenli tırnakla (boşluk / özel karakter) */
function postgrestQuoted(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export async function handleGetDevices(request: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission("dashboard");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const scope = resolveTenantScope(auth.user);
  if (!scope.ok) return jsonFail(scope.message, scope.status);
  const db = getSupabaseAdmin();
  const sp = request.nextUrl.searchParams;
  const archived = sp.get("archived") === "1";
  const q = (sp.get("q") ?? "").trim();
  const year = parseInt(sp.get("year") ?? "0", 10);
  const month = parseInt(sp.get("month") ?? "0", 10);

  let query = applyTenantFilter(
    db
      .from(Tables.tamirKayitlari)
      .select(`*, ${Tables.musteriler}!inner(*)`)
      .eq("arsivlendi", archived)
      .order("guncelleme_tarihi", { ascending: false }),
    scope
  );

  if (q) {
    const pattern = `%${q}%`;
    const quoted = postgrestQuoted(pattern);

    const customerQuery = applyTenantFilter(
      db.from(Tables.musteriler).select("id").ilike("ad_soyad", pattern),
      scope
    );
    const { data: matchedCustomers } = await customerQuery;
    const customerIds = (matchedCustomers ?? [])
      .map((c) => Number(c.id))
      .filter((id) => id > 0);

    const orParts = [
      `takip_kodu.ilike.${quoted}`,
      `cihaz_modeli.ilike.${quoted}`,
    ];
    if (customerIds.length > 0) {
      orParts.push(`customer_id.in.(${customerIds.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error("[get_devices]", error.message, error.details, error.hint);
    return jsonFail("Veritabanı hatası.", 500);
  }

  let filtered = rows ?? [];
  if (archived && year > 0 && month > 0) {
    filtered = filtered.filter((row) => {
      if (!row.arsiv_tarihi) return false;
      const d = new Date(row.arsiv_tarihi);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }

  let devices = filtered.map((row) => {
    const customer = (row[Tables.musteriler] ?? {}) as Record<string, unknown>;
    const repair = { ...(row as Record<string, unknown>) };
    delete repair[Tables.musteriler];
    return mapDevice(repair, customer);
  });

  if (!auth.user.permissions.see_costs) {
    devices = stripCosts(devices);
  }

  const { data: activeRows } = await applyTenantFilter(
    db.from(Tables.tamirKayitlari).select("cihaz_durumu, arsivlendi").eq("arsivlendi", false),
    scope
  );

  const stats = {
    toplam_cihaz: activeRows?.length ?? 0,
    aktif_tamir:
      activeRows?.filter((r) => r.cihaz_durumu !== "teslim_edildi").length ?? 0,
    teslime_hazir:
      activeRows?.filter((r) => r.cihaz_durumu === "hazir").length ?? 0,
  };

  const payload: Record<string, unknown> = { stats, devices };

  if (archived && !year && !month) {
    const { data: archivedRows } = await applyTenantFilter(
      db.from(Tables.tamirKayitlari).select("arsiv_tarihi").eq("arsivlendi", true),
      scope
    );

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

  const scope = resolveTenantScope(auth.user);
  if (!scope.ok) return jsonFail(scope.message, scope.status);
  const db = getSupabaseAdmin();

  const { data: repairs } = await applyTenantFilter(
    db
      .from(Tables.tamirKayitlari)
      .select("cihaz_durumu, arsivlendi, olusturma_tarihi")
      .eq("arsivlendi", false),
    scope
  );

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

  const { data: posToday } = await applyTenantFilter(
    db
      .from(Tables.posSatislar)
      .select("total_amount")
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString()),
    scope
  );

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

  const scope = resolveTenantScope(auth.user);
  if (!scope.ok) return jsonFail(scope.message, scope.status);
  const db = getSupabaseAdmin();
  const body = await request.json();

  const write = requireWriteTenantId(scope, { bodyTenantId: Number(body.tenant_id) || undefined });
  let tenantId: number;
  if (write.ok) {
    tenantId = write.tenantId;
  } else if (scope.mode === "all") {
    const { data: owners } = await db
      .from(Tables.yoneticiKullanicilar)
      .select("id, tenant_id")
      .eq("role", "admin")
      .eq("is_superadmin", false);
    const shopOwners = (owners ?? []).filter((o) => o.id === o.tenant_id);
    if (shopOwners.length === 1) {
      tenantId = shopOwners[0].id;
    } else {
      return jsonFail(
        shopOwners.length === 0
          ? "Önce dükkan yöneticisi oluşturun."
          : "Birden fazla dükkan var; hangi dükkana ekleneceğini belirtin (tenant_id).",
        400
      );
    }
  } else {
    return jsonFail(write.message, write.status);
  }

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
      .from(Tables.musteriler)
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("telefon", telefon)
      .maybeSingle();
    customerId = existing?.id ?? null;
  }

  if (!customerId) {
    const { data: created, error } = await db
      .from(Tables.musteriler)
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

  const takipKodu = await generateNextTrackingCode(tenantId);

  const { error: insertErr } = await db.from(Tables.tamirKayitlari).insert({
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

  const scope = resolveTenantScope(auth.user);
  if (!scope.ok) return jsonFail(scope.message, scope.status);
  const db = getSupabaseAdmin();
  const body = await request.json();
  const id = Number(body.id);

  if (!id) return jsonFail("Geçersiz cihaz.", 400);

  let fetchQuery = db.from(Tables.tamirKayitlari).select(`*, ${Tables.musteriler}(*)`).eq("id", id);
  if (scope.mode === "shop") {
    fetchQuery = fetchQuery.eq("tenant_id", scope.tenantId);
  }
  const { data: existing } = await fetchQuery.maybeSingle();

  if (!existing) return jsonFail("Cihaz bulunamadı.", 404);

  const tenantId = Number(existing.tenant_id);

  const oldParts = parseParts(existing.degisen_parcalar);
  const newPartNames: string[] = Array.isArray(body.degisen_parcalar)
    ? body.degisen_parcalar.map(String)
    : oldParts;
  const inventoryIds: number[] = Array.isArray(body.inventory_ids)
    ? body.inventory_ids.map(Number).filter(Boolean)
    : [];

  if (inventoryIds.length) {
    const { data: items } = await db
      .from(Tables.stok)
      .select("id, part_name, stock_quantity, sell_price")
      .eq("tenant_id", tenantId)
      .in("id", inventoryIds);

    for (const item of items ?? []) {
      if (!oldParts.includes(item.part_name) && item.stock_quantity > 0) {
        await db
          .from(Tables.stok)
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

  const { error } = await withScopedId(db.from(Tables.tamirKayitlari).update({
      cihaz_durumu: newStatus,
      degisen_parcalar: newPartNames,
      parca_ucreti: Number(body.parca_ucreti ?? existing.parca_ucreti),
      iscilik_ucreti: Number(body.iscilik_ucreti ?? existing.iscilik_ucreti),
      toplam_ucret: Math.max(0, toplam),
      aciklama: body.aciklama ?? existing.aciklama,
      imei_no: body.imei_no ?? existing.imei_no,
      cihaz_sifresi: body.cihaz_sifresi ?? existing.cihaz_sifresi,
      guncelleme_tarihi: new Date().toISOString(),
    }), scope, id);

  if (error) return jsonFail("Güncellenemedi.", 500);

  const payableTotal = Math.max(0, toplam);
  if (
    newStatus === "teslim_edildi" &&
    existing.cihaz_durumu !== "teslim_edildi" &&
    payableTotal > 0
  ) {
    const odemeSekli = String(body.odeme_sekli ?? body.payment_type ?? "nakit")
      .trim()
      .toLowerCase();

    if (odemeSekli === "nakit" || odemeSekli === "kart") {
      await db.from(Tables.finansIslemleri).insert({
        tenant_id: tenantId,
        type: "income",
        amount: payableTotal,
        description: `Tamir teslim (${odemeSekli}): ${existing.takip_kodu}`,
      });
    } else if (odemeSekli === "veresiye") {
      const customerId = Number(existing.customer_id);
      if (!customerId) {
        return jsonFail("Veresiye için müşteri kaydı gerekli.", 400);
      }
      const { data: cust } = await db
        .from(Tables.musteriler)
        .select("cari_bakiye")
        .eq("id", customerId)
        .maybeSingle();
      if (!cust) return jsonFail("Müşteri bulunamadı.", 404);

      await db
        .from(Tables.musteriler)
        .update({ cari_bakiye: Number(cust.cari_bakiye) + payableTotal })
        .eq("id", customerId);

      await db.from(Tables.cariIslemleri).insert({
        tenant_id: tenantId,
        customer_id: customerId,
        type: "borc",
        amount: payableTotal,
        description: `Tamir veresiye: ${existing.takip_kodu}`,
      });
    }
    // beklemede / odenmedi / diğer → kasa ve cariye yazılmaz
  }

  if (Array.isArray(body.warranties) && body.warranties.length) {
    const start = new Date();
    for (const w of body.warranties) {
      const months = Number(w.garanti_ay ?? 3);
      const end = new Date(start);
      end.setMonth(end.getMonth() + months);
      await db.from(Tables.garantiler).insert({
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

  // Durum değiştiyse müşteri e-postasına bildirim (başarısız olursa güncellemeyi bozma)
  if (newStatus !== existing.cihaz_durumu) {
    try {
      const customerJoin = existing[Tables.musteriler] as
        | { ad_soyad?: string; email?: string | null }
        | null
        | undefined;
      let email = (customerJoin?.email ?? "").trim();
      let musteriAdi = customerJoin?.ad_soyad ?? "Müşteri";
      if (!email && existing.customer_id) {
        const { data: cust } = await db
          .from(Tables.musteriler)
          .select("ad_soyad, email")
          .eq("id", existing.customer_id)
          .maybeSingle();
        email = (cust?.email ?? "").trim();
        if (cust?.ad_soyad) musteriAdi = cust.ad_soyad;
      }
      if (email && email.includes("@")) {
        const { getShopSettingsForTenant } = await import("../shop-settings");
        const { sendRepairStatusEmail } = await import("../mail");
        const { getTrackingUrl } = await import("@/lib/whatsapp");
        const shop = await getShopSettingsForTenant(tenantId);
        void sendRepairStatusEmail({
          to: email,
          musteriAdi,
          takipKodu: String(existing.takip_kodu),
          cihazModeli: String(existing.cihaz_modeli),
          durum: String(newStatus),
          firmaAdi: shop.firma_adi,
          firmaTelefon: shop.telefon,
          trackingUrl: getTrackingUrl(String(existing.takip_kodu)),
        }).catch((err) => console.error("[status-mail]", err));
      }
    } catch (err) {
      console.error("[status-mail]", err);
    }
  }

  return jsonOk({ message: "Cihaz güncellendi." });
}

export async function handleDeleteDevice(request: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission("dashboard");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const scope = resolveTenantScope(auth.user);
  if (!scope.ok) return jsonFail(scope.message, scope.status);
  const db = getSupabaseAdmin();
  const body = await request.json();
  const id = Number(body.id);
  const action = body.action as string;

  if (!id) return jsonFail("Geçersiz cihaz.", 400);

  if (action === "archive") {
    const { error } = await withScopedId(
      db.from(Tables.tamirKayitlari).update({ arsivlendi: true, arsiv_tarihi: new Date().toISOString() }),
      scope,
      id
    );
    if (error) return jsonFail("Arşivlenemedi.", 500);
    return jsonOk({ message: "Cihaz arşivlendi." });
  }

  if (action === "restore") {
    const { error } = await withScopedId(
      db.from(Tables.tamirKayitlari).update({ arsivlendi: false, arsiv_tarihi: null }),
      scope,
      id
    );
    if (error) return jsonFail("Geri yüklenemedi.", 500);
    return jsonOk({ message: "Cihaz geri yüklendi." });
  }

  if (action === "permanent_delete") {
    const { error } = await withScopedId(db.from(Tables.tamirKayitlari).delete(), scope, id);
    if (error) return jsonFail("Silinemedi.", 500);
    return jsonOk({ message: "Cihaz kalıcı olarak silindi." });
  }

  return jsonFail("Geçersiz işlem.", 400);
}

export async function handleRepairStatus(
  request: NextRequest
): Promise<NextResponse> {
  const raw = (request.nextUrl.searchParams.get("takip_kodu") ?? "").trim();
  const takipKodu = raw.replace(/\s+/g, "").toUpperCase();
  if (!takipKodu) return jsonFail("Takip kodu gereklidir.", 400);

  const db = getSupabaseAdmin();

  // Join yok (PostgREST ilişki cache). Shop filtresi yok (geliştirici slug kayıtları ezerdi).
  // Önce birebir, yoksa büyük/küçük harf duyarsız.
  let row: Record<string, unknown> | null = null;

  const exact = await db
    .from(Tables.tamirKayitlari)
    .select("*")
    .eq("takip_kodu", takipKodu)
    .limit(1);
  if (exact.error) {
    console.error("[repair-status]", exact.error.message, exact.error.code);
    return jsonFail("Kayıt bulunamadı.", 404);
  }
  row = (exact.data?.[0] as Record<string, unknown> | undefined) ?? null;

  if (!row) {
    const loose = await db
      .from(Tables.tamirKayitlari)
      .select("*")
      .ilike("takip_kodu", takipKodu)
      .limit(1);
    if (loose.error) {
      console.error("[repair-status]", loose.error.message, loose.error.code);
      return jsonFail("Kayıt bulunamadı.", 404);
    }
    row = (loose.data?.[0] as Record<string, unknown> | undefined) ?? null;
  }

  if (!row) return jsonFail("Kayıt bulunamadı.", 404);

  let musteriAdi = "—";
  const customerId = Number(row.customer_id);
  if (customerId > 0) {
    const { data: customer } = await db
      .from(Tables.musteriler)
      .select("ad_soyad")
      .eq("id", customerId)
      .maybeSingle();
    if (customer?.ad_soyad) musteriAdi = customer.ad_soyad;
  }

  const repairId = Number(row.id);
  const { data: warrantyRows } = await db
    .from(Tables.garantiler)
    .select("id, parca_adi, garanti_ay, baslangic_tarihi, bitis_tarihi")
    .eq("repair_id", repairId)
    .order("bitis_tarihi", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);
  const garantiler = (warrantyRows ?? []).map((w) => ({
    id: w.id,
    parca_adi: w.parca_adi,
    garanti_ay: Number(w.garanti_ay ?? 0),
    baslangic_tarihi: w.baslangic_tarihi,
    bitis_tarihi: w.bitis_tarihi,
    aktif: String(w.bitis_tarihi) >= today,
  }));

  const settingsTenant = Number(row.tenant_id) || 0;
  const { getShopSettingsForTenant } = await import("../shop-settings");
  const shopSettings =
    settingsTenant > 0
      ? await getShopSettingsForTenant(settingsTenant)
      : {
          firma_adi: "Teknik Servis",
          telefon: null as string | null,
          ucret_detayi_goster: true,
        };

  let data: Record<string, unknown> = {
    takip_kodu: row.takip_kodu,
    musteri_adi: musteriAdi,
    cihaz_modeli: row.cihaz_modeli,
    cihaz_durumu: row.cihaz_durumu,
    degisen_parcalar: parseParts(row.degisen_parcalar),
    parca_ucreti: Number(row.parca_ucreti ?? 0),
    iscilik_ucreti: Number(row.iscilik_ucreti ?? 0),
    toplam_ucret: Number(row.toplam_ucret ?? 0),
    aciklama: row.aciklama ?? null,
    olusturma_tarihi: row.olusturma_tarihi,
    guncelleme_tarihi: row.guncelleme_tarihi,
    ucret_detayi_goster: shopSettings.ucret_detayi_goster !== false,
    firma_adi: shopSettings.firma_adi ?? null,
    firma_telefon: shopSettings.telefon ?? null,
    garantiler,
  };

  if (!shopSettings.ucret_detayi_goster) {
    data = {
      ...data,
      parca_ucreti: 0,
      iscilik_ucreti: 0,
      toplam_ucret: 0,
      ucret_detayi_goster: false,
    };
  }

  return jsonOk({ data });
}
