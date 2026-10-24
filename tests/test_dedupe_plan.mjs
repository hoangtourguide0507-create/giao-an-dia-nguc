// PA-46 (BR-33.2): tìm và gộp bài trùng trong một ngày tập của giáo án
import { dedupePlan, baoCaoTrung } from '../push-server/src/dedupe.js';

const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const bai = (name, o = {}) => ({ i: [], name, currentKg: null, kgSetAt: 0, ph: [], hlvNote: '', l: [], ...o });
const ten = d => d.e.map(x => x.name).join(',');

// trùng theo tên (không phân biệt hoa thường, khoảng trắng thừa)
let r = dedupePlan([{ n: 'Đẩy', e: [bai('Squat'), bai('Bench'), bai('  squat ')] }]);
ok(r.doi && ten(r.plan[0]) === 'Squat,Bench', 'Trùng theo tên: còn Squat, Bench; bài giữ đứng ở vị trí đầu tiên');

// trùng theo khoá nhận diện dù tên khác; khoá của bài bị gộp chuyển sang bài giữ
r = dedupePlan([{ n: 'Kéo', e: [bai('Row', { i: ['~aaaaa'] }), bai('Chèo cáp', { i: ['~aaaaa', '~bbbbb'] })] }]);
ok(r.plan[0].e.length === 1 && ['~aaaaa', '~bbbbb'].every(k => r.plan[0].e[0].i.includes(k)), 'Trùng theo khoá: một bài, giữ đủ khoá (alias) của cả hai');

// chọn bài giữ: mức tạ cao hơn; hoà thì kgSetAt mới hơn; hoà thì có ảnh/ghi chú
r = dedupePlan([{ n: 'A', e: [bai('Squat', { currentKg: 60 }), bai('Squat', { currentKg: 80 })] }]);
ok(r.plan[0].e[0].currentKg === 80, 'Giữ bài có mức tạ cao hơn');
r = dedupePlan([{ n: 'A', e: [bai('Squat', { currentKg: 60, kgSetAt: 5 }), bai('Squat', { currentKg: 60, kgSetAt: 9 })] }]);
ok(r.plan[0].e[0].kgSetAt === 9, 'Cùng mức tạ: giữ bài có kgSetAt mới hơn');
r = dedupePlan([{ n: 'A', e: [bai('Squat'), bai('Squat', { hlvNote: 'chân rộng' })] }]);
ok(r.plan[0].e[0].hlvNote === 'chân rộng', 'Hoà hết: giữ bài có ghi chú/ảnh');

// ba bài trùng, thứ tự các bài khác không đổi
r = dedupePlan([{ n: 'A', e: [bai('X'), bai('Squat'), bai('Y'), bai('squat'), bai('Squat')] }]);
ok(ten(r.plan[0]) === 'X,Squat,Y', 'Ba bài trùng gộp một, thứ tự các bài khác giữ nguyên');

// cùng bài ở hai ngày khác nhau KHÔNG phải trùng
r = dedupePlan([{ n: 'A', e: [bai('Squat')] }, { n: 'B', e: [bai('Squat')] }]);
ok(!r.doi && r.plan[0].e.length === 1 && r.plan[1].e.length === 1, 'Hai ngày cùng có một bài: không đụng');

// không đụng bài khác tên; chạy lần hai không đổi; không sửa đối số
const goc = [{ n: 'A', e: [bai('Squat'), bai('Squat'), bai('Squat sumo')] }], bản = JSON.stringify(goc);
r = dedupePlan(goc);
ok(ten(r.plan[0]) === 'Squat,Squat sumo', 'Bài khác tên (Squat sumo) được giữ');
ok(JSON.stringify(goc) === bản, 'Không sửa giáo án đầu vào');
ok(dedupePlan(r.plan).doi === false, 'Chạy lần hai không đổi gì');

// báo cáo
const bc = baoCaoTrung([{ n: 'A', e: [bai('Squat'), bai('squat'), bai('Squat'), bai('X')] }, { n: 'B', e: [bai('Y')] }]);
ok(bc.length === 1 && bc[0].n === 'A' && bc[0].bai[0].so === 3, 'Báo cáo: ngày A có Squat ×3, ngày B sạch');
ok(baoCaoTrung(null).length === 0 && dedupePlan(null).doi === false, 'Đầu vào rỗng/hỏng không lỗi');
