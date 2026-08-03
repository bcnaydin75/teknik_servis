import { NextResponse } from "next/server";

/** Yanıt proxy'sinde iletilmemesi gereken başlıklar */
export const PROXY_STRIP_RESPONSE_HEADERS = new Set([
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
  "content-encoding",
]);

/** Vercel'de upstream.body stream boş dönebiliyor; gövdeyi tamponlayarak ilet */
export async function nextResponseFromUpstream(
  upstream: Response
): Promise<NextResponse> {
  const body = await upstream.arrayBuffer();
  const responseHeaders = new Headers();

  upstream.headers.forEach((value, key) => {
    if (!PROXY_STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.append(key, value);
    }
  });

  return new NextResponse(body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
