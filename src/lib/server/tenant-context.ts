import type { getCurrentUserPayload } from "./auth";

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getCurrentUserPayload>>>;

export type TenantScope =
  | { ok: true; mode: "all" }
  | { ok: true; mode: "shop"; tenantId: number }
  | { ok: false; status: number; message: string };

/** Okuma/listeleme: superadmin tüm dükkanları görür */
export function resolveTenantScope(user: AuthUser): TenantScope {
  if (user.is_superadmin) {
    return { ok: true, mode: "all" };
  }
  const tenantId = user.tenant_id;
  if (!tenantId || tenantId <= 0) {
    return { ok: false, status: 403, message: "Dükkan bağlamı bulunamadı." };
  }
  return { ok: true, mode: "shop", tenantId };
}

/** Firma profili vb. — yalnızca dükkan kullanıcısı */
export function requireShopTenant(
  user: AuthUser
): { ok: true; tenantId: number } | { ok: false; status: number; message: string } {
  if (user.is_superadmin) {
    return {
      ok: false,
      status: 403,
      message:
        "Geliştirici hesabının dükkan profili yoktur. Dükkan yöneticisi oluşturun veya dükkan admini ile giriş yapın.",
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

export function applyTenantFilter<Q>(
  query: Q,
  scope: Extract<TenantScope, { ok: true }>,
  column = "tenant_id"
): Q {
  if (scope.mode === "all") return query;
  return (query as { eq: (col: string, val: number) => Q }).eq(column, scope.tenantId);
}

export function withScopedId<Q>(
  query: Q,
  scope: Extract<TenantScope, { ok: true }>,
  id: number
): Q {
  let scoped = (query as { eq: (col: string, val: number) => Q }).eq("id", id);
  if (scope.mode === "shop") {
    scoped = (scoped as { eq: (col: string, val: number) => Q }).eq("tenant_id", scope.tenantId);
  }
  return scoped;
}

/** Yazma işlemleri: superadmin kayıttan veya body'den tenant alır */
export function resolveWriteTenantId(
  scope: Extract<TenantScope, { ok: true }>,
  options?: { bodyTenantId?: number; recordTenantId?: number | null }
): number | null {
  if (scope.mode === "shop") return scope.tenantId;
  const fromBody = options?.bodyTenantId;
  if (fromBody && fromBody > 0) return fromBody;
  const fromRecord = options?.recordTenantId;
  if (fromRecord && fromRecord > 0) return fromRecord;
  return null;
}

export function requireWriteTenantId(
  scope: Extract<TenantScope, { ok: true }>,
  options?: { bodyTenantId?: number; recordTenantId?: number | null }
):
  | { ok: true; tenantId: number }
  | { ok: false; status: number; message: string } {
  const tenantId = resolveWriteTenantId(scope, options);
  if (!tenantId) {
    return {
      ok: false,
      status: 400,
      message: "Geliştirici hesabı ile kayıt eklerken dükkan (tenant_id) belirtilmelidir.",
    };
  }
  return { ok: true, tenantId };
}
