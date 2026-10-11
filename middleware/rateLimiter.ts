import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const loginLimiter = new RateLimiterMemory({ points: 60, duration: 60 });
const passwordLimiter = new RateLimiterMemory({ points: 1000, duration: 900 });
const claimLimiter = new RateLimiterMemory({ points: 60, duration: 60 });
const upiLimiter = new RateLimiterMemory({ points: 60, duration: 60 });

/**
 * Rate-limit login attempts by client IP.
 */
export async function rateLimitLogin(req: Request, res: Response, next: NextFunction) {
  try {
    await loginLimiter.consume(req.ip || 'unknown');
    next();
  } catch {
    res.status(429).json({ error: 'Too many login attempts. Try again in a minute.' });
  }
}

/**
 * Rate-limit password change attempts.
 */
export async function rateLimitPassword(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  const key = session?.userId || req.ip || 'unknown';
  try {
    await passwordLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: 'Too many password change attempts. Try again later.' });
  }
}

/**
 * Rate-limit payment claim submissions by user ID.
 */
export async function rateLimitClaim(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  const key = session?.userId || req.ip || 'unknown';
  try {
    await claimLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: 'Too many payment claims. Try again later.' });
  }
}

/**
 * Rate-limit UPI profile updates by user ID.
 */
export async function rateLimitUpi(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  const key = session?.userId || req.ip || 'unknown';
  try {
    await upiLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: 'Too many UPI profile updates. Try again later.' });
  }
}

export default { rateLimitLogin, rateLimitPassword, rateLimitClaim, rateLimitUpi };
