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
    credentials: 'include',
  };

  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch('/api' + path, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || (res.status === 404 ? `API endpoint not found (404: /api${path})` : `HTTP ${res.status}`));
  }

  return data as T;
}
