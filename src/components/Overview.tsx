/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD - KHỐI DỰ ÁN. Layout/charts mirror the source Excel dashboard.
 * Every value is derived from real parsed data (projects/employees/issues/
 * contracts/analytics) — nothing is fabricated; empties render as 0/'—'.
 */
import React, { useMemo } from 'react';
import { Users2, Coins, BadgeCheck, FolderKanban, TrendingUp } from 'lucide-react';
import { Project, Employee, Issue, Contract, Analytics } from '../types';
import { VBarGroup, HBarGroup, PieChart, Slice } from './charts';
import { SectionCard } from './tableKit';

interface Props {
  projects: Project[];
  employees: Employee[];
  issues: Issue[];
  contracts?: Contract[];
  analytics: Analytics | null;
}

const norm = (s: any) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/đ/g, 'd').trim();
const trieu = (n: number) => Math.round((n || 0) / 1e6);         // -> triệu đồng
const fullVND = (n: number) => (n || 0).toLocaleString('vi-VN');

// KPI card matching the source dashboard's boxed metric look.
const Kpi: React.FC<{ icon: any; label: string; value: string; accent: string; sub?: string }> = ({ icon: Icon, label, value, accent, sub }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs p-5 flex items-center gap-4">
    <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}1a`, color: accent }}>
      <Icon className="w-8 h-8" />
    </div>
    <div className="min-w-0">
      <span className="block text-xs uppercase font-extrabold tracking-wider text-slate-400">{label}</span>
      <span className="block text-2xl xl:text-3xl font-black leading-tight" style={{ color: accent }}>{value}</span>
      {sub && <span className="block text-xs text-slate-400 font-semibold">{sub}</span>}
    </div>
  </div>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode; note?: string }> = ({ title, children, note }) => (
  <SectionCard title={title} right={note ? <span className="text-[10px] font-semibold text-slate-400">{note}</span> : undefined}>
    <div className="p-4">{children}</div>
  </SectionCard>
);

export function Overview({ projects, employees, issues, contracts = [], analytics }: Props) {
  const pNames = projects.map((p) => p.name);

  // ---- KPIs ----
  const headcount = employees.length;
  const salaryFund = employees.reduce((s, e) => s + (parseFloat(String(e.salary || '').replace(/[^0-9.\-]/g, '')) || 0), 0);
  const cchnCount = employees.filter((e) => (e.cchn || '').trim()).length;
  // "Tổng doanh thu" = tổng giá trị hợp đồng đã ký (như dashboard Excel).
  const totalRevenue = contracts
    .filter((c) => norm(c.status).includes('da ky'))
    .reduce((s, c) => s + (c.amount || 0), 0);

  // ---- Headcount by field / level (Nhân sự + Chứng chỉ) ----
  const groupNS = (key: (e: Employee) => string) => {
    const m = new Map<string, { ns: number; cc: number }>();
    for (const e of employees) {
      const k = (key(e) || '').trim() || 'Khác';
      const g = m.get(k) || { ns: 0, cc: 0 };
      g.ns += 1;
      if ((e.cchn || '').trim()) g.cc += 1;
      m.set(k, g);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'vi'));
  };
  const byField = useMemo(() => groupNS((e) => e.subsystem), [employees]);
  const byLevel = useMemo(() => groupNS((e) => e.level), [employees]);

  // ---- Issue status donut ----
  const issueColor: Record<string, string> = { closed: '#1f3864', opened: '#5b9bd5', pending: '#a9cce3', ongoing: '#c0392b' };
  const issueSlices: Slice[] = (analytics?.issueStatus || []).map((s) => ({
    label: s.status || '(trống)', value: s.count, color: issueColor[norm(s.status)] || '#94a3b8',
  }));

  // ---- Contract status pie ----
  const contractAgg = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of contracts) {
      const k = (c.status || '').trim() || '(chưa rõ)';
      m.set(k, (m.get(k) || 0) + 1);
    }
    const palette = ['#1f3864', '#5b9bd5', '#a9cce3', '#c0392b', '#94a3b8'];
    return [...m.entries()].map(([label, value], i) => ({ label, value, color: palette[i % palette.length] } as Slice));
  }, [contracts]);

  return (
    <div className="space-y-4">
      {/* Title bar */}
      <div className="bg-[#8b1a1a] text-white rounded-xl shadow-xs px-5 py-3">
        <h2 className="text-base font-black uppercase tracking-wide text-center">Dashboard - Khối Dự Án</h2>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi icon={Users2} label="Số lượng nhân sự" value={headcount.toLocaleString('vi-VN')} accent="#104e8b" />
        <Kpi icon={Coins} label="Tổng quỹ lương" value={`${(salaryFund / 1e9).toFixed(2)} tỷ`} accent="#7c3aed" sub="đồng" />
        <Kpi icon={BadgeCheck} label="S.Lg CCHN" value={cchnCount.toLocaleString('vi-VN')} accent="#0ea5e9" />
        <Kpi icon={FolderKanban} label="Dự án" value={projects.length.toLocaleString('vi-VN')} accent="#0d9488" />
        <Kpi icon={TrendingUp} label="Tổng doanh thu" value={fullVND(totalRevenue)} accent="#104e8b" />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Theo Lĩnh Vực Hoạt Động">
          <VBarGroup
            categories={byField.map((f) => f[0])}
            series={[
              { name: 'Nhân sự', color: '#2563eb', values: byField.map((f) => f[1].ns) },
              { name: 'Chứng chỉ', color: '#8b1a1a', values: byField.map((f) => f[1].cc) },
            ]}
          />
        </ChartCard>

        <ChartCard title="Theo Cấp Bậc">
          <VBarGroup
            categories={byLevel.map((f) => f[0])}
            series={[
              { name: 'Nhân sự', color: '#2563eb', values: byLevel.map((f) => f[1].ns) },
              { name: 'Chứng chỉ', color: '#8b1a1a', values: byLevel.map((f) => f[1].cc) },
            ]}
          />
        </ChartCard>

        <ChartCard title="Yêu Cầu Cần Xử Lý">
          <PieChart data={issueSlices} donut />
        </ChartCard>

        <ChartCard title="Hiệu Quả Ban Chỉ Huy" note="ĐVT: triệu đồng">
          <VBarGroup
            categories={pNames}
            series={[{ name: 'BQ BCH', color: '#c0392b', values: projects.map((p) => trieu(p.avgBch)) }]}
          />
        </ChartCard>

        <ChartCard title="Tiến Độ (số ngày)">
          <HBarGroup
            categories={pNames}
            series={[
              { name: 'Thực tế', color: '#1f3864', values: projects.map((p) => p.actualDays || 0) },
              { name: 'Kế hoạch', color: '#f4a6a6', values: projects.map((p) => p.planDays || 0) },
            ]}
          />
        </ChartCard>

        <ChartCard title="Hợp Đồng - Phụ Lục - VO">
          <PieChart data={contractAgg} />
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard title="Doanh Thu & IPC" note="ĐVT: triệu đồng">
            <VBarGroup
              categories={pNames}
              series={[
                { name: 'Doanh thu', color: '#5b9bd5', values: projects.map((p) => trieu(p.revenue)) },
                { name: 'IPC', color: '#8b1a1a', values: projects.map((p) => trieu(p.ipc)) },
              ]}
            />
          </ChartCard>
        </div>

        <ChartCard title="Ngân Sách" note="ĐVT: triệu đồng">
          <VBarGroup
            categories={pNames}
            series={[
              { name: 'Ngân sách', color: '#5b9bd5', values: projects.map((p) => trieu(p.budget)) },
              { name: 'Đã sử dụng', color: '#1f3864', values: projects.map((p) => trieu(p.budgetUsed)) },
            ]}
          />
        </ChartCard>
      </div>
    </div>
  );
}
