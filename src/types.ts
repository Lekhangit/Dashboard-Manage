/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ---- Auth / phân quyền ----
// Danh sách vai trò dùng chung cho cả backend và frontend.
// (Giai đoạn này chỉ lưu & hiển thị vai trò; quyền hạn chi tiết sẽ phát triển sau.)
export type Role = 'admin' | 'gddh' | 'cht' | 'pm' | 'qa' | 'thu_ky' | 'tai_chinh' | 'nhan_su';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Quản trị hệ thống',
  gddh: 'Giám đốc điều hành',
  cht: 'Chỉ huy trưởng',
  pm: 'PM (Quản lý dự án)',
  qa: 'QA / QC',
  thu_ky: 'Thư ký',
  tai_chinh: 'Tài chính',
  nhan_su: 'Nhân sự',
};

export const ROLE_ORDER: Role[] = ['admin', 'gddh', 'cht', 'pm', 'qa', 'thu_ky', 'tai_chinh', 'nhan_su'];

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
  !!u && (u.role === 'admin' || u.role === 'gddh' || (u.permissions || []).includes(key));

export interface Project {
  id: string;
  name: string;
  fullName: string;
  manager: string;
  budget: number;
  spent: number;
  ipcPlanned: number;
  ipcActual: number;
  progressPlanned: number;
  progressActual: number;
  startDate: string;
  endDate: string;
  status: 'On Track' | 'At Risk' | 'Delayed' | 'Completed';
  revenue: number;
  costPlan: number;
  costActual: number;
  outstandingBudget: number;
  variance: number;
}

export interface Employee {
  id: number;
  department: string;
  name: string;
  title: string;
  description: string;
  kpi: string;
  salary: string;
  insurance: string;
  allowance: string;
  cost: string;
  level: string;
  segment: string;
  branch: string;
  qualification: string;
  certifications: string;
  grade: string;
  status: 'Active' | 'On Leave' | 'Standby';
}

export interface Contract {
  id: string;
  projectId: string;
  name: string;
  signDate: string;
  amount: number;
  ipcAmount: number;
  budget: number;
  startDate: string;
  endDate: string;
  content: string;
  status: 'Pending' | 'Active' | 'Completed';
}

export interface Issue {
  id: string;
  projectId: string;
  projectName: string;
  loggedDate: string;
  assignee: string;
  issueText: string;
  actionText: string;
  resultText: string;
  voAmount: number;
  budget: number;
  targetComplete: string;
  actualComplete: string;
  status: 'Opened' | 'In Progress' | 'Closed';
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

