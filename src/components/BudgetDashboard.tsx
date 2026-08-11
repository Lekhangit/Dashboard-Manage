/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD - NGÂN SÁCH DỰ ÁN. Charts mirror the Excel budget dashboard.
 * All values derived from real budget/issue rows.
 */
import React, { useMemo } from 'react';
import { BudgetItem, Issue, Project } from '../types';
import { VBarGroup, HBarGroup, PieChart, HStackedBar, Slice } from './charts';
import { SectionCard } from './tableKit';

interface Props {
  budget: BudgetItem[];
  issues: Issue[];
  projects?: Project[];
}

const ty = (n: number) => Math.round((n || 0) / 1e8) / 10; // -> tỉ đồng, 1 số lẻ

export function BudgetDashboard({ budget, issues }: Props) {
  // 1. Tỷ trọng ngân sách theo hạng mục (theo Kế hoạch; % trên tổng).
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of budget) {
      const k = (b.category || '').trim() || 'Chưa phân loại';
      m.set(k, (m.get(k) || 0) + (b.plan || 0));
    }
    const total = [...m.values()].reduce((s, v) => s + v, 0) || 1;
    return [...m.entries()]
      .map(([cat, v]) => ({ cat, pct: Math.round((v / total) * 1000) / 10 }))
      .sort((a, b) => b.pct - a.pct);
  }, [budget]);

  // 2. Ngân sách theo phòng ban — Kế hoạch vs Thực tế.
  const byDept = useMemo(() => {
    const m = new Map<string, { plan: number; actual: number }>();
    for (const b of budget) {
      const k = (b.dept || '').trim() || 'Chưa phân bổ';
      const g = m.get(k) || { plan: 0, actual: 0 };
      g.plan += b.plan || 0; g.actual += b.actual || 0; m.set(k, g);
    }
    return [...m.entries()].sort((a, b) => b[1].plan - a[1].plan);
  }, [budget]);

  // 3. Vấn đề theo tình trạng (Chance Logs).
  const issueSlices: Slice[] = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of issues) m.set((i.status || '(trống)').trim(), (m.get((i.status || '(trống)').trim()) || 0) + 1);
    const color: Record<string, string> = { closed: '#548235', ongoing: '#2f75b5', 'on-going': '#2f75b5', pending: '#b91c1c', opened: '#b8860b' };
    return [...m.entries()].map(([label, value]) => ({ label, value, color: color[label.toLowerCase()] || '#94a3b8' }));
  }, [issues]);

  // 4. Tỷ trọng ngân sách theo công trình (theo Kế hoạch).
  const byProject: Slice[] = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of budget) m.set((b.project || '(trống)').trim(), (m.get((b.project || '(trống)').trim()) || 0) + (b.plan || 0));
    const palette = ['#1f3864', '#2f75b5', '#a9cce3', '#c0392b', '#5b9bd5', '#94a3b8'];
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }));
  }, [budget]);

  // 5. Ngày tồn đọng theo người phụ trách (chỉ Opened / Ongoing).
  const ageing = useMemo(() => {
    const open = issues.filter(i => /open|going|ongoing/i.test(i.status || ''));
    const m = new Map<string, [number, number, number, number]>();
    for (const i of open) {
      const who = (i.assignee || '(trống)').trim();
      const d = parseInt(String(i.responseDays).replace(/[^0-9]/g, ''), 10) || 0;
      const b = m.get(who) || [0, 0, 0, 0];
      if (d <= 7) b[0]++; else if (d <= 30) b[1]++; else if (d <= 60) b[2]++; else b[3]++;
      m.set(who, b);
    }
    return [...m.entries()].sort((a, b) => (b[1][0] + b[1][1] + b[1][2] + b[1][3]) - (a[1][0] + a[1][1] + a[1][2] + a[1][3]));
  }, [issues]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Tỷ Trọng Ngân Sách Theo Hạng Mục">
          <div className="p-4">
            <HBarGroup
              categories={byCategory.map(c => c.cat)}
              series={[{ name: '% ngân sách', color: '#8b1a1a', values: byCategory.map(c => c.pct) }]}
              format={(n) => `${n}%`}
            />
          </div>
        </SectionCard>

        <SectionCard title="Ngân Sách Theo Phòng Ban - KH vs TT" right={<span className="text-[10px] font-semibold text-slate-400">ĐVT: tỉ đồng</span>}>
          <div className="p-4">
            <VBarGroup
              categories={byDept.map(d => d[0])}
              series={[
                { name: 'Kế hoạch', color: '#5b9bd5', values: byDept.map(d => ty(d[1].plan)) },
                { name: 'Thực tế', color: '#8b1a1a', values: byDept.map(d => ty(d[1].actual)) },
              ]}
            />
          </div>
        </SectionCard>

        <SectionCard title="Vấn Đề Theo Tình Trạng (Chance Logs)">
          <div className="p-4"><PieChart data={issueSlices} donut /></div>
        </SectionCard>

        <div className="lg:col-span-2">
          <SectionCard title="Tỷ Trọng Ngân Sách Theo Công Trình">
            <div className="p-4"><PieChart data={byProject} size={190} /></div>
          </SectionCard>
        </div>

        <SectionCard title="Ngày Tồn Đọng Theo Người Phụ Trách (Opened / Ongoing)">
          <div className="p-4">
            <HStackedBar
              categories={ageing.map(a => a[0])}
              series={[
                { name: '0 - 7 ngày', color: '#1f3864', values: ageing.map(a => a[1][0]) },
                { name: '8 - 30 ngày', color: '#2f75b5', values: ageing.map(a => a[1][1]) },
                { name: '31 - 60 ngày', color: '#a9cce3', values: ageing.map(a => a[1][2]) },
                { name: 'Trên 60 ngày', color: '#c0392b', values: ageing.map(a => a[1][3]) },
              ]}
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
