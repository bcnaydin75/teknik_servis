import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const SESSION_COOKIE = "ts_session";

/** Varsayılan oturum: 24 saat */
export const SESSION_TTL_DEFAULT_SEC = 86400;
/** Beni hatırla: 7 gün */
export const SESSION_TTL_REMEMBER_SEC = 7 * 86400;

export interface SessionData {
  adminId: number;
  username: string;
  role: string;
  tenantId: number;
}

export type SessionTtl = {
  jwtExp: string;
  maxAgeSec: number;
};

export function sessionTtl(rememberMe: boolean): SessionTtl {
  if (rememberMe) {
    return { jwtExp: "7d", maxAgeSec: SESSION_TTL_REMEMBER_SEC };
  }
  return { jwtExp: "24h", maxAgeSec: SESSION_TTL_DEFAULT_SEC };
}

function getSecret(): Uint8Array {
  const raw =
    process.env.SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "dev-only-change-session-secret";
  return new TextEncoder().encode(raw);
}

export async function signSession(
  data: SessionData,
  ttl: SessionTtl = sessionTtl(false)
): Promise<string> {
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ttl.jwtExp)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const adminId = Number(payload.adminId);
    const tenantId = Number(payload.tenantId);
    if (!adminId || typeof payload.username !== "string") {
      return null;
    }
    if (!Number.isFinite(tenantId) || tenantId < 0) {
      return null;
    }
    return {
      adminId,
      username: payload.username,
      role: String(payload.role ?? "admin"),
      tenantId,
    };
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<SessionData | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function attachSessionCookie(
  response: NextResponse,
  token: string,
  maxAgeSec: number = SESSION_TTL_DEFAULT_SEC
): NextResponse {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
