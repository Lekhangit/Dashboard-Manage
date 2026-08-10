import mongoose, { Schema } from 'mongoose';

/**
 * Typed domain models for the TPL dashboard.
 * Each collection stores documents already in the shape the frontend consumes
 * (camelCase fields matching src/types.ts), so controllers can return them as-is.
 *
 * A single Excel upload performs a CLEAN REPLACE: every collection below is
 * cleared and re-inserted from the freshly parsed workbook.
 */

const opts = { versionKey: false };
const makeModel = <T>(name: string, schema: Schema, collection: string) =>
  (mongoose.models[name] as mongoose.Model<T>) || mongoose.model<T>(name, schema, collection);

// 1. Project
const ProjectSchema = new Schema({
  id: { type: String, index: true }, name: String,
  bch: { type: Number, default: 0 }, revenue: { type: Number, default: 0 },
  avgBch: { type: Number, default: 0 }, ipc: { type: Number, default: 0 },
  ipcPct: { type: Number, default: 0 }, budget: { type: Number, default: 0 },
  budgetUsed: { type: Number, default: 0 }, budgetPct: { type: Number, default: 0 },
  planStart: String, planEnd: String, planDays: { type: Number, default: 0 },
  actualStart: String, actualEnd: String, actualDays: { type: Number, default: 0 },
  progressVsPlanPct: { type: Number, default: 0 }, bchEvalPct: { type: Number, default: 0 },
  progressPct: { type: Number, default: 0 }, status: String,
}, opts);
export const ProjectModel = makeModel('TplProject', ProjectSchema, 'tpl_projects');

// 2. Employee
const EmployeeSchema = new Schema({
  tt: Number, department: String, project: { type: String, index: true },
  name: String, title: String, plan: String, jobDesc: String, kpi: String,
  salary: String, insurance: String, allowance: String, cost: String,
  level: String, subsystem: String, field: String, education: String, cchn: String, rank: String,
}, opts);
export const EmployeeModel = makeModel('TplEmployee', EmployeeSchema, 'tpl_employees');

// 3. Contract
const ContractSchema = new Schema({
  project: { type: String, index: true }, code: String, issueDate: String,
  amount: { type: Number, default: 0 }, budget: { type: Number, default: 0 },
  content: String, note: String, status: String,
}, opts);
export const ContractModel = makeModel('TplContract', ContractSchema, 'tpl_contracts');

// 4. Ipc
const IpcSchema = new Schema({
  project: { type: String, index: true }, ipcNo: String, date: String, content: String,
  amount: { type: Number, default: 0 }, vat: { type: Number, default: 0 }, total: { type: Number, default: 0 },
  actualReceived: { type: Number, default: 0 }, received: { type: Number, default: 0 },
  remaining: { type: Number, default: 0 }, status: String, note: String,
}, opts);
export const IpcModel = makeModel('TplIpc', IpcSchema, 'tpl_ipc');

// 5. BudgetItem
const BudgetItemSchema = new Schema({
  project: { type: String, index: true }, pkg: String, category: String, dept: String, desc: String,
  plan: { type: Number, default: 0 }, actual: { type: Number, default: 0 },
  variance: { type: Number, default: 0 }, usagePct: { type: Number, default: 0 }, status: String,
}, opts);
export const BudgetItemModel = makeModel('TplBudgetItem', BudgetItemSchema, 'tpl_budget_items');

// 6. Issue
const IssueSchema = new Schema({
  id: { type: String, index: true }, loggedDate: String, responseDays: String,
  project: { type: String, index: true }, assignee: String, problem: String, solution: String,
  result: String, voBoq: { type: Number, default: 0 }, budget: { type: Number, default: 0 },
  plannedDate: String, actualDate: String, status: String,
}, opts);
export const IssueModel = makeModel('TplIssue', IssueSchema, 'tpl_issues');

// 7. Todo
const TodoSchema = new Schema({
  tt: Number, group: String, project: String, content: String, start: String, end: String,
  days: { type: Number, default: 0 }, status: String, important: Boolean, urgent: Boolean,
  performer: String, coordinator: String, actual: String, earlyLate: String, note: String,
}, opts);
export const TodoModel = makeModel('TplTodo', TodoSchema, 'tpl_todos');

// 8. ActivityLog (derived from real issue rows)
const ActivityLogSchema = new Schema({
  id: String, user: String, action: String, target: String,
  timestamp: String, project: String,
}, opts);
export const ActivityLogModel = makeModel('TplActivityLog', ActivityLogSchema, 'tpl_activity');

// 10. User (auth + phân quyền)
const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, default: '' },
  role: { type: String, default: 'thu_ky' },
  permissions: { type: [String], default: [] },
  salt: String,
  hash: String,
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
}, opts);
export const UserModel = makeModel('TplUser', UserSchema, 'tpl_users');

// 11. UploadRequest — yêu cầu upload Excel chờ admin + GĐĐH duyệt mới áp dụng
const UploadRequestSchema = new Schema({
  filename: String,
  storedPath: String,
  fileData: Buffer,
  mimeType: String,
  requestedBy: String,       // username người đăng
  requestedByName: String,   // họ tên người đăng
  requestedByRole: String,
  requestedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'pending' }, // pending | applied | rejected
  adminApproved: { type: Boolean, default: false },
  adminBy: String,
  gddhApproved: { type: Boolean, default: false },
  gddhBy: String,
  appliedAt: Date,
  appliedStats: { type: Schema.Types.Mixed },
  decidedBy: String,
  note: String,
}, opts);
export const UploadRequestModel = makeModel('TplUploadRequest', UploadRequestSchema, 'tpl_upload_requests');

// 12. IssueComment — chat "Thảo luận chỉ đạo" theo từng vấn đề (chỉ CEO Phương/GĐĐH & CHT được gửi)
const IssueCommentSchema = new Schema({
  issueId: { type: String, index: true },
  user: String,       // username
  userName: String,   // họ tên
  role: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
}, opts);
export const IssueCommentModel = makeModel('TplIssueComment', IssueCommentSchema, 'tpl_issue_comments');

// 9. ImportHistory (audit of uploads)
const ImportHistorySchema = new Schema({
  filename: String, user: String, sheets: Number,
  projects: Number, employees: Number, contracts: Number, issues: Number,
  milestones: Number, cashflow: Number, duration: Number,
  createdAt: { type: Date, default: Date.now },
}, opts);
export const ImportHistoryModel = makeModel('TplImportHistory', ImportHistorySchema, 'tpl_import_history');
