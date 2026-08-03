import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const SESSION_COOKIE = "ts_session";

export interface SessionData {
  adminId: number;
  username: string;
  role: string;
  tenantId: number;
}

function getSecret(): Uint8Array {
  const raw =
    process.env.SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "dev-only-change-session-secret";
  return new TextEncoder().encode(raw);
}

export async function signSession(data: SessionData): Promise<string> {
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const adminId = Number(payload.adminId);
    const tenantId = Number(payload.tenantId);
    if (!adminId || !tenantId || typeof payload.username !== "string") {
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
  token: string
): NextResponse {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
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
