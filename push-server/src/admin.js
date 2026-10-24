/**
 * PA-46 · quản trị dữ liệu giáo án trên máy chủ (/s/admin/*). Chỉ chủ repo dùng, bằng curl.
 * Xác thực:  Authorization: Bearer a.<ADMIN_KEY>   (băm SHA-256 phải khớp secret env.ADMIN_HASH)
 * Chưa đặt ADMIN_HASH thì mọi đường /s/admin/* đều bị từ chối (tắt mặc định).
 * D1 chỉ đọc: GET /s/admin/giao-an[?d=1]  — báo cáo bài trùng của mọi bản ghi plan@*; d=1 kèm nội dung gốc (để sao lưu).
 */
import { sha } from './sync.js';
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

export async function handleAdmin(ctx, req, p, u) {
  if (!(await laAdmin(ctx.env, req.headers.get('Authorization')))) return json({ ok: false, loi: 'Không có quyền' }, 401);
  if (req.method === 'GET' && p === '/s/admin/giao-an') return json(giaoAn(ctx.sql, u.searchParams.get('d') === '1'));
  return json({ ok: false, loi: 'Không có đường dẫn này' }, 404);
}
