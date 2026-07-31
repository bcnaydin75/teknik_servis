import type { RepairApiResponse } from "@/types/repair";
import { apiHeaders } from "@/lib/api-locale";
import { apiFallback } from "@/lib/i18n/api-fallback";

export async function fetchRepairStatus(
  takipKodu: string
): Promise<RepairApiResponse> {
  const url = new URL("/api/repair-status.php", window.location.origin);
  url.searchParams.set("takip_kodu", takipKodu.trim());

  const response = await fetch(url.toString(), {
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
