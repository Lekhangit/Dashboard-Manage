import xlsx from 'xlsx';
import { norm, slug, numOr, fmtDate } from '../../src/services/templateImportService';

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

console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
