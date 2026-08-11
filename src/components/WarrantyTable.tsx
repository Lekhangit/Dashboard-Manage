/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DỰ ÁN - PHÒNG BẢO HÀNH BẢO TRÌ - BIM CENTER — verbatim view of the Excel
 * "Chance Logs" sheet, filterable per project. All values from real data.
 */
import React, { useMemo, useState } from 'react';
import { Issue } from '../types';
import { DataTable, Column, money, txt, StatusPill, ProjectFilter } from './tableKit';

interface Props {
  issues: Issue[];
}

export function WarrantyTable({ issues }: Props) {
  const [proj, setProj] = useState('');

  const sorted = useMemo(
    () => [...issues].sort((a, b) => String(a.loggedDate || '').localeCompare(String(b.loggedDate || ''))),
    [issues],
  );
  const projectOptions = useMemo(
    () => [...new Set(issues.map(i => (i.project || '').trim()).filter(Boolean))].sort(),
    [issues],
  );
  const rows = proj ? sorted.filter(i => (i.project || '').trim() === proj) : sorted;

  const cols: Column<Issue>[] = [
    { header: 'Ngày ghi nhận', render: r => txt(r.loggedDate) },
    { header: 'Ngày phản hồi', align: 'right', className: 'bg-rose-50', render: r => txt(r.responseDays) },
    { header: 'Dự án', render: r => <span className="font-semibold text-slate-700">{txt(r.project)}</span> },
    { header: 'Người phụ trách', render: r => txt(r.assignee) },
    { header: 'Vấn đề phát sinh', render: r => <span className="text-slate-700">{txt(r.problem)}</span> },
    { header: 'Giải pháp hành động', render: r => <span className="text-slate-500">{txt(r.solution)}</span> },
    { header: 'Kết quả', render: r => <span className="text-slate-500">{txt(r.result)}</span> },
    { header: 'VO / BOQ', align: 'right', render: r => money(r.voBoq) },
    { header: 'Ngân sách', align: 'right', render: r => money(r.budget) },
    { header: 'Dự kiến hoàn thành', render: r => txt(r.plannedDate) },
    { header: 'Thực tế hoàn thành', render: r => txt(r.actualDate) },
    { header: 'Tình trạng', align: 'center', render: r => <StatusPill status={r.status} /> },
  ];

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
      <div className="p-4 border-b border-[#E5E7EB] bg-[#8b1a1a] flex items-center justify-between gap-3">
        <h3 className="font-black text-white text-sm uppercase tracking-wide">Dự Án - Phòng Bảo Hành Bảo Trì - BIM Center</h3>
        <ProjectFilter value={proj} onChange={setProj} options={projectOptions} />
      </div>
      <DataTable
        columns={cols}
        rows={rows}
        minWidthClass="min-w-[1300px]"
        emptyLabel="Chưa có dữ liệu."
        footer={['Total', '', '', '', '', '', '',
          money(rows.reduce((s, r) => s + (r.voBoq || 0), 0)),
          money(rows.reduce((s, r) => s + (r.budget || 0), 0)),
          '', '', `${rows.length}`]}
      />
    </div>
  );
}
