/**
 * In-memory sliding-window rate limiter (process-local).
 * Multi-instance deploy'da her instance kendi sayacını tutar; yine de
 * client-only kilide göre çok daha güvenlidir.
 */

type Bucket = {
  hits: number[];
  lockedUntil: number;
};

const buckets = new Map<string, Bucket>();

const MAX_KEYS = 5000;

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, b] of buckets) {
    if (b.lockedUntil < now && b.hits.length === 0) buckets.delete(key);
  }
  if (buckets.size >= MAX_KEYS) {
    const oldest = buckets.keys().next().value;
    if (oldest) buckets.delete(oldest);
  }
}

function getBucket(key: string): Bucket {
  let b = buckets.get(key);
  if (!b) {
    b = { hits: [], lockedUntil: 0 };
    buckets.set(key, b);
  }
  return b;
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

/**
 * Attempt tüketir. Limit aşıldıysa kilitleyip reddeder.
 */
export function consumeRateLimit(
  key: string,
  opts: { limit: number; windowMs: number; lockMs?: number }
): RateLimitResult {
  const now = Date.now();
  prune(now);
  const b = getBucket(key);

  if (b.lockedUntil > now) {
    return { ok: false, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000) };
  }

  b.hits = b.hits.filter((t) => now - t < opts.windowMs);
  if (b.hits.length >= opts.limit) {
    const lockMs = opts.lockMs ?? opts.windowMs;
    b.lockedUntil = now + lockMs;
    b.hits = [];
    return { ok: false, retryAfterSec: Math.ceil(lockMs / 1000) };
  }

  b.hits.push(now);
  return { ok: true, remaining: opts.limit - b.hits.length };
}

/** Başarılı giriş sonrası kullanıcı anahtarını sıfırla */
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

export function clientIp(request: { headers: Headers }): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}
