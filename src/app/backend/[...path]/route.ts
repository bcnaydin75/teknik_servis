import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/normalize-api-base-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

async function proxyToBackend(
  request: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  const apiBase = getApiBaseUrl();
  const joined = pathSegments.join("/");
  const url = new URL(`${apiBase}/${joined}`);
  url.search = request.nextUrl.search;

  const init: RequestInit = {
    method: request.method,
    headers: new Headers({ accept: "*/*", "user-agent": "TeknikServis-Vercel-Proxy/1.0" }),
    cache: "no-store",
    redirect: "follow",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(url.toString(), init);
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        responseHeaders.append(key, value);
      }
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[backend-proxy] upstream failed:", url.toString(), error);
    return new NextResponse(null, { status: 502 });
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToBackend(request, path);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToBackend(request, path);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
