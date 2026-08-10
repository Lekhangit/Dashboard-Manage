/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DATA ANALYSIC — Pivot-style breakdowns computed from real data
 * (server analytics). No fabricated values.
 */
import React from 'react';
import { Analytics, Project, BudgetItem } from '../types';
import { SectionCard, DataTable, Column, money, pct, txt } from './tableKit';
import { PieChart, Slice } from './charts';

interface Props {
  analytics: Analytics | null;
  projects?: Project[];
  budget?: BudgetItem[];
}

export function DataAnalysis({ analytics }: Props) {
  if (!analytics) {
    return <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs p-8 text-center text-slate-400 text-sm">Chưa có dữ liệu phân tích.</div>;
  }

  const a = analytics;
  const palette = ['#1f3864', '#2563eb', '#5b9bd5', '#a9cce3', '#0d9488', '#c0392b', '#7c3aed', '#f59e0b'];
  const levelSlices: Slice[] = a.headcountByLevel.map((x, i) => ({ label: x.level || '(trống)', value: x.count, color: palette[i % palette.length] }));
  const fieldSlices: Slice[] = a.headcountByField.map((x, i) => ({ label: x.field || '(trống)', value: x.count, color: palette[i % palette.length] }));

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { l: 'Doanh thu', v: money(a.totals.revenue) },
          { l: 'Ngân sách', v: money(a.totals.budget) },
          { l: 'Đã sử dụng', v: money(a.totals.budgetUsed) },
          { l: 'IPC', v: money(a.totals.ipc) },
          { l: 'Nhân sự', v: a.totals.headcount.toLocaleString('vi-VN') },
        ].map((k) => (
          <div key={k.l} className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs p-4">
            <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400">{k.l}</span>
            <span className="block text-base font-black text-slate-800 mt-1">{k.v}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="IPC Theo Dự Án">
          <DataTable
            columns={[
              { header: 'Dự án', render: (r: any) => <span className="font-semibold text-slate-700">{txt(r.project)}</span> },
              { header: 'Số IPC', align: 'right', render: (r: any) => r.count },
              { header: 'Giá trị', align: 'right', render: (r: any) => money(r.value) },
            ] as Column<any>[]}
            rows={a.ipcByProject}
            minWidthClass="min-w-[420px]"
            emptyLabel="Chưa có dữ liệu."
          />
        </SectionCard>

        <SectionCard title="Ngân Sách Theo Phòng Ban">
          <DataTable
            columns={[
              { header: 'Phòng/Ban', render: (r: any) => <span className="font-semibold text-slate-700">{txt(r.dept)}</span> },
              { header: 'Kế hoạch', align: 'right', render: (r: any) => money(r.plan) },
              { header: 'Thực tế', align: 'right', render: (r: any) => money(r.actual) },
              { header: '% Sử dụng', align: 'right', render: (r: any) => <span className={r.usagePct > 100 ? 'text-rose-600 font-semibold' : ''}>{pct(r.usagePct)}</span> },
            ] as Column<any>[]}
            rows={a.budgetByDept}
            minWidthClass="min-w-[520px]"
            emptyLabel="Chưa có dữ liệu."
          />
        </SectionCard>

        <SectionCard title="Nhân Sự Theo Cấp Bậc">
          <div className="p-4"><PieChart data={levelSlices} donut /></div>
        </SectionCard>

        <SectionCard title="Nhân Sự Theo Ngành">
          <div className="p-4"><PieChart data={fieldSlices} donut /></div>
        </SectionCard>

        <SectionCard title="Nhân Sự Theo Dự Án">
          <DataTable
            columns={[
              { header: 'Dự án', render: (r: any) => <span className="font-semibold text-slate-700">{txt(r.project)}</span> },
              { header: 'Số người', align: 'right', render: (r: any) => r.count },
            ] as Column<any>[]}
            rows={a.headcountByProject}
            minWidthClass="min-w-[320px]"
            emptyLabel="Chưa có dữ liệu."
          />
        </SectionCard>

        <SectionCard title="Trạng Thái Vấn Đề / Công Việc">
          <div className="grid grid-cols-2 gap-4 p-4">
            <div>
              <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Vấn đề</p>
              {a.issueStatus.map((s) => (
                <div key={s.status} className="flex justify-between text-xs font-semibold text-slate-600 py-0.5"><span>{txt(s.status)}</span><span>{s.count}</span></div>
              ))}
            </div>
            <div>
              <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Công việc</p>
              {a.todoStatus.map((s) => (
                <div key={s.status} className="flex justify-between text-xs font-semibold text-slate-600 py-0.5"><span>{txt(s.status)}</span><span>{s.count}</span></div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
