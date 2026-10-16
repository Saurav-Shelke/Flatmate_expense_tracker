/**
 * Typed API Client for Flatmate Expense Manager Backend
 */

const TOKEN_KEY = 'flatmate_auth_token';

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function setAuthToken(token: string | null): void {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}

export function getApiBase(): string {
  // Clear any previously saved custom URL from localStorage
  if (typeof window !== 'undefined' && localStorage.getItem('flatmate_backend_url')) {
    localStorage.removeItem('flatmate_backend_url');
  }

  // When deployed on Vercel, use same-origin proxy ('') so requests route through vercel rewrites
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
    return '';
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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const opts: RequestInit = {
    method,
    headers,
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

  // Automatically save token if returned by any auth response
  if (data && typeof data.token === 'string') {
    setAuthToken(data.token);
  }

  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/me' && path !== '/auth/session') {
      // Clear token if server explicitly rejects it
      setAuthToken(null);
    }
    throw new Error(data.error || (res.status === 404 ? `API endpoint not found (404: ${path})` : `HTTP ${res.status}`));
  }

  return data as T;
}
