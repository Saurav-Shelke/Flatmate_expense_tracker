'use strict';

const { RateLimiterMemory } = require('rate-limiter-flexible');

const loginLimiter = new RateLimiterMemory({ points: 60, duration: 60 }); // 60 attempts per minute
const passwordLimiter = new RateLimiterMemory({ points: 1000, duration: 900 }); // 1000 attempts per 15 mins
const claimLimiter = new RateLimiterMemory({ points: 60, duration: 60 });
const upiLimiter = new RateLimiterMemory({ points: 60, duration: 60 });

/**
 * Rate-limit login attempts by client IP.
 */
async function rateLimitLogin(req, res, next) {
  try {
    await loginLimiter.consume(req.ip);
    next();
  } catch {
    res.status(429).json({ error: 'Too many login attempts. Try again in a minute.' });
  }
}

/**
 * Rate-limit password change attempts.
 */
async function rateLimitPassword(req, res, next) {
  const key = req.session?.userId || req.ip;
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
async function rateLimitClaim(req, res, next) {
  const key = req.session?.userId || req.ip;
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
async function rateLimitUpi(req, res, next) {
  const key = req.session?.userId || req.ip;
  try {
    await upiLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: 'Too many UPI profile updates. Try again later.' });
  }
}

module.exports = { rateLimitLogin, rateLimitPassword, rateLimitClaim, rateLimitUpi };
