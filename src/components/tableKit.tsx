/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared presentational helpers for the BIM dashboard screens.
 * NO DATA FABRICATION: every helper collapses empty/0 to an em-dash rather
 * than inventing a value.
 */
import React from 'react';

export const money = (n?: number | null): string => {
  if (n === null || n === undefined || n === 0) return '—';
  return n.toLocaleString('vi-VN') + ' đ';
};

// Salary/allowance are free-text on Employee (may be a pre-formatted source string).
export const moneyText = (s?: string | null): string => {
  if (s === null || s === undefined || !String(s).trim()) return '—';
  const t = String(s).trim();
  const n = parseFloat(t.replace(/[^0-9.\-]/g, ''));
  if (!isNaN(n) && n !== 0) return Math.round(n).toLocaleString('vi-VN') + ' đ';
  return t === '0' || t === '0.00' ? '—' : t;
};

export const pct = (n?: number | null): string => (n === null || n === undefined ? '—' : `${n}%`);

export const count = (n?: number | null): string =>
  n === null || n === undefined || n === 0 ? '—' : n.toLocaleString('vi-VN');

export const txt = (s?: string | number | null): string => {
  if (s === null || s === undefined) return '—';
  const str = String(s).trim();
  return str ? str : '—';
};

// "Ngày phản hồi" / số ngày tồn đọng: Closed -> giữ giá trị đã chốt trong file;
// còn mở (Opened/Ongoing/Pending) -> tính sống = hôm nay - ngày ghi nhận (như công thức Excel).
export const daysOutstanding = (loggedDate?: string, status?: string, storedDays?: string): string => {
  const stored = (storedDays ?? '').toString().trim();
  if (/close/i.test(status || '')) return stored || '—';
  const m = String(loggedDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return stored || '—';
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  return diff >= 0 ? String(diff) : (stored || '—');
};

const normStatus = (s?: string) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/đ/g, 'd');

export const isOnTrack = (status?: string) => /trong/i.test(status || '');
export const isLate = (status?: string) => /(trễ|vượt|quá)/i.test(status || '');

// Màu tình trạng dùng chung: xanh = tốt/hoàn tất (Đã ký, Closed, Trong ngân sách);
// đỏ = mở/trễ (Opened, Trễ, Vượt); vàng = đang xử lý (Đang trình, Ongoing, Pending).
export const statusPillClass = (status?: string): string => {
  const s = normStatus(status);
  if (/(da ky|clos|trong|hoan thanh)/.test(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (/(open|tre|vuot|qua han|khong dat)/.test(s)) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

export const StatusPill: React.FC<{ status?: string }> = ({ status }) =>
  txt(status) === '—' ? (
    <span className="text-slate-300">—</span>
  ) : (
    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusPillClass(status)}`}>
      {txt(status)}
    </span>
  );

export const StatCard: React.FC<{ icon: any; label: string; value: string; accent?: string }> = ({
  icon: Icon, label, value, accent,
}) => (
  <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#104e8b]/10 text-[#104e8b]">
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 truncate">{label}</span>
      <span className={`block text-lg font-black truncate ${accent || 'text-slate-800'}`}>{value}</span>
    </div>
  </div>
);

export interface Column<T> {
  header: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => React.ReactNode;
  className?: string; // applied to th + td + footer cell (e.g. column highlight)
}

const alignClass = (a?: 'left' | 'right' | 'center') =>
  a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : '';

export function DataTable<T>({ columns, rows, minWidthClass, emptyLabel, footer, maxHeightClass }: {
  columns: Column<T>[];
  rows: T[];
  minWidthClass: string;
  emptyLabel: string;
  footer?: React.ReactNode[]; // one cell per column; renders a Total row
  maxHeightClass?: string;    // bật cuộn dọc + header dính (vd 'max-h-[70vh]')
}) {
  return (
    <div className={`overflow-auto ${maxHeightClass || ''}`}>
      <table className={`w-full text-left border-collapse text-xs ${minWidthClass}`}>
        <thead>
          <tr className={`bg-slate-50 text-slate-400 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-100 ${maxHeightClass ? 'sticky top-0 z-10' : ''}`}>
            {columns.map((c, i) => (
              <th key={i} className={`py-3 px-4 ${alignClass(c.align)} ${c.className || ''}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
              {columns.map((c, ci) => (
                <td key={ci} className={`py-3 px-4 ${alignClass(c.align)} ${c.className || ''}`}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="py-10 text-center text-slate-400 font-medium">{emptyLabel}</td></tr>
          )}
        </tbody>
        {footer && rows.length > 0 && (
          <tfoot>
            <tr className="bg-slate-100 font-black text-slate-800 border-t-2 border-slate-300">
              {columns.map((c, ci) => (
                <td key={ci} className={`py-3 px-4 ${alignClass(c.align)} ${c.className || ''}`}>{footer[ci]}</td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// Section card wrapper (uppercase header + body) matching the current look.
export const SectionCard: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title, right, children, className,
}) => (
  <div className={`bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden ${className || ''}`}>
    <div className="p-4 border-b border-[#E5E7EB] bg-slate-50/50 flex justify-between items-center gap-3">
      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

// Project filter <select> built from the distinct real project names present.
export const ProjectFilter: React.FC<{ value: string; onChange: (v: string) => void; options: string[] }> = ({
  value, onChange, options,
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#104e8b]/30"
  >
    <option value="">Tất cả dự án</option>
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);
