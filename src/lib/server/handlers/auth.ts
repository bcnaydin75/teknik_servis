import { NextRequest, NextResponse } from "next/server";
import { validatePassword } from "@/lib/password";
import {
  getCurrentUserPayload,
  hashPassword,
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

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function phonesMatch(a: string, b: string): boolean {
  const da = digitsOnly(a);
  const db = digitsOnly(b);
  if (!da || !db) return false;
  // Son 10 hane (TR cep) veya tam eşleşme
  if (da === db) return true;
  const ta = da.length > 10 ? da.slice(-10) : da;
  const tb = db.length > 10 ? db.slice(-10) : db;
  return ta.length >= 10 && ta === tb;
}
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

  // Dükkan admini kendi şifresini unuttu: kullanıcı adı + firma telefonu ile doğrula
  if (action === "forgot_password" && request.method === "POST") {
    let body: {
      username?: string;
      phone?: string;
      new_password?: string;
      confirm_password?: string;
    };
    try {
      body = await request.json();
    } catch {
      return jsonFail("Geçersiz istek.", 400);
    }

    const username = (body.username ?? "").trim();
    const phone = (body.phone ?? "").trim();
    const newPassword = body.new_password ?? "";
    const confirmPassword = body.confirm_password ?? "";

    if (!username || !phone || !newPassword) {
      return jsonFail("Kullanıcı adı, telefon ve yeni şifre zorunludur.", 400);
    }
    if (newPassword !== confirmPassword) {
      return jsonFail("Yeni şifreler eşleşmiyor.", 400);
    }
    const pwdErr = validatePassword(newPassword);
    if (pwdErr) return jsonFail(pwdErr, 400);

    const { data: user } = await db
      .from(Tables.yoneticiKullanicilar)
      .select("*")
      .ilike("username", username)
      .maybeSingle();

    if (!user || !user.aktif) {
      return jsonFail("Kullanıcı bulunamadı veya hesap pasif.", 404);
    }

    if (user.is_superadmin) {
      return jsonFail(
        "Geliştirici hesabı bu form ile sıfırlanamaz. Veritabanı yöneticisine başvurun.",
        403
      );
    }

    const tenantId = Number(user.tenant_id ?? user.id);
    const isOwner = tenantId === Number(user.id);
    if (!isOwner) {
      return jsonFail(
        "Personel şifresi bu form ile sıfırlanamaz. Dükkan yöneticinizden Ayarlar → Personel → Şifre sıfırla isteyin.",
        403
      );
    }

    const { data: shop } = await db
      .from(Tables.dukkanAyarlari)
      .select("telefon")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const shopPhone = (shop?.telefon ?? "").trim();
    if (!shopPhone) {
      return jsonFail(
        "Firma profilinde telefon kayıtlı değil. Ayarlar → Firma Profili'ne telefon ekleyin (giriş yaptıktan sonra) veya geliştiriciye başvurun.",
        400
      );
    }

    if (!phonesMatch(phone, shopPhone)) {
      return jsonFail(
        "Telefon doğrulanamadı. Firma profilindeki telefon numarasını girin.",
        403
      );
    }

    const { error: updErr } = await db
      .from(Tables.yoneticiKullanicilar)
      .update({
        password_hash: await hashPassword(newPassword),
        must_change_password: false,
      })
      .eq("id", user.id);

    if (updErr) return jsonFail("Şifre güncellenemedi.", 500);

    return jsonOk({ message: "Şifreniz güncellendi. Yeni şifreyle giriş yapabilirsiniz." });
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
