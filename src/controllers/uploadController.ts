import { Response } from 'express';
import * as xlsx from 'xlsx';
import fs from 'fs';
import { UploadRequestModel, UserModel } from '../models';
import { importTemplate } from '../services/templateImportService';
import { AuthedRequest } from '../middleware/auth';

const publicReq = (r: any) => ({
  id: String(r._id),
  filename: r.filename,
  requestedBy: r.requestedBy,
  requestedByName: r.requestedByName || r.requestedBy,
  requestedByRole: r.requestedByRole,
  requestedAt: r.requestedAt,
  status: r.status,
  adminApproved: !!r.adminApproved, adminBy: r.adminBy || '',
  gddhApproved: !!r.gddhApproved, gddhBy: r.gddhBy || '',
  appliedAt: r.appliedAt, appliedStats: r.appliedStats,
  decidedBy: r.decidedBy || '', note: r.note || '',
});

// Áp dụng (import) file ngay khi Giám đốc điều hành (Đỗ Việt Phương) duyệt
async function applyIfApproved(reqDoc: any) {
  if (reqDoc.status !== 'pending' || !reqDoc.gddhApproved) return reqDoc;
  const stats = await importTemplate(reqDoc.storedPath, reqDoc.filename, reqDoc.requestedByName || reqDoc.requestedBy);
  reqDoc.status = 'applied';
  reqDoc.appliedAt = new Date();
  reqDoc.appliedStats = stats;
  await reqDoc.save();
  return reqDoc;
}


// POST /api/import — tạo yêu cầu upload (KHÔNG import ngay); tự duyệt phần của người đăng nếu là admin/GĐĐH
export const createUploadRequest = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Chưa chọn file' });
    const user = await UserModel.findById(req.auth!.id).lean();
    const role = (user as any)?.role || req.auth!.role;
    const uname = (user as any)?.username || req.auth!.username;
    const fullName = (user as any)?.fullName || uname;

    const doc: any = await UploadRequestModel.create({
      filename: req.file.originalname,
      storedPath: req.file.path,
      requestedBy: uname,
      requestedByName: fullName,
      requestedByRole: role,
      status: 'pending',
      adminApproved: role === 'admin',
      adminBy: role === 'admin' ? uname : '',
      gddhApproved: role === 'gddh',
      gddhBy: role === 'gddh' ? uname : '',
    });

    await applyIfApproved(doc);
    res.json({ status: doc.status, request: publicReq(doc) });
  } catch (e: any) {
    console.error('createUploadRequest error:', e);
    res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
};

// GET /api/uploads — lịch sử & trạng thái duyệt
export const listUploadRequests = async (_req: AuthedRequest, res: Response) => {
  const docs = await UploadRequestModel.find({}).sort({ requestedAt: -1 }).limit(100);
  res.json(docs.map(publicReq));
};

// POST /api/uploads/:id/approve — admin duyệt phần admin, GĐĐH duyệt phần GĐĐH
export const approveUpload = async (req: AuthedRequest, res: Response) => {
  try {
    const role = req.auth!.role;
    if (role !== 'admin' && role !== 'gddh') {
      return res.status(403).json({ error: 'Chỉ Quản trị viên hoặc Giám đốc điều hành được duyệt' });
    }
    const doc: any = await UploadRequestModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    if (doc.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu đã được xử lý' });

    if (role === 'admin') { doc.adminApproved = true; doc.adminBy = req.auth!.username; }
    if (role === 'gddh') { doc.gddhApproved = true; doc.gddhBy = req.auth!.username; }
    await doc.save();
    await applyIfApproved(doc);
    res.json({ status: doc.status, request: publicReq(doc) });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
};

// POST /api/uploads/:id/reject
export const rejectUpload = async (req: AuthedRequest, res: Response) => {
  try {
    const role = req.auth!.role;
    if (role !== 'admin' && role !== 'gddh') {
      return res.status(403).json({ error: 'Chỉ Quản trị viên hoặc Giám đốc điều hành được từ chối' });
    }
    const doc: any = await UploadRequestModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    if (doc.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu đã được xử lý' });
    doc.status = 'rejected';
    doc.decidedBy = req.auth!.username;
    doc.note = req.body?.note || '';
    await doc.save();
    res.json({ status: doc.status, request: publicReq(doc) });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
};

// GET /api/uploads/:id/preview — Đọc nội dung file Excel phục vụ xem trước (Preview)
export const previewUpload = async (req: AuthedRequest, res: Response) => {
  try {
    const doc: any = await UploadRequestModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Không tìm thấy yêu cầu upload' });
    if (!doc.storedPath || !fs.existsSync(doc.storedPath)) {
      return res.status(404).json({ error: 'File Excel gốc không còn tồn tại trên máy chủ' });
    }

    const XLSX = (xlsx as any).default || xlsx;
    const fileBuffer = fs.readFileSync(doc.storedPath);
    const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
    
    const utils = XLSX.utils || (xlsx as any).utils;
    const sheets = wb.SheetNames.map((sheetName: string) => {
      const sheet = wb.Sheets[sheetName];
      const data: any[][] = utils ? utils.sheet_to_json(sheet, { header: 1, defval: '' }) : [];
      return {
        name: sheetName,
        data: data.slice(0, 500) // Tối đa 500 dòng mỗi sheet để tối ưu tốc độ
      };
    });

    res.json({
      id: String(doc._id),
      filename: doc.filename,
      requestedBy: doc.requestedBy,
      requestedByName: doc.requestedByName || doc.requestedBy,
      requestedAt: doc.requestedAt,
      status: doc.status,
      adminApproved: !!doc.adminApproved,
      adminBy: doc.adminBy || '',
      gddhApproved: !!doc.gddhApproved,
      gddhBy: doc.gddhBy || '',
      sheets
    });
  } catch (e: any) {
    console.error('previewUpload error:', e);
    res.status(500).json({ error: e?.message || 'Không thể đọc nội dung file Excel này' });
  }
};


// GET /api/uploads/:id/download — Tải về file Excel gốc
export const downloadUpload = async (req: AuthedRequest, res: Response) => {
  try {
    const doc: any = await UploadRequestModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Không tìm thấy yêu cầu upload' });
    if (!doc.storedPath || !fs.existsSync(doc.storedPath)) {
      return res.status(404).json({ error: 'File Excel gốc không còn tồn tại trên máy chủ' });
    }

    res.download(doc.storedPath, doc.filename);
  } catch (e: any) {
    console.error('downloadUpload error:', e);
    res.status(500).json({ error: e?.message || 'Lỗi khi tải file Excel' });
  }
};


