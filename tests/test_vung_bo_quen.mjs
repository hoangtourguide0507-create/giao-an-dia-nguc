// BR-40 Vùng cơ bị bỏ quên theo cả giáo án tuần (PA-52). Hàm thuần, không cần trình duyệt.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pick = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a); if (a < 0 || b < 0) throw new Error('Không tìm thấy: ' + from); return html.slice(a, b); };
const code = pick('const LIB2 = ', 'const LIB = ') + 'const LIB = LIB2.map(x => [x[0], x[4], x[2]]);\n' + pick('/* ===== Vùng cơ: nhóm lớn', '/* video hướng dẫn */');
const fns = ['dayFreq', 'weekPlanLoad', 'neglected', 'skippedInPlan', 'suggestFor', 'NEG', 'NEGZ'];
const A = vm.runInNewContext(code + `\n;({ ${fns.map(f => `${f}: typeof ${f} !== 'undefined' ? ${f} : null`).join(', ')}, zTot })`, {});

let fail = 0;
const ok = (name, cond, got) => { if (cond) console.log('  ok  ' + name); else { fail++; console.log('  FAIL ' + name + (got !== undefined ? ' → ' + JSON.stringify(got) : '')); } };
const need = fns.filter(f => !A[f]);
ok('có đủ hàm BR-40', !need.length, need);
if (need.length) { console.log(`FAIL: thiếu ${need.length} hàm`); process.exit(1); }

const LIB2 = vm.runInNewContext(pick('const LIB2 = ', 'const LIB = ') + ';LIB2');
let n = 0;
const ex = (name, sets = 3) => { const l = LIB2.find(x => x[0] === name); if (!l) throw new Error('Không có: ' + name); return { id: 'e' + (++n), name, zone: l[1], muscle: l[4], type: l[2], sets, alts: [] }; };
const day = (id, name, names) => ({ id, name, exercises: names.map(x => Array.isArray(x) ? ex(...x) : ex(x)) });
/* giáo án 4 ngày điển hình: không bắp chân, không bụng chéo, vai sau ít */
const plan = () => [
  day('d1', 'Ngực', ['Đẩy ngực dốc lên tạ đơn (Incline dumbbell press)', 'Đẩy ngực tạ đòn (Bench press)', 'Ép ngực máy (Pec deck)', 'Đẩy cáp tay sau (Triceps pushdown)']),
  day('d2', 'Lưng', ['Kéo xô (Lat pulldown)', 'Chèo cáp ngồi (Seated cable row)', 'Chèo tạ đơn (Dumbbell row)', 'Cuốn tạ đòn (Barbell curl)']),
  day('d3', 'Chân', ['Squat', 'Đạp đùi (Leg press)', 'Đá đùi (Leg extension)', 'Móc đùi nằm (Lying leg curl)']),
  day('d4', 'Vai', ['Đẩy vai tạ đơn (Dumbbell shoulder press)', 'Nâng vai ngang (Lateral raise)', 'Đẩy vai máy (Machine shoulder press)', 'Kéo cáp qua đầu (Overhead extension)'])];

console.log('Vùng cơ bị bỏ quên — BR-40');
/* tần suất theo lịch sử 4 tuần (Q2) */
const P = plan(), from = '2026-09-28';
const ss = [...['2026-09-29', '2026-10-02', '2026-10-06', '2026-10-09', '2026-10-13', '2026-10-16', '2026-10-20', '2026-10-23'].map(date => ({ dayId: 'd1', date })), { dayId: 'd2', date: '2026-10-21' }, { dayId: 'd3', date: '2026-08-01' }];
const f = A.dayFreq(P, ss, from);
ok('ngày Ngực tập 8 buổi/4 tuần → 2 lần/tuần', f.d1 === 2, f);
ok('ngày Lưng 1 buổi/4 tuần → 0,25 lần/tuần', f.d2 === 0.25, f);
ok('ngày chưa có buổi nào trong 4 tuần → tính 1 lần/tuần', f.d3 === 1 && f.d4 === 1, f);
const L2 = A.weekPlanLoad(P, { d1: 2, d2: 1, d3: 1, d4: 1 });
ok('set/tuần nhân theo tần suất: Ngực trên 3 × 2 = 6', L2['Ngực trên'].d === 6, L2['Ngực trên']);

/* BR-40.2 ba loại phát hiện, tần suất 1/tuần */
const L = A.weekPlanLoad(P, null), N = A.neglected(L, []), by = z => N.find(x => x.zone === z);
ok('bắp chân 0 set → bị bỏ quên', (by('Bắp chân') || {}).kind === 'quen', by('Bắp chân'));
ok('bụng chéo 0 set → bị bỏ quên (Q1: "cơ liên sườn" = bụng chéo)', (by('Bụng chéo') || {}).kind === 'quen', by('Bụng chéo'));
ok('lưng giữa có 3 set chèo cáp → không bỏ quên', !by('Lưng giữa') || by('Lưng giữa').kind !== 'quen', by('Lưng giữa'));
const vs = by('Vai sau');
ok('vai sau chỉ có set phụ, vai trước nhiều → lệch hoặc ít', vs && ['lech', 'it', 'quen'].includes(vs.kind), vs);
ok('ngưỡng "ít" theo nguồn: < 4 set quy đổi/tuần (Pelland 2024)', A.NEG.low === 4, A.NEG);
const P2 = plan(); P2[3].exercises.push(ex('Bay vai sau máy (Reverse pec deck)', 3));
const N2 = A.neglected(A.weekPlanLoad(P2, null), []);
ok('thêm 3 set bay vai sau → vai sau không còn bỏ quên/ít', !N2.some(x => x.zone === 'Vai sau' && x.kind !== 'lech'), N2.filter(x => x.zone === 'Vai sau'));
ok('vùng đã bỏ qua không hiện', !A.neglected(L, ['Bắp chân', 'Cẳng tay']).some(x => x.zone === 'Bắp chân' || x.zone === 'Cẳng tay'));
const lech = A.neglected(A.weekPlanLoad([day('a', 'Chân', ['Squat', 'Đạp đùi (Leg press)', 'Đá đùi (Leg extension)', ['Móc đùi nằm (Lying leg curl)', 1], 'Nhón bắp chân đứng (Standing calf raise)'])], null), []).find(x => x.zone === 'Đùi sau');
ok('đùi sau 1 set, đùi trước 9 → lệch (ghi so với Đùi trước)', lech && lech.kind === 'lech' && /Đùi trước/.test(lech.vs), lech);
const push = [day('p', 'Đẩy', ['Đẩy ngực tạ đòn (Bench press)', 'Đẩy ngực dốc lên tạ đơn (Incline dumbbell press)', 'Đẩy vai tạ đơn (Dumbbell shoulder press)', 'Ép ngực máy (Pec deck)']), day('q', 'Kéo', [['Kéo xô (Lat pulldown)', 2]])];
ok('kéo ít hơn 70% đẩy → lệch Kéo/Đẩy', A.neglected(A.weekPlanLoad(push, null), []).some(x => x.pull), A.neglected(A.weekPlanLoad(push, null), []));

/* BR-40.4 có trong giáo án nhưng 4 tuần chưa tập */
const hist = { 'Ngực trên': { d: 6, s: 0 }, 'Xô': { d: 6, s: 0 } };
const sk = A.skippedInPlan(A.weekPlanLoad(P2, null), hist, 8);
ok('vai sau có trong giáo án, 4 tuần 0 set → báo', sk.includes('Vai sau'), sk);
ok('ngực trên có tập → không báo', !sk.includes('Ngực trên'), sk);
ok('chưa đủ buổi (< 4 buổi/4 tuần) → không kết luận', A.skippedInPlan(A.weekPlanLoad(P2, null), hist, 2).length === 0);

/* BR-40.3 gợi ý ngày + bài */
const s1 = A.suggestFor('Bắp chân', plan(), 14);
ok('bắp chân → ngày Chân', s1 && s1.day.id === 'd3', s1 && s1.day.name);
ok('gợi ý 2–3 bài đúng vùng', s1 && s1.ex.length >= 2 && s1.ex.length <= 3 && s1.ex.every(nm => LIB2.find(x => x[0] === nm)[1] === 'Bắp chân'), s1 && s1.ex);
const s5 = A.suggestFor('Tay sau đầu dài', plan(), 14);
ok('không gợi ý bài đã có ở ngày khác (Kéo cáp qua đầu đã ở ngày Vai)', s5 && !s5.ex.includes('Kéo cáp qua đầu (Overhead extension)'), s5 && s5.ex);
const s2 = A.suggestFor('Vai sau', plan(), 14);
ok('vai sau → ngày Lưng hoặc Vai', s2 && ['d2', 'd4'].includes(s2.day.id), s2 && s2.day.name);
ok('vai sau: bài cô lập đứng đầu', s2 && LIB2.find(x => x[0] === s2.ex[0])[2] === 'iso', s2 && s2.ex);
const s3 = A.suggestFor('Bụng chéo', plan(), 14);
ok('bụng chéo → có ngày gợi ý và bài bụng chéo', s3 && s3.day && s3.ex.every(nm => LIB2.find(x => x[0] === nm)[1] === 'Bụng chéo'), s3);
const full = plan(); full[2].exercises.push(ex('Romanian deadlift', 4), ex('Hip thrust', 4), ex('Móc đùi ngồi (Seated leg curl)', 4));
const s4 = A.suggestFor('Đùi sau', full, 10);
ok('không gợi ý vào ngày mà thêm 2 set sẽ vượt trần (Đùi sau ngày Chân 9 + 2 > 10)', s4 && s4.day.id !== 'd3', s4 && s4.day.name);

if (fail) { console.log(`FAIL: ${fail} kiểm tra đỏ`); process.exit(1); }
console.log('Tất cả xanh');
