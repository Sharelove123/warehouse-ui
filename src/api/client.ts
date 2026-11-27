import type {
  AuditorDashboardResponse,
  LoginResponse,
  ShuttleStatus,
  User,
  UserRole,
  WarehouseMapResponse,
  WarehouseSummary,
} from '../types';

const rawApiBase =
  import.meta.env.VITE_API_BASE_URL ||
  __APP_API_BASE_URL__ ||
  'http://127.0.0.1:8000';

export const API_BASE_URL = rawApiBase.replace(/\/+$/, '');

const ACCESS_KEY = 'wms_access_token';
const REFRESH_KEY = 'wms_refresh_token';
const USER_KEY = 'wms_user';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getStoredTokens() {
  return {
    access: localStorage.getItem(ACCESS_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
  };
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveAuthSession(data: LoginResponse) {
  localStorage.setItem(ACCESS_KEY, data.access);
  localStorage.setItem(REFRESH_KEY, data.refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function saveStoredUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === 'string') return record.detail;
  if (Array.isArray(record.non_field_errors) && record.non_field_errors.length > 0) {
    return String(record.non_field_errors[0]);
  }
  const messages: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value) && value.length > 0) {
      messages.push(`${key}: ${String(value[0])}`);
    } else if (typeof value === 'string') {
      messages.push(value);
    }
  }
  return messages.length > 0 ? messages.join(' ') : fallback;
}

async function tryRefreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return null;

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearAuthSession();
    return null;
  }

  const data = (await response.json()) as { access?: string };
  if (!data.access) {
    clearAuthSession();
    return null;
  }
  localStorage.setItem(ACCESS_KEY, data.access);
  return data.access;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retryOn401 = true
): Promise<T> {
  const { access } = getStoredTokens();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (access) {
    headers.set('Authorization', `Bearer ${access}`);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 65_000);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request timed out waiting for the API server.', 408);
    }
    throw new ApiError('Unable to reach the warehouse API server.', 0);
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (response.status === 401 && retryOn401 && localStorage.getItem(REFRESH_KEY)) {
    const newAccess = await tryRefreshAccessToken();
    if (newAccess) {
      return apiRequest<T>(path, options, false);
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(payload, `Request failed with status ${response.status}`),
      response.status
    );
  }

  return payload as T;
}

export async function loginRequest(
  username: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(payload, 'Login failed. Please check your credentials.'),
      response.status
    );
  }

  const data = payload as LoginResponse;
  saveAuthSession(data);
  return data;
}

export function fetchMe(): Promise<User> {
  return apiRequest<User>('/api/auth/me/');
}

export function fetchWarehouseMap(): Promise<WarehouseMapResponse> {
  return apiRequest<WarehouseMapResponse>('/api/warehouse/map/');
}

export function loadPallet(input: {
  pallet_number: string;
  barcode: string;
  item_name: string;
  quantity: number;
  destination: string;
}): Promise<{ detail: string; summary: WarehouseSummary }> {
  return apiRequest('/api/warehouse/load/', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function unloadPallet(location: string): Promise<{
  detail: string;
  location_code: string;
  summary: WarehouseSummary;
}> {
  return apiRequest('/api/warehouse/unload/', {
    method: 'POST',
    body: JSON.stringify({ location }),
  });
}

export function fetchShuttleStatus(): Promise<ShuttleStatus> {
  return apiRequest<ShuttleStatus>('/api/shuttle/');
}

export function fetchAuditorDashboard(): Promise<AuditorDashboardResponse> {
  return apiRequest<AuditorDashboardResponse>('/api/auditor/dashboard/');
}

export function fetchAdminUsers(): Promise<User[]> {
  return apiRequest<User[]>('/api/admin/users/');
}

export function createAdminUser(input: {
  username: string;
  password: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  email?: string;
}): Promise<User> {
  return apiRequest<User>('/api/admin/users/', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAdminUser(
  userId: number,
  input: Partial<{
    role: UserRole;
    is_active: boolean;
    first_name: string;
    last_name: string;
    email: string;
  }>
): Promise<User> {
  return apiRequest<User>(`/api/admin/users/${userId}/`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function resetAdminUserPassword(
  userId: number,
  password: string
): Promise<{ detail: string }> {
  return apiRequest<{ detail: string }>(
    `/api/admin/users/${userId}/reset-password/`,
    {
      method: 'POST',
      body: JSON.stringify({ password }),
    }
  );
}

export function deleteAdminUser(userId: number): Promise<void> {
  return apiRequest<void>(`/api/admin/users/${userId}/`, {
    method: 'DELETE',
  });
}
