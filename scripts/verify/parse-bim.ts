import xlsx from 'xlsx';
import { norm, slug, numOr, fmtDate, parseProjects, parseEmployees, parseContracts, parseIpc, parseBudget, parseIssues } from '../../src/services/templateImportService';

const wb = xlsx.readFile('public/TPL Project Management BIM (1).xlsx', { cellDates: true });
const rows = (n: string) => xlsx.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' }) as any[][];

let fails = 0;
const eq = (name: string, got: any, want: any) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`);
  if (!ok) fails++;
};

eq('norm diacritics', norm('Phú Hữu'), 'phu huu');
eq('norm đ', norm('DỰ ÁN'), 'du an');
eq('slug charm', slug('Charm Ming'), 'charmming');
eq('numOr comma', numOr('  100,694,000,000 '), 100694000000);
eq('numOr paren negative', numOr('(1,429,217,934)'), -1429217934);
eq('numOr dash empty', numOr(' - '), 0);
eq('fmtDate local no shift', fmtDate(new Date(2026, 2, 4)), '2026-03-04');

const projects = parseProjects(rows('Project'));
eq('projects count', projects.length, 6);
eq('project ids', projects.map(p => p.id).sort(), ['charmming','nafoods','phuhuu','promea','salacia','ttikitchen']);
const naf = projects.find(p => p.id === 'nafoods')!;
eq('nafoods bch', naf.bch, 12);
eq('nafoods budget', naf.budget, 95952728146);
eq('nafoods status nonempty', naf.status.length > 0, true);

const emps = parseEmployees(rows('Resource'));
eq('emp count', emps.length, 92);
const quy = emps.find(e => e.name === 'Trần Vinh Quí')!;
eq('quy dept', quy.department, 'HSE');
eq('quy project', quy.project, 'NaFoods');
eq('nafoods team size', emps.filter(e => e.project === 'NaFoods').length > 0, true);
eq('no PMO leaked into NaFoods', emps.filter(e => e.project === 'NaFoods').every(e => e.department !== 'PMO'), true);

const contracts = parseContracts(rows('Contracts'));
eq('contracts nonzero', contracts.length > 0, true);
const nf = contracts.find(c => c.code.startsWith('NFTN-VT.HDDV.2026.001') && c.amount === 100694000000);
eq('nafoods first contract parsed', !!nf, true);
eq('nafoods first contract project', nf?.project, 'NaFoods');

const ipc = parseIpc(rows('IPC'));
eq('ipc nonzero', ipc.length > 0, true);
const ipc01 = ipc.find(x => x.project === 'NaFoods' && x.ipcNo === 'IPC-01' && x.amount === 1730288056);
eq('ipc01 parsed', !!ipc01, true);
eq('ipc01 vat', ipc01?.vat, 138423044);

const budget = parseBudget(rows('Budget'));
eq('budget nonzero', budget.length > 0, true);
const steel = budget.find(b => b.project === 'NaFoods' && b.category === 'Thép kết cấu' && b.plan === 4649991410);
eq('budget steel parsed', !!steel, true);
eq('budget steel over/in', (steel?.status.length ?? 0) > 0, true);

const issues = parseIssues(rows('Chance Logs'));
eq('issues nonzero', issues.length > 0, true);
const vo1 = issues.find(x => x.project === 'NaFoods' && x.problem.startsWith('VO01'));
eq('vo1 assignee', vo1?.assignee, 'Nguyễn Duy Tân');
eq('vo1 id starts with nafoods|', vo1?.id.startsWith('nafoods|'), true);
eq('vo1 id ends with logged date', vo1?.id.endsWith('2026-05-15'), true);
eq('ids unique', new Set(issues.map(i => i.id)).size, issues.length);

console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
