import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "../auth";
import { jsonFail, jsonOk } from "../api-response";
import { getSupabaseAdmin } from "../supabase";

export async function handlePos(request: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission("pos");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const tenantId = auth.user.tenant_id;
  const db = getSupabaseAdmin();

  if (request.method === "GET") {
    const { data: rows } = await db
      .from("inventory")
      .select("id, part_name, sell_price, stock_quantity")
      .eq("tenant_id", tenantId)
      .gt("stock_quantity", 0)
      .order("part_name");

    return jsonOk({ data: rows ?? [] });
  }

  if (request.method === "POST") {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const paymentType = body.payment_type ?? "nakit";
    const customerId = body.customer_id ? Number(body.customer_id) : null;

    if (!items.length) return jsonFail("Sepet boş.", 400);

    let total = 0;
    const saleItems: {
      inventory_id: number;
      part_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }[] = [];

    for (const item of items) {
      const invId = Number(item.inventory_id);
      const qty = Number(item.quantity ?? 1);
      const { data: inv } = await db
        .from("inventory")
        .select("*")
        .eq("id", invId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (!inv || inv.stock_quantity < qty) {
        return jsonFail(`Stok yetersiz: ${inv?.part_name ?? invId}`, 400);
      }

      const lineTotal = Number(inv.sell_price) * qty;
      total += lineTotal;
      saleItems.push({
        inventory_id: invId,
        part_name: inv.part_name,
        quantity: qty,
        unit_price: Number(inv.sell_price),
        total_price: lineTotal,
      });
    }

    const { data: sale, error: saleErr } = await db
      .from("pos_sales")
      .insert({
        tenant_id: tenantId,
        customer_id: customerId,
        payment_type: paymentType,
        total_amount: total,
        description: (body.description ?? "").trim() || null,
        created_by: auth.user.id,
      })
      .select("id")
      .single();

    if (saleErr || !sale) return jsonFail("Satış kaydedilemedi.", 500);

    for (const line of saleItems) {
      await db.from("pos_sale_items").insert({
        sale_id: sale.id,
        ...line,
      });

      const { data: inv } = await db
        .from("inventory")
        .select("stock_quantity")
        .eq("id", line.inventory_id)
        .single();

      if (inv) {
        await db
          .from("inventory")
          .update({ stock_quantity: inv.stock_quantity - line.quantity })
          .eq("id", line.inventory_id);
      }
    }

    await db.from("transactions").insert({
      tenant_id: tenantId,
      type: "income",
      amount: total,
      description: `POS satış #${sale.id}`,
    });

    if (paymentType === "veresiye" && customerId) {
      const { data: cust } = await db
        .from("customers")
        .select("cari_bakiye")
        .eq("id", customerId)
        .single();

      if (cust) {
        await db
          .from("customers")
          .update({ cari_bakiye: Number(cust.cari_bakiye) + total })
          .eq("id", customerId);

        await db.from("customer_transactions").insert({
          tenant_id: tenantId,
          customer_id: customerId,
          type: "borc",
          amount: total,
          description: `POS veresiye #${sale.id}`,
          pos_sale_id: sale.id,
        });
      }
    }

    return jsonOk({
      message: "Satış tamamlandı.",
      data: { sale_id: sale.id, total },
    });
  }

  return jsonFail("Geçersiz istek.", 405);
}

export async function handleCari(request: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission("cari");
  if (!auth.ok) return jsonFail(auth.message, auth.status);

  const tenantId = auth.user.tenant_id;
  const db = getSupabaseAdmin();
  const action = request.nextUrl.searchParams.get("action") ?? "";

  if (action === "list" && request.method === "GET") {
    const { data: rows } = await db
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .neq("cari_bakiye", 0)
      .order("ad_soyad");

    return jsonOk({ data: rows ?? [] });
  }

  if (action === "search" && request.method === "GET") {
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
    if (!q) return jsonOk({ data: [] });

    const { data: rows } = await db
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .or(`ad_soyad.ilike.%${q}%,telefon.ilike.%${q}%`)
      .limit(20);

    return jsonOk({ data: rows ?? [] });
  }

  if (action === "detail" && request.method === "GET") {
    const customerId = Number(request.nextUrl.searchParams.get("customer_id"));
    if (!customerId) return jsonFail("Müşteri gerekli.", 400);

    const { data: customer } = await db
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!customer) return jsonFail("Müşteri bulunamadı.", 404);

    const { data: txs } = await db
      .from("customer_transactions")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    return jsonOk({
      data: {
        customer,
        transactions: txs ?? [],
      },
    });
  }

  if ((action === "borc" || action === "odeme") && request.method === "POST") {
    const body = await request.json();
    const customerId = Number(body.customer_id);
    const amount = Number(body.amount);

    if (!customerId || !amount || amount <= 0) {
      return jsonFail("Geçersiz tutar.", 400);
    }

    const { data: customer } = await db
      .from("customers")
      .select("cari_bakiye")
      .eq("id", customerId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!customer) return jsonFail("Müşteri bulunamadı.", 404);

    const delta = action === "borc" ? amount : -amount;
    const newBalance = Number(customer.cari_bakiye) + delta;

    await db
      .from("customers")
      .update({ cari_bakiye: newBalance })
      .eq("id", customerId);

    await db.from("customer_transactions").insert({
      tenant_id: tenantId,
      customer_id: customerId,
      type: action,
      amount,
      description: (body.description ?? "").trim() || null,
    });

    if (action === "odeme") {
      await db.from("transactions").insert({
        tenant_id: tenantId,
        type: "income",
        amount,
        description: `Cari tahsilat — müşteri #${customerId}`,
      });
    }

    return jsonOk({ message: "İşlem kaydedildi." });
  }

  return jsonFail("Geçersiz istek.", 405);
}
