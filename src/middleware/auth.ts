import { Request, Response, NextFunction } from 'express';
import { verifyToken, userHasPermission } from '../services/authService';
import { UserModel } from '../models';

export interface AuthedRequest extends Request {
  auth?: { id: string; username: string; role: string };
}

// Yêu cầu token hợp lệ (bất kỳ người dùng đã đăng nhập nào)
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn' });
  req.auth = { id: payload.id, username: payload.username, role: payload.role };
  next();
}

// Yêu cầu quyền admin
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.auth?.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ quản trị viên (admin) được phép thao tác này' });
    }
    next();
  });
}

// Yêu cầu một quyền cụ thể (tra cứu user để lấy permission mới nhất)
export function requirePermission(key: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    requireAuth(req, res, async () => {
      try {
        const user = await UserModel.findById(req.auth!.id).lean();
        if (!userHasPermission(user, key)) {
          return res.status(403).json({ error: 'Bạn không có quyền xem mục này' });
        }
        next();
      } catch (e: any) {
        res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
      }
    });
  };
}
