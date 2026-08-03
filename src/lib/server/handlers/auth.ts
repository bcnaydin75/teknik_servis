import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserPayload,
  requireSession,
  resolveTenantId,
  verifyPassword,
} from "../auth";
import { jsonFail, jsonOk } from "../api-response";
import {
  attachSessionCookie,
  clearSessionCookie,
  signSession,
} from "../session";
import { getSupabaseAdmin } from "../supabase";
export async function handleAuth(request: NextRequest): Promise<NextResponse> {
  const action = request.nextUrl.searchParams.get("action") ?? "";
  const db = getSupabaseAdmin();

  if (action === "login" && request.method === "POST") {
    let body: { username?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return jsonFail("Kullanıcı adı ve şifre zorunludur.", 400);
    }

    const username = (body.username ?? "").trim();
    const password = body.password ?? "";

    if (!username || !password) {
      return jsonFail("Kullanıcı adı ve şifre zorunludur.", 400);
    }

    const { data: user, error } = await db
      .from("admin_users")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (error || !user || !(await verifyPassword(user.password_hash, password))) {
      return jsonFail("Kullanıcı adı veya şifre hatalı.", 401);
    }

    if (!user.aktif) {
      return jsonFail("Hesabınız pasif.", 403);
    }

    const tenantId = resolveTenantId({
      id: user.id,
      username: user.username,
      role: user.role,
      ad_soyad: user.ad_soyad,
      aktif: user.aktif,
      must_change_password: user.must_change_password,
      tenant_id: user.tenant_id,
    });

    const token = await signSession({
      adminId: user.id,
      username: user.username,
      role: user.role ?? "admin",
      tenantId,
    });

    const payload = await getCurrentUserPayload(user.id);
    const res = jsonOk({ data: payload, message: "Giriş başarılı." });
    return attachSessionCookie(res, token);
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

export async function handlePing(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    api: "native",
    node: process.version,
  });
}
