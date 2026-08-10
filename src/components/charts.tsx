/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lightweight hand-rolled SVG charts (no external chart library — renders
 * reliably under React 19 + Vite). All values are supplied by the caller from
 * real parsed data; these components only draw, never fabricate.
 */
import React from 'react';

export interface Series { name: string; color: string; values: number[]; }

const fmtCompact = (n: number): string => {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000) return Math.round(n).toLocaleString('vi-VN');
  return String(Math.round(n * 100) / 100);
};

// ---- Legend ----
export const Legend: React.FC<{ items: { name: string; color: string }[]; className?: string }> = ({ items, className }) => (
  <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className || ''}`}>
    {items.map((it) => (
      <span key={it.name} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: it.color }} /> {it.name}
      </span>
    ))}
  </div>
);

// ---- Vertical grouped bar chart with value labels ----
export const VBarGroup: React.FC<{
  categories: string[];
  series: Series[];
  height?: number;
  format?: (n: number) => string;
}> = ({ categories, series, height = 200, format = fmtCompact }) => {
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const n = categories.length;
  const groupW = 100 / Math.max(1, n);
  const barW = (groupW * 0.7) / Math.max(1, series.length);
  const gap = groupW * 0.15;

  return (
    <div>
      <Legend items={series} className="mb-2 justify-center" />
      <div className="relative w-full overflow-x-auto">
        <div style={{ height, minWidth: n > 6 ? n * 68 : undefined }} className="relative flex items-end">
          <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0">
            {[0.25, 0.5, 0.75].map((g) => (
              <line key={g} x1={0} x2={100} y1={100 - g * 100} y2={100 - g * 100} stroke="#eef2f7" strokeWidth={0.4} />
            ))}
          </svg>
          <div className="relative flex items-end justify-around w-full h-full px-1">
            {categories.map((cat, ci) => (
              <div key={ci} className="flex items-end justify-center gap-[2px] h-full" style={{ flex: 1 }}>
                {series.map((s) => {
                  const v = s.values[ci] || 0;
                  const h = (v / max) * 88;
                  return (
                    <div key={s.name} className="flex flex-col items-center justify-end h-full" style={{ width: 18 }}>
                      {v > 0 && <span className="text-[9px] font-bold text-slate-500 mb-0.5 whitespace-nowrap">{format(v)}</span>}
                      <div style={{ height: `${h}%`, background: s.color, width: '100%' }} className="rounded-t-sm min-h-[2px]" />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-around px-1 mt-1" style={{ minWidth: n > 6 ? n * 68 : undefined }}>
          {categories.map((cat, ci) => (
            <span key={ci} className="text-[9px] font-semibold text-slate-500 text-center leading-tight" style={{ flex: 1 }}>{cat}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---- Horizontal grouped bar chart ----
export const HBarGroup: React.FC<{
  categories: string[];
  series: Series[];
  format?: (n: number) => string;
}> = ({ categories, series, format = fmtCompact }) => {
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  return (
    <div>
      <Legend items={series} className="mb-2" />
      <div className="space-y-2">
        {categories.map((cat, ci) => (
          <div key={ci} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-[10px] font-semibold text-slate-500 text-right truncate">{cat}</span>
            <div className="flex-1 space-y-[3px]">
              {series.map((s) => {
                const v = s.values[ci] || 0;
                const w = (v / max) * 100;
                return (
                  <div key={s.name} className="flex items-center gap-1">
                    <div className="h-2.5 rounded-sm min-w-[2px]" style={{ width: `${w}%`, background: s.color }} />
                    <span className="text-[9px] font-bold text-slate-500 whitespace-nowrap">{format(v)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---- Pie / Donut ----
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};
const arcPath = (cx: number, cy: number, r: number, start: number, end: number) => {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} L ${cx} ${cy} Z`;
};

export interface Slice { label: string; value: number; color: string; }

export const PieChart: React.FC<{ data: Slice[]; donut?: boolean; size?: number }> = ({ data, donut, size = 170 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2, cy = size / 2, r = size / 2 - 2;
  let acc = 0;
  const segs = data.map((d) => {
    const start = total ? (acc / total) * 360 : 0;
    acc += d.value;
    const end = total ? (acc / total) * 360 : 0;
    return { ...d, start, end, pctNum: total ? (d.value / total) * 100 : 0 };
  });
  const labelR = donut ? r * 0.79 : r * 0.62;
  return (
    <div className="flex items-center gap-3 flex-wrap justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="#f1f5f9" />
        ) : segs.map((s) => (
          s.value > 0 && <path key={s.label} d={arcPath(cx, cy, r, s.start, s.end)} fill={s.color} stroke="#fff" strokeWidth={1} />
        ))}
        {donut && <circle cx={cx} cy={cy} r={r * 0.55} fill="#fff" />}
        {/* Data labels on slices: "value, pct%" */}
        {total > 0 && segs.map((s) => {
          if (s.pctNum < 4) return null;
          const mid = (s.start + s.end) / 2;
          const p = polar(cx, cy, labelR, mid);
          return (
            <text key={`l-${s.label}`} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
              fontSize={9} fontWeight={700} fill="#fff" style={{ pointerEvents: 'none' }}>
              {s.value} · {Math.round(s.pctNum)}%
            </text>
          );
        })}
      </svg>
      <div className="space-y-1">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="min-w-[70px]">{s.label}</span>
            <span className="text-slate-400">{Math.round(s.pctNum)}% · {s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---- Horizontal stacked bar (e.g. ageing buckets per assignee) ----
export const HStackedBar: React.FC<{
  categories: string[];
  series: Series[];  // each series = one stacked segment colour, values per category
}> = ({ categories, series }) => {
  const totals = categories.map((_, ci) => series.reduce((s, se) => s + (se.values[ci] || 0), 0));
  const max = Math.max(1, ...totals);
  return (
    <div>
      <Legend items={series} className="mb-2" />
      <div className="space-y-1.5">
        {categories.map((cat, ci) => (
          <div key={ci} className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-[10px] font-semibold text-slate-500 text-right truncate">{cat}</span>
            <div className="flex-1 flex items-center h-3.5 rounded-sm overflow-hidden bg-slate-50">
              {series.map((s) => {
                const v = s.values[ci] || 0;
                if (v <= 0) return null;
                return <div key={s.name} style={{ width: `${(v / max) * 100}%`, background: s.color }} className="h-full" title={`${s.name}: ${v}`} />;
              })}
            </div>
            <span className="w-6 text-[10px] font-bold text-slate-500">{totals[ci] || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
