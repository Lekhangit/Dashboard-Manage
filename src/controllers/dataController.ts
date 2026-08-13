import { Request, Response } from 'express';
import { ProjectModel, EmployeeModel, ContractModel, IpcModel, BudgetItemModel,
  IssueModel, TodoModel, ActivityLogModel, UserModel, PivotModel } from '../models';
import { userHasPermission } from '../services/authService';
import { computeAnalytics } from '../services/templateImportService';

// Map the frontend category name -> its typed collection (lowercase keys).
const MODELS: Record<string, any> = {
  projects: ProjectModel, employees: EmployeeModel, contracts: ContractModel,
  ipc: IpcModel, budget: BudgetItemModel, issues: IssueModel, todos: TodoModel,
  activity: ActivityLogModel, pivot: PivotModel,
};
// Các cột lương/chi phí nhạy cảm — chỉ lộ qua endpoint /data/compensation (có phân quyền).
const COMP_FIELDS = ['salary', 'insurance', 'allowance', 'cost'];

export const getCategoryData = async (req: Request, res: Response) => {
  try {
    const category = req.params.category;
    const Model = MODELS[category];
    // Categories with no source in the template (e.g. Risks) return [] rather than error.
    if (!Model) return res.json([]);
    let docs = await Model.find({}).lean();
    // Ẩn cột lương/chi phí khỏi danh sách nhân sự — TRỪ người có quyền view_compensation
    if (category === 'employees') {
      const auth = (req as any).auth;
      const user = auth ? await UserModel.findById(auth.id).lean() : null;
      if (!userHasPermission(user, 'view_compensation')) {
        docs = docs.map((d: any) => {
          const c = { ...d };
          COMP_FIELDS.forEach((f) => delete c[f]);
          return c;
        });
      }
    }
    res.json(docs);
  } catch (e: any) {
    console.error('Get category data error:', e);
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
};

// Dữ liệu tổng hợp phục vụ Dashboard/Analytics.
// "Tổng doanh thu" theo Excel = giá trị "Đã ký" của khối Hợp đồng/PL/VO trong
// sheet Pivot (đọc thẳng từ file, không tính lại).
function signedRevenueFromPivot(grid: string[][]): number {
  if (!Array.isArray(grid)) return 0;
  for (const row of grid) {
    for (let ci = 0; ci < row.length; ci++) {
      const cell = String(row[ci] ?? '').trim();
      if (/^₫[\d.,]+$/.test(cell)) {
        for (let k = Math.max(0, ci - 3); k < ci; k++) {
          if (/^đã ký$/i.test(String(row[k] ?? '').trim())) {
            return parseInt(cell.replace(/[^\d]/g, ''), 10) || 0;
          }
        }
      }
    }
  }
  return 0;
}

export const getAnalytics = async (_req: Request, res: Response) => {
  try {
    const [projects, employees, contracts, ipc, budget, issues, todos, pivotDoc] = await Promise.all([
      ProjectModel.find({}).lean(), EmployeeModel.find({}).lean(), ContractModel.find({}).lean(),
      IpcModel.find({}).lean(), BudgetItemModel.find({}).lean(), IssueModel.find({}).lean(), TodoModel.find({}).lean(),
      PivotModel.findOne({}).lean(),
    ]);
    const analytics = computeAnalytics({ projects, employees, contracts, ipc, budget, issues, todos } as any);
    analytics.totals.signedRevenue = signedRevenueFromPivot((pivotDoc as any)?.grid || []);
    res.json(analytics);
  } catch (e: any) {
    console.error('Get analytics error:', e);
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
};

// ---- Kanban: lưu trạng thái khi kéo-thả (cột = tình trạng) ----
// Chỉ nhận đúng 4 giá trị cột, tránh ghi rác vào DB.
const KANBAN_LANES = ['Opened', 'Pending', 'On-going', 'Closed'];

export const updateIssueStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const status = String(req.body?.status || '').trim();
    if (!KANBAN_LANES.includes(status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    const r = await IssueModel.updateOne({ id }, { $set: { status } });
    if (!r.matchedCount) return res.status(404).json({ error: 'Không tìm thấy vấn đề' });
    res.json({ ok: true, id, status });
  } catch (e: any) {
    console.error('Update issue status error:', e);
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
};

export const updateTodoStatus = async (req: Request, res: Response) => {
  try {
    const status = String(req.body?.status || '').trim();
    const tt = Number(req.body?.tt);
    const content = String(req.body?.content ?? '');
    if (!KANBAN_LANES.includes(status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    if (!Number.isFinite(tt)) return res.status(400).json({ error: 'Thiếu định danh công việc' });
    // Khớp theo tt + nội dung để đúng dòng (tt có thể trùng giữa các nhóm).
    const filter: any = content ? { tt, content } : { tt };
    const r = await TodoModel.updateOne(filter, { $set: { status } });
    if (!r.matchedCount) return res.status(404).json({ error: 'Không tìm thấy công việc' });
    res.json({ ok: true, tt, status });
  } catch (e: any) {
    console.error('Update todo status error:', e);
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
};

// Dữ liệu Chi phí & Lương đãi ngộ (đầy đủ). Route đã gắn requirePermission('view_compensation').
export const getCompensation = async (_req: Request, res: Response) => {
  try {
    const docs = await EmployeeModel.find({}).lean();
    res.json(docs);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
};
