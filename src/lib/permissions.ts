export interface Permissions {
  dashboard: boolean;
  inventory: boolean;
  suppliers: boolean;
  finance: boolean;
  pos: boolean;
  cari: boolean;
  settings: boolean;
  /** Personel ekleme/düzenleme (hesap sahibi + admin) */
  manage_staff: boolean;
  see_costs: boolean;
  see_finance: boolean;
}

export const DEFAULT_PERMISSIONS: Permissions = {
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

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  teknisyen: "Teknisyen",
  kasa: "Kasa",
};

export type StaffRole = "admin" | "teknisyen" | "kasa";

export function isAccountOwner(user: { id: number; tenant_id: number }): boolean {
  return user.tenant_id === user.id;
}

/** Platform geliştirici yalnızca dükkan admini; dükkan admini tüm rolleri atayabilir */
export function assignableStaffRoles(isSuperadmin: boolean): StaffRole[] {
  return isSuperadmin ? ["admin"] : ["admin", "teknisyen", "kasa"];
}

export function canAccessRoute(pathname: string, perms: Permissions): boolean {
  if (pathname.startsWith("/admin/login")) return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/receipt") || pathname.startsWith("/admin/archive")) return perms.dashboard;
  if (pathname.startsWith("/admin/inventory")) return perms.inventory;
  if (pathname.startsWith("/admin/suppliers")) return perms.suppliers;
  if (pathname.startsWith("/admin/finance")) return perms.finance;
  if (pathname.startsWith("/admin/pos")) return perms.pos;
  if (pathname.startsWith("/admin/cari")) return perms.cari;
  if (pathname.startsWith("/admin/settings")) return perms.settings;
  return true;
}
