/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TIẾN ĐỘ - HIỆU QUẢ - IPC - NGÂN SÁCH DỰ ÁN — mirrors the Excel "Project"
 * sheet: grouped headers + Total row. All values from real project data.
 */
import React from 'react';
import { Project } from '../types';

interface Props {
  projects: Project[];
  onSelect?: (id: string) => void;
}

const n0 = (v?: number | null) => (v === null || v === undefined || v === 0 ? '—' : Math.round(v).toLocaleString('vi-VN'));
const pc = (v?: number | null) => (v === null || v === undefined ? '—' : `${(Math.round((v) * 100) / 100)}%`);
const ddmmyyyy = (s?: string) => {
  if (!s) return '—';
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

export function ProjectsEffectiveness({ projects, onSelect }: Props) {
  const late = (s?: string) => /trễ|vượt/i.test(s || '');

  // Totals (derived exactly like the Excel Total row).
  const T = projects.reduce(
    (a, p) => {
      a.bch += p.bch || 0; a.revenue += p.revenue || 0; a.ipc += p.ipc || 0;
      a.budget += p.budget || 0; a.used += p.budgetUsed || 0;
      return a;
    },
    { bch: 0, revenue: 0, ipc: 0, budget: 0, used: 0 },
  );
  const totBqBch = T.bch ? T.revenue / T.bch : 0;
  const totIpcPct = T.revenue ? (T.ipc / T.revenue) * 100 : 0;
  const totNsPct = T.budget ? (T.used / T.budget) * 100 : 0;

  const grp = 'text-white text-[10px] font-bold uppercase tracking-wider text-center py-1.5 px-2';
  const th = 'py-2 px-2 text-[10px] uppercase font-extrabold tracking-wider text-slate-500 whitespace-nowrap';
  const td = 'py-2.5 px-2 whitespace-nowrap';

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
      <div className="p-4 border-b border-[#E5E7EB] bg-[#8b1a1a]">
        <h3 className="font-black text-white text-sm uppercase tracking-wide text-center">Tiến Độ - Hiệu Quả - IPC - Ngân Sách Dự Án</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[1500px]">
          <thead>
            <tr>
              <th className="bg-slate-100" rowSpan={2}></th>
              <th className="bg-slate-100" rowSpan={2}></th>
              <th className="bg-slate-100" rowSpan={2}></th>
              <th className="bg-slate-100" rowSpan={2}></th>
              <th className="bg-slate-100" rowSpan={2}></th>
              <th className={grp} style={{ background: '#0d9488' }} colSpan={2}>IPC</th>
              <th className={grp} style={{ background: '#1f6f5c' }} colSpan={3}>Ngân sách</th>
              <th className={grp} style={{ background: '#b91c1c' }} colSpan={3}>Tiến độ kế hoạch</th>
              <th className={grp} style={{ background: '#6b21a8' }} colSpan={3}>Tiến độ thực tế</th>
              <th className="bg-slate-100" rowSpan={2}></th>
              <th className="bg-slate-100" rowSpan={2}></th>
              <th className="bg-slate-100" rowSpan={2}></th>
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className={th}>TT</th>
              <th className={th}>Dự án</th>
              <th className={`${th} text-right`}>BCH</th>
              <th className={`${th} text-right`}>Doanh thu</th>
              <th className={`${th} text-right`}>BQ BCH</th>
              <th className={`${th} text-right`}>IPC</th>
              <th className={`${th} text-right`}>%IPC</th>
              <th className={`${th} text-right`}>Ngân sách</th>
              <th className={`${th} text-right`}>Đã sử dụng</th>
              <th className={`${th} text-right`}>%NS</th>
              <th className={th}>KH B.đầu</th>
              <th className={th}>KH K.thúc</th>
              <th className={`${th} text-right`}>Kế hoạch</th>
              <th className={th}>TT B.đầu</th>
              <th className={th}>TT K.thúc</th>
              <th className={`${th} text-right`}>Thực tế</th>
              <th className={`${th} text-right`}>%TT/KH</th>
              <th className={`${th} text-right`}>% T.độ</th>
              <th className={`${th} text-center`}>Tình trạng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {projects.map((p, i) => (
              <tr key={p.id} className="hover:bg-blue-50/40 cursor-pointer" onClick={() => onSelect?.(p.id)}>
                <td className={`${td} text-center text-slate-400 font-mono`}>{i + 1}</td>
                <td className={`${td} font-bold text-slate-800`}>{p.name}</td>
                <td className={`${td} text-right`}>{n0(p.bch)}</td>
                <td className={`${td} text-right`}>{n0(p.revenue)}</td>
                <td className={`${td} text-right`}>{n0(p.avgBch)}</td>
                <td className={`${td} text-right`}>{n0(p.ipc)}</td>
                <td className={`${td} text-right`}>{pc(p.ipcPct)}</td>
                <td className={`${td} text-right`}>{n0(p.budget)}</td>
                <td className={`${td} text-right`}>{n0(p.budgetUsed)}</td>
                <td className={`${td} text-right`}>{pc(p.budgetPct)}</td>
                <td className={td}>{ddmmyyyy(p.planStart)}</td>
                <td className={td}>{ddmmyyyy(p.planEnd)}</td>
                <td className={`${td} text-right`}>{n0(p.planDays)}</td>
                <td className={td}>{ddmmyyyy(p.actualStart)}</td>
                <td className={td}>{ddmmyyyy(p.actualEnd)}</td>
                <td className={`${td} text-right`}>{n0(p.actualDays)}</td>
                <td className={`${td} text-right`}>{pc(p.progressVsPlanPct)}</td>
                <td className={`${td} text-right`}>{pc(p.progressPct)}</td>
                <td className={`${td} text-center`}>
                  <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold ${late(p.status) ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{p.status || '—'}</span>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr><td colSpan={19} className="py-10 text-center text-slate-400">Chưa có dữ liệu dự án.</td></tr>
            )}
          </tbody>
          {projects.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 font-black text-slate-800 border-t-2 border-slate-300">
                <td className={td}></td>
                <td className={td}>Total</td>
                <td className={`${td} text-right`}>{n0(T.bch)}</td>
                <td className={`${td} text-right`}>{n0(T.revenue)}</td>
                <td className={`${td} text-right`}>{n0(totBqBch)}</td>
                <td className={`${td} text-right`}>{n0(T.ipc)}</td>
                <td className={`${td} text-right`}>{pc(Math.round(totIpcPct * 100) / 100)}</td>
                <td className={`${td} text-right`}>{n0(T.budget)}</td>
                <td className={`${td} text-right`}>{n0(T.used)}</td>
                <td className={`${td} text-right`}>{pc(Math.round(totNsPct * 100) / 100)}</td>
                <td className={td} colSpan={9}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
