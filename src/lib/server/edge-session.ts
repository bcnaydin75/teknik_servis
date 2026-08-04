import { jwtVerify } from "jose";
import type { Permissions } from "@/lib/permissions";
import { buildUserPermissions } from "@/lib/server/role-permissions";

export const SESSION_COOKIE = "ts_session";

export interface EdgeSession {
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

/** Edge middleware — HTTP roundtrip yok, JWT doğrudan doğrulanır */
export async function verifySessionToken(
  token: string
): Promise<EdgeSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const adminId = Number(payload.adminId);
    const tenantId = Number(payload.tenantId);
    if (!adminId || typeof payload.username !== "string") return null;
    if (!Number.isFinite(tenantId) || tenantId < 0) return null;
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

export function permissionsFromSession(session: EdgeSession): Permissions {
  const isSuperadmin = session.tenantId === 0;
  return buildUserPermissions(
    session.role,
    session.adminId,
    isSuperadmin ? null : session.tenantId,
    isSuperadmin
  );
}
