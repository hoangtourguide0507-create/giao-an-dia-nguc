// BR-44 Mức tăng tạ theo chuẩn (NSCA 2-for-2: thân trên 1–2,5 kg, thân dưới 2,5–5 kg, 2–10%) và nhãn ngắn (PA-56). Hàm thuần.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const fn = name => { const a = html.indexOf(name); if (a < 0) return ''; const b = html.indexOf('\n}', a); return html.slice(a, b + 2); };
const line = start => { const a = html.indexOf(start); return a < 0 ? '' : html.slice(a, html.indexOf('\n', a)); };
const code = [line('const r2 = '), line('const isDb = '), line('function roundStep('), fn('function incFor('), line('const SG_TAG = '), fn('function sgShort(')].join('\n');
const A = vm.runInNewContext(code + `\n;({ incFor, sgShort: typeof sgShort === 'function' ? sgShort : null, fmt: v => String(v).replace('.', ','), U: () => ' kg' })`, { fmt: v => String(v).replace('.', ','), U: ex => ex && ex.each ? ' kg/tay' : ' kg' });

let fail = 0;
const ok = (name, cond, got) => { if (cond) console.log('  ok  ' + name); else { fail++; console.log('  FAIL ' + name + (got !== undefined ? ' → ' + JSON.stringify(got) : '')); } };
const ex = (name, type, step, o = {}) => ({ name, type, step, ...o });

console.log('Mức tăng tạ & nhãn ngắn — BR-44');
ok('thân trên 40 kg → +2,5', A.incFor(ex('Đẩy ngực tạ đòn', 'upper', 2.5), 40) === 2.5, A.incFor(ex('Đẩy ngực tạ đòn', 'upper', 2.5), 40));
ok('chân 100 kg → +5', A.incFor(ex('Đạp đùi', 'lower', 2.5), 100) === 5, A.incFor(ex('Đạp đùi', 'lower', 2.5), 100));
ok('chân 30 kg (< 40) → +2,5', A.incFor(ex('Squat', 'lower', 2.5), 30) === 2.5, A.incFor(ex('Squat', 'lower', 2.5), 30));
ok('tạ đơn 10 kg/tay → +2 kg/tay', A.incFor(ex('Cuốn tạ đơn', 'iso', 2, { each: true }), 10) === 2, A.incFor(ex('Cuốn tạ đơn', 'iso', 2, { each: true }), 10));
ok('cô lập máy 30 kg, nấc 1 → +2', A.incFor(ex('Đá đùi', 'iso', 1), 30) === 2, A.incFor(ex('Đá đùi', 'iso', 1), 30));
ok('cô lập nhẹ 10 kg, nấc 1 → +1', A.incFor(ex('Nâng vai ngang máy', 'iso', 1), 10) === 1, A.incFor(ex('Nâng vai ngang máy', 'iso', 1), 10));
ok('không vượt 10%: chân 45 kg → +5 nhưng trần 4,5 → làm tròn nấc 2,5', A.incFor(ex('Squat', 'lower', 2.5), 45) === 2.5, A.incFor(ex('Squat', 'lower', 2.5), 45));
ok('nấc máy lớn (5 kg) → ít nhất 1 nấc', A.incFor(ex('Kéo xô máy', 'upper', 5), 40) === 5, A.incFor(ex('Kéo xô máy', 'upper', 5), 40));

ok('có hàm sgShort', !!A.sgShort);
if (A.sgShort) {
  const s = (sg, e = { each: false }) => A.sgShort(e, sg).replace(/<[^>]+>/g, '');
  ok('tăng: "Nên tăng tạ · +5 kg"', s({ kind: 'up', kg: 105, prev: 100 }) === 'Nên tăng tạ · +5 kg', s({ kind: 'up', kg: 105, prev: 100 }));
  ok('tạ đơn: "+2 kg/tay"', s({ kind: 'up', kg: 12, prev: 10 }, { each: true }) === 'Nên tăng tạ · +2 kg/tay', s({ kind: 'up', kg: 12, prev: 10 }, { each: true }));
  ok('sắp tăng', s({ kind: 'almost', kg: 40, next: 42.5 }) === 'Sắp tăng', s({ kind: 'almost', kg: 40 }));
  ok('giữ', s({ kind: 'hold', kg: 40 }) === 'Giữ mức tạ', s({ kind: 'hold', kg: 40 }));
  ok('giảm', s({ kind: 'down', kg: 36 }) === 'Nên giảm tạ', s({ kind: 'down', kg: 36 }));
  ok('deload', s({ kind: 'deload', kg: 36 }) === 'Tuần nhẹ', s({ kind: 'deload', kg: 36 }));
  ok('đau', s({ kind: 'pain', kg: 32 }) === 'Đang đau', s({ kind: 'pain', kg: 32 }));
}
if (fail) { console.log(`FAIL: ${fail} kiểm tra đỏ`); process.exit(1); }
console.log('Tất cả xanh');
