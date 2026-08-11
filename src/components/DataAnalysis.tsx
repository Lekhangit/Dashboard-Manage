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
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
const isHeadingUpper = (s: string) => {
  const t = s.trim();
  if (!t || t.length < 3) return false;
  const letters = t.replace(/[^A-Za-zÀ-ỹ]/g, '');
  return letters.length >= 3 && letters === letters.toUpperCase();
};
// Nhãn header của các pivot (chữ thường/hoa) -> tô xanh như Excel.
const HEADER_LABELS = new Set([
  'du an', 'loai chi phi', 'phong ban', 'phong/ban', 'bo phan', 'nhan su', 'quy luong',
  'cap bac', 'chung chi', 'nganh', 'so luong', 'gia tri', 'so ipc', 'gia tri ipc (vnd)',
  'so viec', 'so van de', 'so ngay ton', 'tinh trang', 'nhom viec', 'nhom cong viec',
  'nguoi phu trach', 'quan trong', 'khan cap', 'ke hoach', 'thuc te', 'ty trong kh',
  'tinh trang thay doi', 'tinh trang hd, pl, vo', 'hop dong, pl, vo', 'pd - tinh trang',
  'pd - nhom viec', 'nguoi phu trach (dang', '0 - 7 ngay', '8 - 30 ngay', '31 - 60 ngay',
  'tren 60 ngay', 'tong', 'so nhan su', 'nguong (ngay)', '% su dung',
]);
const isHeaderCell = (s: string) => {
  const t = s.trim();
  if (!t) return false;
  return isHeadingUpper(t) || HEADER_LABELS.has(norm(t));
};
const isTotalText = (s: string) => /grand total|tổng cộng|^tổng$|^tổng /i.test(s.trim());

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
  const nrows = grid.length;
  const rowHasTotal = grid.map((r) => r.some((c) => isTotalText(c ?? '')));

  // Dò các KHỐI BẢNG: gom ô có dữ liệu theo 8 hướng liền kề, lấy hình chữ nhật bao.
  // Ô rỗng NẰM TRONG khối -> vẫn đóng khung; ô ngoài mọi khối -> khoảng trống tách bảng.
  const filled = grid.map((r) => Array.from({ length: cols }, (_, c) => !!(r[c] ?? '').trim()));
  const inTable: boolean[][] = Array.from({ length: nrows }, () => new Array(cols).fill(false));
  const seen: boolean[][] = Array.from({ length: nrows }, () => new Array(cols).fill(false));
  for (let r = 0; r < nrows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!filled[r][c] || seen[r][c]) continue;
      let minR = r, maxR = r, minC = c, maxC = c;
      const stack: [number, number][] = [[r, c]]; seen[r][c] = true;
      while (stack.length) {
        const [cr, cc] = stack.pop()!;
        if (cr < minR) minR = cr; if (cr > maxR) maxR = cr; if (cc < minC) minC = cc; if (cc > maxC) maxC = cc;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const nr = cr + dr, nc = cc + dc;
          if (nr < 0 || nc < 0 || nr >= nrows || nc >= cols || seen[nr][nc] || !filled[nr][nc]) continue;
          seen[nr][nc] = true; stack.push([nr, nc]);
        }
      }
      for (let rr = minR; rr <= maxR; rr++) for (let cc = minC; cc <= maxC; cc++) inTable[rr][cc] = true;
    }
  }

  const BLUE = '#4472C4', BORDER = '#8EA9DB', TOTAL_BG = '#D9E1F2';

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
      <div className="p-4 border-b border-[#E5E7EB] bg-[#8b1a1a]">
        <h3 className="font-black text-white text-sm uppercase tracking-wide text-center">Data Analysic — Pivot (sao chép từ Excel)</h3>
      </div>
      <div className="overflow-auto max-h-[80vh] p-4 bg-slate-100">
        <table style={{ tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11 }}>
          <tbody>
            {grid.map((row, ri) => (
              <tr key={ri}>
                {Array.from({ length: cols }).map((_, ci) => {
                  const v = (row[ci] ?? '').trim();
                  // Ngoài mọi khối bảng -> khoảng trống tách bảng (không kẻ viền).
                  if (!inTable[ri][ci]) {
                    return <td key={ci} style={{ minWidth: 16, border: 'none', background: 'transparent' }} />;
                  }
                  const header = isHeaderCell(v);
                  const total = rowHasTotal[ri];
                  const numeric = !header && isNumericCell(v);
                  const style: React.CSSProperties = {
                    border: `1px solid ${BORDER}`, minWidth: v ? 78 : 36, maxWidth: 280,
                    padding: '4px 9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    verticalAlign: 'middle', background: '#fff',
                    textAlign: numeric ? 'right' : 'left',
                  };
                  if (header) { style.background = BLUE; style.color = '#fff'; style.fontWeight = 700; }
                  else if (total) { style.background = TOTAL_BG; style.fontWeight = 700; style.color = '#1f3864'; }
                  else { style.color = numeric ? '#1f2937' : '#334155'; }
                  return (
                    <td key={ci} style={style} className={numeric ? 'font-mono' : ''} title={v || undefined}>{v}</td>
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
