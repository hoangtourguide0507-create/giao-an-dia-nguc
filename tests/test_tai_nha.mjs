// BR-45 Giáo án tại nhà không dụng cụ: nấc bài tự trọng, lên/xuống nấc theo rep, mẫu 3 buổi (PA-57). Hàm thuần.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pick = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a); if (a < 0 || b < 0) throw new Error('Không tìm thấy: ' + from); return html.slice(a, b); };
const code = pick('const LIB2 = ', 'const LIB = ') + 'const LIB = LIB2.map(x => [x[0], x[4], x[2]]);\n' + pick('const EXDB_MUS=', '/* ===== Vùng cơ') + pick('/* ===== Vùng cơ: nhóm lớn', '/* video hướng dẫn */');
const fns = ['BW', 'BW_INFO', 'HOME_PLAN', 'bwVerdict', 'bwCues'];
const A = vm.runInNewContext(code + `\n;({ ${fns.map(f => `${f}: typeof ${f} !== 'undefined' ? ${f} : null`).join(', ')}, EXDB, LIB_GID, ZBIG })`, {});

let fail = 0;
const ok = (name, cond, got) => { if (cond) console.log('  ok  ' + name); else { fail++; console.log('  FAIL ' + name + (got !== undefined ? ' → ' + JSON.stringify(got) : '')); } };
const need = fns.filter(f => !A[f]);
ok('có đủ BW, BW_INFO, HOME_PLAN, bwVerdict, bwCues', !need.length, need);
if (need.length) { console.log('FAIL: thiếu'); process.exit(1); }

console.log('Giáo án tại nhà — BR-45');
const ids = new Set(A.EXDB.map(e => e[0]));
const all = Object.entries(A.BW).flatMap(([k, L]) => L.lv.map((v, i) => ({ k, i, name: v[0], gid: v[1], zone: v[3] || L.zone })));
ok('mọi nấc có hình minh hoạ có thật trong thư viện', all.every(x => ids.has(x.gid)), all.filter(x => !ids.has(x.gid)).map(x => x.name));
ok('tên nấc không trùng nhau', new Set(all.map(x => x.name)).size === all.length);
ok('mọi nấc có vùng cơ hợp lệ', all.every(x => A.ZBIG[x.zone]), all.filter(x => !A.ZBIG[x.zone]).map(x => x.name));
ok('mọi nấc có ≥ 3 lời nhắc form', all.every(x => A.bwCues(x.name).length >= 3), all.filter(x => A.bwCues(x.name).length < 3).map(x => x.name));
ok('LIB_GID có tên các nấc (máy học viên tự gắn đúng hình)', all.every(x => A.LIB_GID[x.name] === x.gid));
ok('hít đất: tựa tường → tựa bàn → quỳ gối → chuẩn → chân cao', A.BW.push.lv.length === 5 && /tường/.test(A.BW.push.lv[0][0]) && /chân cao/.test(A.BW.push.lv[4][0]));
ok('không có bài chống ghế / xà kép (vai, cổ tay)', !all.some(x => /chống ghế|xà kép|dip/i.test(x.name)), all.filter(x => /chống ghế|xà kép|dip/i.test(x.name)).map(x => x.name));
ok('lời nhắc hít đất có cách bảo vệ cổ tay', A.bwCues(A.BW.push.lv[2][0]).some(c => /cổ tay/.test(c)));

/* mẫu 3 buổi toàn thân, theo trình độ: hít đất bắt đầu quỳ gối */
ok('3 ngày', A.HOME_PLAN.length === 3, A.HOME_PLAN.map(d => d[0]));
for (const [nm, list] of A.HOME_PLAN) {
  const ks = list.map(x => x[0]);
  ok(`${nm}: có đẩy, chân, kéo/lưng, bụng; 5 bài`, list.length === 5 && ks.some(k => ['push', 'tri'].includes(k)) && ks.some(k => ['squat', 'lunge', 'hinge'].includes(k)) && ks.some(k => ['row', 'post'].includes(k)) && ks.some(k => ['core', 'obl'].includes(k)), ks);
}
ok('hít đất bắt đầu ở nấc quỳ gối', A.HOME_PLAN.flatMap(d => d[1]).filter(x => x[0] === 'push').every(x => /quỳ gối/.test(A.BW.push.lv[x[1]][0])));
ok('kéo lưng dùng bàn ăn (chèo gầm bàn)', A.HOME_PLAN.flatMap(d => d[1]).some(x => x[0] === 'row') && /gầm bàn/.test(A.BW.row.lv[0][0]));

/* lên / xuống nấc theo rep */
const ex = (key, i, o = {}) => ({ name: A.BW[key].lv[i][0], bw: key, sets: 3, repMin: 8, repTarget: 12, repMax: 15, ...o });
const H = (...rows) => rows.map(r => ({ sets: r.map(reps => ({ kg: 0, reps })) }));
let v = A.bwVerdict(ex('push', 2), H([15, 15, 15], [15, 16, 15]));
ok('2 buổi liền mọi set ≥ 15 rep → lên nấc: Hít đất (chuẩn)', v.kind === 'level' && v.next === A.BW.push.lv[3][0], v);
v = A.bwVerdict(ex('push', 2), H([15, 15, 15], [12, 12, 11]));
ok('mới 1 buổi đạt 15 → sắp lên nấc', v.kind === 'almost' && v.next === A.BW.push.lv[3][0], v);
v = A.bwVerdict(ex('push', 4), H([15, 15, 15], [15, 15, 15]));
ok('nấc khó nhất đạt trần → giữ, làm chậm/thêm set', v.kind === 'hold' && v.top === true, v);
v = A.bwVerdict(ex('push', 3), H([5, 4, 4], [6, 5, 4]));
ok('2 buổi liền có set < 8 rep → xuống nấc dễ hơn', v.kind === 'easier' && v.prev === A.BW.push.lv[2][0], v);
v = A.bwVerdict(ex('push', 0), H([5, 4, 4], [6, 5, 4]));
ok('nấc dễ nhất mà vẫn < 8 → giữ, không xuống nữa', v.kind === 'hold', v);
v = A.bwVerdict(ex('push', 2), H([10, 9, 9]));
ok('đang trong khoảng 8–15 → giữ, cố thêm 1 rep', v.kind === 'hold' && !v.top, v);
v = A.bwVerdict(ex('push', 2), []);
ok('chưa có buổi nào → bắt đầu', v.kind === 'start', v);

if (fail) { console.log(`FAIL: ${fail} kiểm tra đỏ`); process.exit(1); }
console.log('Tất cả xanh');
