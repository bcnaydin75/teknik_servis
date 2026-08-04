import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  permissionsFromSession,
  verifySessionToken,
} from "@/lib/server/edge-session";

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

  if (pathname.startsWith("/admin/login") || pathname.startsWith("/admin/forgot-password")) {
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = await verifySessionToken(token);
  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  const perms = permissionsFromSession(session);

  for (const [route, perm] of Object.entries(ROUTE_PERMS)) {
    if (pathname.startsWith(route) && !perms[perm as keyof typeof perms]) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
