import { Router } from 'express';
import multer from 'multer';
import { createUploadRequest, listUploadRequests, approveUpload, rejectUpload, previewUpload, downloadUpload } from '../controllers/uploadController';
import { getCategoryData, getCompensation } from '../controllers/dataController';
import { login, me, changePassword, listUsers, createUser, updateUser } from '../controllers/authController';
import { listComments, postComment } from '../controllers/commentController';
import { requireAuth, requireAdmin, requirePermission } from '../middleware/auth';
import fs from 'fs';

const router = Router();

// Configure Multer for Excel uploads
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// ---- Auth (đăng nhập công khai; các route khác cần token) ----
router.post('/auth/login', login);
router.get('/auth/me', requireAuth, me);
router.post('/auth/change-password', requireAuth, changePassword);
// Quản lý tài khoản: chỉ admin
router.get('/auth/users', requireAdmin, listUsers);
router.post('/auth/users', requireAdmin, createUser);
router.patch('/auth/users/:id', requireAdmin, updateUser);

// ---- Upload Excel: tạo yêu cầu chờ admin + GĐĐH duyệt (không import ngay) ----
router.post('/import', requireAuth, upload.single('file'), createUploadRequest);
router.get('/uploads', requireAuth, listUploadRequests);
router.get('/uploads/:id/preview', requireAuth, previewUpload);
router.get('/uploads/:id/download', requireAuth, downloadUpload);
router.post('/uploads/:id/approve', requireAuth, approveUpload);
router.post('/uploads/:id/reject', requireAuth, rejectUpload);

// ---- Thảo luận chỉ đạo theo vấn đề (chat: chỉ GĐĐH & CHT được gửi) ----
router.get('/issues/:issueId/comments', requireAuth, listComments);
router.post('/issues/:issueId/comments', requireAuth, postComment);

// Chi phí & Lương đãi ngộ: cần quyền view_compensation (đặt TRƯỚC route động /data/:category)
router.get('/data/compensation', requirePermission('view_compensation'), getCompensation);
router.get('/data/:category', requireAuth, getCategoryData);

export default router;
