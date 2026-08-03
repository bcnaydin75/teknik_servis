export const CPANEL_API_BASE_URL =
  "http://loyal-brown-emu.89-252-180-227.cpanel.site";

/** Vercel rewrite için geçerli mutlak API kök URL'si üretir */
export function normalizeApiBaseUrl(
  raw: string | undefined,
  fallback = CPANEL_API_BASE_URL
): string {
  let value = raw?.trim() ?? "";
  value = value.replace(/^["']+|["']+$/g, "");

  if (!value) {
    return stripTrailingSlash(fallback);
  }

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value.replace(/^\/+/, "")}`;
  }

  try {
    const url = new URL(value);
    if (!url.hostname) {
      return stripTrailingSlash(fallback);
    }
    const path = url.pathname.replace(/\/$/, "");
    return `${url.origin}${path}`;
  } catch {
    console.warn(
      `[teknik-servis] Invalid NEXT_PUBLIC_API_URL, using default cPanel URL.`
    );
    return stripTrailingSlash(fallback);
  }
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
}
