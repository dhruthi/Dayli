import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function clientKey(req: Request, scope: string): string {
  // Use the IP that Express derives from `req.socket` + the trusted-proxy
  // setting (`app.set('trust proxy', 1)`). Reading the raw
  // `X-Forwarded-For` header here would let any client spoof the IP.
  return `${scope}:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`;
}

export function rateLimit(opts: { scope: string; max: number; windowMs: number }) {
  return function (req: Request, res: Response, next: NextFunction) {
    const key = clientKey(req, opts.scope);
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }

    if (existing.count >= opts.max) {
      const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "rate_limited",
        message: `Too many requests. Try again in ${retryAfter}s.`,
      });
      return;
    }

    existing.count += 1;
    return next();
  };
}

export function getClientIp(req: Request): string {
  // Same reasoning as `clientKey` — must rely on Express's resolved
  // `req.ip`, never the raw forwarded header.
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}
