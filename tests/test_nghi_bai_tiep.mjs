// BR-43 Hết giờ nghỉ sau set cuối của bài: báo bài kế tiếp, không báo lại bài vừa xong (PA-55). Hàm thuần.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const fn = name => { const a = html.indexOf(name); if (a < 0) return ''; const b = html.indexOf('\n}', a); return html.slice(a, b + 2); };
const line = start => { const a = html.indexOf(start); return a < 0 ? '' : html.slice(a, html.indexOf('\n', a)); };
const code = [line('const entryDone = '), fn('function restNext('), fn('function restMsg(')].join('\n');
const A = vm.runInNewContext(code + `\n;({ restNext: typeof restNext === 'function' ? restNext : null, restMsg: typeof restMsg === 'function' ? restMsg : null })`, {});

let fail = 0;
const ok = (name, cond, got) => { if (cond) console.log('  ok  ' + name); else { fail++; console.log('  FAIL ' + name + (got !== undefined ? ' → ' + JSON.stringify(got) : '')); } };
ok('có hàm restNext, restMsg', A.restNext && A.restMsg);
if (!A.restNext || !A.restMsg) { console.log('FAIL: thiếu hàm'); process.exit(1); }

const en = (name, done, n = 3, o = {}) => ({ exId: name, name, sets: Array.from({ length: n }, (_, k) => ({ kg: 20, reps: 10, done: k < done })), drop: null, ...o });
console.log('Nghỉ xong → set tiếp hay bài tiếp — BR-43');
const E = () => [en('Squat', 3), en('Đá đùi', 3), en('Móc đùi nằm', 0), en('Nhón bắp chân', 0)];

let r = A.restNext([en('Squat', 3), en('Đá đùi', 2), en('Móc đùi nằm', 0)], 1);
ok('bài còn set chưa xong → nghỉ để vào set tiếp của chính bài đó', r.kind === 'set' && r.i === 1, r);
r = A.restNext(E(), 1);
ok('vừa xong set cuối của Đá đùi → bài kế tiếp là Móc đùi nằm (bài 3)', r.kind === 'next' && r.i === 2, r);
r = A.restNext([en('Squat', 0), en('Đá đùi', 3), en('Móc đùi nằm', 3)], 2);
ok('xong bài cuối danh sách nhưng còn bài đầu chưa tập → quay về bài chưa xong (Squat)', r.kind === 'next' && r.i === 0, r);
r = A.restNext([en('Squat', 3), en('Đá đùi', 3)], 1);
ok('xong hết mọi bài → kết thúc, không nghỉ', r.kind === 'end', r);
r = A.restNext([en('Squat', 3, 3, { drop: { kg: 10, reps: 10, done: false } }), en('Đá đùi', 0)], 0);
ok('còn drop set chưa xong → chưa tính là xong bài', r.kind === 'set', r);

const L = (name, done) => A.restMsg(A.restNext(E(), 1), E()).body;
ok('lời báo hết giờ: "Sang bài tiếp: Móc đùi nằm · set 1"', L() === 'Sang bài tiếp: Móc đùi nằm · set 1', L());
const mSet = A.restMsg(A.restNext([en('Squat', 3), en('Đá đùi', 1)], 1), [en('Squat', 3), en('Đá đùi', 1)]);
ok('lời báo khi còn set giữ như cũ: "Vào set tiếp: Đá đùi"', mSet.body === 'Vào set tiếp: Đá đùi' && mSet.btn === 'Vào set tiếp', mSet);
const mNext = A.restMsg(A.restNext(E(), 1), E());
ok('nút trong hộp báo: "Sang bài tiếp", kèm exId để mở bài đó', mNext.btn === 'Sang bài tiếp' && mNext.exId === 'Móc đùi nằm', mNext);

if (fail) { console.log(`FAIL: ${fail} kiểm tra đỏ`); process.exit(1); }
console.log('Tất cả xanh');
