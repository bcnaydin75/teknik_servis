import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "../auth";
import { jsonFail, jsonOk } from "../api-response";
import {
  applyTenantFilter,
  resolveTenantScope,
  requireWriteTenantId,
  withScopedId,
} from "../tenant-context";
import { getSupabaseAdmin } from "../supabase";
import { Tables } from "../db-tables";

async function addSupplierDebt(opts: {
  tenantId: number;
  supplierId: number;
  qty: number;
  unitPrice: number;
  partName: string;
}) {
  const amount = Math.round(opts.qty * opts.unitPrice * 100) / 100;
  if (!opts.supplierId || opts.qty <= 0 || amount <= 0) return;

  const db = getSupabaseAdmin();
  await db.from(Tables.tedarikciIslemleri).insert({
    tenant_id: opts.tenantId,
    supplier_id: opts.supplierId,
    type: "borc",
    amount,
    description: `Stok: ${opts.partName} × ${opts.qty} (birim ₺${opts.unitPrice})`,
  });
}

export async function handleInventory(request: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission("inventory");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const scope = resolveTenantScope(auth.user);
  if (!scope.ok) return jsonFail(scope.message, scope.status);
  const db = getSupabaseAdmin();

  if (request.method === "GET") {
    const { data: rows } = await applyTenantFilter(
      db.from(Tables.stok).select(`*, ${Tables.tedarikciler}(firma_adi)`).order("part_name", { ascending: true }),
      scope
    );

    const items = (rows ?? []).map((r) => ({
      id: r.id,
      part_name: r.part_name,
      buy_price: Number(r.buy_price ?? 0),
      sell_price: Number(r.sell_price ?? 0),
      stock_quantity: r.stock_quantity,
      supplier_id: r.supplier_id,
      supplier_name: (r[Tables.tedarikciler] as { firma_adi?: string } | null)?.firma_adi ?? null,
      created_at: r.created_at,
    }));

    return jsonOk({ data: items });
  }

  if (request.method === "POST") {
    const body = await request.json();
    const action = body.action ?? "add";

    const payload = {
      part_name: (body.part_name ?? "").trim(),
      buy_price: Number(body.buy_price ?? 0),
      sell_price: Number(body.sell_price ?? 0),
      stock_quantity: Number(body.stock_quantity ?? 0),
      supplier_id: body.supplier_id ? Number(body.supplier_id) : null,
    };

    if (!payload.part_name) return jsonFail("Parça adı zorunludur.", 400);

    if (action === "update" && body.id) {
      const id = Number(body.id);
      let existingQuery = db.from(Tables.stok).select("*").eq("id", id);
      existingQuery = applyTenantFilter(existingQuery, scope);
      const { data: existing } = await existingQuery.maybeSingle();

      if (existing && payload.stock_quantity < 0) {
        return jsonFail("Stok eksiye düşemez.", 400);
      }

      const { error } = await withScopedId(
        db.from(Tables.stok).update({
          ...payload,
          stock_quantity: Math.max(0, payload.stock_quantity),
        }),
        scope,
        id
      );
      if (error) return jsonFail("Kaydedilemedi.", 500);

      // Stok artışı varsa adet × maliyet → tedarikçi borcu
      if (existing && payload.supplier_id) {
        const oldQty = Number(existing.stock_quantity ?? 0);
        const added = payload.stock_quantity - oldQty;
        if (added > 0 && payload.buy_price > 0) {
          const tenantId =
            Number(existing.tenant_id) ||
            (scope.mode === "shop" ? scope.tenantId : 0);
          if (tenantId > 0) {
            await addSupplierDebt({
              tenantId,
              supplierId: payload.supplier_id,
              qty: added,
              unitPrice: payload.buy_price,
              partName: payload.part_name,
            });
          }
        }
      }

      return jsonOk({ message: "Stok güncellendi." });
    }

    const write = requireWriteTenantId(scope, { bodyTenantId: Number(body.tenant_id) || undefined });
    if (!write.ok) return jsonFail(write.message, write.status);

    const { error } = await db.from(Tables.stok).insert({
      ...payload,
      tenant_id: write.tenantId,
    });
    if (error) return jsonFail("Kaydedilemedi.", 500);

    if (payload.supplier_id && payload.stock_quantity > 0 && payload.buy_price > 0) {
      await addSupplierDebt({
        tenantId: write.tenantId,
        supplierId: payload.supplier_id,
        qty: payload.stock_quantity,
        unitPrice: payload.buy_price,
        partName: payload.part_name,
      });
    }

    return jsonOk({ message: "Stok eklendi." });
  }

  return jsonFail("Geçersiz istek.", 405);
}

export async function handleFinance(): Promise<NextResponse> {
  const auth = await requirePermission("finance");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const scope = resolveTenantScope(auth.user);
  if (!scope.ok) return jsonFail(scope.message, scope.status);
  const db = getSupabaseAdmin();

  // Özet: tüm kayıtlar (limit yok) — type + amount yeterli
  const { data: sumRows } = await applyTenantFilter(
    db.from(Tables.finansIslemleri).select("type, amount"),
    scope
  );

  let income = 0;
  let expense = 0;
  for (const r of sumRows ?? []) {
    const amount = Number(r.amount ?? 0);
    if (r.type === "income") income += amount;
    else if (r.type === "expense") expense += amount;
  }

  // Liste: son hareketler (UI)
  const { data: rows } = await applyTenantFilter(
    db
      .from(Tables.finansIslemleri)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    scope
  );

  const transactions = (rows ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    description: r.description,
    created_at: r.created_at,
  }));

  return jsonOk({
    data: {
      summary: {
        total_income: Math.round(income * 100) / 100,
        total_expense: Math.round(expense * 100) / 100,
        net_balance: Math.round((income - expense) * 100) / 100,
      },
      transactions,
    },
  });
}
