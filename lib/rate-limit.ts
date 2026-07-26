interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export const RATE_LIMITS = {
  signin: { windowMs: 15 * 60 * 1000, max: 5 },
  signup: { windowMs: 60 * 60 * 1000, max: 3 },
  otp: { windowMs: 15 * 60 * 1000, max: 5 },
  password: { windowMs: 60 * 60 * 1000, max: 5 },
  api: { windowMs: 60 * 1000, max: 60 },
} as const;

export function rateLimit(
  key: string,
  config: RateLimitConfig
): { success: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { success: true, remaining: config.max - 1, resetMs: config.windowMs };
  }

  entry.count++;

  if (entry.count > config.max) {
    return { success: false, remaining: 0, resetMs: entry.resetAt - now };
  }

  return { success: true, remaining: config.max - entry.count, resetMs: entry.resetAt - now };
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function rateLimitResponse(resetMs: number): Response {
  const retryAfter = Math.ceil(resetMs / 1000);
  return Response.json(
    { error: `Too many requests. Try again in ${retryAfter} seconds.` },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": "0",
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
