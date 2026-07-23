import { Response } from 'express';
import { UserModel } from '../models';
import {
  hashPassword, verifyPassword, signToken, publicUser, VALID_ROLES,
} from '../services/authService';
import { AuthedRequest } from '../middleware/auth';

// POST /api/auth/login  { username, password }
export const login = async (req: AuthedRequest, res: Response) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Thiếu tên đăng nhập hoặc mật khẩu' });
    const user = await UserModel.findOne({ username: String(username).trim() });
    if (!user || user.active === false || !verifyPassword(password, user.salt, user.hash)) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    const token = signToken({ id: String(user._id), username: user.username, role: user.role });
    res.json({ token, user: publicUser(user) });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
};

// GET /api/auth/me  (Bearer)
export const me = async (req: AuthedRequest, res: Response) => {
  const user = await UserModel.findById(req.auth!.id);
  if (!user) return res.status(401).json({ error: 'Không tìm thấy người dùng' });
  res.json({ user: publicUser(user) });
};

// POST /api/auth/change-password  (Bearer)  { currentPassword, newPassword }
export const changePassword = async (req: AuthedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải từ 6 ký tự trở lên' });
    }
    const user = await UserModel.findById(req.auth!.id);
    if (!user) return res.status(401).json({ error: 'Không tìm thấy người dùng' });
    if (!verifyPassword(currentPassword || '', user.salt, user.hash)) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
    }
    const { salt, hash } = hashPassword(newPassword);
    user.salt = salt; user.hash = hash;
    await user.save();
    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
};

// ---- Admin: quản lý tài khoản ----

// GET /api/auth/users  (admin)
export const listUsers = async (_req: AuthedRequest, res: Response) => {
  const users = await UserModel.find({}).sort({ createdAt: 1 });
  res.json(users.map(publicUser));
};

// POST /api/auth/users  (admin)  { username, fullName, password, role }
export const createUser = async (req: AuthedRequest, res: Response) => {
  try {
    const { username, fullName, password, role } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Thiếu tên đăng nhập hoặc mật khẩu' });
    if (String(password).length < 6) return res.status(400).json({ error: 'Mật khẩu phải từ 6 ký tự trở lên' });
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Vai trò không hợp lệ' });
    const exists = await UserModel.findOne({ username: String(username).trim() });
    if (exists) return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });
    const { salt, hash } = hashPassword(password);
    const user = await UserModel.create({
      username: String(username).trim(), fullName: fullName || '', role, salt, hash, active: true,
    });
    res.status(201).json(publicUser(user));
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
};

// PATCH /api/auth/users/:id  (admin)  { fullName?, role?, active?, password? }
export const updateUser = async (req: AuthedRequest, res: Response) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    const { fullName, role, active, password, permissions } = req.body || {};
    if (fullName !== undefined) user.fullName = fullName;
    if (Array.isArray(permissions)) user.permissions = permissions;
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Vai trò không hợp lệ' });
      // không cho hạ quyền admin cuối cùng
      if (user.role === 'admin' && role !== 'admin') {
        const admins = await UserModel.countDocuments({ role: 'admin', active: true });
        if (admins <= 1) return res.status(400).json({ error: 'Phải còn ít nhất 1 admin' });
      }
      user.role = role;
    }
    if (active !== undefined) user.active = !!active;
    if (password) {
      if (String(password).length < 6) return res.status(400).json({ error: 'Mật khẩu phải từ 6 ký tự trở lên' });
      const { salt, hash } = hashPassword(password);
      user.salt = salt; user.hash = hash;
    }
    await user.save();
    res.json(publicUser(user));
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
};
