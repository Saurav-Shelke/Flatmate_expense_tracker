/**
 * Typed API Client for Flatmate Expense Manager Backend
 */

export function getApiBase(): string {
  // Clear any previously saved custom URL from localStorage
  if (typeof window !== 'undefined' && localStorage.getItem('flatmate_backend_url')) {
    localStorage.removeItem('flatmate_backend_url');
  }

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let url = envUrl.trim().replace(/\/$/, '');
    if (url.endsWith('/api')) url = url.slice(0, -4);
    return url;
  }

  return '';
}

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

  const apiBase = getApiBase();
  const cleanPath = path.startsWith('/api/') ? path.slice(4) : (path === '/api' ? '' : path);
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
  const targetUrl = `${apiBase}/api${normalizedPath}`;

  let res: Response;
  try {
    res = await fetch(targetUrl, opts);
  } catch (netErr: any) {
    throw new Error(
      `Cannot connect to backend server. Make sure the backend is deployed and running.`
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || (res.status === 404 ? `API endpoint not found (404: ${path})` : `HTTP ${res.status}`));
  }

  return data as T;
}
