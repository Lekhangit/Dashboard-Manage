/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  LayoutDashboard,
  FileText,
  Wallet,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  Users2,
  TrendingUp,
  ClipboardList,
} from 'lucide-react';
import { Project, Employee, Contract, Ipc, BudgetItem, Issue, Todo, AuthUser, hasPerm } from '../types';

interface ProjectPortalProps {
  project: Project;
  employees: Employee[];
  contracts: Contract[];
  ipc: Ipc[];
  budget: BudgetItem[];
  issues: Issue[];
  todos: Todo[];
  authUser?: AuthUser | null;
  onBack?: () => void;
}

// ---- Shared formatting helpers (no fabricated values — blanks stay blank) ----
const money = (n?: number | null): string => {
  if (n === null || n === undefined || n === 0) return '—';
  return n.toLocaleString('vi-VN') + ' đ';
};

// Salary is stored as free-text on Employee (may be a pre-formatted string from the source sheet).
const moneyText = (s?: string | null): string => {
  if (!s || !String(s).trim()) return '—';
  const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
  if (!isNaN(n) && n !== 0) return Math.round(n).toLocaleString('vi-VN') + ' đ';
  return String(s).trim() === '0' ? '—' : String(s).trim();
};

const pct = (n?: number | null): string => {
  if (n === null || n === undefined) return '—';
  return `${n}%`;
};

const count = (n?: number | null): string => {
  if (n === null || n === undefined || n === 0) return '—';
  return n.toLocaleString('vi-VN');
};

const txt = (s?: string | number | null): string => {
  if (s === null || s === undefined) return '—';
  const str = String(s).trim();
  return str ? str : '—';
};

const isOnTrack = (status: string) => /trong/i.test(status);
const isLate = (status: string) => /trễ/i.test(status);

const statusPillClass = (status: string): string => {
  if (isOnTrack(status)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (isLate(status)) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

// ---- KPI stat card (visual language matches Overview.tsx) ----
const StatCard: React.FC<{ icon: any; label: string; value: string; accent?: string }> = ({ icon: Icon, label, value, accent }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#104e8b]/10 text-[#104e8b]">
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 truncate">{label}</span>
      <span className={`block text-lg font-black truncate ${accent || 'text-slate-800'}`}>{value}</span>
    </div>
  </div>
);

// ---- Generic project-scoped data table (shared table chrome across tabs) ----
interface Column<T> {
  header: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => React.ReactNode;
}

function DataTable<T>({ columns, rows, minWidthClass, emptyLabel }: {
  columns: Column<T>[];
  rows: T[];
  minWidthClass: string;
  emptyLabel: string;
}) {
  const alignClass = (a?: 'left' | 'right' | 'center') => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : '');
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-left border-collapse text-xs ${minWidthClass}`}>
        <thead>
          <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-100">
            {columns.map((c, i) => (
              <th key={i} className={`py-3 px-4 ${alignClass(c.align)}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
              {columns.map((c, ci) => (
                <td key={ci} className={`py-3 px-4 ${alignClass(c.align)}`}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="py-10 text-center text-slate-400 font-medium">{emptyLabel}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type TabKey = 'overview' | 'contracts' | 'ipc' | 'budget' | 'issues' | 'team' | 'todos';

export const ProjectPortal: React.FC<ProjectPortalProps> = ({
  project, employees, contracts, ipc, budget, issues, todos, authUser, onBack,
}) => {
  const [tab, setTab] = useState<TabKey>('overview');

  // Filter each dataset to this project by matching the "DỰ ÁN" name string.
  // (Idempotent if the caller already pre-filtered — same join key on both sides.)
  const projTeam = employees.filter(e => e.project === project.name);
  const projContracts = contracts.filter(c => c.project === project.name);
  const projIpc = ipc.filter(i => i.project === project.name);
  const projBudget = budget.filter(b => b.project === project.name);
  const projIssues = issues.filter(i => i.project === project.name);
  const projTodos = todos.filter(t => t.project === project.name);

  const showSalary = hasPerm(authUser, 'view_compensation');

  const TABS: { key: TabKey; label: string; icon: any; badge?: number }[] = [
    { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { key: 'contracts', label: 'Hợp đồng', icon: FileText, badge: projContracts.length },
    { key: 'ipc', label: 'IPC', icon: Wallet, badge: projIpc.length },
    { key: 'budget', label: 'Ngân sách', icon: PiggyBank, badge: projBudget.length },
    { key: 'issues', label: 'Vấn đề', icon: AlertTriangle, badge: projIssues.length },
    { key: 'team', label: 'Nhân sự', icon: Users2, badge: projTeam.length },
    { key: 'todos', label: 'Công việc', icon: CheckCircle2, badge: projTodos.length },
  ];

  return (
    <div className="space-y-4">
      {/* Header banner */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs p-5">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#104e8b] mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại danh mục dự án
          </button>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Building2 className="w-5 h-5 text-[#104e8b] shrink-0" />
              <h2 className="text-lg font-black text-slate-800 truncate">{project.name || 'Hồ sơ dự án'}</h2>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusPillClass(project.status || '')}`}>
                {project.status || '—'}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-[11px] text-slate-500 font-semibold">
              <span>BCH: <b className="text-slate-700 font-mono">{count(project.bch)}</b></span>
              <span>Kế hoạch: <b className="text-slate-700 font-mono">{txt(project.planStart)} – {txt(project.planEnd)}</b></span>
              <span>Thực tế: <b className="text-slate-700 font-mono">{txt(project.actualStart)} – {txt(project.actualEnd)}</b></span>
            </div>
          </div>
        </div>

        {/* Key KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <StatCard icon={TrendingUp} label="Doanh thu" value={money(project.revenue)} accent="text-[#104e8b]" />
          <StatCard icon={Wallet} label="Ngân sách / Đã dùng" value={`${money(project.budget)} / ${money(project.budgetUsed)}`} />
          <StatCard icon={PiggyBank} label="% Sử dụng ngân sách" value={pct(project.budgetPct)} />
          <StatCard icon={FileText} label="IPC / % IPC" value={`${money(project.ipc)} (${pct(project.ipcPct)})`} />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        <div className="flex overflow-x-auto border-b border-[#E5E7EB] bg-slate-50/50">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                  active ? 'border-[#104e8b] text-[#104e8b] bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
                {typeof t.badge === 'number' && t.badge > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${active ? 'bg-[#104e8b]/10 text-[#104e8b]' : 'bg-slate-200 text-slate-500'}`}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4">
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard icon={FileText} label="Hợp đồng" value={count(projContracts.length)} />
                <StatCard icon={Wallet} label="Dòng IPC" value={count(projIpc.length)} />
                <StatCard icon={PiggyBank} label="Hạng mục NS" value={count(projBudget.length)} />
                <StatCard icon={AlertTriangle} label="Vấn đề" value={count(projIssues.length)} />
                <StatCard icon={Users2} label="Nhân sự" value={count(projTeam.length)} />
                <StatCard icon={ClipboardList} label="Công việc" value={count(projTodos.length)} />
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
                <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Tiến độ tổng thể</span>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#104e8b] h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(project.progressPct || 0, 100)}%` }} />
                  </div>
                  <span className="font-mono text-xs text-slate-600 font-bold w-12 text-right">{pct(project.progressPct)}</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'contracts' && (
            <DataTable<Contract>
              minWidthClass="min-w-[760px]"
              emptyLabel="Chưa có dữ liệu hợp đồng cho dự án này."
              rows={projContracts}
              columns={[
                { header: 'Số hợp đồng', render: (r) => <span className="font-bold text-slate-800">{txt(r.code)}</span> },
                { header: 'Ngày phát hành', render: (r) => txt(r.issueDate) },
                { header: 'Số tiền', align: 'right', render: (r) => <span className="font-mono font-bold text-slate-700">{money(r.amount)}</span> },
                { header: 'Ngân sách', align: 'right', render: (r) => <span className="font-mono text-slate-600">{money(r.budget)}</span> },
                { header: 'Nội dung', render: (r) => <span className="max-w-[280px] truncate block" title={r.content}>{txt(r.content)}</span> },
                {
                  header: 'Tình trạng', align: 'center', render: (r) => (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusPillClass(r.status || '')}`}>{r.status || '—'}</span>
                  ),
                },
              ]}
            />
          )}

          {tab === 'ipc' && (
            <DataTable<Ipc>
              minWidthClass="min-w-[1100px]"
              emptyLabel="Chưa có dữ liệu IPC cho dự án này."
              rows={projIpc}
              columns={[
                { header: 'Số IPC', render: (r) => <span className="font-bold text-slate-800">{txt(r.ipcNo)}</span> },
                { header: 'Ngày', render: (r) => txt(r.date) },
                { header: 'Nội dung', render: (r) => <span className="max-w-[220px] truncate block" title={r.content}>{txt(r.content)}</span> },
                { header: 'Số tiền', align: 'right', render: (r) => <span className="font-mono text-slate-700">{money(r.amount)}</span> },
                { header: 'Thuế', align: 'right', render: (r) => <span className="font-mono text-slate-600">{money(r.vat)}</span> },
                { header: 'Cộng', align: 'right', render: (r) => <span className="font-mono font-bold text-slate-700">{money(r.total)}</span> },
                { header: 'Thực nhận', align: 'right', render: (r) => <span className="font-mono text-slate-600">{money(r.actualReceived)}</span> },
                { header: 'Đã nhận', align: 'right', render: (r) => <span className="font-mono text-slate-600">{money(r.received)}</span> },
                { header: 'Còn lại', align: 'right', render: (r) => <span className="font-mono font-bold text-amber-600">{money(r.remaining)}</span> },
                {
                  header: 'Tình trạng', align: 'center', render: (r) => (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusPillClass(r.status || '')}`}>{r.status || '—'}</span>
                  ),
                },
              ]}
            />
          )}

          {tab === 'budget' && (
            <DataTable<BudgetItem>
              minWidthClass="min-w-[980px]"
              emptyLabel="Chưa có dữ liệu ngân sách cho dự án này."
              rows={projBudget}
              columns={[
                { header: 'Gói thầu', render: (r) => <span className="font-bold text-slate-800">{txt(r.pkg)}</span> },
                { header: 'Phân loại', render: (r) => txt(r.category) },
                { header: 'Phòng/ban', render: (r) => txt(r.dept) },
                { header: 'Diễn giải', render: (r) => <span className="max-w-[240px] truncate block" title={r.desc}>{txt(r.desc)}</span> },
                { header: 'Kế hoạch', align: 'right', render: (r) => <span className="font-mono text-slate-700">{money(r.plan)}</span> },
                { header: 'Thực tế', align: 'right', render: (r) => <span className="font-mono font-bold text-slate-700">{money(r.actual)}</span> },
                { header: 'Chênh lệch', align: 'right', render: (r) => <span className="font-mono text-slate-600">{money(r.variance)}</span> },
                { header: '% Sử dụng', align: 'right', render: (r) => <span className="font-mono font-bold text-slate-600">{pct(r.usagePct)}</span> },
                {
                  header: 'Tình trạng', align: 'center', render: (r) => (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusPillClass(r.status || '')}`}>{r.status || '—'}</span>
                  ),
                },
              ]}
            />
          )}

          {tab === 'issues' && (
            <DataTable<Issue>
              minWidthClass="min-w-[1180px]"
              emptyLabel="Chưa có dữ liệu vấn đề cho dự án này."
              rows={projIssues}
              columns={[
                { header: 'Ngày ghi nhận', render: (r) => txt(r.loggedDate) },
                { header: 'Người phụ trách', render: (r) => <span className="font-bold text-slate-800">{txt(r.assignee)}</span> },
                { header: 'Vấn đề', render: (r) => <span className="max-w-[220px] truncate block" title={r.problem}>{txt(r.problem)}</span> },
                { header: 'Giải pháp', render: (r) => <span className="max-w-[220px] truncate block" title={r.solution}>{txt(r.solution)}</span> },
                { header: 'VO/BOQ', align: 'right', render: (r) => <span className="font-mono text-slate-600">{money(r.voBoq)}</span> },
                { header: 'Ngân sách', align: 'right', render: (r) => <span className="font-mono text-slate-600">{money(r.budget)}</span> },
                { header: 'Dự kiến', render: (r) => txt(r.plannedDate) },
                { header: 'Thực tế', render: (r) => txt(r.actualDate) },
                {
                  header: 'Tình trạng', align: 'center', render: (r) => (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusPillClass(r.status || '')}`}>{r.status || '—'}</span>
                  ),
                },
              ]}
            />
          )}

          {tab === 'team' && (
            <DataTable<Employee>
              minWidthClass={showSalary ? 'min-w-[760px]' : 'min-w-[640px]'}
              emptyLabel="Chưa có dữ liệu nhân sự cho dự án này."
              rows={projTeam}
              columns={[
                { header: 'TT', align: 'center', render: (r) => <span className="font-mono text-slate-400">{r.tt || '—'}</span> },
                { header: 'Họ và tên', render: (r) => <span className="font-bold text-slate-800">{txt(r.name)}</span> },
                { header: 'Chức danh', render: (r) => txt(r.title) },
                { header: 'Cấp bậc', render: (r) => txt(r.level) },
                { header: 'Ngành', render: (r) => txt(r.field) },
                ...(showSalary ? [{ header: 'Lương', align: 'right' as const, render: (r: Employee) => <span className="font-mono font-bold text-slate-700">{moneyText(r.salary)}</span> }] : []),
              ]}
            />
          )}

          {tab === 'todos' && (
            <DataTable<Todo>
              minWidthClass="min-w-[980px]"
              emptyLabel="Chưa có dữ liệu công việc cho dự án này."
              rows={projTodos}
              columns={[
                { header: 'Nhóm', render: (r) => <span className="font-bold text-slate-800">{txt(r.group)}</span> },
                { header: 'Nội dung', render: (r) => <span className="max-w-[260px] truncate block" title={r.content}>{txt(r.content)}</span> },
                { header: 'Bắt đầu', render: (r) => txt(r.start) },
                { header: 'Kết thúc', render: (r) => txt(r.end) },
                { header: 'Thực hiện', render: (r) => txt(r.performer) },
                {
                  header: 'Trạng thái', align: 'center', render: (r) => (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusPillClass(r.status || '')}`}>{r.status || '—'}</span>
                  ),
                },
                { header: 'Sớm/Trễ', render: (r) => txt(r.earlyLate) },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
};
