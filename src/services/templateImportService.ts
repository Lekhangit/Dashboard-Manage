import xlsx from 'xlsx';
import {
  ProjectModel, EmployeeModel, ContractModel, IpcModel, BudgetItemModel,
  IssueModel, TodoModel, ActivityLogModel, ImportHistoryModel,
} from '../models';
import { Project, Employee, Contract, Ipc, BudgetItem, Issue, Todo, Analytics } from '../types';

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

export function parseProjects(rows: Grid): Project[] {
  const h = findHeaderRow(rows, ['DỰ ÁN', 'DOANH THU', 'NGÂN SÁCH']);
  if (h === -1) return [];
  const hr = rows[h];
  const c = {
    name: colOf(hr, 'DỰ ÁN'), bch: colOf(hr, 'BCH'), revenue: colOf(hr, 'DOANH THU'),
    avgBch: colOf(hr, 'BQ BCH'), ipc: colOf(hr, 'IPC'), ipcPct: colOf(hr, '%IPC'),
    budget: colOf(hr, 'NGÂN SÁCH'), used: colOf(hr, 'ĐÃ SỬ DỤNG'), ns: colOf(hr, '%NS'),
    planStart: colOf(hr, 'KH B.ĐẦU'), planEnd: colOf(hr, 'KH K.THÚC'),
    ttStart: colOf(hr, 'TT B.ĐẦU'), ttEnd: colOf(hr, 'TT K.THÚC'),
    vsPlan: colOf(hr, '%TT/KH'), bchEval: colOf(hr, '% BCH ĐÁNH GIÁ'),
    prog: colOf(hr, '% T.ĐỘ'), status: colOf(hr, 'TÌNH TRẠNG'),
  };
  const planDays = c.planEnd + 1;   // 'KẾ HOẠCH' (số ngày) ngay sau KH K.THÚC
  const actualDays = c.ttEnd + 1;   // 'THỰC TẾ' (số ngày) ngay sau TT K.THÚC
  const out: Project[] = [];
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i]; const name = str(r[c.name]);
    if (!name || norm(name).includes('total')) continue;
    out.push({
      id: slug(name), name, bch: numOr(r[c.bch]), revenue: numOr(r[c.revenue]),
      avgBch: numOr(r[c.avgBch]), ipc: numOr(r[c.ipc]), ipcPct: numOr(r[c.ipcPct]),
      budget: numOr(r[c.budget]), budgetUsed: numOr(r[c.used]), budgetPct: numOr(r[c.ns]),
      planStart: fmtDate(r[c.planStart]), planEnd: fmtDate(r[c.planEnd]), planDays: numOr(r[planDays]),
      actualStart: fmtDate(r[c.ttStart]), actualEnd: fmtDate(r[c.ttEnd]), actualDays: numOr(r[actualDays]),
      progressVsPlanPct: numOr(r[c.vsPlan]), bchEvalPct: numOr(r[c.bchEval]),
      progressPct: numOr(r[c.prog]), status: str(r[c.status]),
    });
  }
  return out;
}

export function parseEmployees(rows: Grid): Employee[] {
  const h = findHeaderRow(rows, ['HỌ VÀ TÊN', 'CHỨC DANH', 'PHÒNG BAN']);
  if (h === -1) return [];
  const hr = rows[h];
  const c = {
    tt: colOf(hr, 'TT'), dept: colOf(hr, 'PHÒNG BAN'), project: colOf(hr, 'DỰ ÁN'),
    name: colOf(hr, 'HỌ VÀ TÊN'), title: colOf(hr, 'CHỨC DANH'), plan: colOf(hr, 'KẾ HOẠCH'),
    job: colOf(hr, 'MÔ TẢ CÔNG VIỆC'), kpi: colOf(hr, 'KPI'), salary: colOf(hr, 'LƯƠNG'),
    ins: colOf(hr, 'BH'), allow: colOf(hr, 'PHỤ CẤP'), cost: colOf(hr, 'CHI PHÍ'),
    level: colOf(hr, 'CẤP BẬC'), sub: colOf(hr, 'PHÂN HỆ'), field: colOf(hr, 'NGÀNH'),
    edu: colOf(hr, 'Trình độ'), cchn: colOf(hr, 'CCHN'), rank: colOf(hr, 'HẠNG'),
  };
  const out: Employee[] = [];
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i]; const name = str(r[c.name]); const tt = str(r[c.tt]);
    if (!name || norm(name).includes('total') || norm(name).includes('grand')
      || norm(tt).includes('total') || norm(tt).includes('grand')) continue;
    out.push({
      tt: numOr(r[c.tt]), department: str(r[c.dept]), project: str(r[c.project]),
      name, title: str(r[c.title]), plan: str(r[c.plan]), jobDesc: str(r[c.job]), kpi: str(r[c.kpi]),
      salary: str(r[c.salary]), insurance: str(r[c.ins]), allowance: str(r[c.allow]), cost: str(r[c.cost]),
      level: str(r[c.level]), subsystem: str(r[c.sub]), field: str(r[c.field]),
      education: str(r[c.edu]), cchn: str(r[c.cchn]), rank: str(r[c.rank]),
    });
  }
  return out;
}

export function parseContracts(rows: Grid): Contract[] {
  const h = findHeaderRow(rows, ['DỰ ÁN', 'SỐ HỢP ĐỒNG', 'Nội dung']);
  if (h === -1) return [];
  const hr = rows[h];
  const c = {
    project: colOf(hr, 'DỰ ÁN'), code: colOf(hr, 'SỐ HỢP ĐỒNG'), date: colOf(hr, 'NGÀY PHÁT HÀNH'),
    amount: colOf(hr, 'Số tiền'), budget: colOf(hr, 'Ngân sách'), content: colOf(hr, 'Nội dung'),
    note: colOf(hr, 'GHI CHÚ'), status: colOf(hr, 'Tình trạng'),
  };
  const out: Contract[] = [];
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i];
    const project = str(r[c.project]), code = str(r[c.code]), content = str(r[c.content]);
    const amount = numOr(r[c.amount]);
    if (!project && !code && !content && !amount) continue;           // skip fully empty
    if (norm(project).includes('total')) continue;
    out.push({
      project, code, issueDate: fmtDate(r[c.date]), amount, budget: numOr(r[c.budget]),
      content, note: str(r[c.note]), status: str(r[c.status]),
    });
  }
  return out;
}

export function parseIpc(rows: Grid): Ipc[] {
  const h = findHeaderRow(rows, ['DỰ ÁN', 'SỐ IPC', 'CÒN LẠI']);
  if (h === -1) return [];
  const hr = rows[h];
  const c = {
    project: colOf(hr, 'DỰ ÁN'), no: colOf(hr, 'SỐ IPC'), date: colOf(hr, 'NGÀY IPC'),
    content: colOf(hr, 'NỘI DUNG'), amount: colOf(hr, 'SỐ TIỀN'), vat: colOf(hr, 'THUẾ GTGT'),
    total: colOf(hr, 'CỘNG'), actual: colOf(hr, 'THỰC NHẬN'), received: colOf(hr, 'ĐÃ NHẬN'),
    remaining: colOf(hr, 'CÒN LẠI'), status: colOf(hr, 'TÌNH TRẠNG'), note: colOf(hr, 'GHI CHÚ'),
  };
  const out: Ipc[] = [];
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i]; const project = str(r[c.project]), no = str(r[c.no]);
    const amount = numOr(r[c.amount]);
    if (!project && !no && !amount) continue;
    if (norm(project).includes('total')) continue;
    out.push({
      project, ipcNo: no, date: fmtDate(r[c.date]), content: str(r[c.content]),
      amount, vat: numOr(r[c.vat]), total: numOr(r[c.total]),
      actualReceived: numOr(r[c.actual]), received: numOr(r[c.received]), remaining: numOr(r[c.remaining]),
      status: str(r[c.status]), note: str(r[c.note]),
    });
  }
  return out;
}

export function parseBudget(rows: Grid): BudgetItem[] {
  const h = findHeaderRow(rows, ['DỰ ÁN', 'PHÂN LOẠI', 'DIỄN GIẢI']);
  if (h === -1) return [];
  const hr = rows[h];
  const c = {
    project: colOf(hr, 'DỰ ÁN'), pkg: colOf(hr, 'GÓI THẦU'), category: colOf(hr, 'PHÂN LOẠI'),
    dept: colOf(hr, 'PHÒNG'), desc: colOf(hr, 'DIỄN GIẢI'), plan: colOf(hr, 'KẾ HOẠCH'),
    actual: colOf(hr, 'THỰC TẾ'), variance: colOf(hr, 'CHÊNH LỆCH'), usage: colOf(hr, 'SỬ DỤNG'),
    status: colOf(hr, 'TÌNH TRẠNG'),
  };
  const out: BudgetItem[] = [];
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i]; const project = str(r[c.project]), category = str(r[c.category]);
    if (!project && !category) continue;
    if (norm(project).includes('total')) continue;
    out.push({
      project, pkg: str(r[c.pkg]), category, dept: str(r[c.dept]), desc: str(r[c.desc]),
      plan: numOr(r[c.plan]), actual: numOr(r[c.actual]), variance: numOr(r[c.variance]),
      usagePct: numOr(r[c.usage]), status: str(r[c.status]),
    });
  }
  return out;
}

export function parseIssues(rows: Grid): Issue[] {
  const h = findHeaderRow(rows, ['Ngày ghi nhận', 'Dự án', 'Vấn đề phát sinh']);
  if (h === -1) return [];
  const hr = rows[h];
  const c = {
    logged: colOf(hr, 'Ngày ghi nhận'), resp: colOf(hr, 'Ngày phản hồi'), project: colOf(hr, 'Dự án'),
    assignee: colOf(hr, 'Người phụ trách'), problem: colOf(hr, 'Vấn đề phát sinh'),
    solution: colOf(hr, 'Giải pháp hành động'), result: colOf(hr, 'Kết quả'), vo: colOf(hr, 'VO'),
    budget: colOf(hr, 'Ngân sách'), planned: colOf(hr, 'Dự kiến'), actual: colOf(hr, 'Thực tế'),
    status: colOf(hr, 'Tình trạng'),
  };
  const out: Issue[] = [];
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i]; const project = str(r[c.project]), problem = str(r[c.problem]);
    if (!project && !problem) continue;
    if (norm(project).includes('total')) continue;
    const loggedDate = fmtDate(r[c.logged]);
    out.push({
      id: `${slug(project)}|${slug(problem).slice(0, 40)}|${loggedDate}`,
      loggedDate, responseDays: str(r[c.resp]), project, assignee: str(r[c.assignee]),
      problem, solution: str(r[c.solution]), result: str(r[c.result]),
      voBoq: numOr(r[c.vo]), budget: numOr(r[c.budget]),
      plannedDate: fmtDate(r[c.planned]), actualDate: fmtDate(r[c.actual]), status: str(r[c.status]),
    });
  }
  return out;
}

const boolOf = (v: any) => norm(v) === 'true';

export function parseTodos(rows: Grid): Todo[] {
  const h = findHeaderRow(rows, ['NHÓM', 'NỘI DUNG', 'QUAN TRỌNG']);
  if (h === -1) return [];
  const hr = rows[h];
  const c = {
    tt: colOf(hr, 'TT'), group: colOf(hr, 'NHÓM'), project: colOf(hr, 'DỰ ÁN'), content: colOf(hr, 'NỘI DUNG'),
    start: colOf(hr, 'BẮT ĐẦU'), end: colOf(hr, 'KẾT THÚC'), days: colOf(hr, 'SỐ NGÀY'),
    status: colOf(hr, 'TÌNH TRẠNG'), important: colOf(hr, 'QUAN TRỌNG'), urgent: colOf(hr, 'KHẨN CẤP'),
    performer: colOf(hr, 'THỰC HIỆN'), coord: colOf(hr, 'PHỐI HỢP'), actual: colOf(hr, 'THỰC TẾ'),
    earlyLate: colOf(hr, 'SỚM'), note: colOf(hr, 'GHI CHÚ'),
  };
  const out: Todo[] = [];
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i]; const content = str(r[c.content]);
    if (!content) continue;
    if (norm(content).includes('total')) continue;
    out.push({
      tt: numOr(r[c.tt]), group: str(r[c.group]), project: str(r[c.project]), content,
      start: fmtDate(r[c.start]), end: fmtDate(r[c.end]), days: numOr(r[c.days]),
      status: str(r[c.status]), important: boolOf(r[c.important]), urgent: boolOf(r[c.urgent]),
      performer: str(r[c.performer]), coordinator: str(r[c.coord]), actual: fmtDate(r[c.actual]),
      earlyLate: str(r[c.earlyLate]), note: str(r[c.note]),
    });
  }
  return out;
}

type Bundle = {
  projects: Project[]; employees: Employee[]; contracts: Contract[];
  ipc: Ipc[]; budget: BudgetItem[]; issues: Issue[]; todos: Todo[];
};

const groupCount = <T>(arr: T[], key: (t: T) => string) => {
  const m = new Map<string, number>();
  arr.forEach(t => { const k = key(t) || '(trống)'; m.set(k, (m.get(k) || 0) + 1); });
  return [...m].map(([k, count]) => ({ k, count }));
};

export function computeAnalytics(d: Bundle): Analytics {
  const ipcByProject = [...d.ipc.reduce((m, x) => {
    const g = m.get(x.project) || { count: 0, value: 0 };
    g.count++; g.value += x.total || x.amount || 0; m.set(x.project, g); return m;
  }, new Map<string, { count: number; value: number }>())]
    .map(([project, g]) => ({ project, count: g.count, value: g.value }));
  const budgetByDept = [...d.budget.reduce((m, x) => {
    const dept = x.dept || '(trống)';
    const g = m.get(dept) || { plan: 0, actual: 0 };
    g.plan += x.plan; g.actual += x.actual; m.set(dept, g); return m;
  }, new Map<string, { plan: number; actual: number }>())]
    .map(([dept, g]) => ({ dept, plan: g.plan, actual: g.actual, usagePct: g.plan ? Math.round(g.actual / g.plan * 100) : 0 }));
  return {
    ipcByProject,
    budgetByDept,
    headcountByLevel: groupCount(d.employees, e => e.level).map(x => ({ level: x.k, count: x.count })),
    headcountByField: groupCount(d.employees, e => e.field).map(x => ({ field: x.k, count: x.count })),
    headcountByProject: groupCount(d.employees, e => e.project).map(x => ({ project: x.k, count: x.count })),
    issueStatus: groupCount(d.issues, i => i.status).map(x => ({ status: x.k, count: x.count })),
    todoStatus: groupCount(d.todos, t => t.status).map(x => ({ status: x.k, count: x.count })),
    totals: {
      revenue: d.projects.reduce((s, p) => s + p.revenue, 0),
      budget: d.projects.reduce((s, p) => s + p.budget, 0),
      budgetUsed: d.projects.reduce((s, p) => s + p.budgetUsed, 0),
      ipc: d.projects.reduce((s, p) => s + p.ipc, 0),
      headcount: d.employees.length,
    },
  };
}

export async function importTemplate(src: Buffer | string, filename: string, username = 'System') {
  const wb = typeof src === 'string'
    ? xlsx.readFile(src, { cellDates: true })
    : xlsx.read(src, { type: 'buffer', cellDates: true });
  const R = (n: string) => sheetRows(wb, n);
  const projects = parseProjects(R('Project'));
  const employees = parseEmployees(R('Resource'));
  const contracts = parseContracts(R('Contracts'));
  const ipc = parseIpc(R('IPC'));
  const budget = parseBudget(R('Budget'));
  const issues = parseIssues(R('Chance Logs'));
  const todos = parseTodos(R('To-do'));

  await Promise.all([
    ProjectModel.deleteMany({}), EmployeeModel.deleteMany({}), ContractModel.deleteMany({}),
    IpcModel.deleteMany({}), BudgetItemModel.deleteMany({}), IssueModel.deleteMany({}), TodoModel.deleteMany({}),
  ]);
  if (projects.length) await ProjectModel.insertMany(projects);
  if (employees.length) await EmployeeModel.insertMany(employees);
  if (contracts.length) await ContractModel.insertMany(contracts);
  if (ipc.length) await IpcModel.insertMany(ipc);
  if (budget.length) await BudgetItemModel.insertMany(budget);
  if (issues.length) await IssueModel.insertMany(issues);
  if (todos.length) await TodoModel.insertMany(todos);

  const stats = {
    projects: projects.length, employees: employees.length, contracts: contracts.length,
    ipc: ipc.length, budgetItems: budget.length, issues: issues.length, todos: todos.length,
  };
  await ImportHistoryModel.create({
    filename, user: username,
    sheets: wb.SheetNames.length, projects: stats.projects, employees: stats.employees,
    contracts: stats.contracts, issues: stats.issues,
  });
  await ActivityLogModel.deleteMany({});
  await ActivityLogModel.insertMany(issues.slice(0, 50).map((i, n) => ({
    id: `log-${n}`, user: i.assignee, action: i.problem, target: i.project,
    timestamp: i.loggedDate, project: i.project,
  })));
  return stats;
}
