import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "../auth";
import { jsonFail, jsonOk } from "../api-response";
import { requireShopTenant } from "../tenant-context";
import { getSupabaseAdmin } from "../supabase";

export async function handleSuppliers(request: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission("suppliers");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const shop = requireShopTenant(auth.user);
  if (!shop.ok) return jsonFail(shop.message, shop.status);
  const tenantId = shop.tenantId;
  const db = getSupabaseAdmin();

  if (request.method === "GET") {
    const { data: suppliers } = await db
      .from("suppliers")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("firma_adi", { ascending: true });

    const { data: txRows } = await db
      .from("supplier_transactions")
      .select("*, suppliers(firma_adi)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(100);

    const supplierList = (suppliers ?? []).map((s) => {
      const txs = (txRows ?? []).filter((t) => t.supplier_id === s.id);
      const borc = txs
        .filter((t) => t.type === "borc")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const odeme = txs
        .filter((t) => t.type === "odeme")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return {
        id: s.id,
        firma_adi: s.firma_adi,
        telefon: s.telefon,
        email: s.email,
        adres: s.adres,
        notlar: s.notlar,
        created_at: s.created_at,
        toplam_borc: borc,
        toplam_odeme: odeme,
        kalan_borc: borc - odeme,
      };
    });

    const transactions = (txRows ?? []).map((t) => ({
      id: t.id,
      supplier_id: t.supplier_id,
      firma_adi: (t.suppliers as { firma_adi: string }).firma_adi,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      created_at: t.created_at,
    }));

    return jsonOk({ data: { suppliers: supplierList, transactions } });
  }

  if (request.method === "POST") {
    const body = await request.json();
    const action = body.action as string;

    if (action === "add_supplier") {
      const firma = (body.firma_adi ?? "").trim();
      if (!firma) return jsonFail("Firma adı zorunludur.", 400);

      const { error } = await db.from("suppliers").insert({
        tenant_id: tenantId,
        firma_adi: firma,
        telefon: (body.telefon ?? "").trim() || null,
        email: (body.email ?? "").trim() || null,
        adres: (body.adres ?? "").trim() || null,
        notlar: (body.notlar ?? "").trim() || null,
      });
      if (error) return jsonFail("Kaydedilemedi.", 500);
      return jsonOk({ message: "Tedarikçi eklendi." });
    }

    if (action === "add_transaction") {
      const supplierId = Number(body.supplier_id);
      const amount = Number(body.amount);
      const type = body.type as "borc" | "odeme";

      if (!supplierId || !amount || !["borc", "odeme"].includes(type)) {
        return jsonFail("Geçersiz işlem.", 400);
      }

      await db.from("supplier_transactions").insert({
        tenant_id: tenantId,
        supplier_id: supplierId,
        type,
        amount,
        description: (body.description ?? "").trim() || null,
      });

      return jsonOk({ message: "İşlem kaydedildi." });
    }

    return jsonFail("Geçersiz işlem.", 400);
  }

  return jsonFail("Geçersiz istek.", 405);
}
