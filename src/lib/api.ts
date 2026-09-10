function getBaseUrl(): string {
  const env = localStorage.getItem('cw_environment');
  if (env === 'prod') {
    return import.meta.env.VITE_PROD_API_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3142';
  }
  return import.meta.env.VITE_PREPROD_API_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3142';
}

function getToken(): string | null {
  return localStorage.getItem('cw_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => ({}));

  if (
    res.status === 403 &&
    path !== '/auth/change-password' &&
    typeof body?.message === 'string' &&
    body.message.toLowerCase().includes('change your password')
  ) {
    window.location.replace('/change-password');
    throw new Error('Please change your temporary password before continuing.');
  }

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
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  download: async (path: string) => {
    const token = getToken();
    const res = await fetch(`${getBaseUrl()}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message ?? `Download failed: ${res.status}`);
    }
    return { blob: await res.blob() };
  },
};
