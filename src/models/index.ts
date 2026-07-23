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

// 1. Project (Timeline + Budget merged)
const ProjectSchema = new Schema({
  id: { type: String, index: true },
  name: String,
  fullName: String,
  manager: String,
  budget: { type: Number, default: 0 },
  spent: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  ipcActual: { type: Number, default: 0 },
  ipcPlanned: { type: Number, default: 0 },
  outstandingBudget: { type: Number, default: 0 },
  bqBch: { type: Number, default: 0 },
  bch: { type: Number, default: 0 },
  pctPlan: { type: Number, default: 0 },
  progressPlanned: { type: Number, default: 0 },
  progressActual: { type: Number, default: 0 },
  planStart: String, planEnd: String, planDays: Number,
  actualStart: String, actualEnd: String, actualDays: Number,
  varStart: Number, varEnd: Number, statusScore: Number,
  startDate: String, endDate: String,
  costPlan: { type: Number, default: 0 },
  costActual: { type: Number, default: 0 },
  variance: { type: Number, default: 0 },
  status: String,
}, opts);
export const ProjectModel = makeModel('TplProject', ProjectSchema, 'tpl_projects');

// 2. Employee (Resource right table)
const EmployeeSchema = new Schema({
  id: Number,
  department: String, name: String, title: String, description: String,
  kpi: String, salary: String, insurance: String, allowance: String, cost: String,
  level: String, segment: String, branch: String, qualification: String,
  certifications: String, grade: String, status: String,
}, opts);
export const EmployeeModel = makeModel('TplEmployee', EmployeeSchema, 'tpl_employees');

// 3. ResourceSummary (Resource left table) - feeds HeadcountStats
const ResourceSummarySchema = new Schema({
  id: String, name: String, value: Number,
  roleCounts: { type: Schema.Types.Mixed, default: {} },
  focus: { type: String, default: '' },
  type: { type: String, default: 'Project' },
  status: { type: String, default: '' },
}, opts);
export const ResourceSummaryModel = makeModel('TplResourceSummary', ResourceSummarySchema, 'tpl_resource_summary');

// 4. Contract (per-project sheet contract block)
const ContractSchema = new Schema({
  id: String, projectId: { type: String, index: true }, projectName: String,
  name: String, signDate: String, amount: { type: Number, default: 0 },
  ipcAmount: { type: Number, default: 0 }, budget: { type: Number, default: 0 },
  ipcBreakdown: { type: Schema.Types.Mixed, default: {} },
  startDate: String, endDate: String, duration: String,
  content: String, status: String, kind: String,
}, opts);
export const ContractModel = makeModel('TplContract', ContractSchema, 'tpl_contracts');

// 5. Issue (per-project issue blocks + Old_Pro)
const IssueSchema = new Schema({
  id: String, projectId: { type: String, index: true }, projectName: String,
  loggedDate: String, assignee: String, item: String,
  issueText: String, actionText: String, resultText: String,
  voAmount: { type: Number, default: 0 }, budget: { type: Number, default: 0 },
  targetComplete: String, actualComplete: String, status: String,
  source: String,
}, opts);
export const IssueModel = makeModel('TplIssue', IssueSchema, 'tpl_issues');

// 6. Milestone
const MilestoneSchema = new Schema({
  id: String, projectId: { type: String, index: true }, name: String,
  dueDate: String, status: String,
}, opts);
export const MilestoneModel = makeModel('TplMilestone', MilestoneSchema, 'tpl_milestones');

// 7. CashFlow (per-project monthly cashflow block)
const CashFlowSchema = new Schema({
  projectId: { type: String, index: true }, month: String,
  plannedIn: { type: Number, default: 0 }, plannedOut: { type: Number, default: 0 },
  actualIn: { type: Number, default: 0 }, actualOut: { type: Number, default: 0 },
}, opts);
export const CashFlowModel = makeModel('TplCashFlow', CashFlowSchema, 'tpl_cashflow');

// 7b. CashFlowDetail (full monthly cashflow model per project: planned + actual)
const CashFlowDetailSchema = new Schema({
  projectId: { type: String, index: true },
  params: { type: Schema.Types.Mixed, default: {} },
  planned: { type: [Schema.Types.Mixed], default: [] },
  actual: { type: [Schema.Types.Mixed], default: [] },
}, opts);
export const CashFlowDetailModel = makeModel('TplCashFlowDetail', CashFlowDetailSchema, 'tpl_cashflow_detail');

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
