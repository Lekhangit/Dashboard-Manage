/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useMemo, useState } from 'react';
import { FileText, Wallet } from 'lucide-react';
import { Contract, Ipc, Project } from '../types';
import { DataTable, Column, money, txt, StatusPill, SectionCard, ProjectFilter } from './tableKit';
import { VBarGroup, PieChart, Slice } from './charts';

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

  // ---- IPC analytics (from real rows) ----
  // Số IPC theo dự án = số hiệu IPC khác nhau (loại "Tạm ứng") theo dự án.
  const ipcCountByProject = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const r of fIpc) {
      const pj = (r.project || '').trim(); const no = (r.ipcNo || '').trim();
      if (!pj || !/ipc/i.test(no)) continue;
      if (!m.has(pj)) m.set(pj, new Set());
      m.get(pj)!.add(no.toUpperCase());
    }
    return [...m.entries()].map(([project, s]) => ({ project, count: s.size }));
  }, [fIpc]);

  // Tiền đã thu (ĐÃ NHẬN) và còn phải thu (CÒN LẠI) theo tháng.
  const byMonth = useMemo(() => {
    const m = new Map<string, { thu: number; conlai: number }>();
    const key = (d: string) => {
      const mm = String(d).match(/^(\d{4})-(\d{2})/);
      return mm ? `${mm[2]}/${mm[1]}` : 'Chưa có ngày IPC';
    };
    for (const r of fIpc) {
      const k = key(r.date);
      const g = m.get(k) || { thu: 0, conlai: 0 };
      g.thu += r.received || 0; g.conlai += r.remaining || 0;
      m.set(k, g);
    }
    const entries = [...m.entries()];
    entries.sort((a, b) => {
      if (a[0] === 'Chưa có ngày IPC') return 1;
      if (b[0] === 'Chưa có ngày IPC') return -1;
      const [ma, ya] = a[0].split('/'); const [mb, yb] = b[0].split('/');
      return (ya + ma).localeCompare(yb + mb);
    });
    return entries;
  }, [fIpc]);

  // Tình trạng IPC (số lượng) — trạng thái trống -> "Chưa cập nhật".
  const ipcStatus: Slice[] = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of fIpc) {
      const k = (r.status || '').trim() || 'Chưa cập nhật';
      m.set(k, (m.get(k) || 0) + 1);
    }
    const palette: Record<string, string> = { closed: '#1f3864', 'on-going': '#5b9bd5', ongoing: '#5b9bd5', opened: '#a9cce3' };
    return [...m.entries()].map(([label, value], i) => ({
      label, value,
      color: palette[label.toLowerCase()] || (label === 'Chưa cập nhật' ? '#c0392b' : ['#1f3864', '#5b9bd5', '#a9cce3', '#c0392b', '#94a3b8'][i % 5]),
    }));
  }, [fIpc]);

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
      {tab === 'ipc' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SectionCard title="Số IPC Theo Dự Án">
            <div className="p-4">
              <VBarGroup
                categories={ipcCountByProject.map(x => x.project)}
                series={[{ name: 'Số IPC', color: '#1f3864', values: ipcCountByProject.map(x => x.count) }]}
              />
            </div>
          </SectionCard>
          <SectionCard title="Tiền Đã Thu & Còn Phải Thu Theo Tháng" right={<span className="text-[10px] font-semibold text-slate-400">ĐVT: tỉ đồng</span>}>
            <div className="p-4">
              <VBarGroup
                categories={byMonth.map(m => m[0])}
                series={[
                  { name: 'Đã thu', color: '#1f3864', values: byMonth.map(m => Math.round(m[1].thu / 1e8) / 10) },
                  { name: 'Còn phải thu', color: '#8b1a1a', values: byMonth.map(m => Math.round(m[1].conlai / 1e8) / 10) },
                ]}
              />
            </div>
          </SectionCard>
          <SectionCard title="Tình Trạng IPC (số lượng)">
            <div className="p-4"><PieChart data={ipcStatus} /></div>
          </SectionCard>
        </div>
      )}

      <SectionCard
        title={tab === 'contracts' ? 'Hợp Đồng - Phụ Lục - VO' : 'Bảng Thanh Toán IPC'}
        right={<ProjectFilter value={proj} onChange={setProj} options={projectOptions} />}
      >
        <div className="flex border-b border-slate-100 px-2">
          <TabBtn k="contracts" label="Hợp đồng" icon={FileText} badge={fContracts.length} />
          <TabBtn k="ipc" label="IPC" icon={Wallet} badge={fIpc.length} />
        </div>
        {tab === 'contracts'
          ? <DataTable columns={contractCols} rows={fContracts} minWidthClass="min-w-[900px]" emptyLabel="Chưa có hợp đồng."
              footer={['Total', '', '', money(fContracts.reduce((s, c) => s + (c.amount || 0), 0)), money(fContracts.reduce((s, c) => s + (c.budget || 0), 0)), '', '']} />
          : <DataTable columns={ipcCols} rows={fIpc} minWidthClass="min-w-[1100px]" emptyLabel="Chưa có IPC."
              footer={['Total', '', '', '',
                money(fIpc.reduce((s, r) => s + (r.amount || 0), 0)),
                money(fIpc.reduce((s, r) => s + (r.vat || 0), 0)),
                money(fIpc.reduce((s, r) => s + (r.total || 0), 0)),
                money(fIpc.reduce((s, r) => s + (r.actualReceived || 0), 0)),
                money(fIpc.reduce((s, r) => s + (r.received || 0), 0)),
                money(fIpc.reduce((s, r) => s + (r.remaining || 0), 0)), '']} />}
      </SectionCard>
    </div>
  );
}
