// BR-16.5, BR-16.6 Hình minh hoạ: tìm theo tên gọi ở phòng gym (pec fly, hack squat, máy đẩy ngực…).
// Test hàm thuần, không cần trình duyệt: trích đoạn thư viện hình từ index.html rồi chạy trong vm.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pick = (from, to) => {
  const a = html.indexOf(from); const b = html.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error('Không tìm thấy đoạn: ' + from);
  return html.slice(a, b);
};
const code = pick('const LIB2 = ', 'const LIB = ') + 'const LIB = LIB2.map(x => [x[0], x[4], x[2]]);\n'
  + pick('const EXDB_MUS=', '/* ===== Vùng cơ');
const A = vm.runInNewContext(code + `
;({ exdbMatch, autoGid, exdbGet, EXDB, LIB2,
   exdbSearch: typeof exdbSearch === 'function' ? exdbSearch : null,
   EXDB_ALIAS: typeof EXDB_ALIAS !== 'undefined' ? EXDB_ALIAS : null })`, {});

let fail = 0;
const ok = (name, cond, got) => { if (cond) console.log('  ok  ' + name); else { fail++; console.log('  FAIL ' + name + (got !== undefined ? ' → ' + JSON.stringify(got) : '')); } };
const first = q => (A.exdbSearch ? A.exdbSearch(q, 10) : [])[0];
const auto = name => A.autoGid({ name });

console.log('Hình minh hoạ — tên gọi ở phòng gym');
ok('có hàm exdbSearch', !!A.exdbSearch);
ok('có bảng EXDB_ALIAS', Array.isArray(A.EXDB_ALIAS) && A.EXDB_ALIAS.length > 10);

/* BR-16.5 (a): ô Chọn hình minh hoạ */
for (const [q, want] of [
  ['pec fly', 'Butterfly'], ['Pec Deck', 'Butterfly'], ['máy ép ngực', 'Butterfly'],
  ['reverse pec deck', 'Reverse_Machine_Flyes'], ['bay vai sau máy', 'Reverse_Machine_Flyes'],
  ['hack squat', 'Hack_Squat'], ['máy hack squat', 'Hack_Squat'],
  ['chest press', 'Machine_Bench_Press'], ['máy đẩy ngực', 'Machine_Bench_Press'],
  ['incline chest press', 'Leverage_Incline_Chest_Press'], ['đẩy ngực dốc lên máy', 'Leverage_Incline_Chest_Press'],
  ['máy đẩy vai', 'Machine_Shoulder_Military_Press'], ['abductor', 'Thigh_Abductor'], ['khép đùi', 'Thigh_Adductor'],
  ['máy xà kép', 'Dip_Machine'], ['seated leg curl', 'Seated_Leg_Curl'], ['high row', 'Leverage_High_Row'],
]) { const got = first(q); ok(`tìm "${q}" → ${want} đứng đầu`, got === want, got); }
ok('tìm theo từ tiếng Anh như cũ vẫn chạy ("hammer curl")', /Hammer/i.test(first('hammer curl') || ''), first('hammer curl'));
ok('kết quả không trùng', (() => { const r = A.exdbSearch ? A.exdbSearch('pec deck fly', 30) : [1, 1]; return new Set(r).size === r.length; })());

/* BR-16.5 (b): tự gán hình theo tên bài (bài chưa có hình) */
for (const [name, want] of [['Pec Fly', 'Butterfly'], ['Ép ngực Pec Deck', 'Butterfly'], ['Reverse Pec Deck', 'Reverse_Machine_Flyes'],
  ['Máy đẩy ngực ngồi', 'Machine_Bench_Press'], ['Hack squat máy', 'Hack_Squat']]) { const got = auto(name); ok(`tự gán "${name}" → ${want}`, got === want, got); }
ok('thư viện bài vẫn ưu tiên (Đẩy ngực tạ đòn → bench press tạ đòn)', auto('Đẩy ngực tạ đòn (Bench press)') === 'Barbell_Bench_Press_-_Medium_Grip', auto('Đẩy ngực tạ đòn (Bench press)'));
ok('tên lạ không gán bừa', auto('Bài tự chế XYZ') === null, auto('Bài tự chế XYZ'));
ok('máy xà kép ngồi trong thư viện dùng hình Dip_Machine', auto('Máy xà kép ngồi (Seated dip machine)') === 'Dip_Machine', auto('Máy xà kép ngồi (Seated dip machine)'));

/* bảng hợp lệ */
const ids = new Set(A.EXDB.map(e => e[0]));
const bad = (A.EXDB_ALIAS || []).flatMap(([, g]) => g.filter(x => !ids.has(x)));
ok('mọi hình trong bảng tên gọi có thật trong thư viện', bad.length === 0, bad);

/* BR-16.6: nhãn tên gọi quen */
ok('Butterfly có nhãn Pec deck / Pec fly', (A.exdbGet('Butterfly') || {}).aka === 'Pec deck / Pec fly', (A.exdbGet('Butterfly') || {}).aka);
ok('bài không có nhãn thì aka rỗng', !(A.exdbGet('Barbell_Bench_Press_-_Medium_Grip') || {}).aka);

if (fail) { console.log(`FAIL: ${fail} kiểm tra đỏ`); process.exit(1); }
console.log('Tất cả xanh');
