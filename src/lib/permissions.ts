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

export function getRoleDisplayKey(role: string, isSuperadmin: boolean): string {
  if (isSuperadmin) return "roles.developer";
  if (role === "teknisyen") return "roles.teknisyen";
  if (role === "kasa") return "roles.kasa";
  return "roles.admin";
}

export function getRoleBadgeStyle(role: string, isSuperadmin: boolean): string {
  if (isSuperadmin) {
    return "bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-900/50 dark:text-violet-200 dark:ring-violet-700";
  }
  switch (role) {
    case "teknisyen":
      return "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-900/45 dark:text-amber-200 dark:ring-amber-700";
    case "kasa":
      return "bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-900/45 dark:text-emerald-200 dark:ring-emerald-700";
    case "admin":
    default:
      return "bg-blue-100 text-blue-900 ring-blue-200 dark:bg-blue-900/45 dark:text-blue-200 dark:ring-blue-700";
  }
}

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
