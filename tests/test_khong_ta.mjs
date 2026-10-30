// BR-48 Bỏ chữ "tự trọng": bài 0 kg hiển thị "Không tạ", bài tại nhà đổi tên dễ hiểu, bài cũ tự đổi tên (PA-60). Hàm thuần.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pick = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a); if (a < 0 || b < 0) throw new Error('Không tìm thấy: ' + from); return html.slice(a, b); };
const fn = name => { const a = html.indexOf(name); if (a < 0) return ''; const b = html.indexOf('\n}', a); return html.slice(a, b + 2); };
const line = start => { const a = html.indexOf(start); return a < 0 ? '' : html.slice(a, html.indexOf('\n', a)); };
const code = [line('const r2 = '), line('function roundStep('), pick('const LIB2 = ', 'const LIB = '), 'const LIB = LIB2.map(x => [x[0], x[4], x[2]]);', pick('const EXDB_MUS=', '/* ===== Vùng cơ'), pick('/* ===== Vùng cơ: nhóm lớn', '/* video hướng dẫn */'), fn('function migrateEx('),
  'const OLD_REST = {}; const fmt = v => String(v).replace(".", ","), U = ex => ex && ex.each ? " kg/tay" : " kg";', line('const kgTxt = ')].join('\n');
const A = vm.runInNewContext(code + `\n;({ BW, BW_INFO, BW_OLD: typeof BW_OLD !== 'undefined' ? BW_OLD : null, migrateEx, loadMode, kgTxt, EXDB_EQ_VI })`, {});

let fail = 0;
const ok = (name, cond, got) => { if (cond) console.log('  ok  ' + name); else { fail++; console.log('  FAIL ' + name + (got !== undefined ? ' → ' + JSON.stringify(got) : '')); } };
console.log('Bỏ chữ "tự trọng" — BR-48');

/* 1. Không còn chữ "tự trọng" hiện ra màn hình: bỏ chú thích, chỉ cho phép trong bảng tên cũ, từ khoá tìm kiếm và nhận dạng tên cũ */
const visible = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').split('\n')
  .map((t, i) => [i + 1, t]).filter(([, t]) => /tự trọng/i.test(t) && !/const BW_OLD = |const VI_EN = |\/tự trọng\|/.test(t));
ok('không còn chữ "tự trọng" trong chữ hiển thị', !visible.length, visible.map(([n, t]) => n + ': ' + t.trim().slice(0, 80)));
ok('số tạ 0 kg ghi "Không tạ"', A.kgTxt(0) === 'Không tạ', A.kgTxt(0));
ok('số tạ khác 0 vẫn ghi kg', A.kgTxt(20) === '20 kg', A.kgTxt(20));
ok('thiết bị "body only" trong thư viện ghi "không tạ"', A.EXDB_EQ_VI['body only'] === 'không tạ', A.EXDB_EQ_VI['body only']);

/* 2. Tên nấc bài tại nhà */
const all = Object.values(A.BW).flatMap(L => L.lv.map(v => v[0]));
ok('tên nấc bài tại nhà không chứa "tự trọng"', !all.some(n => /tự trọng/i.test(n)), all.filter(n => /tự trọng/i.test(n)));
ok('tên nấc không trùng nhau', new Set(all).size === all.length);
ok('squat tại nhà: "Squat không tạ"', all.includes('Squat không tạ (Bodyweight squat)'));

/* 3. Bài đã tạo trước đây đổi sang tên mới, vẫn nhận ra là bài tại nhà */
ok('có bảng tên cũ → mới', A.BW_OLD && Object.keys(A.BW_OLD).length === 8, A.BW_OLD && Object.keys(A.BW_OLD).length);
if (A.BW_OLD) {
  ok('mọi tên mới đều là nấc có thật', Object.values(A.BW_OLD).every(n => all.includes(n)), Object.values(A.BW_OLD).filter(n => !all.includes(n)));
  const ex = A.migrateEx({ name: 'Squat tự trọng (Bodyweight squat)', bw: 'squat', repMin: 10, repTarget: 15, repMax: 20 });
  ok('bài cũ "Squat tự trọng" → "Squat không tạ"', ex.name === 'Squat không tạ (Bodyweight squat)', ex.name);
  ok('giữ nguyên rep đã đặt', ex.repMin === 10 && ex.repMax === 20, ex);
  ok('tên cũ vẫn có hướng dẫn (buổi tập cũ, dữ liệu đồng bộ chưa đổi)', !!A.BW_INFO['Dead bug tự trọng (Dead bug)']);
  const keep = A.migrateEx({ name: 'Squat tạ đòn (Barbell squat)' });
  ok('bài khác không bị đổi tên', keep.name === 'Squat tạ đòn (Barbell squat)', keep.name);
}
ok('bài ghép tên "… không tạ" là bài 0 kg', A.loadMode({ name: 'Đẩy ngực không tạ' }) === 'bw' && A.loadMode({ name: 'Squat không tạ (Bodyweight squat)' }) === 'bw');

if (fail) { console.log(`FAIL: ${fail} kiểm tra đỏ`); process.exit(1); }
console.log('Tất cả xanh');
