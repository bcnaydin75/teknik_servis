import bcrypt from "bcryptjs";
import type { Permissions } from "@/lib/permissions";
import { getSupabaseAdmin } from "./supabase";
import type { SessionData } from "./session";
import { getSessionFromCookies } from "./session";

export function getRolePermissions(role: string): Permissions {
  const none: Permissions = {
    dashboard: false,
    inventory: false,
    suppliers: false,
    finance: false,
    pos: false,
    cari: false,
    settings: false,
    see_costs: false,
    see_finance: false,
  };

  const all: Permissions = {
    dashboard: true,
    inventory: true,
    suppliers: true,
    finance: true,
    pos: true,
    cari: true,
    settings: true,
    see_costs: true,
    see_finance: true,
  };

  switch (role) {
    case "admin":
      return all;
    case "teknisyen":
      return {
        ...none,
        dashboard: true,
        inventory: true,
      };
    case "kasa":
      return {
        ...none,
        dashboard: true,
        finance: true,
        pos: true,
        cari: true,
        see_finance: true,
      };
    default:
      return none;
  }
}

export interface AdminUserRow {
  id: number;
  username: string;
  role: string;
  ad_soyad: string | null;
  aktif: boolean;
  must_change_password: boolean;
  tenant_id: number | null;
}

export async function loadAdminUser(userId: number): Promise<AdminUserRow | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("admin_users")
    .select("id, username, role, ad_soyad, aktif, must_change_password, tenant_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    username: data.username,
    role: data.role ?? "admin",
    ad_soyad: data.ad_soyad,
    aktif: Boolean(data.aktif),
    must_change_password: Boolean(data.must_change_password),
    tenant_id: data.tenant_id,
  };
}

export function resolveTenantId(user: AdminUserRow): number {
  const tid = user.tenant_id ?? user.id;
  return tid > 0 ? tid : user.id;
}

export async function getCurrentUserPayload(userId: number) {
  const user = await loadAdminUser(userId);
  if (!user || !user.aktif) return null;

  const tenantId = resolveTenantId(user);
  const role = user.role ?? "admin";

  return {
    id: user.id,
    username: user.username,
    role,
    ad_soyad: user.ad_soyad,
    must_change_password: user.must_change_password,
    tenant_id: tenantId,
    is_account_owner: tenantId === user.id,
    permissions: getRolePermissions(role),
  };
}

export async function requireSession(): Promise<
  { session: SessionData; user: NonNullable<Awaited<ReturnType<typeof getCurrentUserPayload>>> } | null
> {
  const session = await getSessionFromCookies();
  if (!session) return null;

  const user = await getCurrentUserPayload(session.adminId);
  if (!user) return null;

  return { session, user };
}

export async function requirePermission(
  permission: keyof Permissions
): Promise<
  | { ok: true; session: SessionData; user: NonNullable<Awaited<ReturnType<typeof getCurrentUserPayload>>> }
  | { ok: false; status: number; message: string }
> {
  const auth = await requireSession();
  if (!auth) {
    return { ok: false, status: 401, message: "Oturum gerekli." };
  }

  if (!auth.user.permissions[permission]) {
    return { ok: false, status: 403, message: "Yetkiniz yok." };
  }

  return { ok: true, ...auth };
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  if (hash.startsWith("$2y$")) {
    return bcrypt.compare(password, hash.replace("$2y$", "$2a$"));
  }
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
