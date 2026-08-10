/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { Employee, Project, AuthUser, hasPerm } from '../types';

interface ResourceProps {
  employees: Employee[];
  projects?: Project[];
  authUser?: AuthUser | null;
}

// ---- Shared formatting helpers (no fabricated values — blanks stay blank) ----
const txt = (s?: string | number | null): string => {
  if (s === null || s === undefined) return '—';
  const str = String(s).trim();
  return str ? str : '—';
};

// Salary is stored as free-text on Employee (may be a pre-formatted string from the source sheet).
const moneyText = (s?: string | null): string => {
  if (!s || !String(s).trim()) return '—';
  const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
  if (!isNaN(n) && n !== 0) return Math.round(n).toLocaleString('vi-VN') + ' đ';
  return String(s).trim() === '0' ? '—' : String(s).trim();
};

interface Column<T> {
  header: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => React.ReactNode;
}

export const Resource: React.FC<ResourceProps> = ({ employees, authUser }) => {
  const [dept, setDept] = useState('all');
  const [proj, setProj] = useState('all');
  const [search, setSearch] = useState('');

  // Dropdown options come only from distinct values actually present in the data.
  const departments = useMemo(
    () => Array.from(new Set(employees.map(e => (e.department || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [employees]
  );
  const projectNames = useMemo(
    () => Array.from(new Set(employees.map(e => (e.project || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [employees]
  );

  const showSalary = hasPerm(authUser, 'view_compensation');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter(e => {
      const matchesDept = dept === 'all' || (e.department || '').trim() === dept;
      const matchesProj = proj === 'all' || (e.project || '').trim() === proj;
      const matchesSearch = !q || (e.name || '').toLowerCase().includes(q);
      return matchesDept && matchesProj && matchesSearch;
    });
  }, [employees, dept, proj, search]);

  const columns: Column<Employee>[] = [
    { header: 'TT', align: 'center', render: (r) => <span className="font-mono text-slate-400">{r.tt || '—'}</span> },
    { header: 'Phòng ban', render: (r) => txt(r.department) },
    { header: 'Dự án', render: (r) => txt(r.project) },
    { header: 'Họ tên', render: (r) => <span className="font-bold text-slate-800">{txt(r.name)}</span> },
    { header: 'Chức danh', render: (r) => txt(r.title) },
    { header: 'Cấp bậc', render: (r) => txt(r.level) },
    { header: 'Ngành', render: (r) => txt(r.field) },
    { header: 'Trình độ', render: (r) => txt(r.education) },
    { header: 'CCHN', render: (r) => txt(r.cchn) },
    // Salary column is constructed only when permitted — never rendered then hidden via CSS.
    ...(showSalary
      ? [{
          header: 'Lương',
          align: 'right' as const,
          render: (r: Employee) => <span className="font-mono font-bold text-slate-700">{moneyText(r.salary)}</span>,
        }]
      : []),
  ];

  const alignClass = (a?: 'left' | 'right' | 'center') => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : '');

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo họ tên..."
            className="pl-8 pr-3 py-1.5 w-full border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#104e8b] focus:ring-1 focus:ring-[#104e8b]/20 transition-all"
          />
        </div>

        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-[#104e8b] transition-colors"
        >
          <option value="all">Tất cả phòng ban</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          value={proj}
          onChange={(e) => setProj(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-[#104e8b] transition-colors"
        >
          <option value="all">Tất cả dự án</option>
          {projectNames.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full text-left border-collapse text-xs ${showSalary ? 'min-w-[920px]' : 'min-w-[800px]'}`}>
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-100">
                {columns.map((c, i) => (
                  <th key={i} className={`py-3 px-4 ${alignClass(c.align)}`}>{c.header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  {columns.map((c, ci) => (
                    <td key={ci} className={`py-3 px-4 ${alignClass(c.align)}`}>{c.render(row)}</td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-bold">Không có nhân sự phù hợp với bộ lọc hiện tại.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
