import xlsx from 'xlsx';
import {
  ProjectModel, EmployeeModel, ContractModel, IpcModel, BudgetItemModel,
  IssueModel, TodoModel, ActivityLogModel, ImportHistoryModel,
} from '../models';

type Grid = any[][];

export const norm = (s: any): string =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();

export const slug = (s: any): string => norm(s).replace(/ /g, '');

export const str = (v: any): string => (v == null ? '' : String(v).trim());

export function numOr(v: any, fallback = 0): number {
  if (v == null || v === '') return fallback;
  if (typeof v === 'number') return isFinite(v) ? v : fallback;
  let s = String(v).trim();
  if (s === '' || s === '-' || s === '–') return fallback;
  const neg = /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, '').replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  const n = parseFloat(s);
  if (!isFinite(n)) return fallback;
  return neg ? -n : n;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
export function fmtDate(v: any): string {
  if (v == null || v === '') return '';
  let d: Date;
  if (v instanceof Date) d = v;
  else {
    const s = String(v).trim();
    if (!s) return '';
    // support m/d/yy and dd/mm/yyyy textual dates
    const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (mdy) {
      let [_, a, b, y] = mdy; let Y = +y; if (Y < 100) Y += 2000;
      // heuristic: if first > 12 it's d/m, else m/d (workbook uses m/d/yy)
      const first = +a, second = +b;
      const month = first > 12 ? second : first, day = first > 12 ? first : second;
      d = new Date(Y, month - 1, day);
    } else { const t = new Date(s); if (isNaN(+t)) return s; d = t; }
  }
  if (isNaN(+d)) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function sheetRows(wb: xlsx.WorkBook, name: string): Grid {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return xlsx.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as Grid;
}

export function findHeaderRow(rows: Grid, labels: string[]): number {
  const want = labels.map(norm);
  for (let i = 0; i < rows.length; i++) {
    const cells = (rows[i] || []).map(norm);
    if (want.every((w) => cells.some((c) => c === w || c.includes(w)))) return i;
  }
  return -1;
}

export function colOf(header: any[], label: string, fallback = -1): number {
  const w = norm(label);
  const cells = (header || []).map(norm);
  let i = cells.indexOf(w);
  if (i === -1) i = cells.findIndex((c) => c.includes(w) && w.length > 2);
  return i === -1 ? fallback : i;
}
