/**
 * cPanel PHP API (production).
 * Vercel'de Environment Variable ile override edilebilir: NEXT_PUBLIC_API_URL
 */
export const CPANEL_API_BASE_URL =
  "http://loyal-brown-emu.89-252-180-227.cpanel.site";

/** Yerel Laragon geliştirme */
export const LOCAL_API_BASE_URL =
  "http://127.0.0.1/teknik_servis_projesi/backend";

/** Ortam değişkeni yoksa cPanel kullanılır */
export const DEFAULT_API_BASE_URL = CPANEL_API_BASE_URL;

/** Frontend kök adresi (takip linkleri için) */
export const DEFAULT_APP_URL = "http://localhost:3000";

export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEFAULT_API_BASE_URL;
}

/**
 * Tarayıcı istekleri same-origin /api proxy üzerinden gider (Vercel rewrite → cPanel PHP).
 * Mixed-content (HTTPS→HTTP) ve oturum çerezleri için gereklidir.
 * Middleware / SSR doğrudan getApiBaseUrl() kullanır.
 */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined") {
    return new URL(normalized, window.location.origin).href;
  }

  return `${getApiBaseUrl()}${normalized}`;
}

/**
 * Edge middleware — oturum çerezleri same-origin proxy ile taşınır,
 * rewrite hedefi getApiBaseUrl() (cPanel PHP).
 */
export function apiUrlFromOrigin(path: string, origin: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, origin).href;
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
