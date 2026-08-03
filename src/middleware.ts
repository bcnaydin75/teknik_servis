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

function apiUrlFromOrigin(path: string, origin: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, origin).href;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const cookie = request.headers.get("cookie") ?? "";
    const meUrl = apiUrlFromOrigin("/api/auth.php?action=me", request.nextUrl.origin);

    try {
      const res = await fetch(meUrl, { headers: { cookie }, cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Auth check failed: ${res.status}`);
      }

      const text = await res.text();
      let data: {
        success?: boolean;
        data?: {
          permissions?: Record<string, boolean>;
          is_superadmin?: boolean;
        };
      };
      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        throw new Error("Auth check returned invalid JSON");
      }

      if (!data.success) {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      const perms = data.data?.permissions ?? {};
      const isSuperadmin = Boolean(data.data?.is_superadmin);

      if (isSuperadmin && !pathname.startsWith("/admin/settings") && !pathname.startsWith("/admin/login")) {
        return NextResponse.redirect(new URL("/admin/settings", request.url));
      }

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
