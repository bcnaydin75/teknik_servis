/** Müşteri sayfası / public API — hesap sahibi kullanıcı adı (bcnaydin75) */
export function getPublicTenantSlug(): string {
  const fromEnv = process.env.NEXT_PUBLIC_TENANT_SLUG?.trim();
  if (fromEnv) return fromEnv;
  return "";
}

export function withShopParam(
  url: URL,
  slug: string = getPublicTenantSlug()
): URL {
  if (slug) {
    url.searchParams.set("shop", slug);
  }
  return url;
}
