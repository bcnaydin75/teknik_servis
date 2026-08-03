export const CPANEL_API_BASE_URL =
  "http://loyal-brown-emu.89-252-180-227.cpanel.site";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function isCpanelTempHost(hostname: string): boolean {
  return hostname.endsWith(".cpanel.site");
}

/** cPanel geçici domainlerinde SSL genelde yok — sunucu tarafı fetch için HTTP şart */
function forceHttpForCpanelTemp(url: URL): URL {
  if (isCpanelTempHost(url.hostname) && url.protocol === "https:") {
    url.protocol = "http:";
  }
  return url;
}

/** Vercel / Laragon için geçerli mutlak API kök URL'si */
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
    const host = value.replace(/^\/+/, "").split("/")[0] ?? value;
    const protocol = isCpanelTempHost(host) ? "http" : "https";
    value = `${protocol}://${value.replace(/^\/+/, "")}`;
  }

  try {
    const url = forceHttpForCpanelTemp(new URL(value));
    if (!url.hostname) {
      return stripTrailingSlash(fallback);
    }
    const path = url.pathname.replace(/\/$/, "");
    return `${url.origin}${path}`;
  } catch {
    console.warn(
      "[teknik-servis] Invalid NEXT_PUBLIC_API_URL, using default cPanel URL."
    );
    return stripTrailingSlash(fallback);
  }
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
}
