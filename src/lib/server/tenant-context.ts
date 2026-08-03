import type { getCurrentUserPayload } from "./auth";

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getCurrentUserPayload>>>;

export function requireShopTenant(
  user: AuthUser
): { ok: true; tenantId: number } | { ok: false; status: number; message: string } {
  if (user.is_superadmin) {
    return {
      ok: false,
      status: 403,
      message: "Geliştirici hesabı dükkan işlemleri için kullanılamaz. Dükkan yöneticisi oluşturun.",
    };
  }
  const tenantId = user.tenant_id;
  if (!tenantId || tenantId <= 0) {
    return { ok: false, status: 403, message: "Dükkan bağlamı bulunamadı." };
  }
  return { ok: true, tenantId };
}

export function isShopOwnerUser(userId: number, tenantId: number): boolean {
  return userId === tenantId;
}
