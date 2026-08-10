/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useMemo, useState } from 'react';
import { FileText, Wallet } from 'lucide-react';
import { Contract, Ipc, Project } from '../types';
import { DataTable, Column, money, txt, StatusPill, SectionCard, ProjectFilter } from './tableKit';

interface Props {
  contracts: Contract[];
  ipc: Ipc[];
  projects?: Project[];
  initialTab?: 'contracts' | 'ipc';
}

export function ContractsIpc({ contracts, ipc, initialTab = 'contracts' }: Props) {
  const [tab, setTab] = useState<'contracts' | 'ipc'>(initialTab);
  const [proj, setProj] = useState('');

  const projectOptions = useMemo(
    () => [...new Set([...contracts.map(c => c.project), ...ipc.map(i => i.project)].map(s => (s || '').trim()).filter(Boolean))].sort(),
    [contracts, ipc],
  );

  const fContracts = contracts.filter(c => !proj || (c.project || '').trim() === proj);
  const fIpc = ipc.filter(i => !proj || (i.project || '').trim() === proj);

  const contractCols: Column<Contract>[] = [
    { header: 'Dự án', render: r => <span className="font-semibold text-slate-700">{txt(r.project)}</span> },
    { header: 'Số HĐ / Phụ lục / VO', render: r => <span className="font-mono text-[11px]">{txt(r.code)}</span> },
    { header: 'Ngày', render: r => txt(r.issueDate) },
    { header: 'Số tiền', align: 'right', render: r => <span className="font-semibold">{money(r.amount)}</span> },
    { header: 'Ngân sách', align: 'right', render: r => money(r.budget) },
    { header: 'Nội dung', render: r => <span className="text-slate-500">{txt(r.content)}</span> },
    { header: 'Tình trạng', align: 'center', render: r => <StatusPill status={r.status} /> },
  ];

  const ipcCols: Column<Ipc>[] = [
    { header: 'Dự án', render: r => <span className="font-semibold text-slate-700">{txt(r.project)}</span> },
    { header: 'Số IPC', render: r => <span className="font-mono text-[11px]">{txt(r.ipcNo)}</span> },
    { header: 'Ngày', render: r => txt(r.date) },
    { header: 'Nội dung', render: r => <span className="text-slate-500">{txt(r.content)}</span> },
    { header: 'Số tiền', align: 'right', render: r => money(r.amount) },
    { header: 'Thuế GTGT', align: 'right', render: r => money(r.vat) },
    { header: 'Cộng', align: 'right', render: r => <span className="font-semibold">{money(r.total)}</span> },
    { header: 'Thực nhận', align: 'right', render: r => money(r.actualReceived) },
    { header: 'Đã nhận', align: 'right', render: r => money(r.received) },
    { header: 'Còn lại', align: 'right', render: r => money(r.remaining) },
    { header: 'Tình trạng', align: 'center', render: r => <StatusPill status={r.status} /> },
  ];

  const TabBtn = ({ k, label, icon: Icon, badge }: { k: 'contracts' | 'ipc'; label: string; icon: any; badge: number }) => (
    <button
      onClick={() => setTab(k)}
      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
        tab === k ? 'border-[#104e8b] text-[#104e8b]' : 'border-transparent text-slate-400 hover:text-slate-600'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{badge}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <SectionCard
        title={tab === 'contracts' ? 'Hợp Đồng - Phụ Lục - VO' : 'Bảng Thanh Toán IPC'}
        right={<ProjectFilter value={proj} onChange={setProj} options={projectOptions} />}
      >
        <div className="flex border-b border-slate-100 px-2">
          <TabBtn k="contracts" label="Hợp đồng" icon={FileText} badge={fContracts.length} />
          <TabBtn k="ipc" label="IPC" icon={Wallet} badge={fIpc.length} />
        </div>
        {tab === 'contracts'
          ? <DataTable columns={contractCols} rows={fContracts} minWidthClass="min-w-[900px]" emptyLabel="Chưa có hợp đồng." />
          : <DataTable columns={ipcCols} rows={fIpc} minWidthClass="min-w-[1100px]" emptyLabel="Chưa có IPC." />}
      </SectionCard>
    </div>
  );
}
