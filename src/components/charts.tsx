/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lightweight hand-rolled SVG charts (no external chart library — renders
 * reliably under React 19 + Vite). All values are supplied by the caller from
 * real parsed data; these components only draw, never fabricate.
 * Sizing is deliberately large for on-screen dashboard readability.
 */
import React, { useState } from 'react';

export interface Series { name: string; color: string; values: number[]; raw?: number[]; }

// Tooltip khi rê chuột: ưu tiên số gốc (raw) đầy đủ, có dấu phân cách.
const barTitle = (s: Series, ci: number, v: number) =>
  `${s.name}: ${(s.raw && s.raw[ci] != null ? s.raw[ci] : v).toLocaleString('vi-VN')}`;

// Hộp tooltip tùy biến, hiện NGAY khi rê chuột (không đợi như title mặc định).
function useHoverTip() {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const show = (text: string) => (e: React.MouseEvent) => setTip({ x: e.clientX, y: e.clientY, text });
  const clear = () => setTip(null);
  const node = tip ? (
    <div style={{
      position: 'fixed', left: Math.min(tip.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 240),
      top: tip.y + 14, zIndex: 70, background: '#0f172a', color: '#fff', padding: '5px 10px',
      borderRadius: 6, fontSize: 12, fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap',
      boxShadow: '0 6px 16px rgba(0,0,0,.3)',
    }}>{tip.text}</div>
  ) : null;
  return { show, clear, node };
}

const fmtCompact = (n: number): string => {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000) return Math.round(n).toLocaleString('vi-VN');
  return String(Math.round(n * 100) / 100);
};

export const Legend: React.FC<{ items: { name: string; color: string }[]; className?: string }> = ({ items, className }) => (
  <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className || ''}`}>
    {items.map((it) => (
      <span key={it.name} className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
        <span className="w-3.5 h-3.5 rounded-sm" style={{ background: it.color }} /> {it.name}
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
}> = ({ categories, series, height = 330, format = fmtCompact }) => {
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const n = categories.length;
  const t = useHoverTip();
  return (
    <div>
      {t.node}
      <Legend items={series} className="mb-3 justify-center" />
      <div className="relative w-full overflow-x-auto">
        <div style={{ height, minWidth: n > 5 ? n * 100 : undefined }} className="relative flex items-end">
          <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0">
            {[0.25, 0.5, 0.75].map((g) => (
              <line key={g} x1={0} x2={100} y1={100 - g * 100} y2={100 - g * 100} stroke="#eef2f7" strokeWidth={0.4} />
            ))}
          </svg>
          <div className="relative flex items-end justify-around w-full h-full px-1">
            {categories.map((cat, ci) => (
              <div key={ci} className="flex items-end justify-center gap-1 h-full" style={{ flex: 1 }}>
                {series.map((s) => {
                  const v = s.values[ci] || 0;
                  const h = (v / max) * 88;
                  return (
                    <div key={s.name} className="flex flex-col items-center justify-end h-full cursor-help" style={{ width: 30 }}
                      onMouseMove={t.show(barTitle(s, ci, v))} onMouseLeave={t.clear}>
                      {v > 0 && <span className="text-[13px] font-bold text-slate-600 mb-0.5 whitespace-nowrap">{format(v)}</span>}
                      <div style={{ height: `${h}%`, background: s.color, width: '100%' }} className="rounded-t-sm min-h-[2px]" />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-around px-1 mt-1.5" style={{ minWidth: n > 5 ? n * 100 : undefined }}>
          {categories.map((cat, ci) => (
            <span key={ci} className="text-[12px] font-semibold text-slate-600 text-center leading-tight" style={{ flex: 1 }}>{cat}</span>
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
  const t = useHoverTip();
  return (
    <div>
      {t.node}
      <Legend items={series} className="mb-3" />
      <div className="space-y-2.5">
        {categories.map((cat, ci) => (
          <div key={ci} className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-[12px] font-semibold text-slate-600 text-right truncate">{cat}</span>
            <div className="flex-1 space-y-1">
              {series.map((s) => {
                const v = s.values[ci] || 0;
                const w = (v / max) * 100;
                return (
                  <div key={s.name} className="flex items-center gap-1.5 cursor-help" onMouseMove={t.show(barTitle(s, ci, v))} onMouseLeave={t.clear}>
                    <div className="h-4 rounded-sm min-w-[2px]" style={{ width: `${w}%`, background: s.color }} />
                    <span className="text-[12px] font-bold text-slate-600 whitespace-nowrap">{format(v)}</span>
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

export const PieChart: React.FC<{ data: Slice[]; donut?: boolean; size?: number }> = ({ data, donut, size = 240 }) => {
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
  const t = useHoverTip();
  return (
    <div className="flex items-center gap-4 flex-wrap justify-center">
      {t.node}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="#f1f5f9" />
        ) : segs.map((s) => (
          s.value > 0 && <path key={s.label} d={arcPath(cx, cy, r, s.start, s.end)} fill={s.color} stroke="#fff" strokeWidth={1} className="cursor-help"
            onMouseMove={t.show(`${s.label}: ${s.value.toLocaleString('vi-VN')} (${Math.round(s.pctNum)}%)`)} onMouseLeave={t.clear} />
        ))}
        {donut && <circle cx={cx} cy={cy} r={r * 0.55} fill="#fff" />}
        {total > 0 && segs.map((s) => {
          if (s.pctNum < 5) return null;
          const mid = (s.start + s.end) / 2;
          const p = polar(cx, cy, labelR, mid);
          return (
            <text key={`l-${s.label}`} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
              fontSize={13} fontWeight={700} fill="#fff" style={{ pointerEvents: 'none' }}>
              {Math.round(s.pctNum)}%
            </text>
          );
        })}
      </svg>
      <div className="space-y-1.5">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-[13px] font-semibold text-slate-600">
            <span className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="min-w-[86px]">{s.label}</span>
            <span className="text-slate-400 whitespace-nowrap">{Math.round(s.pctNum)}% · {s.value.toLocaleString('vi-VN')}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---- Horizontal stacked bar (e.g. ageing buckets per assignee) ----
export const HStackedBar: React.FC<{
  categories: string[];
  series: Series[];
}> = ({ categories, series }) => {
  const totals = categories.map((_, ci) => series.reduce((s, se) => s + (se.values[ci] || 0), 0));
  const max = Math.max(1, ...totals);
  const t = useHoverTip();
  return (
    <div>
      {t.node}
      <Legend items={series} className="mb-3" />
      <div className="space-y-2">
        {categories.map((cat, ci) => (
          <div key={ci} className="flex items-center gap-2">
            <span className="w-36 shrink-0 text-[12px] font-semibold text-slate-600 text-right truncate">{cat}</span>
            <div className="flex-1 flex items-center h-5 rounded-sm overflow-hidden bg-slate-50">
              {series.map((s) => {
                const v = s.values[ci] || 0;
                if (v <= 0) return null;
                return <div key={s.name} style={{ width: `${(v / max) * 100}%`, background: s.color }} className="h-full cursor-help"
                  onMouseMove={t.show(`${cat} — ${s.name}: ${v}`)} onMouseLeave={t.clear} />;
              })}
            </div>
            <span className="w-7 text-[12px] font-bold text-slate-600">{totals[ci] || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
