/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  TrendingUp, Wallet, PiggyBank, FileText, Users2,
  LayoutDashboard, BarChart3,
} from 'lucide-react';
import { Project, Employee, Analytics, Issue, Todo } from '../types';

interface OverviewProps {
  projects: Project[];
  employees: Employee[];
  analytics: Analytics | null;
  issues: Issue[];
  todos: Todo[];
}

// ---- Shared formatting helpers (no fabricated values) ----
const money = (n?: number | null): string => {
  if (n === null || n === undefined || n === 0) return '—';
  return n.toLocaleString('vi-VN') + ' đ';
};

const pct = (n?: number | null): string => {
  if (n === null || n === undefined) return '—';
  return `${n}%`;
};

const count = (n?: number | null): string => {
  if (n === null || n === undefined || n === 0) return '—';
  return n.toLocaleString('vi-VN');
};

const isOnTrack = (status: string) => /trong/i.test(status);
const isLate = (status: string) => /trễ/i.test(status);

const statusPillClass = (status: string): string => {
  if (isOnTrack(status)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (isLate(status)) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

// ---- KPI stat card ----
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

// ---- Simple CSS-width horizontal bar list (no chart library) ----
const BarList: React.FC<{
  title: string;
  icon: any;
  items: { label: string; value: number }[];
  formatValue: (n: number) => string;
  barClass: string;
}> = ({ title, icon: Icon, items, formatValue, barClass }) => {
  const max = items.length ? Math.max(...items.map(i => i.value)) : 0;
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
      <div className="p-4 border-b border-[#E5E7EB] bg-slate-50/50 flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-4 space-y-3">
        {items.length === 0 && (
          <div className="py-6 text-center text-slate-400 text-xs">Chưa có dữ liệu.</div>
        )}
        {items.map((item, idx) => {
          const width = max > 0 ? (item.value / max) * 100 : 0;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-700 truncate" title={item.label}>{item.label}</span>
                <span className="font-mono font-bold text-slate-500 shrink-0">{item.value > 0 ? formatValue(item.value) : '—'}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className={`${barClass} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Overview: React.FC<OverviewProps> = ({ projects, analytics }) => {
  const totals = analytics?.totals;
  const ipcByProject = analytics?.ipcByProject || [];
  const headcountByProject = analytics?.headcountByProject || [];

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={TrendingUp} label="Tổng doanh thu" value={money(totals?.revenue)} accent="text-[#104e8b]" />
        <StatCard icon={Wallet} label="Tổng ngân sách" value={money(totals?.budget)} />
        <StatCard icon={PiggyBank} label="Đã sử dụng" value={money(totals?.budgetUsed)} />
        <StatCard icon={FileText} label="IPC" value={money(totals?.ipc)} />
        <StatCard icon={Users2} label="Nhân sự" value={count(totals?.headcount)} />
      </div>

      {/* Projects table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB] bg-slate-50/50 flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-slate-500" />
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Danh mục dự án ({projects.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[960px]">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-100">
                <th className="py-3 px-4">Dự án</th>
                <th className="py-3 px-4 text-center">BCH</th>
                <th className="py-3 px-4 text-right">Doanh thu</th>
                <th className="py-3 px-4 text-right">IPC</th>
                <th className="py-3 px-4">Ngân sách / Đã dùng / %</th>
                <th className="py-3 px-4">Tiến độ</th>
                <th className="py-3 px-4 text-center">Tình trạng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-800 max-w-[220px] truncate" title={p.name}>{p.name}</td>
                  <td className="py-3 px-4 text-center font-mono text-slate-600">{count(p.bch)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">{money(p.revenue)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono font-bold text-slate-700">{money(p.ipc)}</span>
                    <span className="block text-[10px] text-slate-400 font-mono">{pct(p.ipcPct)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-[11px] font-mono text-slate-600">
                      <span>{money(p.budget)}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span>{money(p.budgetUsed)}</span>
                      <span className="ml-1 font-bold text-slate-500">({pct(p.budgetPct)})</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
                      <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(p.budgetPct || 0, 100)}%` }} />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-[#104e8b] h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(p.progressPct || 0, 100)}%` }} />
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 font-bold w-9 text-right">{pct(p.progressPct)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusPillClass(p.status || '')}`}>
                      {p.status || '—'}
                    </span>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400 font-medium">Chưa có dữ liệu dự án.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two CSS-width bar lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarList
          title="Giá trị IPC theo dự án"
          icon={FileText}
          items={ipcByProject.map(i => ({ label: i.project, value: i.value }))}
          formatValue={(n) => money(n)}
          barClass="bg-[#104e8b]"
        />
        <BarList
          title="Nhân sự theo dự án"
          icon={BarChart3}
          items={headcountByProject.map(h => ({ label: h.project, value: h.count }))}
          formatValue={(n) => count(n)}
          barClass="bg-emerald-500"
        />
      </div>
    </div>
  );
};
