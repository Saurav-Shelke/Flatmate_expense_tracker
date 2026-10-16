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

  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const cleanPath = path.startsWith('/api/') ? path.slice(4) : (path === '/api' ? '' : path);
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
  const res = await fetch(`${apiBase}/api${normalizedPath}`, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || (res.status === 404 ? `API endpoint not found (404: ${path})` : `HTTP ${res.status}`));
  }

  return data as T;
}
