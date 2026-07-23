import * as xlsx from 'xlsx';
import fs from 'fs';
import {
  ProjectModel, EmployeeModel, ResourceSummaryModel, ContractModel,
  IssueModel, MilestoneModel, CashFlowModel, CashFlowDetailModel,
  ActivityLogModel, ImportHistoryModel,
} from '../models';

// ---------- helpers ----------
type Row = any[];
type Grid = Row[];

const strip = (s: string) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export const slug = (name: string) =>
  strip(String(name || '').trim()).replace(/[^a-z0-9]/g, '');

// Format a JS Date to YYYY-MM-DD. SheetJS builds date cells at LOCAL midnight,
// so we must read local components — using toISOString() (UTC) shifts the day
// back by one in positive-offset timezones (e.g. UTC+7), which caused dates to
// appear one day early.
const pad2 = (n: number) => String(n).padStart(2, '0');
const fmtDate = (d: Date): string => {
  // guard against SheetJS epoch rounding (e.g. 23:59:59.999 of the prior day):
  // nudge by 2 minutes before reading local Y/M/D.
  const x = new Date(d.getTime() + 2 * 60 * 1000);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};

const str = (v: any): string => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return fmtDate(v);
  return String(v).replace(/\r?\n/g, ' ').trim();
};

const dateStr = (v: any): string => {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return fmtDate(v);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
};

const num = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
};

const grid = (ws: xlsx.WorkSheet): Grid =>
  xlsx.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as Grid;

// Normalize a header label to its "meaning": drop diacritics, đ->d, lowercase,
// collapse any punctuation/whitespace to single spaces. So "DOANH THU", "Doanh thu",
// "doanh_thu", "  Doanh  Thu " all become "doanh thu". This makes column matching
// tolerant of case / accents / spacing / punctuation — no fixed positions, no exact text.
export const norm = (v: any): string => strip(str(v)).replace(/[^a-z0-9]+/g, ' ').trim();

// find the first row index whose cells include ALL given labels (normalized match)
const findHeaderRow = (rows: Grid, labels: string[]): number => {
  const want = labels.map(norm);
  for (let i = 0; i < rows.length; i++) {
    const cells = (rows[i] || []).map(norm);
    if (want.every((l) => cells.includes(l))) return i;
  }
  return -1;
};

// Like findHeaderRow, but among all matching header rows prefers the one that actually has
// DATA beneath it. This skips residual/empty header blocks (e.g. leftover side-by-side
// columns) so we lock onto the real, populated table.
const findHeaderRowWithData = (rows: Grid, labels: string[], contentLabels: string[], preferFrom = 0): number => {
  const want = labels.map(norm);
  const candidates: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const cells = (rows[i] || []).map(norm);
    if (want.every((l) => cells.includes(l))) candidates.push(i);
  }
  if (candidates.length === 0) return -1;
  const hasData = (c: number): boolean => {
    const hr = rows[c] || [];
    const cols = contentLabels.map((l) => colOf(hr, l)).filter((x) => x >= 0);
    for (let i = c + 1; i < Math.min(c + 60, rows.length); i++) {
      const r = rows[i] || [];
      if (cols.some((col) => str(r[col]) !== '')) return true;
    }
    return false;
  };
  // Prefer a header at/after `preferFrom` with data (the table belonging to this section,
  // e.g. the stacked issue table below the contract table). Then any header with data.
  for (const c of candidates) if (c >= preferFrom && hasData(c)) return c;
  for (const c of candidates) if (hasData(c)) return c;
  return candidates[0];
};

// column index of a header label within a row (normalized). Prefers an EXACT normalized
// match; only if none exists does it fall back to startsWith (so "IPC" never grabs "IPC01").
const colOf = (row: Row, label: string, from = 0): number => {
  const want = norm(label);
  const r = row || [];
  for (let j = from; j < r.length; j++) if (norm(r[j]) === want) return j;
  for (let j = from; j < r.length; j++) { const c = norm(r[j]); if (c && c.startsWith(want)) return j; }
  return -1;
};
const colOfAny = (row: Row, labels: string[], from = 0): number => {
  // try exact-normalized for every alias first, then startsWith for every alias
  const r = row || [];
  const wants = labels.map(norm);
  for (let j = from; j < r.length; j++) { const c = norm(r[j]); if (wants.includes(c)) return j; }
  for (let j = from; j < r.length; j++) { const c = norm(r[j]); if (c && wants.some((w) => c.startsWith(w))) return j; }
  return -1;
};

const isTotalRow = (v: any): boolean => {
  const s = strip(str(v));
  return s === 'total' || s === 'tong' || s === 'tong cong';
};

const normIssueStatus = (v: any): string => {
  const s = strip(str(v));
  if (!s) return 'Opened';
  if (s.includes('close') || s.includes('nghiem thu') || s.includes('hoan thanh')) return 'Closed';
  if (s.includes('process') || s.includes('progress') || s.includes('thuc hien') || s.includes('dang')) return 'In Progress';
  return 'Opened';
};

// ---------- parsers ----------

export function parseTimeline(rows: Grid) {
  const h = findHeaderRow(rows, ['DỰ ÁN', 'BCH', 'IPC']);
  if (h === -1) return [];
  const hr = rows[h];
  const C = {
    name: colOf(hr, 'DỰ ÁN'), manager: colOf(hr, 'QLDA/CHT'), bch: colOf(hr, 'BCH'),
    revenue: colOf(hr, 'DOANH THU'), bqBch: colOf(hr, 'BQ BCH'), ipc: colOf(hr, 'IPC'),
    outstanding: colOf(hr, 'GT CÒN LẠI'), pct: colOf(hr, '% TT/KH'),
    planStart: colOf(hr, 'KH B.ĐẦU'), planEnd: colOf(hr, 'KH K.THÚC'), planDays: colOf(hr, 'KẾ HOẠCH'),
    actStart: colOf(hr, 'TT B.ĐẦU'), actEnd: colOf(hr, 'TT K.THÚC'), actDays: colOf(hr, 'THỰC TẾ'),
    varStart: colOf(hr, 'CL B.ĐẦU'), varEnd: colOf(hr, 'CL. K.THÚC'), score: colOf(hr, 'TÌNH TRẠNG'),
  };
  const out: any[] = [];
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const name = str(r[C.name]);
    if (!name || isTotalRow(r[C.name]) || isTotalRow(r[1])) continue;
    const planDays = num(r[C.planDays]);
    const actDays = num(r[C.actDays]);
    const score = num(r[C.score]);
    out.push({
      id: slug(name), name,
      manager: str(r[C.manager]),
      bch: num(r[C.bch]),
      revenue: num(r[C.revenue]),
      bqBch: num(r[C.bqBch]),
      ipcActual: num(r[C.ipc]),
      outstandingBudget: num(r[C.outstanding]),
      pctPlan: num(r[C.pct]) * 100,
      planStart: dateStr(r[C.planStart]), planEnd: dateStr(r[C.planEnd]), planDays,
      actualStart: dateStr(r[C.actStart]), actualEnd: dateStr(r[C.actEnd]), actualDays: actDays,
      varStart: num(r[C.varStart]), varEnd: num(r[C.varEnd]), statusScore: score,
      startDate: dateStr(r[C.planStart]), endDate: dateStr(r[C.planEnd]),
      progressActual: planDays ? Math.max(0, Math.min(100, Math.round((actDays / planDays) * 100))) : 0,
      progressPlanned: 100,
      status: score < 0 ? 'Delayed' : 'On Track',
    });
  }
  return out;
}

export function parseBudget(rows: Grid): Map<string, { budget: number; spent: number }> {
  const map = new Map<string, { budget: number; spent: number }>();
  const h = findHeaderRow(rows, ['TÊN DỰ ÁN', 'NGÂN SÁCH']);
  if (h === -1) return map;
  const hr = rows[h];
  const cName = colOf(hr, 'TÊN DỰ ÁN'), cBudget = colOf(hr, 'NGÂN SÁCH'), cSpent = colOf(hr, 'ĐÃ SỬ DỤNG');
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const name = str(r[cName]);
    if (!name || isTotalRow(r[cName]) || isTotalRow(r[0])) continue;
    map.set(slug(name), { budget: num(r[cBudget]), spent: num(r[cSpent]) });
  }
  return map;
}

export function parseResource(rows: Grid) {
  const summaries: any[] = [];
  const employees: any[] = [];

  // staff-list header (may be side-by-side on the same row, or stacked below the summary)
  const hs = findHeaderRow(rows, ['HỌ VÀ TÊN', 'CHỨC DANH']);

  // summary table (per project role counts)
  const hl = findHeaderRow(rows, ['PHÒNG BAN - DỰ ÁN', 'TỔNG CỘNG']);
  if (hl !== -1) {
    const hr = rows[hl];
    const cName = colOf(hr, 'PHÒNG BAN - DỰ ÁN');
    const cTotal = colOf(hr, 'TỔNG CỘNG');
    const roleCols: { key: string; idx: number }[] = [];
    for (let j = cName + 1; j < cTotal; j++) {
      const label = str(hr[j]);
      if (label) roleCols.push({ key: label, idx: j });
    }
    // If the staff list is stacked BELOW the summary, stop before it so staff rows
    // aren't miscounted as summary rows. (Side-by-side layout: hs === hl → read to end.)
    const summaryEnd = (hs > hl) ? hs : rows.length;
    for (let i = hl + 1; i < summaryEnd; i++) {
      const r = rows[i] || [];
      const name = str(r[cName]);
      if (!name || isTotalRow(r[cName])) continue;
      const roleCounts: Record<string, number> = {};
      roleCols.forEach((rc) => { if (r[rc.idx] != null) roleCounts[rc.key] = num(r[rc.idx]); });
      summaries.push({
        id: slug(name), name, value: num(r[cTotal]), roleCounts,
        focus: '', status: '', type: 'Project',
      });
    }
  }

  // RIGHT/BELOW staff list
  if (hs !== -1) {
    const hr = rows[hs];
    const cTT = colOf(hr, 'TT', colOf(hr, 'HỌ VÀ TÊN') - 3 > 0 ? colOf(hr, 'HỌ VÀ TÊN') - 3 : 0);
    const cDept = colOf(hr, 'BỘ PHẬN - DỰ ÁN');
    const cName = colOf(hr, 'HỌ VÀ TÊN');
    const cTitle = colOf(hr, 'CHỨC DANH');
    const cDesc = colOfAny(hr, ['MÔ TẢ CÔNG VIỆC HIỆN TẠI', 'MÔ TẢ CÔNG VIỆC']);
    const cKpi = colOf(hr, 'KPI');
    const cSalary = colOf(hr, 'LƯƠNG');
    const cIns = colOfAny(hr, ['BHXH + BHYT + CĐ', 'BHXH']);
    const cAllow = colOf(hr, 'PHỤ CẤP');
    const cCost = colOf(hr, 'CHI PHÍ');
    const cLevel = colOf(hr, 'CẤP BẬC');
    const cSeg = colOf(hr, 'PHÂN HỆ');
    const cBranch = colOf(hr, 'NGÀNH');
    const cQual = colOfAny(hr, ['Trình độ', 'TRÌNH ĐỘ']);
    const cCert = colOf(hr, 'CCHN');
    const cGrade = colOf(hr, 'HẠNG');
    let seq = 0;
    for (let i = hs + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const name = str(r[cName]);
      if (!name || isTotalRow(name) || /^\d+$/.test(name) || (cTT !== -1 && isTotalRow(r[cTT]))) continue;
      seq++;
      employees.push({
        id: cTT !== -1 && r[cTT] != null ? num(r[cTT]) : seq,
        department: str(r[cDept]), name, title: str(r[cTitle]), description: str(r[cDesc]),
        kpi: str(r[cKpi]), salary: str(r[cSalary]), insurance: str(r[cIns]),
        allowance: str(r[cAllow]), cost: str(r[cCost]), level: str(r[cLevel]),
        segment: str(r[cSeg]), branch: str(r[cBranch]), qualification: str(r[cQual]),
        certifications: str(r[cCert]), grade: cGrade !== -1 ? str(r[cGrade]) : '',
        status: 'Active',
      });
    }
  }

  return { summaries, employees };
}

export function parseProjectSheet(rows: Grid, projectId: string, projectName: string) {
  const contracts: any[] = [];
  const issues: any[] = [];
  const cashflow: any[] = [];

  // The contract table and the issue table may share ONE header row (side-by-side layout)
  // or be two SEPARATE stacked tables. Locate each header independently.
  const cH = findHeaderRowWithData(rows, ['Hợp đồng', 'Số tiền'], ['Hợp đồng', 'Số tiền', 'Ngân sách', 'Nội dung']);
  // For issues, prefer the table at/after the contract table (handles stacked layouts where a
  // residual side-by-side issue block still lingers above the real stacked one).
  const iH = findHeaderRowWithData(rows, ['Ngày ghi nhận', 'Vấn đề phát sinh'], ['Vấn đề phát sinh', 'Người phụ trách'], cH);

  // ----- Contracts / Phụ lục / VO -----
  if (cH !== -1) {
    const hr = rows[cH];
    const cName = colOf(hr, 'Hợp đồng');
    const cSign = colOfAny(hr, ['Ngày ký/Ngày trình', 'Ngày ký']);
    const cAmount = colOf(hr, 'Số tiền');
    const cIpc = colOf(hr, 'IPC');
    const cBudget = colOfAny(hr, ['Ngân sách', 'NGÂN SÁCH']);
    const cStart = colOf(hr, 'Bắt đầu');
    const cEnd = colOf(hr, 'Kết thúc');
    const cDur = colOf(hr, 'Thời gian');
    const cContent = colOf(hr, 'Nội dung');
    const cStatus = colOf(hr, 'Tình trạng');
    const ipcCols: { key: string; idx: number }[] = [];
    hr.forEach((c, j) => { if (/^ipc\s*\d+$/.test(norm(c))) ipcCols.push({ key: str(c), idx: j }); });
    // if the issue table is stacked AFTER the contract table, stop before it
    const cEndRow = (iH > cH) ? iH : rows.length;
    let cSeq = 0;
    for (let i = cH + 1; i < cEndRow; i++) {
      const r = rows[i] || [];
      const cn = str(r[cName]);
      if (isTotalRow(cn)) continue;
      const amount = num(r[cAmount]);
      const budget = cBudget !== -1 ? num(r[cBudget]) : 0;
      const ipc = cIpc !== -1 ? num(r[cIpc]) : 0;
      const content = str(r[cContent]);
      const sign = dateStr(r[cSign]);
      const start = dateStr(r[cStart]);
      // Bỏ dòng banner/trống: không có tên HĐ VÀ cũng không có số liệu/nội dung nào.
      // (Giữ lại dòng chỉ có ngân sách + nội dung như "Gói 1, 2, 3" dù chưa có số hợp đồng.)
      if (!cn && !amount && !budget && !ipc && !content) continue;
      if (cn && !amount && !budget && !ipc && !content && !sign && !start) continue;
      cSeq++;
      const ipcBreakdown: Record<string, number> = {};
      ipcCols.forEach((ic) => { if (r[ic.idx] != null) ipcBreakdown[ic.key] = num(r[ic.idx]); });
      const low = strip(cn);
      const kind = low.includes('vo') ? 'VO' : low.includes('pl') ? 'Phụ lục' : 'Hợp đồng';
      contracts.push({
        id: `${projectId}-c${cSeq}`, projectId, projectName,
        name: cn, signDate: sign, amount, ipcAmount: ipc, budget, ipcBreakdown,
        startDate: start, endDate: dateStr(r[cEnd]), duration: str(r[cDur]),
        content, status: str(r[cStatus]) || 'Active', kind,
      });
    }
  }

  // ----- Issues (THEO DÕI CÁC VẤN ĐỀ PHÁT SINH) -----
  if (iH !== -1) {
    const hr = rows[iH];
    const iDate = colOf(hr, 'Ngày ghi nhận');
    const iItem = colOf(hr, 'Hạng mục');
    const iIssue = colOf(hr, 'Vấn đề phát sinh');
    const iAction = colOf(hr, 'Giải pháp hành động');
    const iAssignee = colOf(hr, 'Người phụ trách');
    const iTarget = colOf(hr, 'Dự kiến hoàn thành');
    const iActual = colOf(hr, 'Thực tế hoàn thành');
    const iStatus = colOf(hr, 'Tình trạng', iDate >= 0 ? iDate : 0);
    let iSeq = 0;
    for (let i = iH + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const itext = str(r[iIssue]);
      const iitem = str(r[iItem]);
      const iass = str(r[iAssignee]);
      if (!itext && !iitem && !iass) continue;
      iSeq++;
      issues.push({
        id: `${projectId}-i${iSeq}`, projectId, projectName,
        loggedDate: dateStr(r[iDate]), assignee: iass, item: iitem,
        issueText: itext, actionText: str(r[iAction]), resultText: '',
        voAmount: 0, budget: 0,
        targetComplete: dateStr(r[iTarget]), actualComplete: dateStr(r[iActual]),
        status: normIssueStatus(r[iStatus]), source: 'project',
      });
    }
  }

  // cashflow: monthly "Tổng số tiền nhận trong kỳ" (in) & "Tổng số tiền phải chi" (out),
  // planned block (left) + actual block (right). All-zero in template stays zero (faithful).
  const monthHdr = rows.find((r) => (r || []).some((c) => isTotalRow(c)) && (r || []).some((c) => c instanceof Date));
  if (monthHdr) {
    const totalIdxs: number[] = [];
    monthHdr.forEach((c, j) => { if (isTotalRow(c)) totalIdxs.push(j); });
    // planned months = date cells before first Total; actual = date cells before second Total
    const plannedMonths: number[] = [];
    const actualMonths: number[] = [];
    monthHdr.forEach((c, j) => {
      if (c instanceof Date) {
        if (totalIdxs[0] != null && j < totalIdxs[0]) plannedMonths.push(j);
        else if (totalIdxs[1] != null && j < totalIdxs[1]) actualMonths.push(j);
      }
    });
    const rowByLabel = (label: string) => rows.find((r) => (r || []).some((c) => strip(str(c)) === strip(label)));
    const inRow = rowByLabel('Tổng số tiền nhận trong kỳ');
    const outRow = rowByLabel('Tổng số tiền phải chi');
    plannedMonths.forEach((mCol, k) => {
      const aCol = actualMonths[k];
      cashflow.push({
        projectId,
        month: dateStr(monthHdr[mCol]),
        plannedIn: inRow ? num(inRow[mCol]) : 0,
        plannedOut: outRow ? num(outRow[mCol]) : 0,
        actualIn: inRow && aCol != null ? num(inRow[aCol]) : 0,
        actualOut: outRow && aCol != null ? num(outRow[aCol]) : 0,
      });
    });
  }

  return { contracts, issues, cashflow };
}

// Full detailed monthly cashflow model (planned + actual) + contract header params.
export function parseCashflowDetail(rows: Grid) {
  const empty = { params: {}, planned: [] as any[], actual: [] as any[] };

  // contract header row (first row containing "Giá trị hợp đồng"), matched by normalized label
  const gRow = rows.find((r) => (r || []).some((c) => norm(c) === norm('Giá trị hợp đồng')));
  const allCols = (row: Row, label: string) => {
    const want = norm(label);
    const out: number[] = [];
    (row || []).forEach((c, j) => { const n = norm(c); if (n === want || (n && n.startsWith(want))) out.push(j); });
    return out;
  };
  const params: any = {};
  if (gRow) {
    const gv = allCols(gRow, 'Giá trị hợp đồng');
    const gd = allCols(gRow, 'Ngày hợp đồng');
    const gw = allCols(gRow, 'Cảnh báo khi số dư');
    params.plannedContractValue = gv[0] != null ? num(gRow[gv[0] + 1]) : 0;
    params.actualContractValue = gv[1] != null ? num(gRow[gv[1] + 1]) : 0;
    params.plannedContractDate = gd[0] != null ? dateStr(gRow[gd[0] + 1]) : '';
    params.actualContractDate = gd[1] != null ? dateStr(gRow[gd[1] + 1]) : '';
    params.warningThreshold = gw[0] != null ? num(gRow[gw[0] + 1]) : 0;
  }

  // month header row = the row (within the cashflow region, cols 1..17) carrying the
  // "Total" markers. Some sheets fill month dates, others leave them blank — so we derive
  // the month value columns POSITIONALLY from the Total markers (works with or without dates).
  const totalCount = (r: Row) => (r || []).slice(0, 18).filter((c) => isTotalRow(c)).length;
  let mIdx = rows.findIndex((r) => totalCount(r) >= 2);
  if (mIdx === -1) mIdx = rows.findIndex((r) => totalCount(r) >= 1);
  if (mIdx === -1) return { ...empty, params };
  const monthHdr = rows[mIdx];
  const totals: number[] = [];
  monthHdr.slice(0, 18).forEach((c, j) => { if (isTotalRow(c)) totals.push(j); });

  // Determine the LABEL columns (planned + actual) dynamically. Different exports shift
  // the whole block left/right (e.g. no leading empty column), so we cannot assume col 1/10.
  // The label "Số dư dòng tại đầu mỗi tháng" appears once per block → gives both label cols.
  let plLabelCol = 1, acLabelCol = 10;
  const labelRow = rows.find((r) => (r || []).some((c) => strip(str(c)).startsWith('so du dong')));
  if (labelRow) {
    const cs: number[] = [];
    labelRow.forEach((c, j) => { if (strip(str(c)).startsWith('so du dong')) cs.push(j); });
    if (cs[0] != null) plLabelCol = cs[0];
    if (cs[1] != null) acLabelCol = cs[1];
  }

  // value columns = between each block's label column and its Total marker
  const plannedCols: number[] = [];
  for (let j = plLabelCol + 1; j < totals[0]; j++) plannedCols.push(j);
  const actualCols: number[] = [];
  if (totals[1] != null) {
    for (let j = acLabelCol + 1; j < totals[1]; j++) if (j > totals[0]) actualCols.push(j);
  }

  // locate rows by their label in ANY column (label may sit at col 0/1/9/10 depending on export)
  const rowIdx = (pred: (s: string) => boolean) =>
    rows.findIndex((r) => (r || []).some((c) => { const s = strip(str(c)); return !!s && pred(s); }));
  const iBegin = rowIdx((s) => s.startsWith('so du dong'));
  const iAdvIn = rowIdx((s) => s.startsWith('thu tam ung'));
  const iRecov = rowIdx((s) => s.startsWith('hoan tam ung'));
  const iIpc = rowIdx((s) => s.startsWith('thu theo ipc'));
  const iTotalIn = rowIdx((s) => s.startsWith('tong so tien nhan'));
  const iCash = rowIdx((s) => s.startsWith('so tien co dau thang'));
  const iDirect = rowIdx((s) => s.startsWith('chi phi truc tiep'));
  const iMgmt = rowIdx((s) => s.startsWith('chi phi qlda'));
  const iUnalloc = rowIdx((s) => s.startsWith('chua phan bo'));
  const iSub = rowIdx((s) => s === 'cong');
  const iOther = rowIdx((s) => s === 'khac');
  const iTotalOut = rowIdx((s) => s.startsWith('tong so tien phai chi'));
  const iEnd = rowIdx((s) => s.startsWith('so tien cuoi thang'));

  // package sub-rows sit between section header and the next total row
  const pkgRows = (from: number, to: number) => {
    const out: number[] = [];
    if (from < 0 || to < 0) return out;
    for (let i = from + 1; i < to && out.length < 3; i++) {
      const s = strip(str((rows[i] || [])[plLabelCol]) || str((rows[i] || [])[acLabelCol]));
      if (s) out.push(i);
    }
    return out;
  };
  const ipcPkg = pkgRows(iIpc, iTotalIn);
  const dirPkg = pkgRows(iDirect, iMgmt);

  const build = (cols: number[]) =>
    cols.map((mc, k) => {
      const at = (idx: number) => (idx >= 0 ? num(rows[idx]?.[mc]) : 0);
      const pk = (arr: number[], p: number) => (arr[p] != null ? num(rows[arr[p]]?.[mc]) : 0);
      return {
        month: dateStr(monthHdr[mc]) || `Kỳ ${k + 1}`,
        beginningBalance: at(iBegin),
        advanceIn: at(iAdvIn),
        advanceRecovery: at(iRecov),
        ipcIn: at(iIpc),
        packageIpc: { pkg1: pk(ipcPkg, 0), pkg2: pk(ipcPkg, 1), pkg3: pk(ipcPkg, 2) },
        totalInPeriod: at(iTotalIn),
        cashAvailable: at(iCash),
        directCost: { pkg1: pk(dirPkg, 0), pkg2: pk(dirPkg, 1), pkg3: pk(dirPkg, 2) },
        managementCost: at(iMgmt),
        unallocatedCost: at(iUnalloc),
        subtotalOut: at(iSub),
        otherOut: at(iOther),
        totalOutPeriod: at(iTotalOut),
        endingBalance: at(iEnd),
      };
    });

  return { params, planned: build(plannedCols), actual: build(actualCols) };
}

export function parseOldPro(rows: Grid) {
  const h = findHeaderRow(rows, ['Dự án', 'Vấn đề phát sinh']);
  if (h === -1) return [];
  const hr = rows[h];
  const C = {
    date: colOf(hr, 'Ngày ghi nhận'), project: colOf(hr, 'Dự án'), assignee: colOf(hr, 'Người phụ trách'),
    issue: colOf(hr, 'Vấn đề phát sinh'), action: colOf(hr, 'Giải pháp hành động'), result: colOf(hr, 'Kết quả'),
    vo: colOfAny(hr, ['VO / BOQ', 'VO/BOQ']), budget: colOf(hr, 'Ngân sách'),
    target: colOfAny(hr, ['Dự kiến\r\nhoàn thành', 'Dự kiến hoàn thành']),
    actual: colOfAny(hr, ['Thực tế\r\nhoàn thành', 'Thực tế hoàn thành']),
    status: colOf(hr, 'Tình trạng'),
  };
  const out: any[] = [];
  let seq = 0;
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const issue = str(r[C.issue]);
    const proj = str(r[C.project]);
    if (!issue && !proj) continue;
    seq++;
    out.push({
      id: `old-${seq}`, projectId: slug(proj), projectName: proj,
      loggedDate: dateStr(r[C.date]), assignee: str(r[C.assignee]), item: '',
      issueText: issue, actionText: str(r[C.action]), resultText: str(r[C.result]),
      voAmount: num(r[C.vo]), budget: num(r[C.budget]),
      targetComplete: dateStr(r[C.target]), actualComplete: dateStr(r[C.actual]),
      status: normIssueStatus(r[C.status]), source: 'old_pro',
    });
  }
  return out;
}

// Reserved sheet names (everything else is treated as a project sheet — no fixed list).
const RESERVED_SHEETS = ['dashboard', 'resource', 'budget', 'timeline', 'old pro'];
export const isProjectSheet = (name: string) => !RESERVED_SHEETS.includes(norm(name));

// project sheet name -> Timeline project id (handles "Charm" -> "Charm Ming", "Phu Huu" -> "Phú Hữu")
function resolveProjectId(sheetName: string, projects: any[]): { id: string; name: string } {
  const s = slug(sheetName);
  const exact = projects.find((p) => p.id === s);
  if (exact) return { id: exact.id, name: exact.name };
  const pref = projects.find((p) => p.id.startsWith(s) || s.startsWith(p.id));
  if (pref) return { id: pref.id, name: pref.name };
  return { id: s, name: sheetName };
}

// ---------- orchestrator ----------
export async function importTemplate(fileData: Buffer, filename: string, username = 'System') {
  const start = Date.now();
  const wb = xlsx.read(fileData, { type: 'buffer', cellDates: true });
  const sheet = (name: string): Grid | null => (wb.Sheets[name] ? grid(wb.Sheets[name]) : null);

  // 1. Projects = Timeline merged with Budget
  const projects = parseTimeline(sheet('Timeline') || []);
  const budgetMap = parseBudget(sheet('Budget') || []);
  projects.forEach((p) => {
    const b = budgetMap.get(p.id);
    if (b) { p.budget = b.budget; p.spent = b.spent; }
  });

  // 2. Resource -> summaries + employees
  const { summaries, employees } = parseResource(sheet('Resource') || []);

  // 3. Per-project sheets -> contracts, issues, cashflow
  const contracts: any[] = [];
  const issues: any[] = [];
  const cashflow: any[] = [];
  const cashflowDetail: any[] = [];
  const projectSheetNames = wb.SheetNames.filter(isProjectSheet);
  for (const sn of projectSheetNames) {
    const g = sheet(sn);
    if (!g) continue;
    const { id, name } = resolveProjectId(sn, projects);
    const parsed = parseProjectSheet(g, id, name);
    contracts.push(...parsed.contracts);
    issues.push(...parsed.issues);
    const detail = parseCashflowDetail(g);
    cashflowDetail.push({ projectId: id, ...detail });
    // Simple monthly cashflow (for the overview chart) derived from the detailed model,
    // so it works regardless of column layout / text-vs-date month headers.
    detail.planned.forEach((pm: any, k: number) => {
      const am: any = detail.actual[k] || {};
      cashflow.push({
        projectId: id, month: pm.month,
        plannedIn: pm.totalInPeriod || 0, plannedOut: pm.totalOutPeriod || 0,
        actualIn: am.totalInPeriod || 0, actualOut: am.totalOutPeriod || 0,
      });
    });
    // set fullName on the matching project from the sheet banner (row 0/1 title)
    const banner = (g[0] || []).concat(g[1] || []).map((c) => str(c)).find((t) => t && t.length > 12);
    const proj = projects.find((p) => p.id === id);
    if (proj && banner) proj.fullName = banner;
  }

  // 4. Old_Pro -> issues
  issues.push(...parseOldPro(sheet('Old_Pro') || []));

  // 5. Activity log derived from real issue rows (most recent first)
  const activity = issues
    .filter((i) => i.issueText)
    .sort((a, b) => (b.loggedDate || '').localeCompare(a.loggedDate || ''))
    .slice(0, 20)
    .map((i, k) => ({
      id: `act-${k}`, user: i.assignee || '—',
      action: i.issueText, target: i.item || i.projectName,
      timestamp: i.loggedDate, project: i.projectName,
    }));

  // 6. Milestones: template has no milestone source -> leave empty (no fabrication)
  const milestones: any[] = [];

  // 7. CLEAN REPLACE all collections
  await Promise.all([
    ProjectModel.deleteMany({}), EmployeeModel.deleteMany({}), ResourceSummaryModel.deleteMany({}),
    ContractModel.deleteMany({}), IssueModel.deleteMany({}), MilestoneModel.deleteMany({}),
    CashFlowModel.deleteMany({}), CashFlowDetailModel.deleteMany({}), ActivityLogModel.deleteMany({}),
  ]);
  if (cashflowDetail.length) await CashFlowDetailModel.insertMany(cashflowDetail);
  if (projects.length) await ProjectModel.insertMany(projects);
  if (employees.length) await EmployeeModel.insertMany(employees);
  if (summaries.length) await ResourceSummaryModel.insertMany(summaries);
  if (contracts.length) await ContractModel.insertMany(contracts);
  if (issues.length) await IssueModel.insertMany(issues);
  if (milestones.length) await MilestoneModel.insertMany(milestones);
  if (cashflow.length) await CashFlowModel.insertMany(cashflow);
  if (activity.length) await ActivityLogModel.insertMany(activity);

  const stats = {
    sheets: wb.SheetNames.length,
    projects: projects.length, employees: employees.length,
    resourceSummary: summaries.length, contracts: contracts.length,
    issues: issues.length, cashflow: cashflow.length,
    cashflowDetail: cashflowDetail.length, activity: activity.length,
    duration: Date.now() - start,
  };
  await ImportHistoryModel.create({ filename, user: username, ...stats });
  return stats;
}
