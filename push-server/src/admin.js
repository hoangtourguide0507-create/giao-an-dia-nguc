/**
 * PA-46 · quản trị dữ liệu giáo án trên máy chủ (/s/admin/*). Chỉ chủ repo dùng, bằng curl.
 * Xác thực:  Authorization: Bearer a.<ADMIN_KEY>   (băm SHA-256 phải khớp secret env.ADMIN_HASH)
 * Chưa đặt ADMIN_HASH thì mọi đường /s/admin/* đều bị từ chối (tắt mặc định).
 * D1 chỉ đọc (cả hai đường): GET /s/admin/buoi?tu=&den=[&ct=1] (ct=1 kèm từng bài, từng set: kg, rep, cảm giác) — set mỗi nhóm cơ và buổi trùng ngày+tên trong khoảng ngày.
 * Ghi (PA-46 D3, đã được chủ repo cho phép 24/10): POST /s/admin/gan-nhom-co { chay_thu, doi:[{hv,buoi,bai,den,t}] } — chỉ đổi `muscle` 'Khác' → nhóm cơ đích của bài trong buổi cũ.
 * D1 chỉ đọc: GET /s/admin/giao-an[?d=1]  — báo cáo bài trùng của mọi bản ghi plan@*; d=1 kèm nội dung gốc (để sao lưu).
 */
import { sha, nextSeq } from './sync.js';
import { baoCaoTrung } from './dedupe.js';

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
const same = (a, b) => { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; };

async function laAdmin(env, h) {
  const m = /^Bearer a\.(.+)$/.exec(h || '');
  return !!m && !!env.ADMIN_HASH && same(await sha(m[1]), env.ADMIN_HASH);
}

function giaoAn(sql, withD) {
  const rows = sql.exec("SELECT hv, k, t, xoa, d FROM rec WHERE k IN ('plan@hlv', 'plan@hv') ORDER BY hv, k").toArray();
  const recs = rows.map(r => {
    let plan = null; try { plan = JSON.parse(r.d).plan; } catch (e) { /* bản ghi hỏng: báo loi */ }
    const o = { hv: r.hv, k: r.k, t: r.t, xoa: !!r.xoa, ngay: Array.isArray(plan) ? plan.length : 0, bai: Array.isArray(plan) ? plan.reduce((n, d) => n + ((d && d.e) || []).length, 0) : 0 };
    if (!Array.isArray(plan)) o.loi = 'Không đọc được giáo án';
    else o.trung = baoCaoTrung(plan);
    if (withD) o.d = r.d;
    return o;
  });
  const bi = recs.filter(r => r.trung && r.trung.length);
  return { ok: true, tong: recs.length, biTrung: bi.length, baiTrung: bi.reduce((n, r) => n + r.trung.reduce((m, d) => m + d.bai.reduce((z, b) => z + b.so - 1, 0), 0), 0), recs };
}

/* Buổi tập đã ghi trong khoảng ngày [tu, den] (YYYY-MM-DD), theo học viên: set mỗi nhóm cơ như app đếm (set + drop) và các buổi trùng ngày + tên buổi. Chỉ đọc. */
function buoiTuan(sql, tu, den, ct) {
  const NGAY = /^\d{4}-\d\d-\d\d$/;
  if (!NGAY.test(tu) || !NGAY.test(den)) return { ok: false, loi: 'Cần tu và den dạng YYYY-MM-DD' };
  const hv = {};
  for (const r of sql.exec("SELECT hv, id, t, xoa, d FROM rec WHERE k LIKE 'buoi:%' AND xoa = 0 ORDER BY hv, id").toArray()) {
    let x = null; try { x = JSON.parse(r.d); } catch (e) { continue; }
    if (!x || !NGAY.test(x.date || '') || x.date < tu || x.date > den) continue;
    const nhom = {}, es = Array.isArray(x.entries) ? x.entries : [];
    for (const en of es) nhom[en.muscle || '?'] = (nhom[en.muscle || '?'] || 0) + (Array.isArray(en.sets) ? en.sets.length : 0) + (en.drop ? 1 : 0);
    (hv[r.hv] = hv[r.hv] || []).push({ id: r.id, t: r.t, date: x.date, dayName: x.dayName || '', xong: !!x.finishedAt, bai: es.length, nhom, ...(ct ? { dayId: x.dayId, entries: es.map(en => ({ name: en.name, muscle: en.muscle, each: !!en.each, sets: (en.sets || []).map(z => ({ kg: z.kg, reps: z.reps, ...(z.dr ? { dr: z.dr } : {}), ...(z.ef ? { ef: z.ef } : {}), ...(z.done === false ? { done: false } : {}) })), drop: en.drop || null })) } : {}) });
  }
  const out = Object.entries(hv).map(([id, buoi]) => {
    const tong = {}, dem = {};
    for (const b of buoi) { for (const [m, n] of Object.entries(b.nhom)) tong[m] = (tong[m] || 0) + n; const k = b.date + '|' + b.dayName; dem[k] = (dem[k] || 0) + 1; }
    return { hv: id, soBuoi: buoi.length, tongNhom: tong, trungNgayTen: Object.entries(dem).filter(([, n]) => n > 1).map(([k, n]) => ({ k, n })), buoi };
  });
  return { ok: true, tu, den, hv: out };
}

const NHOM_CO = ['Ngực', 'Lưng', 'Vai', 'Tay trước', 'Tay sau', 'Đùi trước', 'Đùi sau', 'Đùi trong', 'Mông', 'Bắp chân', 'Bụng', 'Cẳng tay'];

/* Gán lại nhóm cơ "Khác" của bài trong buổi tập cũ. Mỗi mục: { hv, buoi, bai, den, t } với t là t hiện tại của bản ghi (chỉ ghi khi chưa ai sửa).
   chay_thu: không ghi, trả `truoc` (nội dung gốc) để sao lưu. Không đổi gì ngoài `muscle` của bài; không gửi thông báo đẩy. */
function ganNhomCo(sql, q) {
  const ds = Array.isArray(q.doi) ? q.doi : [];
  if (!ds.length || ds.length > 200) return { ok: false, loi: 'Cần 1–200 mục trong doi' };
  const theoBuoi = new Map();
  for (const m of ds) {
    if (!m || !NHOM_CO.includes(m.den)) return { ok: false, loi: 'Nhóm cơ đích không hợp lệ: ' + (m && m.den) };
    const k = m.hv + '|' + m.buoi;
    if (!theoBuoi.has(k)) theoBuoi.set(k, { hv: m.hv, buoi: m.buoi, t: m.t, m: [] });
    theoBuoi.get(k).m.push(m);
  }
  const ketQua = [], truoc = [];
  for (const g of theoBuoi.values()) {
    const cur = sql.exec("SELECT k, id, t, vai, xoa, d FROM rec WHERE hv = ? AND k = ? AND id = ?", g.hv, 'buoi:' + g.buoi, g.buoi).toArray()[0];
    if (!cur || cur.xoa) { ketQua.push({ hv: g.hv, buoi: g.buoi, trangThai: 'khong-co' }); continue; }
    if (cur.t !== g.t) { ketQua.push({ hv: g.hv, buoi: g.buoi, trangThai: 'da-doi' }); continue; }
    let x = null; try { x = JSON.parse(cur.d); } catch (e) { ketQua.push({ hv: g.hv, buoi: g.buoi, trangThai: 'hong' }); continue; }
    let n = 0;
    for (const en of Array.isArray(x.entries) ? x.entries : []) {
      const m = g.m.find(z => z.bai === en.name);
      if (m && en.muscle === 'Khác') { en.muscle = m.den; n++; }
    }
    if (!n) { ketQua.push({ hv: g.hv, buoi: g.buoi, trangThai: 'khong-can' }); continue; }
    truoc.push({ hv: g.hv, buoi: g.buoi, t: cur.t, vai: cur.vai, d: cur.d });
    if (!q.chay_thu) {
      const t = Math.max(Date.now(), cur.t + 1), seq = nextSeq(sql);
      sql.exec('UPDATE rec SET seq = ?, t = ?, d = ? WHERE hv = ? AND k = ? AND id = ?', seq, t, JSON.stringify(x), g.hv, 'buoi:' + g.buoi, g.buoi);
    }
    ketQua.push({ hv: g.hv, buoi: g.buoi, trangThai: q.chay_thu ? 'se-doi' : 'da-ghi', bai: n });
  }
  return { ok: true, chayThu: !!q.chay_thu, ketQua, truoc };
}

export async function handleAdmin(ctx, req, p, u) {
  if (!(await laAdmin(ctx.env, req.headers.get('Authorization')))) return json({ ok: false, loi: 'Không có quyền' }, 401);
  if (req.method === 'GET' && p === '/s/admin/giao-an') return json(giaoAn(ctx.sql, u.searchParams.get('d') === '1'));
  if (req.method === 'GET' && p === '/s/admin/buoi') { const r = buoiTuan(ctx.sql, u.searchParams.get('tu') || '', u.searchParams.get('den') || '', u.searchParams.get('ct') === '1'); return json(r, r.ok ? 200 : 400); }
  if (req.method === 'POST' && p === '/s/admin/gan-nhom-co') { const r = ganNhomCo(ctx.sql, await req.json().catch(() => ({}))); return json(r, r.ok ? 200 : 400); }
  return json({ ok: false, loi: 'Không có đường dẫn này' }, 404);
}
