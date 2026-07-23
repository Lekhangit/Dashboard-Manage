/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Project, Milestone } from '../types';

interface TimelineViewProps {
  projects: (Project & {
    bch?: number; bqBch?: number; pctPlan?: number;
    planStart?: string; planEnd?: string; planDays?: number;
    actualStart?: string; actualEnd?: string; actualDays?: number;
    varStart?: number; varEnd?: number; statusScore?: number;
  })[];
  milestones?: Milestone[];
}

// ---- format helpers ----
const money = (v?: number) => (v ? Math.round(v).toLocaleString('vi-VN') : '');
const dmy = (s?: string) => {
  if (!s) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};
// Excel-style signed number: negatives in parentheses
const signed = (v?: number) => {
  if (v === undefined || v === null || v === 0) return '-';
  return v < 0 ? `(${Math.abs(Math.round(v)).toLocaleString('vi-VN')})` : Math.round(v).toLocaleString('vi-VN');
};

export const TimelineView: React.FC<TimelineViewProps> = ({ projects }) => {
  const rows = projects || [];
  const sum = (f: keyof (typeof rows)[number]) =>
    rows.reduce((s, p: any) => s + (Number(p[f]) || 0), 0);

  const maxDays = Math.max(1, ...rows.map((p) => Math.max(p.planDays || 0, p.actualDays || 0)));
  const maxBq = Math.max(1, ...rows.map((p) => p.bqBch || 0));
  const maxIpcStack = Math.max(1, ...rows.map((p) => (p.ipcActual || 0) + (p.outstandingBudget || 0)));

  return (
    <div className="space-y-6">
      {/* ===== HEADER BANNER (Excel red) ===== */}
      <div className="rounded-xl bg-gradient-to-r from-[#7f1d1d] via-[#991b1b] to-[#7f1d1d] shadow-lg">
        <h2 className="text-center text-white font-black tracking-[0.15em] text-lg sm:text-2xl py-5 uppercase">
          Theo Dõi Tiến Độ Dự Án
        </h2>
      </div>

      {/* ===== DATA TABLE (mirrors Timeline sheet) ===== */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-[1180px] w-full border-collapse text-[11px]">
          <thead>
            {/* group header row */}
            <tr className="text-white font-bold uppercase text-[10px] tracking-wide">
              <th rowSpan={2} className="bg-slate-800 border border-slate-700 px-2 py-2">TT</th>
              <th rowSpan={2} className="bg-slate-800 border border-slate-700 px-2 py-2 text-left">Dự án</th>
              <th rowSpan={2} className="bg-slate-800 border border-slate-700 px-2 py-2 text-left">QLDA/CHT</th>
              <th rowSpan={2} className="bg-slate-800 border border-slate-700 px-2 py-2">BCH</th>
              <th rowSpan={2} className="bg-slate-800 border border-slate-700 px-2 py-2 text-right">Doanh thu</th>
              <th rowSpan={2} className="bg-slate-800 border border-slate-700 px-2 py-2 text-right">BQ BCH</th>
              <th rowSpan={2} className="bg-slate-800 border border-slate-700 px-2 py-2 text-right">IPC</th>
              <th rowSpan={2} className="bg-slate-800 border border-slate-700 px-2 py-2 text-right">GT còn lại</th>
              <th rowSpan={2} className="bg-slate-800 border border-slate-700 px-2 py-2 text-right">% TT/KH</th>
              <th colSpan={3} className="bg-[#991b1b] border border-red-900 px-2 py-1.5">Kế hoạch (hợp đồng)</th>
              <th colSpan={3} className="bg-[#6d28d9] border border-violet-900 px-2 py-1.5">Thực tế</th>
              <th colSpan={3} className="bg-[#0f766e] border border-teal-900 px-2 py-1.5">Chênh lệch</th>
            </tr>
            <tr className="text-white font-semibold text-[9px] uppercase">
              {['KH B.đầu', 'KH K.thúc', 'Kế hoạch'].map((h) => (
                <th key={h} className="bg-[#991b1b]/90 border border-red-900 px-2 py-1.5">{h}</th>
              ))}
              {['TT B.đầu', 'TT K.thúc', 'Thực tế'].map((h) => (
                <th key={h} className="bg-[#6d28d9]/90 border border-violet-900 px-2 py-1.5">{h}</th>
              ))}
              {['CL B.đầu', 'CL K.thúc', 'Tình trạng'].map((h) => (
                <th key={h} className="bg-[#0f766e]/90 border border-teal-900 px-2 py-1.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {rows.map((p, i) => (
              <tr key={p.id} className="odd:bg-white even:bg-slate-50/60 hover:bg-amber-50/60">
                <td className="border border-slate-200 px-2 py-1.5 text-center">{i + 1}</td>
                <td className="border border-slate-200 px-2 py-1.5 font-bold text-slate-800">{p.name}</td>
                <td className="border border-slate-200 px-2 py-1.5">{p.manager}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-center font-semibold">{p.bch ?? ''}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-right font-mono">{money(p.revenue)}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-right font-mono text-rose-600">{money(p.bqBch)}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-right font-mono">{money(p.ipcActual)}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-right font-mono">{money(p.outstandingBudget)}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-right font-mono">{(p.pctPlan || 0).toFixed(2)}%</td>
                <td className="border border-slate-200 px-2 py-1.5 text-center whitespace-nowrap">{dmy(p.planStart)}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-center whitespace-nowrap">{dmy(p.planEnd)}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-center font-semibold">{p.planDays ?? ''}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-center whitespace-nowrap">{dmy(p.actualStart)}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-center whitespace-nowrap">{dmy(p.actualEnd)}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-center font-semibold">{p.actualDays ?? ''}</td>
                <td className={`border border-slate-200 px-2 py-1.5 text-center font-mono ${(p.varStart || 0) < 0 ? 'text-rose-600' : 'text-slate-600'}`}>{signed(p.varStart)}</td>
                <td className={`border border-slate-200 px-2 py-1.5 text-center font-mono ${(p.varEnd || 0) < 0 ? 'text-rose-600' : 'text-slate-600'}`}>{signed(p.varEnd)}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-center">
                  <span className={`inline-block min-w-[34px] px-1.5 py-0.5 rounded font-bold font-mono ${
                    (p.statusScore || 0) < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {p.statusScore ?? ''}
                  </span>
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr className="bg-slate-100 font-black text-slate-800">
              <td className="border border-slate-300 px-2 py-2" colSpan={3}>Total</td>
              <td className="border border-slate-300 px-2 py-2 text-center">{sum('bch' as any)}</td>
              <td className="border border-slate-300 px-2 py-2 text-right font-mono">{money(sum('revenue' as any))}</td>
              <td className="border border-slate-300 px-2 py-2 text-right font-mono">{money(sum('bqBch' as any))}</td>
              <td className="border border-slate-300 px-2 py-2 text-right font-mono">{money(sum('ipcActual' as any))}</td>
              <td className="border border-slate-300 px-2 py-2" colSpan={11}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== 3 CHARTS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Tiến độ (Thực tế vs Kế hoạch, số ngày) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="text-center font-black text-slate-800 text-sm uppercase tracking-wide mb-4">Tiến độ dự án</h3>
          <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-500 mb-4">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-500" />Thực tế</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-sky-300" />Kế hoạch</span>
          </div>
          <div className="space-y-3">
            {rows.map((p) => (
              <div key={p.id} className="text-[10px]">
                <span className="font-bold text-slate-600">{p.name}</span>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                      <div className="h-full bg-slate-500 rounded" style={{ width: `${((p.actualDays || 0) / maxDays) * 100}%` }} />
                    </div>
                    <span className="w-8 font-mono font-bold text-slate-600">{p.actualDays ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                      <div className="h-full bg-sky-300 rounded" style={{ width: `${((p.planDays || 0) / maxDays) * 100}%` }} />
                    </div>
                    <span className="w-8 font-mono font-bold text-slate-400">{p.planDays ?? 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Doanh thu bình quân BCH */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="text-center font-black text-slate-800 text-sm uppercase tracking-wide mb-4">Doanh thu bình quân ban chỉ huy</h3>
          <div className="flex items-end justify-around gap-2 h-56 border-b border-slate-100 pt-4">
            {rows.map((p) => (
              <div key={p.id} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[9px] font-mono font-bold text-slate-500 mb-1 rotate-0">{money(p.bqBch)}</span>
                <div className="w-full max-w-[46px] bg-gradient-to-t from-rose-600 to-rose-400 rounded-t" style={{ height: `${((p.bqBch || 0) / maxBq) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="flex justify-around gap-2 mt-2">
            {rows.map((p) => (
              <span key={p.id} className="flex-1 text-center text-[9px] font-bold text-slate-600 truncate">{p.name}</span>
            ))}
          </div>
        </div>

        {/* 3. IPC vs GT còn lại */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="text-center font-black text-slate-800 text-sm uppercase tracking-wide mb-4">Tình hình thực thi IPC các dự án</h3>
          <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-500 mb-4">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-700" />IPC</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-200" />GT còn lại</span>
          </div>
          <div className="flex items-end justify-around gap-2 h-52 border-b border-slate-100">
            {rows.map((p) => {
              const ipc = p.ipcActual || 0;
              const rest = p.outstandingBudget || 0;
              return (
                <div key={p.id} className="flex-1 flex flex-col items-center justify-end h-full" title={`IPC ${money(ipc)} • Còn lại ${money(rest)}`}>
                  <div className="w-full max-w-[40px] flex flex-col justify-end h-full">
                    <div className="w-full bg-blue-200" style={{ height: `${(Math.max(0, rest) / maxIpcStack) * 100}%` }} />
                    <div className="w-full bg-blue-700" style={{ height: `${(Math.max(0, ipc) / maxIpcStack) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-around gap-2 mt-2">
            {rows.map((p) => (
              <span key={p.id} className="flex-1 text-center text-[9px] font-bold text-slate-600 truncate">{p.name}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
