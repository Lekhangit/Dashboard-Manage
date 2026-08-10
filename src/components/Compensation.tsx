/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Employee } from '../types';
import { apiGetCompensation } from '../authClient';
import { DataTable, Column, moneyText, txt, money, SectionCard, StatCard } from './tableKit';
import { Wallet, Users2, ShieldCheck, Gift } from 'lucide-react';

interface Props {
  employees?: Employee[];
}

const num = (s?: string | null): number => {
  if (!s) return 0;
  const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
};

export function Compensation({ employees: fallback }: Props) {
  // The module only renders for users with view_compensation, so this endpoint
  // returns the full (un-stripped) employee records.
  const [employees, setEmployees] = useState<Employee[]>(fallback || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiGetCompensation()
      .then(data => { if (!cancelled) setEmployees(data as Employee[]); })
      .catch(e => { if (!cancelled) setError(e?.message || 'Lỗi tải dữ liệu'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const totals = useMemo(() => employees.reduce(
    (acc, e) => {
      acc.salary += num(e.salary); acc.insurance += num(e.insurance);
      acc.allowance += num(e.allowance); acc.cost += num(e.cost);
      return acc;
    },
    { salary: 0, insurance: 0, allowance: 0, cost: 0 },
  ), [employees]);

  const cols: Column<Employee>[] = [
    { header: 'Họ tên', render: r => <span className="font-semibold text-slate-700">{txt(r.name)}</span> },
    { header: 'Phòng ban', render: r => txt(r.department) },
    { header: 'Dự án', render: r => txt(r.project) },
    { header: 'Chức danh', render: r => txt(r.title) },
    { header: 'Lương', align: 'right', render: r => moneyText(r.salary) },
    { header: 'BH+YT', align: 'right', render: r => moneyText(r.insurance) },
    { header: 'Phụ cấp', align: 'right', render: r => moneyText(r.allowance) },
    { header: 'Chi phí', align: 'right', render: r => moneyText(r.cost) },
  ];

  if (loading) return <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs p-8 text-center text-slate-400 text-sm">Đang tải dữ liệu chi phí…</div>;
  if (error) return <div className="bg-white border border-rose-200 rounded-xl shadow-xs p-8 text-center text-rose-600 text-sm">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users2} label="Số nhân sự" value={employees.length.toLocaleString('vi-VN')} />
        <StatCard icon={Wallet} label="Tổng lương" value={money(totals.salary)} />
        <StatCard icon={ShieldCheck} label="Tổng BH+YT" value={money(totals.insurance)} />
        <StatCard icon={Gift} label="Tổng phụ cấp" value={money(totals.allowance)} />
      </div>

      <SectionCard title="Chi Phí & Lương Đãi Ngộ">
        <DataTable columns={cols} rows={employees} minWidthClass="min-w-[820px]" emptyLabel="Chưa có dữ liệu nhân sự." />
      </SectionCard>
    </div>
  );
}
