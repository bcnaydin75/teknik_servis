import type { RepairApiResponse } from "@/types/repair";
import { apiUrlWithSearch } from "@/lib/api-config";
import { apiHeaders } from "@/lib/api-locale";
import { apiFallback } from "@/lib/i18n/api-fallback";

export async function fetchRepairStatus(
  takipKodu: string
): Promise<RepairApiResponse> {
  const url = apiUrlWithSearch("/api/repair-status.php", {
    takip_kodu: takipKodu.trim(),
  });

  const response = await fetch(url, {
    method: "GET",
    headers: apiHeaders(),
    cache: "no-store",
  });

  let data: RepairApiResponse;
  try {
    data = await response.json();
  } catch {
    return {
      success: false,
      message: apiFallback("errors.apiInvalid"),
    };
  }

  if (!response.ok) {
    return {
      success: false,
      message: data.message ?? apiFallback("errors.notFound"),
    };
  }

  return data;
}
