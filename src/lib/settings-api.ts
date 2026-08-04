import type { Permissions } from "./permissions";
import type { ShopSettings } from "@/types/settings";
import type { StaffMember, PosItem, PosCartItem, CariCustomer, CariTransaction } from "@/types/settings";
import { apiUrl } from "@/lib/api-config";
import { apiHeaders } from "@/lib/api-locale";
import { apiFallback } from "@/lib/i18n/api-fallback";
import { normalizeShopSettings } from "@/lib/normalize-shop-settings";
import { withShopParam } from "@/lib/tenant-slug";

const fetchOpts: RequestInit = { credentials: "include" };

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(apiFallback("errors.apiInvalid"));
  }
}

export async function fetchShopSettings(): Promise<{ success: boolean; data?: ShopSettings; message?: string }> {
  const res = await fetch(apiUrl("/api/settings.php?action=profile"), {
    ...fetchOpts,
    headers: apiHeaders(),
    cache: "no-store",
  });
  const parsed = await parseJson<{ success: boolean; data?: Record<string, unknown>; message?: string }>(res);
  if (parsed.success && parsed.data) {
    return { ...parsed, data: normalizeShopSettings(parsed.data) };
  }
  return parsed as { success: boolean; data?: ShopSettings; message?: string };
}

export async function saveShopSettings(data: Partial<ShopSettings>): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(apiUrl("/api/settings.php?action=profile"), {
    ...fetchOpts,
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  return parseJson(res);
}

export async function uploadLogo(file: File): Promise<{ success: boolean; message?: string; data?: ShopSettings }> {
  const form = new FormData();
  form.append("logo", file);
  const res = await fetch(apiUrl("/api/settings.php?action=upload_logo"), {
    ...fetchOpts,
    method: "POST",
    headers: apiHeaders(),
    body: form,
  });
  return parseJson(res);
}

export async function fetchStaff(): Promise<{ success: boolean; data?: StaffMember[]; message?: string }> {
  const res = await fetch(apiUrl("/api/settings.php?action=staff"), {
    ...fetchOpts,
    headers: apiHeaders(),
    cache: "no-store",
  });
  return parseJson(res);
}

export async function addStaff(payload: {
  username: string;
  password: string;
  role: string;
  ad_soyad?: string;
  firma_adi?: string;
}): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(apiUrl("/api/settings.php?action=staff_add"), {
    ...fetchOpts,
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function updateStaff(payload: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(apiUrl("/api/settings.php?action=staff_update"), {
    ...fetchOpts,
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function deleteStaff(id: number): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(apiUrl("/api/settings.php?action=staff_delete"), {
    ...fetchOpts,
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id }),
  });
  return parseJson(res);
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(apiUrl("/api/settings.php?action=change_password"), {
    ...fetchOpts,
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  return parseJson(res);
}

export async function fetchPublicSettings(): Promise<{ success: boolean; data?: ShopSettings }> {
  try {
    const res = await fetch(withShopParam(new URL(apiUrl("/api/public_settings.php?action=profile"))).href, {
      headers: apiHeaders(),
      cache: "no-store",
    });
    const parsed = await parseJson<{ success: boolean; data?: Record<string, unknown> }>(res);
    if (parsed.success && parsed.data) {
      return { success: true, data: normalizeShopSettings(parsed.data) };
    }
    return parsed as { success: boolean; data?: ShopSettings };
  } catch {
    return { success: false };
  }
}

export async function fetchPosItems(): Promise<{ success: boolean; data?: PosItem[]; message?: string }> {
  const res = await fetch(apiUrl("/api/pos.php"), {
    ...fetchOpts,
    headers: apiHeaders(),
    cache: "no-store",
  });
  return parseJson(res);
}

export async function submitPosSale(payload: {
  items: PosCartItem[];
  payment_type: string;
  customer_id?: number;
  description?: string;
  discount?: number;
}): Promise<{
  success: boolean;
  message?: string;
  data?: { sale_id: number; total: number; discount?: number; subtotal?: number };
}> {
  const res = await fetch(apiUrl("/api/pos.php"), {
    ...fetchOpts,
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function fetchCariList(): Promise<{ success: boolean; data?: CariCustomer[]; message?: string }> {
  const res = await fetch(apiUrl("/api/cari.php?action=list"), {
    ...fetchOpts,
    headers: apiHeaders(),
    cache: "no-store",
  });
  return parseJson(res);
}

export async function fetchCariDetail(customerId: number): Promise<{
  success: boolean;
  data?: { customer: CariCustomer; transactions: CariTransaction[] };
  message?: string;
}> {
  const res = await fetch(apiUrl(`/api/cari.php?action=detail&customer_id=${customerId}`), {
    ...fetchOpts,
    headers: apiHeaders(),
    cache: "no-store",
  });
  return parseJson(res);
}

export async function searchCariCustomers(q: string): Promise<{ success: boolean; data?: CariCustomer[] }> {
  const res = await fetch(apiUrl(`/api/cari.php?action=search&q=${encodeURIComponent(q)}`), {
    ...fetchOpts,
    headers: apiHeaders(),
    cache: "no-store",
  });
  return parseJson(res);
}

export async function postCariTransaction(
  action: "borc" | "odeme",
  payload: { customer_id: number; amount: number; description?: string }
): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(apiUrl(`/api/cari.php?action=${action}`), {
    ...fetchOpts,
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export type { Permissions };
