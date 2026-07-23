import crypto from 'crypto';
import { UserModel } from '../models';
import { ROLE_ORDER } from '../types';

const SECRET = process.env.AUTH_SECRET || 'tpl-dev-secret-please-change-in-production';
const TOKEN_TTL_SEC = 7 * 24 * 3600; // 7 ngày

export const VALID_ROLES = ROLE_ORDER;

// ---------- password hashing (scrypt, không cần thư viện ngoài) ----------
export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  if (!salt || !hash) return false;
  const h = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(h, 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------- token (mini-JWT ký HMAC-SHA256) ----------
export function signToken(payload: Record<string, any>): string {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC };
  const p = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
  return `${p}.${sig}`;
}

export function verifyToken(token: string): Record<string, any> | null {
  try {
    const [p, sig] = String(token).split('.');
    if (!p || !sig) return null;
    const expect = crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expect);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const body = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (!body.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
    return body;
  } catch {
    return null;
  }
}

// shape trả cho frontend (không lộ salt/hash)
export const publicUser = (u: any) => ({
  id: String(u._id),
  username: u.username,
  fullName: u.fullName || '',
  role: u.role,
  permissions: u.permissions || [],
  active: u.active !== false,
  createdAt: u.createdAt,
});

// admin & Giám đốc điều hành luôn có mọi quyền; người khác cần được cấp cụ thể.
export const userHasPermission = (u: any, key: string): boolean =>
  !!u && (u.role === 'admin' || u.role === 'gddh' || (u.permissions || []).includes(key));

// ---------- seed admin mặc định nếu chưa có user nào ----------
export async function seedAdmin() {
  try {
    const count = await UserModel.countDocuments();
    if (count > 0) return;
    const { salt, hash } = hashPassword('admin123');
    await UserModel.create({
      username: 'admin',
      fullName: 'Quản trị viên',
      role: 'admin',
      salt, hash, active: true,
    });
    console.log('[auth] Seeded default admin -> username: admin | password: admin123 (đổi mật khẩu sau khi đăng nhập)');
  } catch (e: any) {
    console.error('[auth] seedAdmin error:', e?.message || e);
  }
}
