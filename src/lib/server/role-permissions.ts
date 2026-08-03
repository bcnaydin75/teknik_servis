import type { Permissions } from "@/lib/permissions";
import { isAccountOwner } from "@/lib/permissions";

const SHOP_NONE: Permissions = {
  dashboard: false,
  inventory: false,
  suppliers: false,
  finance: false,
  pos: false,
  cari: false,
  settings: false,
  manage_staff: false,
  see_costs: false,
  see_finance: false,
};

const SHOP_ALL: Permissions = {
  dashboard: true,
  inventory: true,
  suppliers: true,
  finance: true,
  pos: true,
  cari: true,
  settings: true,
  manage_staff: true,
  see_costs: true,
  see_finance: true,
};

/** Platform geliştirici: dükkan paneli kapalı, dükkan yöneticisi yönetimi açık */
export function getSuperadminPermissions(): Permissions {
  return {
    ...SHOP_NONE,
    settings: true,
    manage_staff: true,
  };
}

export function getRolePermissions(role: string): Permissions {
  switch (role) {
    case "admin":
      return { ...SHOP_ALL, manage_staff: true };
    case "teknisyen":
      return {
        ...SHOP_NONE,
        dashboard: true,
        inventory: true,
      };
    case "kasa":
      return {
        ...SHOP_NONE,
        dashboard: true,
        finance: true,
        pos: true,
        cari: true,
        see_finance: true,
      };
    default:
      return SHOP_NONE;
  }
}

export function buildUserPermissions(
  role: string,
  userId: number,
  tenantId: number | null,
  isSuperadmin: boolean
): Permissions {
  if (isSuperadmin) return getSuperadminPermissions();
  if (tenantId != null && isAccountOwner({ id: userId, tenant_id: tenantId })) {
    return getRolePermissions("admin");
  }
  return getRolePermissions(role);
}

export function isTenantOwnerUser(userId: number, tenantId: number): boolean {
  return userId === tenantId;
}
