/**
 * Typed API Client for Flatmate Expense Manager Backend
 */

export async function api<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: any
): Promise<T> {
  const opts: RequestInit = {
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

  return data as T;
}
