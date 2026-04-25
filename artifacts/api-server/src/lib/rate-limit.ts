import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function clientKey(req: Request, scope: string): string {
  const fwd = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd?.split(",")[0])?.trim() || req.ip || req.socket.remoteAddress || "unknown";
  return `${scope}:${ip}`;
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
  const fwd = req.headers["x-forwarded-for"];
  return (Array.isArray(fwd) ? fwd[0] : fwd?.split(",")[0])?.trim() || req.ip || req.socket.remoteAddress || "unknown";
}
