import bcrypt from "bcryptjs";
import type { Permissions } from "@/lib/permissions";
import { isAccountOwner, type StaffRole } from "@/lib/permissions";
import { getSupabaseAdmin } from "./supabase";
import type { SessionData } from "./session";
import { getSessionFromCookies } from "./session";
import {
  buildUserPermissions,
  getRolePermissions,
  isTenantOwnerUser,
} from "./role-permissions";

export { getRolePermissions, isTenantOwnerUser };

export interface AdminUserRow {
  id: number;
  username: string;
  role: string;
  ad_soyad: string | null;
  aktif: boolean;
  must_change_password: boolean;
  tenant_id: number | null;
  is_superadmin: boolean;
}

export async function loadAdminUser(userId: number): Promise<AdminUserRow | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("admin_users")
    .select(
      "id, username, role, ad_soyad, aktif, must_change_password, tenant_id, is_superadmin"
    )
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
    is_superadmin: Boolean(data.is_superadmin),
  };
}

/** JWT oturumu için tenant; superadmin = 0 */
export function resolveSessionTenantId(user: AdminUserRow): number {
  if (user.is_superadmin) return 0;
  const tid = user.tenant_id ?? user.id;
  return tid > 0 ? tid : user.id;
}

export function resolveShopTenantId(user: AdminUserRow): number | null {
  if (user.is_superadmin) return null;
  const tid = user.tenant_id ?? user.id;
  return tid > 0 ? tid : null;
}

export async function getCurrentUserPayload(userId: number) {
  const user = await loadAdminUser(userId);
  if (!user || !user.aktif) return null;

  const tenantId = resolveShopTenantId(user);
  const role = user.role ?? "admin";

  return {
    id: user.id,
    username: user.username,
    role,
    ad_soyad: user.ad_soyad,
    must_change_password: user.must_change_password,
    tenant_id: tenantId,
    is_superadmin: user.is_superadmin,
    is_account_owner:
      !user.is_superadmin &&
      tenantId != null &&
      isAccountOwner({ id: user.id, tenant_id: tenantId }),
    permissions: buildUserPermissions(role, user.id, tenantId, user.is_superadmin),
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

export async function requireManageStaff(): Promise<
  | { ok: true; session: SessionData; user: NonNullable<Awaited<ReturnType<typeof getCurrentUserPayload>>> }
  | { ok: false; status: number; message: string }
> {
  const auth = await requireSession();
  if (!auth) {
    return { ok: false, status: 401, message: "Oturum gerekli." };
  }

  if (!auth.user.permissions.manage_staff) {
    return { ok: false, status: 403, message: "Personel yönetimi yetkiniz yok." };
  }

  return { ok: true, ...auth };
}

export function canAssignStaffRole(
  isSuperadmin: boolean,
  role: string
): role is StaffRole {
  if (!["admin", "teknisyen", "kasa"].includes(role)) return false;
  if (isSuperadmin) return role === "admin";
  return true;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function createShopOwnerUser(input: {
  username: string;
  passwordHash: string;
  adSoyad: string | null;
  firmaAdi: string;
  createdBy: number;
}): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  const db = getSupabaseAdmin();

  const { data: inserted, error } = await db
    .from("admin_users")
    .insert({
      username: input.username,
      password_hash: input.passwordHash,
      role: "admin",
      ad_soyad: input.adSoyad,
      tenant_id: null,
      created_by: input.createdBy,
      is_superadmin: false,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { ok: false, message: "Bu kullanıcı adı zaten kullanılıyor." };
  }

  const shopOwnerId = inserted.id;

  await db.from("admin_users").update({ tenant_id: shopOwnerId }).eq("id", shopOwnerId);

  await db.from("shop_settings").insert({
    tenant_id: shopOwnerId,
    firma_adi: input.firmaAdi.trim(),
  });

  return { ok: true, id: shopOwnerId };
}
