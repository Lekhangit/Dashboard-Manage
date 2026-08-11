/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DATA ANALYSIC — a verbatim copy of the Excel "Pivot" sheet (all cell
 * values, same layout). Nothing is computed or fabricated here; the grid is
 * exactly what the import stored from the workbook.
 */
import React, { useEffect, useState } from 'react';
import { apiGetPivot } from '../authClient';

const isNumericCell = (s: string) => /^[₫\s]*\(?-?[\d.,]+%?\)?\s*$/.test(s) && /\d/.test(s);
const isHeading = (s: string) => {
  const t = s.trim();
  if (!t || t.length < 3) return false;
  const letters = t.replace(/[^A-Za-zÀ-ỹ]/g, '');
  return letters.length >= 3 && letters === letters.toUpperCase();
};

export function DataAnalysis() {
  const [grid, setGrid] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiGetPivot()
      .then((g) => { if (!cancelled) setGrid(g); })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Lỗi tải dữ liệu'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs p-8 text-center text-slate-400 text-sm">Đang tải dữ liệu phân tích…</div>;
  if (error) return <div className="bg-white border border-rose-200 rounded-xl shadow-xs p-8 text-center text-rose-600 text-sm">{error}</div>;
  if (!grid.length) return <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs p-8 text-center text-slate-400 text-sm">Chưa có dữ liệu Pivot. Hãy import file Excel có sheet "Pivot".</div>;

  const cols = Math.max(...grid.map((r) => r.length));

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
      <div className="p-4 border-b border-[#E5E7EB] bg-[#8b1a1a]">
        <h3 className="font-black text-white text-sm uppercase tracking-wide text-center">Data Analysic — Pivot (sao chép từ Excel)</h3>
      </div>
      <div className="overflow-auto max-h-[80vh] p-2">
        <table className="text-[11px] border border-slate-300" style={{ tableLayout: 'auto', borderCollapse: 'collapse' }}>
          <tbody>
            {grid.map((row, ri) => (
              <tr key={ri} className={ri % 2 ? 'bg-slate-50/50' : 'bg-white'}>
                {Array.from({ length: cols }).map((_, ci) => {
                  const v = (row[ci] ?? '').trim();
                  const heading = isHeading(v);
                  const numeric = !heading && isNumericCell(v);
                  return (
                    <td
                      key={ci}
                      style={{ minWidth: 84, maxWidth: 260 }}
                      className={`border border-slate-300 px-2.5 py-1.5 align-middle whitespace-nowrap overflow-hidden text-ellipsis ${heading ? 'font-bold text-slate-800 bg-slate-100' : numeric ? 'text-right font-mono text-slate-700' : 'text-slate-600'}`}
                      title={v || undefined}
                    >
                      {v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
