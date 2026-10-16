/**
 * Typed API Client for Flatmate Expense Manager Backend
 */

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('flatmate_backend_url');
    if (saved && saved.trim()) {
      let url = saved.trim().replace(/\/$/, '');
      if (url.endsWith('/api')) url = url.slice(0, -4);
      return url;
    }
  }

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let url = envUrl.trim().replace(/\/$/, '');
    if (url.endsWith('/api')) url = url.slice(0, -4);
    return url;
  }

  return '';
}

export function setApiBase(url: string) {
  if (typeof window !== 'undefined') {
    let trimmed = url.trim().replace(/\/$/, '');
    if (trimmed.endsWith('/api')) trimmed = trimmed.slice(0, -4);
    if (trimmed) {
      localStorage.setItem('flatmate_backend_url', trimmed);
    } else {
      localStorage.removeItem('flatmate_backend_url');
    }
  }
}

export async function testBackendConnection(url: string): Promise<boolean> {
  let base = url.trim().replace(/\/$/, '');
  if (base.endsWith('/api')) base = base.slice(0, -4);
  try {
    const res = await fetch(`${base}/api/health`, { method: 'GET', credentials: 'omit' });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return data && data.status === 'ok';
  } catch {
    return false;
  }
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
    if (!apiBase && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      throw new Error(
        'Backend URL not configured. Since frontend and backend are deployed separately on Vercel, please connect your backend Vercel URL below.'
      );
    }
    throw new Error(
      `Cannot connect to backend server at ${apiBase || 'current host'}. Make sure the backend is deployed and running.`
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 404 && !apiBase && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      throw new Error(
        'Backend URL not configured. Since frontend and backend are deployed separately on Vercel, please connect your backend Vercel URL below.'
      );
    }
    throw new Error(data.error || (res.status === 404 ? `API endpoint not found (404: ${path})` : `HTTP ${res.status}`));
  }

  return data as T;
}
