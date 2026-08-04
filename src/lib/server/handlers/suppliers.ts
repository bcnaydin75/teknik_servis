import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "../auth";
import { jsonFail, jsonOk } from "../api-response";
import {
  applyTenantFilter,
  resolveTenantScope,
  requireWriteTenantId,
} from "../tenant-context";
import { getSupabaseAdmin } from "../supabase";
import { Tables } from "../db-tables";

export async function handleSuppliers(request: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission("suppliers");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const scope = resolveTenantScope(auth.user);
  if (!scope.ok) return jsonFail(scope.message, scope.status);
  const db = getSupabaseAdmin();

  if (request.method === "GET") {
    const { data: suppliers } = await applyTenantFilter(
      db.from(Tables.tedarikciler).select("*").order("firma_adi", { ascending: true }),
      scope
    );

    const { data: txRows } = await applyTenantFilter(
      db
        .from(Tables.tedarikciIslemleri)
        .select(`*, ${Tables.tedarikciler}(firma_adi)`)
        .order("created_at", { ascending: false })
        .limit(100),
      scope
    );

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
      firma_adi: (t[Tables.tedarikciler] as { firma_adi: string }).firma_adi,
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

    const write = requireWriteTenantId(scope, { bodyTenantId: Number(body.tenant_id) || undefined });
    if (!write.ok) return jsonFail(write.message, write.status);
    const tenantId = write.tenantId;

    if (action === "add_supplier") {
      const firma = (body.firma_adi ?? "").trim();
      if (!firma) return jsonFail("Firma adı zorunludur.", 400);

      const { error } = await db.from(Tables.tedarikciler).insert({
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
      const description = (body.description ?? "").trim() || null;

      if (!supplierId || !amount || amount <= 0 || !["borc", "odeme"].includes(type)) {
        return jsonFail("Geçersiz işlem.", 400);
      }

      let supplierQuery = db
        .from(Tables.tedarikciler)
        .select("id, firma_adi, tenant_id")
        .eq("id", supplierId);
      if (scope.mode === "shop") {
        supplierQuery = supplierQuery.eq("tenant_id", scope.tenantId);
      }
      const { data: supplier } = await supplierQuery.maybeSingle();
      if (!supplier) return jsonFail("Tedarikçi bulunamadı.", 404);

      const { error: txErr } = await db.from(Tables.tedarikciIslemleri).insert({
        tenant_id: tenantId,
        supplier_id: supplierId,
        type,
        amount,
        description,
      });
      if (txErr) return jsonFail("İşlem kaydedilemedi.", 500);

      // Ödeme → kasadan gider (borç oluşunca değil; nakit çıkışı ödemede)
      if (type === "odeme") {
        const firma = supplier.firma_adi || `#${supplierId}`;
        const { error: finErr } = await db.from(Tables.finansIslemleri).insert({
          tenant_id: tenantId,
          type: "expense",
          amount,
          description: description
            ? `Tedarikçi ödeme — ${firma}: ${description}`
            : `Tedarikçi ödeme — ${firma}`,
        });
        if (finErr) {
          console.error("[suppliers] finance expense", finErr.message);
          return jsonFail(
            "Tedarikçi ödemesi kaydedildi ancak kasa gideri yazılamadı.",
            500
          );
        }
      }

      return jsonOk({
        message:
          type === "odeme"
            ? "Ödeme kaydedildi ve kasaya gider işlendi."
            : "Borç kaydedildi.",
      });
    }

    return jsonFail("Geçersiz işlem.", 400);
  }

  return jsonFail("Geçersiz istek.", 405);
}
