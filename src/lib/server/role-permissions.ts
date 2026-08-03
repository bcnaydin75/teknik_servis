import type { Permissions } from "@/lib/permissions";
import { isAccountOwner } from "@/lib/permissions";

export function getRolePermissions(role: string): Permissions {
  const none: Permissions = {
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

  const all: Permissions = {
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

  switch (role) {
    case "admin":
      return { ...all, manage_staff: true };
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

export function buildUserPermissions(
  role: string,
  userId: number,
  tenantId: number
): Permissions {
  if (isAccountOwner({ id: userId, tenant_id: tenantId })) {
    return getRolePermissions("admin");
  }
  return getRolePermissions(role);
}

export function isTenantOwnerUser(userId: number, tenantId: number): boolean {
  return userId === tenantId;
}
