import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserPayload,
  requireSession,
  resolveSessionTenantId,
  verifyPassword,
} from "../auth";
import { jsonFail, jsonOk } from "../api-response";
import {
  attachSessionCookie,
  clearSessionCookie,
  sessionTtl,
  signSession,
} from "../session";
import { getSupabaseAdmin } from "../supabase";
import { Tables } from "../db-tables";
export async function handleAuth(request: NextRequest): Promise<NextResponse> {
  const action = request.nextUrl.searchParams.get("action") ?? "";
  const db = getSupabaseAdmin();

  if (action === "login" && request.method === "POST") {
    let body: { username?: string; password?: string; rememberMe?: boolean };
    try {
      body = await request.json();
    } catch {
      return jsonFail("Kullanıcı adı ve şifre zorunludur.", 400);
    }

    const username = (body.username ?? "").trim();
    const password = body.password ?? "";
    const rememberMe = Boolean(body.rememberMe);

    if (!username || !password) {
      return jsonFail("Kullanıcı adı ve şifre zorunludur.", 400);
    }

    const { data: user, error } = await db
      .from(Tables.yoneticiKullanicilar)
      .select("*")
      .ilike("username", username)
      .maybeSingle();

    if (error) {
      console.error("[auth/login] supabase:", error.message, error.code, error.details);
      const msg = (error.message ?? "").toLowerCase();
      if (
        msg.includes("could not find the table") ||
        msg.includes("does not exist") ||
        msg.includes("schema cache")
      ) {
        return jsonFail(
          "Veritabanı tablosu bulunamadı. supabase/migrations/004_turkce_tablo_adlari.sql çalıştırıldı mı?",
          500
        );
      }
      if (msg.includes("jwt") || msg.includes("api key") || msg.includes("invalid")) {
        return jsonFail(
          "Veritabanı bağlantı hatası. SUPABASE_SERVICE_ROLE_KEY kontrol edin.",
          500
        );
      }
      return jsonFail(`Veritabanı hatası: ${error.message}`, 500);
    }

    if (!user) {
      return jsonFail("Kullanıcı adı veya şifre hatalı.", 401);
    }

    const hash = String(user.password_hash ?? "").trim();
    if (!(await verifyPassword(hash, password))) {
      return jsonFail("Kullanıcı adı veya şifre hatalı.", 401);
    }

    if (!user.aktif) {
      return jsonFail("Hesabınız pasif.", 403);
    }

    const tenantId = resolveSessionTenantId({
      id: user.id,
      username: user.username,
      role: user.role,
      ad_soyad: user.ad_soyad,
      aktif: user.aktif,
      must_change_password: user.must_change_password,
      tenant_id: user.tenant_id,
      is_superadmin: Boolean(user.is_superadmin),
    });

    const ttl = sessionTtl(rememberMe);
    const token = await signSession(
      {
        adminId: user.id,
        username: user.username,
        role: user.role ?? "admin",
        tenantId,
      },
      ttl
    );

    const payload = await getCurrentUserPayload(user.id);
    const res = jsonOk({
      data: payload,
      message: "Giriş başarılı.",
      rememberMe,
      sessionDays: rememberMe ? 7 : 1,
    });
    return attachSessionCookie(res, token, ttl.maxAgeSec);
  }

  if (action === "me" && request.method === "GET") {
    const auth = await requireSession();
    if (!auth) {
      return jsonFail("Oturum gerekli.", 401);
    }
    return jsonOk({ data: auth.user });
  }

  if (action === "logout" && request.method === "POST") {
    const res = jsonOk({ message: "Çıkış yapıldı." });
    return clearSessionCookie(res);
  }

  return jsonFail("Geçersiz istek.", 405);
}

export async function handlePing(request?: NextRequest): Promise<NextResponse> {
  const base = {
    ok: true,
    api: "native",
    node: process.version,
  };

  if (request?.nextUrl.searchParams.get("check") === "db") {
    try {
      const db = getSupabaseAdmin();
      const { count, error } = await db
        .from(Tables.yoneticiKullanicilar)
        .select("*", { count: "exact", head: true });

      const { data: sample } = await db
        .from(Tables.yoneticiKullanicilar)
        .select("username, aktif")
        .ilike("username", "bcnaydin75")
        .maybeSingle();

      return NextResponse.json({
        ...base,
        admin_count: count ?? 0,
        bcnaydin75: sample ?? null,
        db_error: error?.message ?? null,
      });
    } catch (e) {
      return NextResponse.json({
        ...base,
        ok: false,
        db_error: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  return NextResponse.json(base);
}
