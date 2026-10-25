// BR-41 Kcal vận động của buổi tập (PA-53): MET × cân nặng × thời gian. Hàm thuần, không cần trình duyệt.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pick = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a); if (a < 0 || b < 0) throw new Error('Không tìm thấy: ' + from); return html.slice(a, b); };
const code = pick('const LIB2 = ', 'const LIB = ') + 'const LIB = LIB2.map(x => [x[0], x[4], x[2]]);\n' + pick('/* ===== Vùng cơ: nhóm lớn', '/* video hướng dẫn */');
const fns = ['sessMet', 'sessKcal', 'KMET'];
const A = vm.runInNewContext(code + `\n;({ ${fns.map(f => `${f}: typeof ${f} !== 'undefined' ? ${f} : null`).join(', ')} })`, {});

let fail = 0;
const ok = (name, cond, got) => { if (cond) console.log('  ok  ' + name); else { fail++; console.log('  FAIL ' + name + (got !== undefined ? ' → ' + JSON.stringify(got) : '')); } };
const need = fns.filter(f => !A[f]);
ok('có đủ hàm BR-41', !need.length, need);
if (need.length) { console.log(`FAIL: thiếu ${need.length} hàm`); process.exit(1); }

const T0 = Date.UTC(2026, 9, 25, 10);
const S = (min, ents, o = {}) => ({ startedAt: T0, finishedAt: T0 + min * 60000, paused: 0, entries: ents, ...o });
const en = (type, n, ef, o = {}) => ({ type, sets: Array.from({ length: n }, () => ({ kg: 40, reps: 10, ...(ef ? { ef } : {}) })), ...o });
const typeOf = e => e.type;

console.log('Kcal buổi tập — BR-41');
const a = A.sessKcal(S(60, [en('upper', 9), en('iso', 9)]), 70, typeOf);
ok('70 kg · 60 phút · 18 set thân trên/cô lập → MET 3,5 → 175 kcal vận động', a && a.met === 3.5 && a.kcal === 175, a);
const b = A.sessKcal(S(60, [en('lower', 12)]), 70, typeOf);
ok('toàn bài chân nhiều khớp → MET 5,0 → (5 − 1) × 70 × 1 = 280', b && b.met === 5 && b.kcal === 280, b);
const c = A.sessKcal(S(60, [en('upper', 6, 'h'), en('upper', 6, 'f'), en('iso', 6, 'm')]), 70, typeOf);
ok('≥ 50% set chấm Sát/Hỏng → MET +1 (3,5 → 4,5)', c && c.met === 4.5 && c.why.length === 1, c);
const d = A.sessKcal(S(60, [en('lower', 12, 'h')]), 70, typeOf);
ok('MET tối đa 6,0', d && d.met === 6, d);
const e = A.sessKcal(S(20, [en('upper', 20)]), 70, typeOf);
ok('20 set trong 20 phút (≤ 70 giây/set gồm nghỉ) → tính như circuit 5,8', e && e.met === 5.8, e);
const f = A.sessKcal(S(300, [en('upper', 10)]), 70, typeOf);
ok('quên bấm kết thúc (5 giờ, 10 set) → chỉ tính tối đa 10 × 6 + 10 = 70 phút, có cờ trimmed', f && f.min === 70 && f.trimmed === true, f);
const g = A.sessKcal(S(60, [en('upper', 9)], { paused: 30 * 60000 }), 70, typeOf);
ok('trừ thời gian tạm dừng (60 − 30 = 30 phút)', g && g.min === 30, g);
ok('chưa kết thúc buổi → không tính', A.sessKcal(S(60, [en('upper', 9)], { finishedAt: null }), 70, typeOf) === null);
ok('chưa có cân nặng → không tính', A.sessKcal(S(60, [en('upper', 9)]), null, typeOf) === null);
const h = A.sessKcal(S(60, [{ type: 'upper', sets: [{ kg: 40, reps: 10, done: true }, { kg: 40, reps: 10, done: false }, { kg: 40, reps: 0, done: true }] }]), 70, typeOf);
ok('bỏ set chưa bấm ✓ và set 0 rep khi đếm', h && h.met === 3.5, h);
ok('buổi không có set nào → không tính', A.sessKcal(S(60, [{ type: 'upper', sets: [] }]), 70, typeOf) === null);

if (fail) { console.log(`FAIL: ${fail} kiểm tra đỏ`); process.exit(1); }
console.log('Tất cả xanh');
