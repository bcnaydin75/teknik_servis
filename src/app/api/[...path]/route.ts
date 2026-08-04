import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/normalize-api-base-url";
import { nextResponseFromUpstream } from "@/lib/proxy-response";
import { handleNativeApi, isNativeApiEnabled } from "@/lib/server/native-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FORWARD_REQUEST_HEADERS = new Set([
  "accept",
  "accept-language",
  "content-type",
  "cookie",
  "authorization",
  "x-locale",
]);

function buildTargetUrl(basePath: string, pathSegments: string[], search: string): string {
  const apiBase = getApiBaseUrl();
  const joined = pathSegments.join("/");
  const url = new URL(`${apiBase}${basePath}${joined}`);
  url.search = search;
  return url.toString();
}

function pickRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (FORWARD_REQUEST_HEADERS.has(lower)) {
      headers.set(key, value);
    }
  });
  if (!headers.has("accept")) {
    headers.set("accept", "application/json, text/plain, */*");
  }
  if (!headers.has("user-agent")) {
    headers.set("user-agent", "TeknikServis-Vercel-Proxy/1.0");
  }
  return headers;
}

async function proxyToBackend(
  request: NextRequest,
  pathSegments: string[],
  basePath: string
): Promise<NextResponse> {
  const targetUrl = buildTargetUrl(basePath, pathSegments, request.nextUrl.search);

  const init: RequestInit = {
    method: request.method,
    headers: pickRequestHeaders(request),
    cache: "no-store",
    redirect: "follow",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(targetUrl, init);

    if (!upstream.ok && upstream.status >= 500) {
      console.error("[api-proxy] upstream error:", targetUrl, upstream.status);
    }

    return nextResponseFromUpstream(upstream);
  } catch (error) {
    console.error("[api-proxy] upstream failed:", targetUrl, error);
    return NextResponse.json(
      { success: false, message: "Sunucuya bağlanılamadı." },
      { status: 502 }
    );
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const joined = path.join("/");

  const native = await handleNativeApi(request, joined);
  if (native) return native;

  // PHP backend kaldırıldı — native Supabase şart
  if (!isNativeApiEnabled()) {
    return NextResponse.json(
      {
        success: false,
        message:
          "SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY eksik. .env.local veya Vercel Environment Variables ekleyin.",
      },
      { status: 503 }
    );
  }

  return proxyToBackend(request, path, "/api/");
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
