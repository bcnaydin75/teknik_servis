import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "../auth";
import { jsonFail, jsonOk } from "../api-response";
import { getSupabaseAdmin } from "../supabase";

export async function handleInventory(request: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission("inventory");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const tenantId = auth.user.tenant_id;
  const db = getSupabaseAdmin();

  if (request.method === "GET") {
    const { data: rows } = await db
      .from("inventory")
      .select("*, suppliers(firma_adi)")
      .eq("tenant_id", tenantId)
      .order("part_name", { ascending: true });

    const items = (rows ?? []).map((r) => ({
      id: r.id,
      part_name: r.part_name,
      buy_price: Number(r.buy_price ?? 0),
      sell_price: Number(r.sell_price ?? 0),
      stock_quantity: r.stock_quantity,
      supplier_id: r.supplier_id,
      supplier_name: (r.suppliers as { firma_adi?: string } | null)?.firma_adi ?? null,
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
      const { error } = await db
        .from("inventory")
        .update(payload)
        .eq("id", Number(body.id))
        .eq("tenant_id", tenantId);
      if (error) return jsonFail("Kaydedilemedi.", 500);
      return jsonOk({ message: "Stok güncellendi." });
    }

    const { error } = await db.from("inventory").insert({
      ...payload,
      tenant_id: tenantId,
    });
    if (error) return jsonFail("Kaydedilemedi.", 500);
    return jsonOk({ message: "Stok eklendi." });
  }

  return jsonFail("Geçersiz istek.", 405);
}

export async function handleFinance(): Promise<NextResponse> {
  const auth = await requirePermission("finance");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const tenantId = auth.user.tenant_id;
  const db = getSupabaseAdmin();

  const { data: rows } = await db
    .from("transactions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(200);

  const transactions = (rows ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    description: r.description,
    created_at: r.created_at,
  }));

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  return jsonOk({
    data: {
      summary: {
        total_income: income,
        total_expense: expense,
        net_balance: income - expense,
      },
      transactions,
    },
  });
}
