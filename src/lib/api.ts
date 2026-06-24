const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3142';

function getToken(): string | null {
  return localStorage.getItem('cw_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => ({}));

  if (res.status === 401) {
    // Only redirect if we had an active session — not on a fresh login attempt
    if (localStorage.getItem('cw_token')) {
      localStorage.removeItem('cw_token');
      localStorage.removeItem('cw_refresh_token');
      localStorage.removeItem('cw_role');
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    throw new Error(body?.message ?? 'Unauthorised');
  }

  if (!res.ok) {
    throw new Error(body?.message ?? `Request failed: ${res.status}`);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
};
