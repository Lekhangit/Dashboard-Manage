/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ---- Auth / phân quyền ----
// Danh sách vai trò dùng chung cho cả backend và frontend.
// (Giai đoạn này chỉ lưu & hiển thị vai trò; quyền hạn chi tiết sẽ phát triển sau.)
export type Role = 'admin' | 'gddh' | 'bgd' | 'cht' | 'pm' | 'qa' | 'thu_ky' | 'tai_chinh' | 'nhan_su';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Quản trị hệ thống',
  gddh: 'Giám đốc điều hành',
  bgd: 'Ban giám đốc',
  cht: 'Chỉ huy trưởng',
  pm: 'PM (Quản lý dự án)',
  qa: 'QA / QC',
  thu_ky: 'Thư ký',
  tai_chinh: 'Tài chính',
  nhan_su: 'Nhân sự',
};

export const ROLE_ORDER: Role[] = ['admin', 'gddh', 'bgd', 'cht', 'pm', 'qa', 'thu_ky', 'tai_chinh', 'nhan_su'];

// Các quyền hạn chi tiết (permission) có thể bật/tắt cho từng người.
export type PermissionKey = 'view_compensation';
export const PERMISSIONS: Record<PermissionKey, string> = {
  view_compensation: 'Chi phí & Lương đãi ngộ',
};

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  active?: boolean;
  permissions?: string[];
  createdAt?: string;
}

// admin & Giám đốc điều hành luôn có mọi quyền; người khác cần được cấp cụ thể.
export const hasPerm = (u: { role: Role; permissions?: string[] } | null | undefined, key: PermissionKey): boolean =>
  !!u && (u.role === 'admin' || u.role === 'gddh' || u.role === 'bgd' || (u.permissions || []).includes(key));

export interface Project {
  id: string; name: string; bch: number; revenue: number; avgBch: number;
  ipc: number; ipcPct: number; budget: number; budgetUsed: number; budgetPct: number;
  planStart: string; planEnd: string; planDays: number;
  actualStart: string; actualEnd: string; actualDays: number;
  progressVsPlanPct: number; bchEvalPct: number; progressPct: number; status: string;
}
export interface Employee {
  tt: number; department: string; project: string; name: string; title: string;
  plan: string; jobDesc: string; kpi: string;
  salary?: string; insurance?: string; allowance?: string; cost?: string;
  level: string; subsystem: string; field: string; education: string; cchn: string; rank: string;
}
export interface Contract {
  project: string; code: string; issueDate: string; amount: number; budget: number;
  content: string; note: string; status: string;
}
export interface Ipc {
  project: string; ipcNo: string; date: string; content: string; amount: number;
  vat: number; total: number; actualReceived: number; received: number; remaining: number;
  status: string; note: string;
}
export interface BudgetItem {
  project: string; pkg: string; category: string; dept: string; desc: string;
  plan: number; actual: number; variance: number; usagePct: number; status: string;
}
export interface Issue {
  id: string; loggedDate: string; responseDays: string; project: string; assignee: string;
  problem: string; solution: string; result: string; voBoq: number; budget: number;
  plannedDate: string; actualDate: string; status: string;
}
export interface Todo {
  tt: number; group: string; project: string; content: string; start: string; end: string;
  days: number; status: string; important: boolean; urgent: boolean;
  performer: string; coordinator: string; actual: string; earlyLate: string; note: string;
}
export interface Analytics {
  ipcByProject: { project: string; count: number; value: number }[];
  budgetByDept: { dept: string; plan: number; actual: number; usagePct: number }[];
  headcountByLevel: { level: string; count: number }[];
  headcountByField: { field: string; count: number }[];
  headcountByProject: { project: string; count: number }[];
  issueStatus: { status: string; count: number }[];
  todoStatus: { status: string; count: number }[];
  totals: { revenue: number; budget: number; budgetUsed: number; ipc: number; headcount: number };
}

export interface CashFlowMonth {
  month: string;
  plannedIn: number;
  plannedOut: number;
  actualIn: number;
  actualOut: number;
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  project: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  dueDate: string;
  status: 'Completed' | 'Pending' | 'Overdue';
}

export interface RiskAndKpi {
  id: string;
  projectId: string;
  projectName: string;
  riskText: string;
  solutionText: string;
  kpiText: string;
  assignee: string;
  status: 'Unresolved' | 'In Progress' | 'Resolved';
  sourceIssueId?: string;
}

