import { AuthUser, Role } from './types';

const TOKEN_KEY = 'tpl_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Patch window.fetch to attach the Bearer token to same-origin /api requests
// (except the public login endpoint). Covers every existing fetch call site.
export function installAuthFetch() {
  const w = window as any;
  if (w.__authFetchInstalled) return;
  w.__authFetchInstalled = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input: any, init: any = {}) => {
    const url = typeof input === 'string' ? input : (input?.url || '');
    if (url.startsWith('/api') && !url.startsWith('/api/auth/login')) {
      const token = getToken();
      if (token) {
        init = { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } };
      }
    }
    return orig(input, init);
  };
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Lỗi ${res.status}`);
  return data;
}

export async function apiLogin(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return jsonOrThrow(res) as any;
}

export async function apiMe(): Promise<AuthUser | null> {
  if (!getToken()) return null;
  const res = await fetch('/api/auth/me');
  if (!res.ok) return null;
  const data = await res.json();
  return data.user as AuthUser;
}

export async function apiChangePassword(currentPassword: string, newPassword: string) {
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return jsonOrThrow(res);
}

export async function apiListUsers(): Promise<AuthUser[]> {
  const res = await fetch('/api/auth/users');
  return jsonOrThrow(res) as any;
}

export async function apiCreateUser(payload: { username: string; fullName: string; password: string; role: Role }) {
  const res = await fetch('/api/auth/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(res);
}

export async function apiUpdateUser(id: string, payload: Partial<{ fullName: string; role: Role; active: boolean; password: string; permissions: string[] }>) {
  const res = await fetch(`/api/auth/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(res);
}

// Dữ liệu Chi phí & Lương đãi ngộ (chỉ người có quyền mới gọi được, ngược lại 403)
export async function apiGetCompensation(): Promise<any[]> {
  const res = await fetch('/api/data/compensation');
  return jsonOrThrow(res) as any;
}

// ---- Upload Excel (quy trình duyệt admin + GĐĐH) ----
export async function apiListUploads(): Promise<any[]> {
  const res = await fetch('/api/uploads');
  return jsonOrThrow(res) as any;
}
export async function apiApproveUpload(id: string) {
  const res = await fetch(`/api/uploads/${id}/approve`, { method: 'POST' });
  return jsonOrThrow(res);
}
export async function apiRejectUpload(id: string, note = '') {
  const res = await fetch(`/api/uploads/${id}/reject`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }),
  });
  return jsonOrThrow(res);
}

export async function apiPreviewUpload(id: string): Promise<any> {
  const res = await fetch(`/api/uploads/${id}/preview`);
  return jsonOrThrow(res);
}

export async function apiDownloadUpload(id: string, filename: string) {
  const token = getToken();
  const res = await fetch(`/api/uploads/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Lỗi khi tải file');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}


