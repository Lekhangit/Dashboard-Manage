import { Request, Response } from 'express';
import {
  ProjectModel, EmployeeModel, ResourceSummaryModel, ContractModel,
  IssueModel, MilestoneModel, CashFlowModel, CashFlowDetailModel, ActivityLogModel, UserModel,
} from '../models';
import { userHasPermission } from '../services/authService';

// Map the frontend category name -> its typed collection.
const MODELS: Record<string, any> = {
  Projects: ProjectModel,
  Employees: EmployeeModel,
  ResourceSummary: ResourceSummaryModel,
  Contracts: ContractModel,
  Issues: IssueModel,
  Milestones: MilestoneModel,
  CashFlow: CashFlowModel,
  CashflowDetail: CashFlowDetailModel,
  Activity: ActivityLogModel,
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
    if (category === 'Employees') {
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
  } catch (error: any) {
    console.error('Get category data error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

// Dữ liệu Chi phí & Lương đãi ngộ (đầy đủ). Route đã gắn requirePermission('view_compensation').
export const getCompensation = async (_req: Request, res: Response) => {
  try {
    const docs = await EmployeeModel.find({}).lean();
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
