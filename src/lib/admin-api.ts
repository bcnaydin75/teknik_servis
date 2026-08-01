import type {
  AddDevicePayload,
  ApiMessageResponse,
  DashboardStatsResponse,
  FinanceResponse,
  GetDevicesResponse,
  InventoryPayload,
  InventoryResponse,
  UpdateDevicePayload,
} from "@/types/admin";
import { apiUrl, apiUrlWithSearch } from "@/lib/api-config";
import { apiHeaders } from "@/lib/api-locale";
import { apiFallback } from "@/lib/i18n/api-fallback";

const fetchOptions: RequestInit = {
  credentials: "include",
};

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    if (response.status === 401) {
      return { success: false, message: apiFallback("errors.invalidRequest") } as T;
    }
    throw new Error(
      response.status >= 500
        ? apiFallback("errors.connectionLaragon")
        : apiFallback("errors.connectionShort")
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(apiFallback("errors.connection"));
  }
}

function handleUnauthorized(): void {
  if (typeof window !== "undefined") {
    const redirect = encodeURIComponent(window.location.pathname);
    window.location.href = `/admin/login?redirect=${redirect}`;
  }
}

export async function fetchDevices(options?: {
  archived?: boolean;
  q?: string;
  year?: number;
  month?: number;
}): Promise<GetDevicesResponse> {
  const url = apiUrlWithSearch("/api/get_devices.php", {
    archived: options?.archived ? "1" : undefined,
    q: options?.q?.trim() || undefined,
    year: options?.year,
    month: options?.month,
  });

  const response = await fetch(url, {
    ...fetchOptions,
    method: "GET",
    headers: apiHeaders(),
    cache: "no-store",
  });

  if (response.status === 401) {
    handleUnauthorized();
    return { success: false, message: "Oturum gerekli." };
  }

  const data = await parseJson<GetDevicesResponse>(response);

  if (!response.ok) {
    return {
      success: false,
      message: data.message ?? "Cihaz listesi alınamadı.",
    };
  }

  return data;
}

export async function fetchDashboardStats(): Promise<DashboardStatsResponse> {
  const response = await fetch(apiUrl("/api/dashboard_stats.php"), {
    ...fetchOptions,
    method: "GET",
    headers: apiHeaders(),
    cache: "no-store",
  });

  if (response.status === 401) {
    handleUnauthorized();
    return { success: false, message: "Oturum gerekli." };
  }

  const data = await parseJson<DashboardStatsResponse>(response);

  if (!response.ok) {
    return {
      success: false,
      message: data.message ?? "Dashboard istatistikleri alınamadı.",
    };
  }

  return data;
}

export async function archiveDevice(id: number): Promise<ApiMessageResponse> {
  const response = await fetch(apiUrl("/api/delete_device.php"), {
    ...fetchOptions,
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id, action: "archive" }),
  });

  if (response.status === 401) {
    handleUnauthorized();
    return { success: false, message: "Oturum gerekli." };
  }

  const data = await parseJson<ApiMessageResponse>(response);

  if (!response.ok) {
    return {
      success: false,
      message: data.message ?? "Cihaz arşivlenemedi.",
    };
  }

  return data;
}

export async function restoreDevice(id: number): Promise<ApiMessageResponse> {
  const response = await fetch(apiUrl("/api/delete_device.php"), {
    ...fetchOptions,
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id, action: "restore" }),
  });

  if (response.status === 401) {
    handleUnauthorized();
    return { success: false, message: "Oturum gerekli." };
  }

  const data = await parseJson<ApiMessageResponse>(response);

  if (!response.ok) {
    return {
      success: false,
      message: data.message ?? "Cihaz geri yüklenemedi.",
    };
  }

  return data;
}

export async function permanentDeleteDevice(id: number): Promise<ApiMessageResponse> {
  const response = await fetch(apiUrl("/api/delete_device.php"), {
    ...fetchOptions,
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id, action: "permanent_delete" }),
  });

  if (response.status === 401) {
    handleUnauthorized();
    return { success: false, message: "Oturum gerekli." };
  }

  const data = await parseJson<ApiMessageResponse>(response);

  if (!response.ok) {
    return {
      success: false,
      message: data.message ?? "Kalıcı silme başarısız.",
    };
  }

  return data;
}

export async function addDevice(
  payload: AddDevicePayload
): Promise<ApiMessageResponse> {
  const response = await fetch(apiUrl("/api/add_device.php"), {
    ...fetchOptions,
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    handleUnauthorized();
    return { success: false, message: "Oturum gerekli." };
  }

  const data = await parseJson<ApiMessageResponse>(response);

  if (!response.ok) {
    return {
      success: false,
      message: data.message ?? "Cihaz eklenemedi.",
    };
  }

  return data;
}

export async function updateDevice(
  payload: UpdateDevicePayload
): Promise<ApiMessageResponse> {
  const response = await fetch(apiUrl("/api/update_device.php"), {
    ...fetchOptions,
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    handleUnauthorized();
    return { success: false, message: "Oturum gerekli." };
  }

  const data = await parseJson<ApiMessageResponse>(response);

  if (!response.ok) {
    return {
      success: false,
      message: data.message ?? "Cihaz güncellenemedi.",
    };
  }

  return data;
}

export async function fetchInventory(): Promise<InventoryResponse> {
  const response = await fetch(apiUrl("/api/inventory.php"), {
    ...fetchOptions,
    method: "GET",
    headers: apiHeaders(),
    cache: "no-store",
  });

  if (response.status === 401) {
    handleUnauthorized();
    return { success: false, message: "Oturum gerekli." };
  }

  const data = await parseJson<InventoryResponse>(response);

  if (!response.ok) {
    return {
      success: false,
      message: data.message ?? "Stok listesi alınamadı.",
    };
  }

  return data;
}

export async function saveInventoryItem(
  payload: InventoryPayload
): Promise<ApiMessageResponse> {
  const response = await fetch(apiUrl("/api/inventory.php"), {
    ...fetchOptions,
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    handleUnauthorized();
    return { success: false, message: "Oturum gerekli." };
  }

  const data = await parseJson<ApiMessageResponse>(response);

  if (!response.ok) {
    return {
      success: false,
      message: data.message ?? "Stok kaydedilemedi.",
    };
  }

  return data;
}

export async function fetchFinance(): Promise<FinanceResponse> {
  const response = await fetch(apiUrl("/api/finance.php"), {
    ...fetchOptions,
    method: "GET",
    headers: apiHeaders(),
    cache: "no-store",
  });

  if (response.status === 401) {
    handleUnauthorized();
    return { success: false, message: "Oturum gerekli." };
  }

  const data = await parseJson<FinanceResponse>(response);

  if (!response.ok) {
    return {
      success: false,
      message: data.message ?? "Kasa verileri alınamadı.",
    };
  }

  return data;
}

export async function checkCustomer(params: {
  telefon?: string;
  ad_soyad?: string;
}): Promise<import("@/types/admin").CustomerCheckResponse> {
  const url = apiUrlWithSearch("/api/check_customer.php", {
    telefon: params.telefon,
    ad_soyad: params.ad_soyad,
  });
  const response = await fetch(url, {
    ...fetchOptions,
    headers: apiHeaders(),
    cache: "no-store",
  });
  if (response.status === 401) {
    handleUnauthorized();
    return { success: false, message: "Oturum gerekli." };
  }
  return parseJson(response);
}

export async function updateCustomer(payload: {
  id: number;
  riskli_musteri: boolean;
  risk_notu?: string;
}): Promise<ApiMessageResponse> {
  const response = await fetch(apiUrl("/api/update_customer.php"), {
    ...fetchOptions,
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (response.status === 401) {
    handleUnauthorized();
    return { success: false, message: "Oturum gerekli." };
  }
  const data = await parseJson<ApiMessageResponse>(response);
  if (!response.ok) return { success: false, message: data.message ?? "Güncellenemedi." };
  return data;
}

export async function fetchSuppliers(): Promise<import("@/types/admin").SuppliersResponse> {
  const response = await fetch(apiUrl("/api/suppliers.php"), {
    ...fetchOptions,
    headers: apiHeaders(),
    cache: "no-store",
  });
  if (response.status === 401) {
    handleUnauthorized();
    return { success: false, message: "Oturum gerekli." };
  }
  const data = await parseJson<import("@/types/admin").SuppliersResponse>(response);
  if (!response.ok) return { success: false, message: data.message ?? "Tedarikçiler alınamadı." };
  return data;
}

export async function saveSupplier(payload: Record<string, unknown>): Promise<ApiMessageResponse> {
  const response = await fetch(apiUrl("/api/suppliers.php"), {
    ...fetchOptions,
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (response.status === 401) {
    handleUnauthorized();
    return { success: false, message: "Oturum gerekli." };
  }
  const data = await parseJson<ApiMessageResponse>(response);
  if (!response.ok) return { success: false, message: data.message ?? "Kaydedilemedi." };
  return data;
}
