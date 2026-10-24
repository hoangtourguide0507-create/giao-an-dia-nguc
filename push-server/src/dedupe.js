/**
 * PA-46 · tìm và gộp bài trùng trong giáo án (BR-33.2). Hàm thuần, không đụng máy chủ.
 * Giáo án = [{ n: tên ngày, e: [bài] }]; bài có i (các khoá nhận diện), name, currentKg, kgSetAt, ph (ảnh), hlvNote, l (bài thay thế).
 * Trong một ngày, hai bài là một nếu `i` giao nhau hoặc cùng tên (không phân biệt hoa thường, bỏ khoảng trắng thừa).
 */

const tenChuan = s => String(s == null ? '' : s).normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
const khoa = x => (Array.isArray(x.i) ? x.i : []).map(String).filter(Boolean);

/* nhóm các bài cùng một bài trong một ngày; trả mảng nhóm là chỉ số bài, theo thứ tự xuất hiện đầu tiên */
function nhomTrung(e) {
  const cha = e.map((_, i) => i), goc = i => { while (cha[i] !== i) i = cha[i] = cha[cha[i]]; return i; };
  const gop = (a, b) => { a = goc(a); b = goc(b); if (a !== b) cha[Math.max(a, b)] = Math.min(a, b); };
  const theoKhoa = new Map(), theoTen = new Map();
  e.forEach((x, i) => {
    for (const k of khoa(x)) { if (theoKhoa.has(k)) gop(i, theoKhoa.get(k)); else theoKhoa.set(k, i); }
    const t = tenChuan(x && x.name); if (!t) return;
    if (theoTen.has(t)) gop(i, theoTen.get(t)); else theoTen.set(t, i);
  });
  const nhom = new Map();
  e.forEach((_, i) => { const g = goc(i); if (!nhom.has(g)) nhom.set(g, []); nhom.get(g).push(i); });
  return [...nhom.values()];
}

/* điểm giữ lại: mức tạ cao hơn → kgSetAt mới hơn → có ảnh/ghi chú → đứng trước (so từng tiêu chí theo thứ tự) */
function tot(a, b) {
  const kg = x => Number(x.currentKg) || 0, at = x => Number(x.kgSetAt) || 0, co = x => ((x.ph || []).length ? 1 : 0) + (x.hlvNote ? 1 : 0);
  return kg(a) - kg(b) || at(a) - at(b) || co(a) - co(b);
}

/* Báo cáo trùng, không sửa: [{ n: tên ngày, bai: [{ name, so: số lần }] }] */
export function baoCaoTrung(plan) {
  const out = [];
  for (const d of Array.isArray(plan) ? plan : []) {
    const e = Array.isArray(d && d.e) ? d.e : [], bai = [];
    for (const g of nhomTrung(e)) if (g.length > 1) bai.push({ name: String(e[g[0]].name || ''), so: g.length });
    if (bai.length) out.push({ n: String((d && d.n) || ''), bai });
  }
  return out;
}

/* Gộp bài trùng, trả { plan, doi }; không sửa đối số. Bài giữ lại đứng ở vị trí xuất hiện đầu tiên, nhận thêm khoá của bài bị gộp. */
export function dedupePlan(plan) {
  if (!Array.isArray(plan)) return { plan, doi: false };
  let doi = false;
  const out = plan.map(d => {
    const e = Array.isArray(d && d.e) ? d.e : [], nhom = nhomTrung(e);
    if (nhom.every(g => g.length === 1)) return d;
    doi = true;
    const giu = nhom.map(g => {
      let b = e[g[0]];
      for (const i of g.slice(1)) if (tot(e[i], b) > 0) b = e[i];
      if (g.length === 1) return { vt: g[0], x: b };
      const i = [...new Set(g.flatMap(k => khoa(e[k])))].slice(0, 12);
      return { vt: g[0], x: { ...b, i } };
    });
    return { ...d, e: giu.sort((a, b) => a.vt - b.vt).map(z => z.x) };
  });
  return { plan: out, doi };
}
