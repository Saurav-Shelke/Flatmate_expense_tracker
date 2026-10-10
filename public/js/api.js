'use strict';

/**
 * Fetch wrapper for JSON API endpoints
 * @param {string} method - 'GET' | 'POST' | 'PUT' | 'DELETE'
 * @param {string} path - URL path relative to /api (e.g. '/expenses')
 * @param {object} [body] - JSON payload
 * @returns {Promise<any>}
 */
async function api(method, path, body) {
  const opts = {
    method,
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

  return data;
}
