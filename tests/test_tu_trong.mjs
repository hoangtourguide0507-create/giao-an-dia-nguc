// BR-46 Bài tự trọng / ôm thêm tạ / máy trợ lực / bài tính giây (PA-58). Hàm thuần.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pick = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a); if (a < 0 || b < 0) throw new Error('Không tìm thấy: ' + from); return html.slice(a, b); };
const line = start => { const a = html.indexOf(start); return a < 0 ? '' : html.slice(a, html.indexOf('\n', a)); };
const code = [line('const r2 = '), line('function roundStep('), pick('const LIB2 = ', 'const LIB = '), 'const LIB = LIB2.map(x => [x[0], x[4], x[2]]);', pick('const EXDB_MUS=', '/* ===== Vùng cơ'), pick('/* ===== Vùng cơ: nhóm lớn', '/* video hướng dẫn */')].join('\n');
const fns = ['loadMode', 'assistVerdict', 'bwVerdict', 'loadHint', 'ASSIST_NEXT'];
const A = vm.runInNewContext(code + `\n;({ ${fns.map(f => `${f}: typeof ${f} !== 'undefined' ? ${f} : null`).join(', ')}, BW_INFO })`, {});

let fail = 0;
const ok = (name, cond, got) => { if (cond) console.log('  ok  ' + name); else { fail++; console.log('  FAIL ' + name + (got !== undefined ? ' → ' + JSON.stringify(got) : '')); } };
const need = fns.filter(f => !A[f]);
ok('có đủ hàm BR-46', !need.length, need);
if (need.length) { console.log('FAIL: thiếu'); process.exit(1); }

console.log('Tự trọng / ôm tạ / trợ lực / tính giây — BR-46');
const M = n => A.loadMode({ name: n });
ok('máy hỗ trợ → trợ lực', M('Hít xà máy hỗ trợ (Assisted pull-up)') === 'assist' && M('Xà kép máy hỗ trợ (Assisted dip machine)') === 'assist');
ok('plank → tính giây', M('Plank') === 'time' && M('Plank nghiêng (Side plank)') === 'time' && M('Copenhagen plank') === 'time');
ok('gập bụng, hít xà, xà kép, duỗi lưng → ôm/đeo thêm tạ được', ['Gập bụng (Crunch)', 'Hít xà (Pull-up)', 'Xà kép (Dips)', 'Duỗi lưng (Back extension)', 'Gập bụng ghế dốc (Decline crunch)'].every(n => M(n) === 'load'), ['Gập bụng (Crunch)', 'Hít xà (Pull-up)'].map(M));
ok('nâng gối ghế chống, dead bug, bird dog, lăn bánh xe → tự trọng thuần', ["Nâng gối ghế chống (Captain's chair knee raise)", 'Dead bug', 'Bird dog', 'Lăn bánh xe bụng (Ab wheel rollout)'].every(n => M(n) === 'bw'), ["Nâng gối ghế chống (Captain's chair knee raise)", 'Dead bug'].map(M));
ok('gập bụng cáp / máy là bài tạ thường', M('Gập bụng cáp (Cable crunch)') === 'kg' && M('Gập bụng máy (Ab crunch machine)') === 'kg');
ok('bài giáo án tại nhà không gợi ý ôm tạ (học viên không có tạ)', A.loadMode({ name: 'Hít đất chân cao (Feet-elevated push-up)', bw: 'push' }) === 'bw');
ok('có cách ôm/đeo tạ cho gập bụng', /ngực/.test(A.loadHint({ name: 'Gập bụng (Crunch)' })));

const H = (...rows) => rows.map(r => ({ sets: r.map(([kg, reps]) => ({ kg, reps })) }));
const ex = (name, o = {}) => ({ name, sets: 3, repMin: 8, repTarget: 10, repMax: 12, step: 2.5, ...o });
/* nâng gối ghế chống: có nấc lên nâng chân treo */
let v = A.bwVerdict(ex("Nâng gối ghế chống (Captain's chair knee raise)"), H([[0, 12], [0, 12], [0, 13]], [[0, 12], [0, 12], [0, 12]]));
ok('nâng gối 2 buổi đạt 12 → lên nấc khó hơn (không phải +kg)', v.kind === 'level' && /Nâng chân/.test(v.next), v);
/* plank tính giây: trần 60 giây */
v = A.bwVerdict(ex('Plank'), H([[0, 40], [0, 35], [0, 30]]));
ok('plank 40/35/30 giây → giữ, chưa tới 60', v.kind === 'hold' && !v.top, v);
v = A.bwVerdict(ex('Plank'), H([[0, 60], [0, 60], [0, 62]], [[0, 60], [0, 61], [0, 60]]));
ok('plank 2 buổi ≥ 60 giây mọi set → đạt trần', v.top === true && v.two === true, v);
/* bài không có nấc, đạt trần 2 buổi → đánh dấu two để gợi ý ôm tạ nếu được */
v = A.bwVerdict(ex('Xà kép (Dips)'), H([[0, 12], [0, 12], [0, 12]], [[0, 12], [0, 12], [0, 12]]));
ok('xà kép 0 kg đạt 12 rep 2 buổi → top + two', v.top === true && v.two === true, v);

/* máy trợ lực: đủ rep → giảm trợ lực; hụt → tăng; hết trợ lực → sang bài không hỗ trợ */
const ap = ex('Hít xà máy hỗ trợ (Assisted pull-up)');
v = A.assistVerdict(ap, H([[30, 10], [30, 10], [30, 10]], [[30, 10], [30, 11], [30, 10]]), 30);
ok('trợ lực 30 kg đủ 3×10 hai buổi → giảm còn 25 kg', v.kind === 'assist' && v.kg === 25, v);
v = A.assistVerdict(ap, H([[30, 10], [30, 10], [30, 10]]), 30);
ok('mới 1 buổi → sắp giảm, giữ 30', v.kind === 'almost' && v.kg === 30, v);
v = A.assistVerdict(ap, H([[15, 6], [15, 5], [15, 5]], [[15, 7], [15, 6], [15, 5]]), 15);
ok('2 buổi liền dưới 8 rep → tăng trợ lực 15 → 17,5', v.kind === 'assistUp' && v.kg === 17.5, v);
v = A.assistVerdict(ap, H([[5, 10], [5, 10], [5, 10]], [[5, 10], [5, 10], [5, 10]]), 5);
ok('trợ lực 5 kg đủ rep → hết trợ lực → chuyển Hít xà', v.kind === 'level' && v.next === A.ASSIST_NEXT[ap.name] && /Hít xà \(Pull-up\)/.test(v.next), v);

if (fail) { console.log(`FAIL: ${fail} kiểm tra đỏ`); process.exit(1); }
console.log('Tất cả xanh');
