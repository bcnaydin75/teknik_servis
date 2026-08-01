/** Yerel Laragon fallback — NEXT_PUBLIC_API_URL tanımlı değilse kullanılır */
export const DEFAULT_API_BASE_URL =
  "http://localhost/teknik_servis_projesi/backend";

/** Frontend kök adresi (takip linkleri için) */
export const DEFAULT_APP_URL = "http://localhost:3000";

export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEFAULT_API_BASE_URL;
}

/**
 * PHP API URL'si.
 * Tarayıcıda Next.js rewrite proxy (/api/*) kullanılır — CORS ve bağlantı sorunları önlenir.
 * Sunucu tarafında doğrudan backend adresi kullanılır.
 */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return new URL(normalized, window.location.origin).href;
  }
  return `${getApiBaseUrl()}${normalized}`;
}

/** Query parametreli API URL'si */
export function apiUrlWithSearch(
  path: string,
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const url = new URL(apiUrl(path));
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export function getAppOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEFAULT_APP_URL;
}

/** Backend'den gelen göreli dosya yolunu tam URL'ye çevirir */
export function resolveBackendAssetUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const relative = path.replace(/^\//, "");
  if (typeof window !== "undefined") {
    return new URL(`/backend/${relative}`, window.location.origin).href;
  }
  return `${getApiBaseUrl()}/${relative}`;
}
