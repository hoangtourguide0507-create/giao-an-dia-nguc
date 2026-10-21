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
const PHIEN_BAN = 2;
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
  if (a === 'ping') return { ok: true, v: PHIEN_BAN, vai: vaiCua_(q.ma, q.id) };
  const hlv = laHLV_(q.ma);
  switch (a) {
    /* ---- việc của HLV ---- */
    case 'tv.them': canHLV_(hlv); return themThanhVien_(q.ten);
    case 'tv.ds': canHLV_(hlv); return { ok: true, ds: dsThanhVien_() };
    case 'tv.doima': canHLV_(hlv); return doiMaThanhVien_(q.id);
    case 'tv.tat': canHLV_(hlv); return batTatThanhVien_(q.id, false);
    case 'tv.bat': canHLV_(hlv); return batTatThanhVien_(q.id, true);
    /* ---- việc của HLV hoặc chính học viên đó ---- */
    case 'keo': canQuyen_(q); return keo_(q.id, q.biet);
    case 'day': canQuyen_(q); return day_(q, hlv);
    case 'anh.co': canAi_(q); return anhCo_(q.ds);
    case 'anh.day': canAi_(q); return anhDay_(q.anh);
    case 'anh.lay': canAi_(q); return anhLay_(q.ds);
  }
  return { ok: false, loi: 'Việc không hợp lệ: ' + a };
}

/* ================= QUYỀN ================= */

function laHLV_(ma) { const m = PropertiesService.getScriptProperties().getProperty('MA_HLV'); return !!m && typeof ma === 'string' && ma === m; }
function canHLV_(hlv) { if (!hlv) throw new Error('Cần mã HLV'); }
function timTV_(id) { return docDs_().ds.find(function (x) { return x.id === id; }) || null; }
function laHocVien_(ma, id) { const t = timTV_(String(id || '')); return !!t && !t.tat && typeof ma === 'string' && bam_(ma) === t.h; }
function vaiCua_(ma, id) { return laHLV_(ma) ? 'hlv' : laHocVien_(ma, id) ? 'hv' : null; }
/** HLV truy cập mọi học viên; học viên chỉ truy cập dữ liệu của mình. */
function canQuyen_(q) { if (!laHLV_(q.ma) && !laHocVien_(q.ma, q.id)) throw new Error('Mã liên kết không đúng hoặc đã bị thu hồi'); if (!timTV_(q.id)) throw new Error('Không có học viên này'); }
/** Ảnh dùng chung: chỉ cần là HLV hoặc một học viên hợp lệ. */
function canAi_(q) { if (!laHLV_(q.ma) && !laHocVien_(q.ma, q.id)) throw new Error('Mã liên kết không đúng hoặc đã bị thu hồi'); }

/* ================= HỌC VIÊN ================= */

function docDs_() { return docJson_(thuMucGoc_(), 'thanh-vien.json') || { v: PHIEN_BAN, ds: [] }; }
function ghiDs_(d) { ghiJson_(thuMucGoc_(), 'thanh-vien.json', d); }

function themThanhVien_(ten) {
  ten = String(ten || '').trim().slice(0, 40); if (!ten) throw new Error('Thiếu tên học viên');
  return voiKhoa_(function () {
    const d = docDs_(), id = 'hv' + Date.now().toString(36) + taoMa_(4).toLowerCase(), ma = taoMa_(24);
    d.ds.push({ id: id, ten: ten, h: bam_(ma), at: Date.now(), tat: false });
    ghiDs_(d); thuMucCon_(thuMucCon_(thuMucGoc_(), 'hoc-vien'), id);
    return { ok: true, id: id, ma: ma, ten: ten };
  });
}

function dsThanhVien_() {
  const hv = thuMucCon_(thuMucGoc_(), 'hoc-vien');
  return docDs_().ds.map(function (t) {
    const f = thuMucCon_(hv, t.id), a = docJson_(f, 'hv.json'), b = docJson_(f, 'hlv.json');
    return { id: t.id, ten: t.ten, at: t.at, tat: !!t.tat, hv: a ? { rev: a.rev, at: a.at } : null, hlv: b ? { rev: b.rev, at: b.at } : null };
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
