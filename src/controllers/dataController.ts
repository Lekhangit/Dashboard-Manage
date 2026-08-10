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
export const getAnalytics = async (_req: Request, res: Response) => {
  try {
    const [projects, employees, contracts, ipc, budget, issues, todos] = await Promise.all([
      ProjectModel.find({}).lean(), EmployeeModel.find({}).lean(), ContractModel.find({}).lean(),
      IpcModel.find({}).lean(), BudgetItemModel.find({}).lean(), IssueModel.find({}).lean(), TodoModel.find({}).lean(),
    ]);
    res.json(computeAnalytics({ projects, employees, contracts, ipc, budget, issues, todos } as any));
  } catch (e: any) {
    console.error('Get analytics error:', e);
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
