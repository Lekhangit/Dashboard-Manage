/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useMemo, useState } from 'react';
import { Flame, Star } from 'lucide-react';
import { Todo, Project } from '../types';
import { DataTable, Column, txt, StatusPill, StatCard, SectionCard, ProjectFilter } from './tableKit';

interface Props {
  todos: Todo[];
  projects?: Project[];
}

const earlyLateClass = (v?: string): string => {
  const s = (v || '').toLowerCase();
  if (/trễ/.test(s)) return 'text-rose-600';
  if (/sớm|đúng/.test(s)) return 'text-emerald-600';
  return 'text-slate-400';
};

export function Todos({ todos }: Props) {
  const [proj, setProj] = useState('');

  const projectOptions = useMemo(
    () => [...new Set(todos.map(t => (t.project || '').trim()).filter(Boolean))].sort(),
    [todos],
  );

  const rows = todos.filter(t => !proj || (t.project || '').trim() === proj);

  const importantCount = rows.filter(t => t.important).length;
  const urgentCount = rows.filter(t => t.urgent).length;
  const bothCount = rows.filter(t => t.important && t.urgent).length;

  const cols: Column<Todo>[] = [
    { header: 'Nhóm', render: r => <span className="font-semibold text-slate-600">{txt(r.group)}</span> },
    { header: 'Dự án', render: r => txt(r.project) },
    { header: 'Nội dung', render: r => <span className="text-slate-700">{txt(r.content)}</span> },
    { header: 'Bắt đầu', render: r => txt(r.start) },
    { header: 'Kết thúc', render: r => txt(r.end) },
    {
      header: 'QT/KC', align: 'center', render: r => (
        <div className="flex items-center justify-center gap-1">
          {r.important && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" aria-label="Quan trọng" />}
          {r.urgent && <Flame className="w-3.5 h-3.5 text-rose-500" aria-label="Khẩn cấp" />}
          {!r.important && !r.urgent && <span className="text-slate-300">—</span>}
        </div>
      ),
    },
    { header: 'Thực hiện', render: r => txt(r.performer) },
    { header: 'Phối hợp', render: r => txt(r.coordinator) },
    { header: 'Trạng thái', align: 'center', render: r => <StatusPill status={r.status} /> },
    { header: 'Sớm/Trễ', align: 'center', render: r => <span className={`font-bold ${earlyLateClass(r.earlyLate)}`}>{txt(r.earlyLate)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={Star} label="Quan trọng" value={String(importantCount)} accent="text-amber-600" />
        <StatCard icon={Flame} label="Khẩn cấp" value={String(urgentCount)} accent="text-rose-600" />
        <StatCard icon={Flame} label="Quan trọng & Khẩn cấp" value={String(bothCount)} accent="text-[#104e8b]" />
      </div>

      <SectionCard
        title="Quản Lý Công Việc Cá Nhân"
        right={<ProjectFilter value={proj} onChange={setProj} options={projectOptions} />}
      >
        <DataTable columns={cols} rows={rows} minWidthClass="min-w-[1000px]" emptyLabel="Chưa có công việc." />
      </SectionCard>
    </div>
  );
}
