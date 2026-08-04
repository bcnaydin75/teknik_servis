import { NextRequest, NextResponse } from "next/server";
import { jsonFail, jsonOk } from "../api-response";
import {
  getDefaultTenantId,
  getShopSettingsForTenant,
  resolveTenantIdByShopSlug,
} from "../shop-settings";
import { getSupabaseAdmin } from "../supabase";
import { Tables } from "../db-tables";

export async function handlePublicSettings(
  request: NextRequest
): Promise<NextResponse> {
  const action = request.nextUrl.searchParams.get("action") ?? "profile";
  const shop = (request.nextUrl.searchParams.get("shop") ?? "").trim();

  if (action === "profile" && request.method === "GET") {
    let tenantId = shop ? await resolveTenantIdByShopSlug(shop) : null;
    if (!tenantId) {
      tenantId = await getDefaultTenantId();
    }
    if (!tenantId) {
      return jsonOk({
        data: {
          firma_adi: "Teknik Servis",
          adres: null,
          telefon: null,
          email: null,
          logo_url: null,
          default_locale: "tr",
          ucret_detayi_goster: true,
        },
      });
    }

    const data = await getShopSettingsForTenant(tenantId, {
      includeLogoQuery: true,
      shopSlug: shop || undefined,
    });

    return jsonOk({ data });
  }

  if (action === "logo" && request.method === "GET") {
    let tenantId = shop ? await resolveTenantIdByShopSlug(shop) : null;
    const tenantParam = Number(request.nextUrl.searchParams.get("tenant_id") ?? 0);
    if (!tenantId && tenantParam > 0) tenantId = tenantParam;
    if (!tenantId) tenantId = await getDefaultTenantId();

    const db = getSupabaseAdmin();
    const { data: row } = tenantId
      ? await db
          .from(Tables.dukkanAyarlari)
          .select("logo_path")
          .eq("tenant_id", tenantId)
          .maybeSingle()
      : { data: null };

    if (!row?.logo_path) {
      return new NextResponse(null, { status: 404 });
    }

    if (row.logo_path.startsWith("http")) {
      const upstream = await fetch(row.logo_path);
      if (!upstream.ok) return new NextResponse(null, { status: 404 });
      const buf = await upstream.arrayBuffer();
      return new NextResponse(buf, {
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "image/png",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "logos";
    const { data: file, error } = await db.storage
      .from(bucket)
      .download(row.logo_path);

    if (error || !file) {
      return new NextResponse(null, { status: 404 });
    }

    const ext = row.logo_path.split(".").pop()?.toLowerCase();
    const mime =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "webp"
          ? "image/webp"
          : ext === "gif"
            ? "image/gif"
            : "image/png";

    return new NextResponse(await file.arrayBuffer(), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  return jsonFail("Bulunamadı.", 404);
}
