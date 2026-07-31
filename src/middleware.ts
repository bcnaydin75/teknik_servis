import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROUTE_PERMS: Record<string, string> = {
  "/admin/inventory": "inventory",
  "/admin/suppliers": "suppliers",
  "/admin/finance": "finance",
  "/admin/pos": "pos",
  "/admin/cari": "cari",
  "/admin/settings": "settings",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const cookie = request.headers.get("cookie") ?? "";
    const meUrl = new URL("/api/auth.php?action=me", request.url);

    try {
      const res = await fetch(meUrl, { headers: { cookie }, cache: "no-store" });
      const data = await res.json();

      if (!data.success) {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      const perms = data.data?.permissions ?? {};
      for (const [route, perm] of Object.entries(ROUTE_PERMS)) {
        if (pathname.startsWith(route) && !perms[perm]) {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      }
    } catch {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
