// BR-39 Cân vùng cơ trong ngày tập, góc tập, vùng còn thiếu, biến thể (PA-50).
// Test hàm thuần, không cần trình duyệt: trích đoạn "Vùng cơ" từ index.html rồi chạy trong vm.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pick = (from, to) => {
  const a = html.indexOf(from); const b = html.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error('Không tìm thấy đoạn: ' + from);
  return html.slice(a, b);
};
const code = pick('const LIB2 = ', 'const LIB = ') + 'const LIB = LIB2.map(x => [x[0], x[4], x[2]]);\n'
  + pick('/* ===== Vùng cơ: nhóm lớn', '/* video hướng dẫn */');
const fns = ['dayLoad', 'dayBalance', 'missingZones', 'variantsOf', 'famOf', 'eqOf', 'angOpts', 'angleOf', 'angleName', 'secOf', 'BAL'];
const A = vm.runInNewContext(code + `\n;({ ${fns.map(f => `${f}: typeof ${f} !== 'undefined' ? ${f} : null`).join(', ')}, zoneOf })`, {});

let fail = 0;
const ok = (name, cond, got) => { if (cond) console.log('  ok  ' + name); else { fail++; console.log('  FAIL ' + name + (got !== undefined ? ' → ' + JSON.stringify(got) : '')); } };
const need = fns.filter(f => !A[f]);
ok('có đủ hàm BR-39', !need.length, need);
if (need.length) { console.log(`FAIL: thiếu ${need.length} hàm`); process.exit(1); }

/* bài như trong giáo án: tên thư viện, zone/type lấy theo thư viện (giống newEx) */
const LIB2 = vm.runInNewContext(pick('const LIB2 = ', 'const LIB = ') + ';LIB2');
let n = 0;
const ex = (name, sets = 3, o = {}) => { const l = LIB2.find(x => x[0] === name); if (!l && !o.zone) throw new Error('Không có trong thư viện: ' + name);
  return { id: 'e' + (++n), name, zone: l ? l[1] : o.zone, muscle: l ? l[4] : 'Khác', type: l ? l[2] : 'upper', sets, alts: [], ...o }; };
const INC_DB = 'Đẩy ngực dốc lên tạ đơn (Incline dumbbell press)', INC_SM = 'Đẩy ngực dốc lên máy Smith (Smith incline press)';
const LOW_CF = 'Ép cáp từ dưới lên (Low-to-high cable fly)', PUSHD = 'Đẩy cáp tay sau (Triceps pushdown)', DIPS = 'Xà kép (Dips)';
const nguc = () => ({ id: 'd1', name: 'Ngực', exercises: [ex(INC_DB), ex(INC_SM), ex(LOW_CF), ex(PUSHD)] });
const day2 = () => ({ id: 'd2', name: 'Đẩy', exercises: [ex(DIPS), ex('Đẩy vai tạ đơn (Dumbbell shoulder press)'), ex('Nâng vai ngang (Lateral raise)')] });

console.log('Cân vùng cơ — BR-39');
/* nhận diện họ động tác / dụng cụ */
for (const [nm, f] of [[INC_DB, 'press'], [INC_SM, 'press'], ['Ép ngực máy (Pec deck)', 'fly'], ['Ép cáp (Cable fly)', 'cfly'], ['Bay vai sau máy (Reverse pec deck)', 'rear'],
  ['Đẩy ngực tay hẹp (Close-grip bench)', 'tri'], ['Kéo cáp dọc thân (Upright row)', 'upr'], ['Chèo cáp ngồi (Seated cable row)', 'row'], ['Kéo xô tay thẳng (Straight-arm pulldown)', 'sap'], ['Cuốn tạ đòn (Barbell curl)', null]])
  ok(`họ động tác "${nm}" = ${f}`, A.famOf({ name: nm }) === f, A.famOf({ name: nm }));
ok('dụng cụ: Smith, tạ đơn, cáp, máy', A.eqOf(INC_SM) === 'máy Smith' && A.eqOf(INC_DB) === 'tạ đơn' && A.eqOf(LOW_CF) === 'cáp' && A.eqOf('Ép ngực máy (Pec deck)') === 'máy', [A.eqOf(INC_SM), A.eqOf(INC_DB), A.eqOf(LOW_CF)]);

/* BR-39.1 góc */
ok('đẩy ngực có 4 góc', A.angOpts(ex(INC_DB)).map(o => o[0]).join() === '0,30,45,dec', A.angOpts(ex(INC_DB)));
ok('ép ngực máy (pec deck) không có góc', A.angOpts(ex('Ép ngực máy (Pec deck)')).length === 0);
ok('ép cáp: dưới lên / ngang / trên xuống', A.angOpts(ex('Ép cáp (Cable fly)')).map(o => o[2]).join() === 'Ngực trên,Ngực giữa,Ngực dưới');
ok('góc suy từ tên: dốc lên → 30, dốc xuống → dec, không ghi → 0', A.angleOf(ex(INC_DB)) === '30' && A.angleOf(ex('Đẩy ngực dốc xuống tạ đơn (Decline dumbbell press)')) === 'dec' && A.angleOf(ex('Đẩy ngực tạ đơn (Dumbbell press)')) === '0');
ok('góc chọn tay (45°) được giữ', A.angleOf(ex(INC_DB, 3, { angle: '45' })) === '45');
ok('đổi góc → tên thư viện đúng: tạ đơn phẳng → dốc lên', A.angleName('Đẩy ngực tạ đơn (Dumbbell press)', 'press', '30') === INC_DB, A.angleName('Đẩy ngực tạ đơn (Dumbbell press)', 'press', '30'));
ok('đổi góc → Smith phẳng có trong thư viện', A.angleName(INC_SM, 'press', '0') === 'Đẩy ngực máy Smith (Smith bench press)', A.angleName(INC_SM, 'press', '0'));
ok('đổi góc → Smith dốc xuống (không có trong thư viện) ghép tên', A.angleName(INC_SM, 'press', 'dec') === 'Đẩy ngực dốc xuống máy Smith', A.angleName(INC_SM, 'press', 'dec'));
ok('đổi góc ép cáp → từ trên xuống', A.angleName('Ép cáp (Cable fly)', 'cfly', 'hi') === 'Ép cáp từ trên xuống (High-to-low cable fly)', A.angleName('Ép cáp (Cable fly)', 'cfly', 'hi'));

/* BR-39.3 set chính 1, set phụ 0,5 */
const z = A.dayLoad([ex(INC_DB)]);
ok('đẩy dốc lên 3 set → Ngực trên 3, Vai trước 1,5, Tay sau đầu ngoài 1,5', z['Ngực trên'].d === 3 && z['Vai trước'].s === 1.5 && z['Tay sau đầu ngoài'].s === 1.5, z);
ok('bài cô lập không có vùng phụ', A.secOf(ex(LOW_CF)).length === 0);

/* BR-39.5 cảnh báo */
const D = nguc(), W = A.dayBalance(D);
const st = W.find(w => w.kind === 'stack');
ok('dồn vùng: Ngực trên 3 bài · 9 set, trống Ngực giữa + Ngực dưới', st && st.zone === 'Ngực trên' && st.n === 3 && st.sets === 9 && st.empty.join() === 'Ngực giữa,Ngực dưới', st);
const dup = W.find(w => w.kind === 'dup');
ok('gần trùng: đẩy dốc lên tạ đơn và Smith', dup && dup.a === D.exercises[0].id && dup.b === D.exercises[1].id, dup);
ok('chưa vượt trần 11 khi Ngực 9 set', !W.some(w => w.kind === 'cap'), W);
const big = { id: 'd3', name: 'Ngực nặng', exercises: [ex(INC_DB), ex('Đẩy ngực tạ đòn (Bench press)'), ex('Ép ngực máy (Pec deck)'), ex('Đẩy ngực dốc xuống tạ đơn (Decline dumbbell press)')] };
const cap = A.dayBalance(big).find(w => w.kind === 'cap');
ok('vượt trần: Ngực 12 set > 11', cap && cap.big === 'Ngực' && cap.total === 12, A.dayBalance(big));
ok('ngày cân đối không có cảnh báo dồn', !A.dayBalance({ exercises: [ex(INC_DB), ex('Đẩy ngực tạ đòn (Bench press)'), ex('Ép cáp từ trên xuống (High-to-low cable fly)')] }).some(w => w.kind === 'stack'));
ok('khác góc không bị coi là trùng (tạ đơn 30° + Smith phẳng)', !A.dayBalance({ exercises: [ex(INC_DB), ex('Đẩy ngực máy Smith (Smith bench press)')] }).some(w => w.kind === 'dup'));
ok('ngưỡng mặc định: trần 11, dồn 3 bài / 8 set', A.BAL.cap === 11 && A.BAL.stackN === 3 && A.BAL.stackS === 8, A.BAL);

/* BR-39.8 vùng còn thiếu, tính theo cả tuần */
const d1 = nguc(), d2 = day2(), miss = A.missingZones(d1, [d1, d2]);
const mz = Object.fromEntries(miss.map(m => [m.zone, m.elsewhere]));
ok('còn thiếu Ngực giữa (không ngày nào có)', 'Ngực giữa' in mz && mz['Ngực giữa'] === null, miss);
ok('Ngực dưới đã có ở ngày Đẩy', mz['Ngực dưới'] === 'Đẩy', miss);
ok('Vai trước không nhắc (không phải vùng chính, đã có set phụ)', !('Vai trước' in mz), miss);
ok('chỉ xét nhóm cơ có trong ngày (không nhắc Lưng, Chân)', !miss.some(m => ['Lưng', 'Đùi trước', 'Đùi sau'].includes(m.big)), miss);

/* BR-39.9 biến thể */
const vs = A.variantsOf(d1.exercises[0], d1, [d1, d2]);
ok('biến thể không chứa chính bài đó', !vs.some(v => v.name === INC_DB));
ok('biến thể lấp chỗ thiếu đứng đầu', vs[0] && vs[0].fills === true, vs.slice(0, 3));
const flat = vs.find(v => v.name === 'Đẩy ngực tạ đơn (Dumbbell press)');
ok('cùng dụng cụ, khác góc → trục Góc, Ngực giữa, lấp chỗ thiếu', flat && flat.axis === 'Góc' && flat.zone === 'Ngực giữa' && flat.fills, flat);
ok('Smith dốc lên đã có trong ngày → Đã có', (vs.find(v => v.name === INC_SM) || {}).has === true, vs.find(v => v.name === INC_SM));
ok('có biến thể đổi kiểu động tác (ép) cùng vùng', vs.some(v => v.axis === 'Động tác' && v.zone === 'Ngực trên'), vs.map(v => v.axis + ':' + v.name));
ok('có biến thể đổi dụng cụ', vs.some(v => v.axis === 'Dụng cụ'));
const cv = A.variantsOf(ex('Cuốn tạ đòn (Barbell curl)'), { exercises: [] }, []);
ok('bài không thuộc họ có góc: biến thể cùng vùng, cùng kiểu bài', cv.length > 2 && cv.every(v => v.zone === 'Bắp tay trước'), cv.map(v => v.name));

if (fail) { console.log(`FAIL: ${fail} kiểm tra đỏ`); process.exit(1); }
console.log('Tất cả xanh');
