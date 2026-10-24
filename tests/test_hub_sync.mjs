// PA-33: máy chủ đồng bộ (/s/*) trên push-server — chạy đúng push-server/src/index.js với SQLite thật (node:sqlite)
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { Hub } from '../push-server/src/index.js';

const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const b64u = b => Buffer.from(b).toString('base64url');
const rnd = n => b64u(crypto.randomBytes(n));
const shaFull = s => b64u(crypto.createHash('sha256').update(s).digest());

// ---------- DO giả: KV + SQL ----------
const db = new DatabaseSync(':memory:');
const mem = new Map(); let alarmAt = null;
const storage = {
  get: async k => mem.get(k),
  put: async (k, v) => { mem.set(k, structuredClone(v)); },
  delete: async k => { for (const x of [].concat(k)) mem.delete(x); return 1; },
  list: async ({ prefix = '', limit } = {}) => { const m = new Map([...mem].filter(([k]) => k.startsWith(prefix)).sort(([a], [b]) => a < b ? -1 : 1)); return limit ? new Map([...m].slice(0, limit)) : m; },
  setAlarm: async t => { alarmAt = t; }, deleteAlarm: async () => { alarmAt = null; },
  sql: {
    exec(q, ...b) {
      const st = db.prepare(q);
      const rows = /^\s*(select|with)/i.test(q) ? st.all(...b) : (st.run(...b), []);
      return { toArray: () => rows, one: () => rows[0] };
    }
  }
};
const HK = rnd(32);                                  // khoá HLV (chỉ có trong QR, không lưu đâu)
const env = { HLV_HASH: shaFull(HK) };
const hub = new Hub({ storage, blockConcurrencyWhile: f => f() }, env);

const sent = []; globalThis.fetch = async (url, opt) => { sent.push({ url, opt }); return new Response(null, { status: 201 }); };
const api = async (path, body, auth, method = 'POST') => {
  const h = { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) };
  const r = await hub.fetch(new Request('https://x' + path, { method, headers: h, body: method === 'POST' ? JSON.stringify(body || {}) : undefined }));
  return { s: r.status, j: await r.json().catch(() => ({})) };
};
const AH = { authorization: 'Bearer h.' + HK };
const H = 'Bearer h.' + HK;
const V = (hv, dk) => `Bearer v.${hv}.${dk}`;
// đăng ký đẩy giả nhưng khoá thật (điểm P-256 hợp lệ) để việc mã hoá thông báo chạy đúng
const subOf = async () => {
  const k = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  return { endpoint: 'https://web.push.apple.com/' + rnd(12), keys: { p256dh: b64u(new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey))), auth: rnd(16) } };
};

// Khoá học viên GAV1: k = khoá ngẫu nhiên, máy chủ chỉ giữ băm
const kLan = rnd(24);
const T = Date.now();

// ---------- 1. Xác thực HLV bằng khoá trong QR ----------
ok((await api('/s/tv', null, null, 'GET')).s === 401, 'Không có khoá HLV → 401');
ok((await api('/s/tv', null, 'Bearer h.sai', 'GET')).s === 401, 'Khoá HLV sai → 401');
ok((await api('/s/tv', null, H, 'GET')).s === 200, 'Khoá HLV đúng (băm khớp HLV_HASH) → 200');
ok((await api('/s/hlv/tao', {}, H)).s === 404, 'Không có lệnh tạo HLV (không còn nguy cơ chiếm phòng)');

// ---------- 2. Thêm học viên ----------
const add = await api('/s/tv/them', { id: 'lan-7k3f', ten: 'Lan', kieu: 'hv', skh: shaFull(kLan) }, H);
ok(add.s === 200 && add.j.ok, 'HLV thêm học viên với băm khoá QR');
ok((await api('/s/tv/them', { id: 'lan-7k3f', ten: 'Lan', kieu: 'hv', skh: shaFull(kLan) }, H)).s === 409, 'Trùng mã học viên → 409');
ok((await api('/s/tv/them', { id: 'AB', ten: 'x', kieu: 'hv', skh: 'x' }, H)).s === 400, 'Mã học viên sai định dạng → 400');
ok((await api('/s/tv/them', { id: 'minh-1a2b', ten: 'Minh', kieu: 'hv' }, H)).s === 400, 'Thiếu băm khoá → 400');

// ---------- 3. Nối máy bằng QR vĩnh viễn ----------
const noi = await api('/s/noi', { i: 'lan-7k3f', k: kLan, tb: 'iPhone Lan' });
ok(noi.s === 200 && noi.j.dk && noi.j.id === 'lan-7k3f' && noi.j.ten === 'Lan', 'Quét QR học viên → nhận khoá thiết bị dk');
ok((await api('/s/noi', { i: 'lan-7k3f', k: rnd(24), tb: 'máy lạ' })).s === 403, 'QR giả (khác khoá) → 403');
ok((await api('/s/noi', { i: 'khong-co', k: kLan, tb: 'x' })).s === 403, 'Mã học viên không tồn tại → 403, không lộ thông tin');
const dk1 = noi.j.dk;
const tbSeen = (await api('/s/tv', null, H, 'GET')).j.hv.find(x => x.id === 'lan-7k3f');
ok(tbSeen && tbSeen.tb.length === 1 && !JSON.stringify(tbSeen).includes(dk1), 'Danh sách máy hiện tên máy, không lộ khoá thiết bị');
for (let n = 2; n <= 6; n++) await api('/s/noi', { i: 'lan-7k3f', k: kLan, tb: 'máy ' + n });
const sau6 = (await api('/s/tv', null, H, 'GET')).j.hv.find(x => x.id === 'lan-7k3f');
ok(sau6.tb.length === 5 && !sau6.tb.some(x => x.ten === 'iPhone Lan'), 'Máy thứ 6 đẩy máy cũ nhất ra (tối đa 5 máy)');
// máy còn lại dùng được; dùng khoá đã bị đẩy → 401
const dk6 = (await api('/s/noi', { i: 'lan-7k3f', k: kLan, tb: 'máy 7' })).j.dk;
ok((await api('/s/doi?hv=lan-7k3f&since=0', null, V('lan-7k3f', dk6), 'GET')).s === 200, 'Máy mới nhất dùng được ngay');
ok((await api('/s/doi?hv=lan-7k3f&since=0', null, V('lan-7k3f', dk1), 'GET')).s === 401, 'Khoá thiết bị đã bị đẩy ra → 401');

// ---------- 4. Ghi và đọc bản ghi, quyền ----------
const buoi = (id, t, extra = {}) => ({ k: 'buoi:' + id, id, t, vai: 'hv', d: JSON.stringify({ name: 'Ngực', sets: [{ kg: 40, reps: 8 }] }), ...extra });
const w1 = await api('/s/ghi', { hv: 'lan-7k3f', recs: [buoi('b1', T)] }, V('lan-7k3f', dk6));
ok(w1.s === 200 && w1.j.seq >= 1 && w1.j.tuChoi.length === 0, 'Học viên ghi buổi của mình');
const seq1 = w1.j.seq;
const w2 = await api('/s/ghi', { hv: 'lan-7k3f', recs: [buoi('b1', T)] }, V('lan-7k3f', dk6));
ok(w2.j.seq === seq1, 'Gửi lại cùng bản ghi không đổi seq (idempotent)');
const w3 = await api('/s/ghi', { hv: 'lan-7k3f', recs: [buoi('b1', T - 5000, { d: '{"old":1}' })] }, V('lan-7k3f', dk6));
ok(w3.j.tuChoi.length === 1 && w3.j.tuChoi[0].cu && w3.j.tuChoi[0].cu.t === T, 'Bản cũ hơn bị từ chối, trả lại bản hiện có để gộp');
ok((await api('/s/ghi', { hv: 'minh-1a2b', recs: [buoi('x', T)] }, V('lan-7k3f', dk6))).s === 403, 'Học viên ghi sang hồ sơ người khác → 403');
ok((await api('/s/ghi', { hv: 'lan-7k3f', recs: [{ k: 'plan@hlv', id: 'p', t: T, vai: 'hlv', d: '{}' }] }, V('lan-7k3f', dk6))).s === 403, 'Học viên ghi giáo án của HLV (plan@hlv) → 403');
ok((await api('/s/ghi', { hv: 'lan-7k3f', recs: [buoi('big', T, { d: 'x'.repeat(300 * 1024) })] }, V('lan-7k3f', dk6))).s === 413, 'Buổi quá 256 KB → 413');
const planH = await api('/s/ghi', { hv: 'lan-7k3f', recs: [{ k: 'plan@hlv', id: 'p', t: T, vai: 'hlv', d: '{"days":[]}' }] }, H);
ok(planH.s === 200 && planH.j.seq > seq1, 'HLV ghi giáo án (plan@hlv)');
ok((await api('/s/ghi', { hv: 'lan-7k3f', recs: [{ k: 'plan@hv', id: 'h', t: T, vai: 'hv', d: '{}' }] }, H)).s === 403, 'HLV ghi mức tạ tự nhập của học viên (plan@hv) → 403');

// PA-40: báo cơ còn đau (dau@hv): học viên ghi, HLV chỉ đọc, bản quá 24 giờ bị bỏ
ok((await api('/s/ghi', { hv: 'lan-7k3f', recs: [{ k: 'dau@hv', id: 'dau', t: T, vai: 'hv', d: '[{"m":"Ngực","at":1}]' }] }, V('lan-7k3f', dk6))).s === 200, 'Học viên ghi báo cơ còn đau (dau@hv)');
ok((await api('/s/ghi', { hv: 'lan-7k3f', recs: [{ k: 'dau@hv', id: 'dau', t: T, vai: 'hlv', d: '[]' }] }, H)).s === 403, 'HLV không ghi được báo cơ của học viên (dau@hv) → 403');
ok((await api('/s/ghi', { hv: 'lan-7k3f', recs: [{ k: 'dau@hv', id: 'khac', t: T, vai: 'hv', d: '[]' }] }, V('lan-7k3f', dk6))).s === 403, 'Bản dau@hv có mã khác “dau” → 403');
const doi = (q, a) => api('/s/doi?' + q, null, a, 'GET');
const hlvAll = await doi('since=0', H);
ok(hlvAll.j.recs.some(r => r.id === 'b1') && hlvAll.j.seq >= planH.j.seq, 'HLV đọc mọi học viên và seq hiện tại');
const delta = await doi(`hv=lan-7k3f&since=${seq1}`, H);
ok(delta.j.recs.every(r => r.seq > seq1) && delta.j.recs.some(r => r.k === 'plan@hlv'), 'Đọc theo seq: chỉ bản ghi mới hơn seq đã thấy');
ok(delta.j.recs.every(r => r.hv === 'lan-7k3f'), 'Đọc theo học viên chỉ trả đúng học viên đó');
ok((await doi('hv=lan-7k3f&since=0', V('lan-7k3f', dk6))).j.recs.length >= 2, 'Học viên đọc lại dữ liệu của mình');

// ---------- 5. Đổi mã (QR bị lộ) ----------
const kMoi = rnd(24);
await api('/s/tv/doima', { id: 'lan-7k3f', skh: shaFull(kMoi) }, H);
ok((await doi('hv=lan-7k3f&since=0', V('lan-7k3f', dk6))).s === 401, 'Đổi mã: mọi máy cũ bị thu hồi');
ok((await api('/s/noi', { i: 'lan-7k3f', k: kLan, tb: 'x' })).s === 403, 'Đổi mã: QR cũ không còn nối được');
const dkMoi = (await api('/s/noi', { i: 'lan-7k3f', k: kMoi, tb: 'iPhone mới' })).j.dk;
ok(!!dkMoi, 'Đổi mã: QR mới nối được');

// ---------- 6. Khoá / mở / thu hồi máy ----------
await api('/s/tv/khoa', { id: 'lan-7k3f', khoa: true }, H);
ok((await doi('hv=lan-7k3f&since=0', V('lan-7k3f', dkMoi))).s === 401, 'Khoá học viên: máy bị từ chối ngay (401)');
ok((await api('/s/noi', { i: 'lan-7k3f', k: kMoi, tb: 'x' })).s === 403, 'Khoá học viên: không nối máy mới');
await api('/s/tv/khoa', { id: 'lan-7k3f', khoa: false }, H);
ok((await doi('hv=lan-7k3f&since=0', V('lan-7k3f', dkMoi))).s === 200, 'Mở khoá: máy cũ dùng lại được, dữ liệu không mất');
await api('/s/noi', { i: 'lan-7k3f', k: kMoi, tb: 'iPad' });
const listNow = (await api('/s/tv', null, H, 'GET')).j.hv.find(x => x.id === 'lan-7k3f');
const ipad = listNow.tb.find(x => x.ten === 'iPad');
await api('/s/tv/tb/thu', { id: 'lan-7k3f', dkh: ipad.dkh }, H);
const sauThu = (await api('/s/tv', null, H, 'GET')).j.hv.find(x => x.id === 'lan-7k3f');
ok(sauThu.tb.length === listNow.tb.length - 1 && !sauThu.tb.some(x => x.ten === 'iPad'), 'HLV thu hồi một máy cụ thể');
ok((await doi('hv=lan-7k3f&since=0', V('lan-7k3f', dkMoi))).s === 200, 'Thu hồi iPad: máy chính vẫn dùng được');

// ---------- 7. Học viên tự gửi, không báo lịch sử, báo HLV khi buổi mới xong ----------
const subHLV = await subOf(), subLan = await subOf();
ok((await api('/s/dk', { sub: subHLV }, H)).j.ok, 'HLV đăng ký nhận thông báo');
ok((await api('/s/dk', { sub: subLan }, V('lan-7k3f', dkMoi))).j.ok, 'Học viên đăng ký nhận thông báo giáo án');
sent.length = 0;
await api('/s/ghi', { hv: 'lan-7k3f', recs: [buoi('b2', T + 1000)], ev: { title: 'Lan vừa tập xong', body: 'Ngực · 1 bài', tag: 'buoi-b2' } }, V('lan-7k3f', dkMoi));
ok(sent.length === 1 && sent[0].url === subHLV.endpoint, 'Buổi mới xong → 1 thông báo tới HLV, không tới máy học viên');
sent.length = 0;
await api('/s/ghi', { hv: 'lan-7k3f', recs: [buoi('b2', T + 1000)], ev: { title: 'Lan vừa tập xong', body: 'x', tag: 'buoi-b2' } }, V('lan-7k3f', dkMoi));
ok(sent.length === 0, 'Gửi lại cùng buổi → không báo lần hai');
sent.length = 0;
await api('/s/ghi', { hv: 'lan-7k3f', recs: [buoi('b3', T + 2000)], ev: { title: 'x', body: 'y', tag: 'buoi-b3' }, backfill: true }, V('lan-7k3f', dkMoi));
ok(sent.length === 0, 'Lô lịch sử (backfill) → không báo');
sent.length = 0;
await api('/s/ghi', { hv: 'lan-7k3f', recs: [{ k: 'plan@hlv', id: 'p', t: T + 3000, vai: 'hlv', d: '{"days":[1]}' }], ev: { title: 'HLV vừa cập nhật giáo án', body: '', tag: 'plan' } }, H);
ok(sent.length === 1 && sent[0].url === subLan.endpoint, 'HLV đổi giáo án → thông báo tới học viên, không tới HLV');

// ---------- 8. Hồ sơ HLV tự tập: sao lưu một chiều ----------
ok((await api('/s/tv/them', { id: 'hlv-tu-tap', ten: 'HLV', kieu: 'sl', skh: shaFull(kLan) }, H)).s === 200, 'Tạo hồ sơ sao lưu một chiều của HLV');
const slRec = await api('/s/ghi', { hv: 'sl:hlv-tu-tap', recs: [buoi('t1', T)], ev: { title: 'x', body: 'y', tag: 't1' } }, H);
ok(slRec.s === 200 && sent.length === 1, 'HLV tự tập: ghi được, và không có thông báo');
// BR-28.11: tên hồ sơ tập của HLV (ten@hlv): chỉ HLV ghi, chỉ vào hồ sơ sl:…
ok((await api('/s/ghi', { hv: 'sl:hlv-tu-tap', recs: [{ k: 'ten@hlv', id: 'ten', t: T, vai: 'hlv', d: 'Hoàng' }] }, H)).s === 200, 'HLV ghi tên hồ sơ tập (ten@hlv) vào sl:…');
ok((await doi('hv=sl:hlv-tu-tap&since=0', H)).j.recs.some(r => r.k === 'ten@hlv' && r.d === 'Hoàng'), 'Đọc lại được tên hồ sơ tập');
ok((await api('/s/ghi', { hv: 'lan-7k3f', recs: [{ k: 'ten@hlv', id: 'ten', t: T, vai: 'hlv', d: 'X' }] }, H)).s === 403, 'ten@hlv không ghi được vào học viên thường → 403');
ok((await api('/s/ghi', { hv: 'sl:hlv-tu-tap', recs: [{ k: 'ten@hlv', id: 'ten', t: T, vai: 'hlv', d: '   ' }] }, H)).s === 403, 'Tên trống → 403');
ok(!(await doi('since=0', H)).j.recs.some(r => r.hv === 'sl:hlv-tu-tap'), 'Đọc mặc định của HLV không lẫn hồ sơ sao lưu');
ok((await doi('hv=sl:hlv-tu-tap&since=0', H)).j.recs.some(r => r.id === 't1'), 'Khôi phục hồ sơ sao lưu: đọc được theo hv=sl:…');
ok((await api('/s/tv', null, H, 'GET')).j.hv.find(x => x.id === 'hlv-tu-tap').kieu === 'sl', 'Hồ sơ sao lưu hiển thị đúng loại');

// PA-48 · BR-37: thông tin cơ thể (do@hv, anh@hv, ho-so@hv): học viên ghi, HLV chỉ đọc, báo HLV khi có số đo/ảnh mới
{
  const A = V('lan-7k3f', dkMoi), ct = (k, id, t, d, extra = {}) => ({ hv: 'lan-7k3f', recs: [{ k, id, t, vai: 'hv', d: JSON.stringify(d), ...extra }] });
  sent.length = 0;
  const ev = { title: 'Lan vừa cập nhật số đo', body: 'x', tag: 'co-the' };
  ok((await api('/s/ghi', { ...ct('do@hv', 'd1', T, { date: '2026-10-20', weight: 70, bodyFat: 20 }), ev }, A)).s === 200, 'Học viên ghi số đo (do@hv)');
  ok(sent.length === 1 && sent[0].url === subHLV.endpoint, 'Số đo mới → 1 thông báo tới HLV');
  sent.length = 0;
  ok((await api('/s/ghi', { ...ct('anh@hv', 'a1', T, { date: '2026-10-20', pose: 'Trước', h: 'abc123xyz' }), ev }, A)).s === 200 && sent.length === 1, 'Học viên ghi dòng ảnh body (anh@hv) → báo HLV');
  sent.length = 0;
  ok((await api('/s/ghi', { ...ct('do@hv', 'd1', T + 1, {}, { xoa: 1 }), ev }, A)).s === 200 && sent.length === 0, 'Xoá số đo (xoa) → không báo');
  ok((await api('/s/ghi', { ...ct('do@hv', 'd2', T, { weight: 71 }), ev, backfill: true }, A)).s === 200 && sent.length === 0, 'Gửi bù (backfill) → không báo');
  ok((await api('/s/ghi', ct('ho-so@hv', 'ho-so', T, { height: 170, sex: 'm' }), A)).s === 200, 'Học viên ghi chiều cao/giới tính (ho-so@hv)');
  ok((await api('/s/ghi', ct('ho-so@hv', 'khac', T, {}), A)).s === 403, 'ho-so@hv có mã khác “ho-so” → 403');
  for (const k of ['do@hv', 'anh@hv', 'ho-so@hv']) ok((await api('/s/ghi', { hv: 'lan-7k3f', recs: [{ k, id: k === 'ho-so@hv' ? 'ho-so' : 'z1', t: T, vai: 'hlv', d: '{}' }] }, H)).s === 403, 'HLV không ghi được ' + k + ' → 403');
  ok((await api('/s/ghi', ct('do@hv', 'big', T, { x: 'y'.repeat(5000) }), A)).s === 413, 'Số đo quá 4 KB → 413');
  const got = (await doi('hv=lan-7k3f&since=0', H)).j.recs;
  ok(got.some(r => r.k === 'do@hv' && r.id === 'd1' && r.xoa === 1) && got.some(r => r.k === 'anh@hv') && got.some(r => r.k === 'ho-so@hv'), 'HLV và học viên đọc lại được các bản ghi cơ thể (kể cả bản xoá)');
  ok((await doi('hv=lan-7k3f&since=0', A)).j.recs.some(r => r.k === 'do@hv' && r.id === 'd2'), 'Máy học viên mới (since=0) lấy lại được số đo của chính mình');
}

// ---------- 9. Xoá học viên ----------
await api('/s/tv/xoa', { id: 'lan-7k3f' }, H);
ok((await doi('hv=lan-7k3f&since=0', V('lan-7k3f', dkMoi))).s === 401, 'Xoá học viên: máy của họ mất quyền');
ok(!(await doi('since=0', H)).j.recs.some(r => r.hv === 'lan-7k3f'), 'Xoá học viên: dữ liệu biến mất khỏi máy chủ');


// ---------- 11. Tắt thông báo đồng bộ (dk off) ----------
{
  const kAn = rnd(24), subT = await subOf();
  await api('/s/tv/them', { id: 'an-1x2y', ten: 'An', kieu: 'hv', skh: shaFull(kAn) }, H);
  const dkAn = (await api('/s/noi', { i: 'an-1x2y', k: kAn, tb: 'máy thử' })).j.dk;
  const recAn = (id, t) => ({ hv: 'an-1x2y', recs: [buoi(id, t)], ev: { title: 'x', body: 'y', tag: id } });
  await api('/s/dk', { sub: subT }, H);
  sent.length = 0;
  await api('/s/ghi', recAn('off1', T + 5000), V('an-1x2y', dkAn));
  ok(sent.some(u => u.url === subT.endpoint), 'Trước khi tắt: HLV nhận thông báo buổi mới');
  await api('/s/dk', { sub: subT, off: true }, H);
  sent.length = 0;
  await api('/s/ghi', recAn('off2', T + 6000), V('an-1x2y', dkAn));
  ok(!sent.some(u => u.url === subT.endpoint), 'Sau khi tắt: máy đó không còn nhận thông báo của phòng');
}
// ---------- 10. Trạng thái ----------
const tt = await api('/s/tt', null, H, 'GET');
ok(tt.s === 200 && typeof tt.j.seq === 'number', 'Trạng thái máy chủ có seq');
