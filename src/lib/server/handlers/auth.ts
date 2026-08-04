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
  generateResetCode,
  hashResetCode,
  maskEmail,
  sendPasswordResetCodeEmail,
} from "../mail";
import {
  signPasswordResetToken,
  verifyPasswordResetToken,
} from "../password-reset-token";
import {
  attachSessionCookie,
  clearSessionCookie,
  sessionTtl,
  signSession,
} from "../session";
import { getSupabaseAdmin } from "../supabase";
import { Tables } from "../db-tables";
import {
  clearRateLimit,
  clientIp,
  consumeRateLimit,
} from "../rate-limit";

const LOGIN_IP = { limit: 25, windowMs: 15 * 60_000, lockMs: 15 * 60_000 };
const LOGIN_USER = { limit: 8, windowMs: 15 * 60_000, lockMs: 15 * 60_000 };
const OTP_REQ_IP = { limit: 8, windowMs: 60 * 60_000, lockMs: 60 * 60_000 };
const OTP_REQ_USER = { limit: 3, windowMs: 60 * 60_000, lockMs: 60 * 60_000 };
const OTP_CONFIRM_IP = { limit: 20, windowMs: 15 * 60_000, lockMs: 15 * 60_000 };
const OTP_CONFIRM_TOKEN = { limit: 5, windowMs: 15 * 60_000, lockMs: 30 * 60_000 };

function rateLimited(retryAfterSec: number): NextResponse {
  const res = jsonFail(
    "Çok fazla deneme. Lütfen birkaç dakika bekleyin.",
    429
  );
  res.headers.set("Retry-After", String(Math.max(1, retryAfterSec)));
  return res;
}

export async function handleAuth(request: NextRequest): Promise<NextResponse> {
  const action = request.nextUrl.searchParams.get("action") ?? "";
  const db = getSupabaseAdmin();
  const ip = clientIp(request);

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

    const userKey = username.toLowerCase();
    const ipLimit = consumeRateLimit(`login:ip:${ip}`, LOGIN_IP);
    if (!ipLimit.ok) return rateLimited(ipLimit.retryAfterSec);
    const userLimit = consumeRateLimit(`login:user:${userKey}`, LOGIN_USER);
    if (!userLimit.ok) return rateLimited(userLimit.retryAfterSec);

    const { data: user, error } = await db
      .from(Tables.yoneticiKullanicilar)
      .select("*")
      .ilike("username", username)
      .maybeSingle();

    if (error) {
      console.error("[auth/login] supabase:", error.message, error.code, error.details);
      return jsonFail("Giriş şu an yapılamıyor. Lütfen daha sonra deneyin.", 500);
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

    clearRateLimit(`login:user:${userKey}`);

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

  // 1) Kod iste — firma e-postasına 6 haneli kod
  if (action === "forgot_password_request" && request.method === "POST") {
    let body: { username?: string };
    try {
      body = await request.json();
    } catch {
      return jsonFail("Geçersiz istek.", 400);
    }

    const username = (body.username ?? "").trim();
    if (!username) return jsonFail("Kullanıcı adı zorunludur.", 400);

    const userKey = username.toLowerCase();
    const ipLimit = consumeRateLimit(`otp-req:ip:${ip}`, OTP_REQ_IP);
    if (!ipLimit.ok) return rateLimited(ipLimit.retryAfterSec);
    const userLimit = consumeRateLimit(`otp-req:user:${userKey}`, OTP_REQ_USER);
    if (!userLimit.ok) return rateLimited(userLimit.retryAfterSec);

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
        "Geliştirici hesabı bu form ile sıfırlanamaz.",
        403
      );
    }

    const tenantId = Number(user.tenant_id ?? user.id);
    if (tenantId !== Number(user.id)) {
      return jsonFail(
        "Personel şifresi bu form ile sıfırlanamaz. Dükkan yöneticinizden Ayarlar → Personel → Şifre sıfırla isteyin.",
        403
      );
    }

    const { data: shop } = await db
      .from(Tables.dukkanAyarlari)
      .select("email, firma_adi")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const shopEmail = (shop?.email ?? "").trim().toLowerCase();
    if (!shopEmail || !shopEmail.includes("@")) {
      return jsonFail(
        "Firma profilinde e-posta kayıtlı değil. Ayarlar → Firma Profili'ne e-posta ekleyin.",
        400
      );
    }

    const code = generateResetCode();
    const codeHash = hashResetCode(code);
    const resetToken = await signPasswordResetToken({
      userId: user.id,
      username: user.username,
      codeHash,
    });

    const sent = await sendPasswordResetCodeEmail({
      to: shopEmail,
      code,
      username: user.username,
      firmaAdi: shop?.firma_adi,
    });
    if (!sent.ok) return jsonFail(sent.message, 502);

    return jsonOk({
      message: "Doğrulama kodu firma e-postasına gönderildi.",
      data: {
        resetToken,
        emailHint: maskEmail(shopEmail),
      },
    });
  }

  // 2) Kod + yeni şifre
  if (action === "forgot_password_confirm" && request.method === "POST") {
    let body: {
      resetToken?: string;
      code?: string;
      new_password?: string;
      confirm_password?: string;
    };
    try {
      body = await request.json();
    } catch {
      return jsonFail("Geçersiz istek.", 400);
    }

    const resetToken = (body.resetToken ?? "").trim();
    const code = (body.code ?? "").trim();
    const newPassword = body.new_password ?? "";
    const confirmPassword = body.confirm_password ?? "";

    if (!resetToken || !code || !newPassword) {
      return jsonFail("Kod ve yeni şifre zorunludur.", 400);
    }
    if (newPassword !== confirmPassword) {
      return jsonFail("Yeni şifreler eşleşmiyor.", 400);
    }
    const pwdErr = validatePassword(newPassword);
    if (pwdErr) return jsonFail(pwdErr, 400);

    const ipLimit = consumeRateLimit(`otp-ok:ip:${ip}`, OTP_CONFIRM_IP);
    if (!ipLimit.ok) return rateLimited(ipLimit.retryAfterSec);
    const tokenKey = `otp-ok:tok:${resetToken.slice(0, 24)}`;
    const tokLimit = consumeRateLimit(tokenKey, OTP_CONFIRM_TOKEN);
    if (!tokLimit.ok) return rateLimited(tokLimit.retryAfterSec);

    const payload = await verifyPasswordResetToken(resetToken);
    if (!payload) {
      return jsonFail("Kod süresi dolmuş veya geçersiz. Yeni kod isteyin.", 400);
    }
    if (hashResetCode(code) !== payload.codeHash) {
      return jsonFail("Doğrulama kodu hatalı.", 403);
    }
    clearRateLimit(tokenKey);

    const { error: updErr } = await db
      .from(Tables.yoneticiKullanicilar)
      .update({
        password_hash: await hashPassword(newPassword),
        must_change_password: false,
      })
      .eq("id", payload.userId);

    if (updErr) return jsonFail("Şifre güncellenemedi.", 500);

    return jsonOk({
      message: "Şifreniz güncellendi. Yeni şifreyle giriş yapabilirsiniz.",
    });
  }

  return jsonFail("Geçersiz istek.", 405);
}

/**
 * Health check — asla kullanıcı, hata mesajı, sürüm veya sayım sızdırmaz.
 * `check=db` yalnızca { ok: true|false } döner.
 * Opsiyonel: PING_SECRET tanımlıysa ?token=... gerekir (DB kontrolü için).
 */
export async function handlePing(request?: NextRequest): Promise<NextResponse> {
  const checkDb = request?.nextUrl.searchParams.get("check") === "db";

  if (!checkDb) {
    return NextResponse.json({ ok: true });
  }

  const secret = (process.env.PING_SECRET ?? "").trim();
  if (secret) {
    const token = (request?.nextUrl.searchParams.get("token") ?? "").trim();
    if (!token || token !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  try {
    const db = getSupabaseAdmin();
    const { error } = await db
      .from(Tables.yoneticiKullanicilar)
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) {
      console.error("[ping/db]", error.message);
      return NextResponse.json({ ok: false }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[ping/db]", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
