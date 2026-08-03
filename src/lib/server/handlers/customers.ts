import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "../auth";
import { jsonFail, jsonOk } from "../api-response";
import { getSupabaseAdmin } from "../supabase";

export async function handleCheckCustomer(
  request: NextRequest
): Promise<NextResponse> {
  const auth = await requirePermission("dashboard");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const tenantId = auth.user.tenant_id;
  const db = getSupabaseAdmin();
  const telefon = (request.nextUrl.searchParams.get("telefon") ?? "").trim();
  const adSoyad = (request.nextUrl.searchParams.get("ad_soyad") ?? "").trim();

  let query = db.from("customers").select("*").eq("tenant_id", tenantId);

  if (telefon) {
    query = query.eq("telefon", telefon);
  } else if (adSoyad) {
    query = query.ilike("ad_soyad", adSoyad);
  } else {
    return jsonOk({ data: null });
  }

  const { data: customer } = await query.maybeSingle();
  if (!customer) return jsonOk({ data: null });

  const today = new Date().toISOString().slice(0, 10);
  const { data: warranties } = await db
    .from("warranties")
    .select("*")
    .eq("customer_id", customer.id)
    .gte("bitis_tarihi", today);

  return jsonOk({
    data: {
      id: customer.id,
      ad_soyad: customer.ad_soyad,
      telefon: customer.telefon,
      email: customer.email,
      riskli_musteri: Boolean(customer.riskli_musteri),
      risk_notu: customer.risk_notu,
      aktif_garantiler: (warranties ?? []).map((w) => ({
        id: w.id,
        parca_adi: w.parca_adi,
        garanti_ay: w.garanti_ay,
        baslangic_tarihi: w.baslangic_tarihi,
        bitis_tarihi: w.bitis_tarihi,
        takip_kodu: w.takip_kodu,
        cihaz_modeli: w.cihaz_modeli,
      })),
    },
  });
}

export async function handleUpdateCustomer(
  request: NextRequest
): Promise<NextResponse> {
  const auth = await requirePermission("dashboard");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const body = await request.json();
  const id = Number(body.id);
  if (!id) return jsonFail("Geçersiz müşteri.", 400);

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("customers")
    .update({
      riskli_musteri: Boolean(body.riskli_musteri),
      risk_notu: (body.risk_notu ?? "").trim() || null,
    })
    .eq("id", id)
    .eq("tenant_id", auth.user.tenant_id);

  if (error) return jsonFail("Güncellenemedi.", 500);
  return jsonOk({ message: "Müşteri güncellendi." });
}
