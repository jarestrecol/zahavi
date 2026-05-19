import { useAuthStore } from '../stores/auth.js';

const API_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function extractMensaje(body: unknown): string | undefined {
  if (body != null && typeof body === 'object') {
    const val = (body as Record<string, unknown>)['mensaje'];
    return typeof val === 'string' ? val : undefined;
  }
  return undefined;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers ?? {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    useAuthStore.getState().logout();
    throw new ApiError(401, 'Sesión expirada');
  }

  const body = res.headers.get('content-type')?.includes('application/json')
    ? await res.json()
    : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, extractMensaje(body) ?? res.statusText);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
