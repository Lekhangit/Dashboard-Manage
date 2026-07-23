import { Response } from 'express';
import { IssueCommentModel, UserModel } from '../models';
import { AuthedRequest } from '../middleware/auth';

// Chỉ CEO Phương (Giám đốc điều hành) và Ban chỉ huy (Chỉ huy trưởng) được gửi tin.
const CAN_POST = ['gddh', 'cht'];

const publicC = (c: any) => ({
  id: String(c._id),
  user: c.user, userName: c.userName || c.user, role: c.role,
  text: c.text, createdAt: c.createdAt,
});

// GET /api/issues/:issueId/comments — ai đăng nhập cũng xem được
export const listComments = async (req: AuthedRequest, res: Response) => {
  try {
    const comments = await IssueCommentModel.find({ issueId: req.params.issueId }).sort({ createdAt: 1 });
    res.json(comments.map(publicC));
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
};

// POST /api/issues/:issueId/comments — chỉ GĐĐH & CHT
export const postComment = async (req: AuthedRequest, res: Response) => {
  try {
    if (!CAN_POST.includes(req.auth!.role)) {
      return res.status(403).json({ error: 'Chỉ Giám đốc điều hành và Ban chỉ huy (CHT) được nhắn tin' });
    }
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Nội dung trống' });
    const user = await UserModel.findById(req.auth!.id).lean();
    const c = await IssueCommentModel.create({
      issueId: req.params.issueId,
      user: req.auth!.username,
      userName: (user as any)?.fullName || req.auth!.username,
      role: req.auth!.role,
      text,
    });
    res.status(201).json(publicC(c));
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
};
