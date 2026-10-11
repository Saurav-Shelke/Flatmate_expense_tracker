'use strict';

/**
 * In-memory client-side cache for high-speed tab navigation
 * Prevents redundant round-trips when switching between tabs
 */
const apiCache = new Map();
const DEFAULT_CACHE_TTL_MS = 25000; // 25 seconds

/**
 * Fetch wrapper for JSON API endpoints with performance caching
 * @param {string} method - 'GET' | 'POST' | 'PUT' | 'DELETE'
 * @param {string} path - URL path relative to /api (e.g. '/expenses')
 * @param {object} [body] - JSON payload
 * @param {object} [options] - Additional options ({ bypassCache?: boolean, ttl?: number })
 * @returns {Promise<any>}
 */
async function api(method, path, body, options = {}) {
  const upperMethod = method.toUpperCase();
  const cacheKey = path;

  // 1. Check in-memory cache for GET requests
  if (upperMethod === 'GET' && !options.bypassCache) {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return JSON.parse(JSON.stringify(cached.data)); // Return cloned copy
    }
  }

  // 2. Clear cache on mutations (POST/PUT/DELETE) to prevent stale financial data
  if (upperMethod !== 'GET') {
    apiCache.clear();
  }

  const opts = {
    method: upperMethod,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  };

  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch('/api' + path, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  // 3. Cache successful GET responses
  if (upperMethod === 'GET') {
    const ttl = options.ttl || DEFAULT_CACHE_TTL_MS;
    apiCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  return data;
}

/**
 * Helper to explicitly clear API client cache
 */
api.clearCache = function (pathPrefix) {
  if (pathPrefix) {
    for (const key of apiCache.keys()) {
      if (key.startsWith(pathPrefix)) {
        apiCache.delete(key);
      }
    }
  } else {
    apiCache.clear();
  }
};
