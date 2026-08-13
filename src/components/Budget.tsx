/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useMemo, useState } from 'react';
import { BudgetItem, Project } from '../types';
import { DataTable, Column, money, txt, pct, StatusPill, SectionCard, ProjectFilter } from './tableKit';

interface Props {
  budget: BudgetItem[];
  projects?: Project[];
}

export function Budget({ budget }: Props) {
  const [proj, setProj] = useState('');

  const projectOptions = useMemo(
    () => [...new Set(budget.map(b => (b.project || '').trim()).filter(Boolean))].sort(),
    [budget],
  );

  const rows = budget.filter(b => !proj || (b.project || '').trim() === proj);

  // "Ngân sách theo phòng ban" — aggregate of the real rows currently in view.
  const byDept = useMemo(() => {
    const m = new Map<string, { plan: number; actual: number }>();
    for (const b of rows) {
      const dept = (b.dept || '').trim() || '(trống)';
      const g = m.get(dept) || { plan: 0, actual: 0 };
      g.plan += b.plan || 0; g.actual += b.actual || 0;
      m.set(dept, g);
    }
    return [...m].map(([dept, g]) => ({ dept, plan: g.plan, actual: g.actual, usagePct: g.plan ? Math.round(g.actual / g.plan * 100) : 0 }))
      .sort((a, b) => b.actual - a.actual);
  }, [rows]);

  const cols: Column<BudgetItem>[] = [
    { header: 'Dự án', render: r => <span className="font-semibold text-slate-700">{txt(r.project)}</span> },
    { header: 'Gói thầu', render: r => txt(r.pkg) },
    { header: 'Phân loại', render: r => <span className="font-semibold text-slate-600">{txt(r.category)}</span> },
    { header: 'Phòng/Ban', render: r => txt(r.dept) },
    { header: 'Diễn giải', render: r => <span className="text-slate-500">{txt(r.desc)}</span> },
    { header: 'Kế hoạch', align: 'right', render: r => money(r.plan) },
    { header: 'Thực tế', align: 'right', render: r => money(r.actual) },
    { header: 'Chênh lệch', align: 'right', render: r => <span className={r.variance < 0 ? 'text-rose-600 font-semibold' : ''}>{money(r.variance)}</span> },
    {
      header: '% Sử dụng', align: 'right', render: r => (
        <div className="flex items-center justify-end gap-2 min-w-[90px]">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[60px]">
            <div className={`h-full rounded-full ${r.usagePct > 100 ? 'bg-rose-500' : 'bg-[#104e8b]'}`} style={{ width: `${Math.min(r.usagePct || 0, 100)}%` }} />
          </div>
          <span className={`font-semibold ${r.usagePct > 100 ? 'text-rose-600' : 'text-slate-600'}`}>{pct(r.usagePct)}</span>
        </div>
      ),
    },
    { header: 'Tình trạng', align: 'center', render: r => <StatusPill status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <SectionCard
        title="Quản Lý Ngân Sách Dự Án"
        right={<ProjectFilter value={proj} onChange={setProj} options={projectOptions} />}
      >
        <DataTable
          columns={cols}
          rows={rows}
          minWidthClass="min-w-[1000px]"
          maxHeightClass="max-h-[68vh]"
          emptyLabel="Chưa có dữ liệu ngân sách."
          footer={(() => {
            const plan = rows.reduce((s, r) => s + (r.plan || 0), 0);
            const actual = rows.reduce((s, r) => s + (r.actual || 0), 0);
            const variance = rows.reduce((s, r) => s + (r.variance || 0), 0);
            return ['Total', '', '', '', '', money(plan), money(actual), money(variance), pct(plan ? Math.round(actual / plan * 100) : 0), ''];
          })()}
        />
      </SectionCard>

      <SectionCard title="Ngân Sách Theo Phòng Ban">
        <DataTable
          columns={[
            { header: 'Phòng/Ban', render: (d: any) => <span className="font-semibold text-slate-700">{txt(d.dept)}</span> },
            { header: 'Kế hoạch', align: 'right', render: (d: any) => money(d.plan) },
            { header: 'Thực tế', align: 'right', render: (d: any) => money(d.actual) },
            {
              header: '% Sử dụng', align: 'right', render: (d: any) => (
                <span className={`font-semibold ${d.usagePct > 100 ? 'text-rose-600' : 'text-slate-600'}`}>{pct(d.usagePct)}</span>
              ),
            },
          ]}
          rows={byDept}
          minWidthClass="min-w-[560px]"
          emptyLabel="Chưa có dữ liệu."
        />
      </SectionCard>
    </div>
  );
}
