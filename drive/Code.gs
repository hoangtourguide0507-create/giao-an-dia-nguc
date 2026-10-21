/**
 * GIÁO ÁN ĐỊA NGỤC · MÁY CHỦ ĐỒNG BỘ (Google Apps Script)
 * ---------------------------------------------------------
 * Lưu dữ liệu của từng học viên vào thư mục Google Drive "GiaoAnDiaNguc".
 * App trên điện thoại gửi/nhận dữ liệu qua đường link "Ứng dụng web" của script này.
 *
 * Cách dùng: xem file HUONG-DAN-TRIEN-KHAI.md đi kèm.
 *  1. Dán toàn bộ file này vào Apps Script.
 *  2. Chạy hàm caiDat() một lần → lấy MÃ HLV trong Nhật ký thực thi.
 *  3. Triển khai thành Ứng dụng web (Thực thi: Tôi · Truy cập: Bất kỳ ai).
 *  4. Trong app: Cài đặt → Tài khoản → "Tạo tài khoản HLV lần đầu" (dán link + MÃ HLV, đặt tên đăng nhập & mật khẩu).
 *
 * Tài khoản (PA-21): HLV và mỗi học viên đăng nhập bằng tên đăng nhập + mật khẩu.
 *  - Mật khẩu chỉ lưu dạng băm có muối; mỗi lần đăng nhập cấp một "phiên" (mã ngẫu nhiên) cho máy đó.
 *  - HLV đặt / đặt lại mật khẩu cho học viên; học viên tự đổi được mật khẩu của mình.
 *  - Sai mật khẩu 8 lần liền thì tạm khoá tên đăng nhập đó 15 phút.
 *  - Mã liên kết kiểu cũ (quét QR) vẫn dùng được song song.
 *
 * Cấu trúc thư mục trên Drive:
 *   GiaoAnDiaNguc/
 *     thanh-vien.json        danh sách học viên (mã bí mật chỉ lưu dạng băm)
 *     hoc-vien/<id>/hv.json  dữ liệu do máy học viên gửi lên
 *     hoc-vien/<id>/hlv.json dữ liệu do máy HLV gửi xuống (giáo án, mức tạ…)
 *     anh/<mã-ảnh>           ảnh máy tập (dùng chung, không trùng lặp)
 *     sao-luu/YYYY-MM-DD/    bản sao lưu tự động mỗi đêm, giữ 14 ngày
 */

const TEN_THU_MUC = 'GiaoAnDiaNguc';
const PHIEN_BAN = 3;
const PHIEN_TOI_DA = 8;          // số máy đăng nhập cùng lúc cho mỗi tài khoản
const SAI_TOI_DA = 8, KHOA_PHUT = 15;
const GIU_SAO_LUU_NGAY = 14;
const ANH_TOI_DA = 3 * 1024 * 1024;     // tối đa 3 MB mỗi ảnh
const GOI_TOI_DA = 25 * 1024 * 1024;    // tối đa 25 MB mỗi lần gửi dữ liệu
const ANH_TRA_TOI_DA = 20 * 1024 * 1024; // mỗi lần tải ảnh về tối đa ~20 MB

/* ================= CÀI ĐẶT (chạy tay 1 lần) ================= */

/** Chạy hàm này 1 lần sau khi dán code. Xem MÃ HLV trong Nhật ký thực thi. */
function caiDat() {
  const root = thuMucGoc_();
  ['hoc-vien', 'anh', 'sao-luu'].forEach(function (n) { thuMucCon_(root, n); });
  const p = PropertiesService.getScriptProperties();
  p.setProperty('THU_MUC_ID', root.getId());
  if (!p.getProperty('MA_HLV')) p.setProperty('MA_HLV', taoMa_(32));
  if (!root.getFilesByName('thanh-vien.json').hasNext()) ghiJson_(root, 'thanh-vien.json', { v: PHIEN_BAN, ds: [] });
  taoLichSaoLuu_();
  Logger.log('✅ Cài đặt xong.');
  Logger.log('Thư mục dữ liệu: ' + root.getUrl());
  Logger.log('MÃ HLV (giữ kín, dán vào app ở máy HLV): ' + p.getProperty('MA_HLV'));
}

/** Quên mật khẩu HLV: chạy hàm này → xoá tài khoản HLV (dữ liệu giữ nguyên), rồi tạo lại trong app bằng MÃ HLV. */
function xoaTaiKhoanHLV() { PropertiesService.getScriptProperties().deleteProperty('HLV_TK'); Logger.log('Đã xoá tài khoản HLV. Mở app → Tạo tài khoản HLV lần đầu (dùng MÃ HLV).'); }

/** Lỡ để lộ mã HLV: chạy hàm này để tạo mã mới (mã cũ hết hiệu lực ngay). */
function doiMaHLV() {
  const ma = taoMa_(32);
  PropertiesService.getScriptProperties().setProperty('MA_HLV', ma);
  Logger.log('MÃ HLV MỚI: ' + ma + ' · nhập lại vào app ở máy HLV.');
}

/** Xem lại mã HLV hiện tại. */
function xemMaHLV() { Logger.log('MÃ HLV: ' + PropertiesService.getScriptProperties().getProperty('MA_HLV')); }

/* ================= CỔNG WEB ================= */

/** Mở link trên trình duyệt để kiểm tra script đã chạy. */
function doGet() {
  return traVe_({ ok: true, ten: 'Giáo Án Địa Ngục · máy chủ đồng bộ', v: PHIEN_BAN, daCaiDat: !!PropertiesService.getScriptProperties().getProperty('MA_HLV') });
}

/** App gửi yêu cầu dạng: { a: 'tên-việc', ma: 'mã bí mật', ...dữ liệu } (Content-Type text/plain). */
function doPost(e) {
  let q;
  try { q = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return traVe_({ ok: false, loi: 'Dữ liệu gửi lên không đọc được' }); }
  try { return traVe_(xuLy_(q)); }
  catch (err) { return traVe_({ ok: false, loi: String(err && err.message || err) }); }
}

function xuLy_(q) {
  const a = String(q.a || '');
  if (a === 'ping') return { ok: true, v: PHIEN_BAN, vai: vaiCua_(q.ma, q.id), coTK: !!docTkHLV_() };
  if (a === 'dn') return dangNhap_(q.u, q.mk);
  const hlv = laHLV_(q.ma);
  switch (a) {
    /* ---- việc của HLV ---- */
    case 'hlv.tao': canHLV_(hlv); return taoTkHLV_(q.u, q.mk, q.ten);
    case 'tv.them': canHLV_(hlv); return themThanhVien_(q.ten, q.u, q.mk);
    case 'tv.tk': canHLV_(hlv); return datTkThanhVien_(q.id, q.u, q.mk);
    case 'tv.ds': canHLV_(hlv); return { ok: true, ds: dsThanhVien_(q.gon) };
    case 'tv.doima': canHLV_(hlv); return doiMaThanhVien_(q.id);
    case 'tv.tat': canHLV_(hlv); return batTatThanhVien_(q.id, false);
    case 'tv.bat': canHLV_(hlv); return batTatThanhVien_(q.id, true);
    /* ---- việc của HLV hoặc chính học viên đó ---- */
    case 'dx': return dangXuat_(q.ma, q.id);
    case 'mk.doi': return doiMatKhau_(q.ma, q.id, q.mkCu, q.mkMoi);
    case 'keo': canQuyen_(q); return keo_(q.id, q.biet);
    case 'day': canQuyen_(q); return day_(q, hlv);
    case 'anh.co': canAi_(q); return anhCo_(q.ds);
    case 'anh.day': canAi_(q); return anhDay_(q.anh);
    case 'anh.lay': canAi_(q); return anhLay_(q.ds);
  }
  return { ok: false, loi: 'Việc không hợp lệ: ' + a };
}

/* ================= QUYỀN ================= */

function laHLV_(ma) {
  if (typeof ma !== 'string' || ma.length < 16) return false;
  const p = PropertiesService.getScriptProperties(), m = p.getProperty('MA_HLV'); if (m && ma === m) return true;
  const b = bam_(ma); return docPhienHLV_().some(function (x) { return x.h === b; });
}
function canHLV_(hlv) { if (!hlv) throw new Error('Cần mã HLV'); }
function timTV_(id) { return docDs_().ds.find(function (x) { return x.id === id; }) || null; }
function laHocVien_(ma, id) {
  const t = timTV_(String(id || '')); if (!t || t.tat || typeof ma !== 'string' || ma.length < 16) return false;
  const b = bam_(ma); return b === t.h || (t.ph || []).some(function (x) { return x.h === b; });
}
function vaiCua_(ma, id) { return laHLV_(ma) ? 'hlv' : laHocVien_(ma, id) ? 'hv' : null; }
/** HLV truy cập mọi học viên; học viên chỉ truy cập dữ liệu của mình. */
function canQuyen_(q) { if (!laHLV_(q.ma) && !laHocVien_(q.ma, q.id)) throw new Error('Mã liên kết không đúng hoặc đã bị thu hồi'); if (!timTV_(q.id)) throw new Error('Không có học viên này'); }
/** Ảnh dùng chung: chỉ cần là HLV hoặc một học viên hợp lệ. */
function canAi_(q) { if (!laHLV_(q.ma) && !laHocVien_(q.ma, q.id)) throw new Error('Mã liên kết không đúng hoặc đã bị thu hồi'); }

/* ================= HỌC VIÊN ================= */

function docDs_() { return docJson_(thuMucGoc_(), 'thanh-vien.json') || { v: PHIEN_BAN, ds: [] }; }
function ghiDs_(d) { ghiJson_(thuMucGoc_(), 'thanh-vien.json', d); }

function themThanhVien_(ten, u, mk) {
  ten = String(ten || '').trim().slice(0, 40); if (!ten) throw new Error('Thiếu tên học viên');
  const coTk = u != null && String(u).trim() !== '';
  if (coTk) { u = chuanTen_(u); kiemMk_(mk); }
  return voiKhoa_(function () {
    const d = docDs_(), id = 'hv' + Date.now().toString(36) + taoMa_(4).toLowerCase(), ma = taoMa_(24);
    const t = { id: id, ten: ten, h: bam_(ma), at: Date.now(), tat: false };
    if (coTk) { tenTrung_(d, u, null); ganMk_(t, mk); t.u = u; }
    d.ds.push(t); ghiDs_(d); thuMucCon_(thuMucCon_(thuMucGoc_(), 'hoc-vien'), id);
    return { ok: true, id: id, ma: ma, ten: ten, u: t.u || '' };
  });
}

/* ================= TÀI KHOẢN (PA-21) ================= */

/** Tên đăng nhập: chữ thường không dấu, số, dấu chấm / gạch; 3–30 ký tự. */
function chuanTen_(u) {
  u = String(u || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(u)) throw new Error('Tên đăng nhập 3–30 ký tự, chỉ gồm chữ không dấu, số, dấu chấm hoặc gạch');
  return u;
}
function kiemMk_(mk) { mk = String(mk == null ? '' : mk); if (mk.length < 6 || mk.length > 100) throw new Error('Mật khẩu cần ít nhất 6 ký tự'); return mk; }
/** Băm mật khẩu có muối, lặp nhiều vòng để khó dò ngược. */
function bamMk_(muoi, mk) { let x = muoi + ':' + mk; for (let i = 0; i < 300; i++) x = bam_(muoi + x); return x; }
function ganMk_(o, mk) { o.s = taoMa_(16); o.p = bamMk_(o.s, kiemMk_(mk)); o.ph = []; }
function dungMk_(o, mk) { return !!o && !!o.p && typeof mk === 'string' && bamMk_(o.s, mk) === o.p; }
/** Cấp phiên mới cho 1 máy, giữ tối đa PHIEN_TOI_DA phiên gần nhất. */
function capPhien_(o) { const ma = taoMa_(40); o.ph = (o.ph || []).concat([{ h: bam_(ma), at: Date.now() }]).slice(-PHIEN_TOI_DA); return ma; }
function tenTrung_(d, u, boQuaId) {
  const h = docTkHLV_(); if (h && h.u === u) throw new Error('Tên đăng nhập đã có người dùng');
  if (d.ds.some(function (x) { return x.u === u && x.id !== boQuaId; })) throw new Error('Tên đăng nhập đã có người dùng');
}
function docTkHLV_() { const s = PropertiesService.getScriptProperties().getProperty('HLV_TK'); return s ? JSON.parse(s) : null; }
function ghiTkHLV_(o) { PropertiesService.getScriptProperties().setProperty('HLV_TK', JSON.stringify(o)); }
function docPhienHLV_() { const o = docTkHLV_(); return o && o.ph || []; }

/** HLV tạo tài khoản lần đầu (bằng MÃ HLV) hoặc đổi tên đăng nhập / mật khẩu. Các máy HLV khác phải đăng nhập lại. */
function taoTkHLV_(u, mk, ten) {
  u = chuanTen_(u); kiemMk_(mk);
  return voiKhoa_(function () {
    tenTrung_(docDs_(), u, null);
    const o = { u: u, ten: String(ten || '').trim().slice(0, 30) || 'HLV' }; ganMk_(o, mk);
    const ma = capPhien_(o); ghiTkHLV_(o);
    return { ok: true, vai: 'hlv', u: u, ten: o.ten, ma: ma };
  });
}

/** HLV đặt (hoặc đặt lại) tên đăng nhập + mật khẩu cho học viên. Máy học viên đang đăng nhập sẽ phải đăng nhập lại. */
function datTkThanhVien_(id, u, mk) {
  u = chuanTen_(u); kiemMk_(mk);
  return voiKhoa_(function () {
    const d = docDs_(), t = d.ds.find(function (x) { return x.id === id; }); if (!t) throw new Error('Không có học viên này');
    tenTrung_(d, u, id); t.u = u; ganMk_(t, mk); ghiDs_(d); xoaSai_(u);
    return { ok: true, id: id, u: u, ten: t.ten };
  });
}

function dangNhap_(u, mk) {
  u = String(u || '').trim().toLowerCase(); mk = String(mk == null ? '' : mk);
  if (!u || !mk) throw new Error('Nhập tên đăng nhập và mật khẩu');
  return voiKhoa_(function () {
    if (biKhoa_(u)) throw new Error('Sai quá nhiều lần, thử lại sau ' + KHOA_PHUT + ' phút');
    const h = docTkHLV_();
    if (h && h.u === u && dungMk_(h, mk)) { const ma = capPhien_(h); ghiTkHLV_(h); xoaSai_(u); return { ok: true, vai: 'hlv', u: u, ten: h.ten, ma: ma }; }
    const d = docDs_(), t = d.ds.find(function (x) { return x.u === u; });
    if (t && dungMk_(t, mk)) {
      if (t.tat) throw new Error('Tài khoản này đang bị HLV khoá');
      const ma = capPhien_(t); ghiDs_(d); xoaSai_(u);
      return { ok: true, vai: 'hv', u: u, id: t.id, ten: t.ten, ma: ma, hlv: h ? h.ten : '' };
    }
    ghiSai_(u); throw new Error('Sai tên đăng nhập hoặc mật khẩu');
  });
}

/** Đăng xuất máy này: xoá phiên. */
function dangXuat_(ma, id) {
  if (typeof ma !== 'string' || !ma) return { ok: true };
  const b = bam_(ma);
  return voiKhoa_(function () {
    const h = docTkHLV_(); if (h && (h.ph || []).some(function (x) { return x.h === b; })) { h.ph = h.ph.filter(function (x) { return x.h !== b; }); ghiTkHLV_(h); return { ok: true }; }
    const d = docDs_(), t = d.ds.find(function (x) { return x.id === id; });
    if (t && (t.ph || []).some(function (x) { return x.h === b; })) { t.ph = t.ph.filter(function (x) { return x.h !== b; }); ghiDs_(d); }
    return { ok: true };
  });
}

/** Tự đổi mật khẩu (HLV hoặc học viên): cần mật khẩu cũ. Các máy khác phải đăng nhập lại, máy này nhận phiên mới. */
function doiMatKhau_(ma, id, mkCu, mkMoi) {
  kiemMk_(mkMoi); if (typeof ma !== 'string' || ma.length < 16) throw new Error('Chưa đăng nhập');
  const b = bam_(ma);
  return voiKhoa_(function () {
    const h = docTkHLV_();
    if (h && (h.ph || []).some(function (x) { return x.h === b; })) {
      if (!dungMk_(h, String(mkCu || ''))) throw new Error('Mật khẩu hiện tại không đúng');
      ganMk_(h, mkMoi); const m = capPhien_(h); ghiTkHLV_(h); return { ok: true, ma: m };
    }
    const d = docDs_(), t = d.ds.find(function (x) { return x.id === id; });
    if (!t || t.tat || !(t.ph || []).some(function (x) { return x.h === b; })) throw new Error('Phiên đăng nhập đã hết hạn, hãy đăng nhập lại');
    if (!dungMk_(t, String(mkCu || ''))) throw new Error('Mật khẩu hiện tại không đúng');
    ganMk_(t, mkMoi); const m = capPhien_(t); ghiDs_(d); return { ok: true, ma: m };
  });
}

/* chặn dò mật khẩu: đếm lần sai theo tên đăng nhập */
function docSai_() { const s = PropertiesService.getScriptProperties().getProperty('SAI'); try { return s ? JSON.parse(s) : {}; } catch (e) { return {}; } }
function biKhoa_(u) { const x = docSai_()[u]; return !!x && x.n >= SAI_TOI_DA && Date.now() - x.t < KHOA_PHUT * 6e4; }
function ghiSai_(u) {
  const S = docSai_(), x = S[u] && Date.now() - S[u].t < KHOA_PHUT * 6e4 ? S[u] : { n: 0 };
  S[u] = { n: x.n + 1, t: Date.now() };
  const ks = Object.keys(S); if (ks.length > 200) ks.sort(function (a, b) { return S[a].t - S[b].t; }).slice(0, ks.length - 200).forEach(function (k) { delete S[k]; });
  PropertiesService.getScriptProperties().setProperty('SAI', JSON.stringify(S));
}
function xoaSai_(u) { const S = docSai_(); if (S[u]) { delete S[u]; PropertiesService.getScriptProperties().setProperty('SAI', JSON.stringify(S)); } }

/** gon = true: chỉ trả tên / tài khoản, không đọc file dữ liệu từng người (nhanh hơn). */
function dsThanhVien_(gon) {
  const hv = thuMucCon_(thuMucGoc_(), 'hoc-vien');
  return docDs_().ds.map(function (t) {
    if (gon) return { id: t.id, ten: t.ten, u: t.u || '', at: t.at, tat: !!t.tat };
    const f = thuMucCon_(hv, t.id), a = docJson_(f, 'hv.json'), b = docJson_(f, 'hlv.json');
    return { id: t.id, ten: t.ten, u: t.u || '', at: t.at, tat: !!t.tat, hv: a ? { rev: a.rev, at: a.at } : null, hlv: b ? { rev: b.rev, at: b.at } : null };
  });
}

function doiMaThanhVien_(id) {
  return voiKhoa_(function () {
    const d = docDs_(), t = d.ds.find(function (x) { return x.id === id; }); if (!t) throw new Error('Không có học viên này');
    const ma = taoMa_(24); t.h = bam_(ma); t.tat = false; ghiDs_(d);
    return { ok: true, id: id, ma: ma, ten: t.ten };
  });
}

function batTatThanhVien_(id, bat) {
  return voiKhoa_(function () {
    const d = docDs_(), t = d.ds.find(function (x) { return x.id === id; }); if (!t) throw new Error('Không có học viên này');
    t.tat = !bat; ghiDs_(d); return { ok: true, id: id, tat: t.tat };
  });
}

/* ================= DỮ LIỆU ================= */

/** Tải cả 2 phía: hv (máy học viên gửi lên) và hlv (máy HLV gửi xuống).
 *  biet = { hv: rev, hlv: rev } máy đã có: phía nào chưa mới hơn thì chỉ trả số phiên bản, không trả dữ liệu (đỡ tốn mạng). */
function keo_(id, biet) {
  const f = thuMucCon_(thuMucCon_(thuMucGoc_(), 'hoc-vien'), id), b = biet || {};
  const gon = function (x, r) { return x && r != null && x.rev <= Number(r) ? { rev: x.rev, at: x.at } : x; };
  return { ok: true, hv: gon(docJson_(f, 'hv.json'), b.hv), hlv: gon(docJson_(f, 'hlv.json'), b.hlv) };
}

/**
 * Gửi dữ liệu 1 phía. Máy học viên chỉ ghi được phía 'hv', máy HLV ghi được phía 'hlv'.
 * rev: số phiên bản máy đang giữ; nếu trên Drive đã mới hơn (máy khác vừa gửi) → báo xung đột để app tải về gộp rồi gửi lại.
 */
function day_(q, hlv) {
  const vai = q.vai === 'hlv' ? 'hlv' : 'hv';
  if (vai === 'hlv' && !hlv) throw new Error('Chỉ máy HLV được gửi giáo án xuống');
  if (vai === 'hv' && hlv && q.thay !== true) throw new Error('Máy HLV không ghi đè dữ liệu phía học viên');
  const s = JSON.stringify(q.goi == null ? null : q.goi); if (s.length > GOI_TOI_DA) throw new Error('Dữ liệu quá lớn');
  return voiKhoa_(function () {
    const f = thuMucCon_(thuMucCon_(thuMucGoc_(), 'hoc-vien'), q.id), ten = vai + '.json', cu = docJson_(f, ten), rev = cu ? cu.rev : 0;
    if (q.rev != null && Number(q.rev) !== rev) return { ok: false, xungDot: true, rev: rev };
    const moi = { rev: rev + 1, at: Date.now(), goi: q.goi };
    ghiJson_(f, ten, moi);
    return { ok: true, rev: moi.rev, at: moi.at };
  });
}

/* ================= ẢNH MÁY TẬP ================= */

const reMaAnh_ = /^[A-Za-z0-9_-]{4,64}$/;
function anhCo_(ds) {
  const fo = thuMucCon_(thuMucGoc_(), 'anh');
  const thieu = (Array.isArray(ds) ? ds : []).slice(0, 500).filter(function (h) { return reMaAnh_.test(h) && !fo.getFilesByName(h).hasNext(); });
  return { ok: true, thieu: thieu };
}
function anhDay_(anh) {
  const fo = thuMucCon_(thuMucGoc_(), 'anh'); let n = 0;
  Object.keys(anh || {}).slice(0, 100).forEach(function (h) {
    const v = String(anh[h] || ''), m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(v);
    if (!reMaAnh_.test(h) || !m || m[2].length > ANH_TOI_DA * 1.37 || fo.getFilesByName(h).hasNext()) return;
    fo.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], h)); n++;
  });
  return { ok: true, n: n };
}
function anhLay_(ds) {
  const fo = thuMucCon_(thuMucGoc_(), 'anh'), out = {}, con = []; let tong = 0;
  (Array.isArray(ds) ? ds : []).slice(0, 300).forEach(function (h) {
    if (!reMaAnh_.test(h)) return; const it = fo.getFilesByName(h); if (!it.hasNext()) return;
    if (tong > ANH_TRA_TOI_DA) { con.push(h); return; }
    const b = it.next().getBlob(), v = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
    tong += v.length; out[h] = v;
  });
  return { ok: true, anh: out, con: con };
}

/* ================= SAO LƯU TỰ ĐỘNG ================= */

function taoLichSaoLuu_() {
  const co = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'saoLuuHangNgay'; });
  if (!co) ScriptApp.newTrigger('saoLuuHangNgay').timeBased().everyDays(1).atHour(3).create();
}

/** Chạy tự động mỗi đêm khoảng 3 giờ: chép dữ liệu học viên sang sao-luu/<ngày>, xoá bản cũ hơn 14 ngày. */
function saoLuuHangNgay() {
  const root = thuMucGoc_(), sl = thuMucCon_(root, 'sao-luu'), hv = thuMucCon_(root, 'hoc-vien');
  const ngay = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'), dich = thuMucCon_(sl, ngay);
  const ds = root.getFilesByName('thanh-vien.json'); if (ds.hasNext()) ds.next().makeCopy('thanh-vien.json', dich);
  const it = hv.getFolders();
  while (it.hasNext()) {
    const f = it.next(), fs = f.getFiles();
    while (fs.hasNext()) { const x = fs.next(); x.makeCopy(f.getName() + '-' + x.getName(), dich); }
  }
  const han = Date.now() - GIU_SAO_LUU_NGAY * 864e5, cu = sl.getFolders();
  while (cu.hasNext()) { const f = cu.next(), t = Date.parse(f.getName()); if (t && t < han) f.setTrashed(true); }
}

/* ================= TIỆN ÍCH ================= */

function thuMucGoc_() {
  const p = PropertiesService.getScriptProperties(), id = p.getProperty('THU_MUC_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* thư mục đã bị xoá: tìm lại theo tên */ } }
  const it = DriveApp.getFoldersByName(TEN_THU_MUC);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(TEN_THU_MUC);
  p.setProperty('THU_MUC_ID', f.getId());
  return f;
}
function thuMucCon_(cha, ten) { const it = cha.getFoldersByName(ten); return it.hasNext() ? it.next() : cha.createFolder(ten); }
function docJson_(fo, ten) { const it = fo.getFilesByName(ten); if (!it.hasNext()) return null; try { return JSON.parse(it.next().getBlob().getDataAsString('UTF-8')); } catch (e) { return null; } }
function ghiJson_(fo, ten, obj) {
  const s = JSON.stringify(obj), it = fo.getFilesByName(ten);
  if (it.hasNext()) it.next().setContent(s); else fo.createFile(ten, s, 'application/json');
}
function voiKhoa_(fn) { const k = LockService.getScriptLock(); k.waitLock(25000); try { return fn(); } finally { k.releaseLock(); } }
function bam_(s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function taoMa_(n) { let s = ''; while (s.length < n) s += Utilities.getUuid().replace(/-/g, ''); return s.slice(0, n); }
function traVe_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
