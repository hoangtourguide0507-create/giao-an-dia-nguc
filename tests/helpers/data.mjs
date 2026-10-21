// Dựng dữ liệu mẫu (giáo án, buổi tập, số đo) đúng định dạng app lưu trong IndexedDB.
export const TODAY = '2026-10-21'; /* Thứ Tư */
export const MONDAY = '2026-10-19';
export const at = (date, hm = '18:00') => new Date(`${date}T${hm}:00+07:00`).getTime();
export const addDays = (s, n) => { const d = new Date(`${s}T12:00:00+07:00`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

let seq = 0;
export const nid = p => `${p}${++seq}`;

export function ex(name, o = {}) {
  return { id: nid('e'), name, muscle: 'Ngực', zone: null, type: 'upper', sets: 3, repTarget: 10, repMin: 8, repMax: 12, dropSet: false, step: 2.5, rest: 0, restV: 2,
    setup: '', photos: [], currentKg: null, targetKg: null, kgSetAt: null, warmup: true, each: false, alts: [], slot: '', mainSince: '2026-10-01', gid: null, ...o };
}
export const day = (name, exercises, o = {}) => ({ id: nid('d'), name, exercises, ...o });

/* entries: [[ex, [[kg, reps, ef?], …], extra?]] */
export function session(d, date, entries, o = {}) {
  const start = o.startedAt || at(date);
  return { id: nid('s'), dayId: d ? d.id : 'custom', dayName: d ? d.name : 'Tự chọn', date, startedAt: start, finishedAt: start + 50 * 60000, deload: false, est: 3000,
    entries: entries.map(([x, sets, extra]) => ({ exId: x.id, name: x.name, muscle: x.muscle, note: '', each: !!x.each,
      sets: sets.map(([kg, reps, ef, dr]) => ({ kg, reps, ...(ef ? { ef } : {}), ...(dr ? { dr } : {}) })), drop: null, ...(extra || {}) })), ...o };
}

export function state(o = {}) {
  const { settings, ...rest } = o;
  return { v: 3, days: [], sessions: [], body: [], bodyPhotos: [], active: null, pains: [], weekPlans: {}, wpSkip: MONDAY, updatedAt: 1,
    settings: { name: '', cycleStart: null, sets3: 1, warmAll: 1, alertV17: 1, alertMethod: 'shortcut', ...(settings || {}) }, ...rest };
}

/* giáo án 2 ngày dùng chung cho nhiều test */
export function basicPlan() {
  const bench = ex('Đẩy ngực tạ đòn (Bench press)', { muscle: 'Ngực', zone: 'Ngực giữa', currentKg: 40 });
  const fly = ex('Ép ngực máy (Pec deck)', { muscle: 'Ngực', type: 'iso', step: 2.5, currentKg: 30 });
  const push = ex('Đẩy cáp tay sau (Triceps pushdown)', { muscle: 'Tay sau', type: 'iso', currentKg: 20 });
  const lat = ex('Kéo xô (Lat pulldown)', { muscle: 'Lưng', currentKg: 45 });
  const row = ex('Chèo cáp ngồi (Seated cable row)', { muscle: 'Lưng', currentKg: 40 });
  const curl = ex('Cuốn tạ đơn (Dumbbell curl)', { muscle: 'Tay trước', type: 'iso', step: 2, each: true, currentKg: 10 });
  const chest = day('Ngực + Tay sau', [bench, fly, push]);
  const back = day('Lưng + Tay trước', [lat, row, curl]);
  return { bench, fly, push, lat, row, curl, chest, back, days: [chest, back] };
}

/* ảnh JPEG 1×1 hợp lệ */
export const JPEG_B64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
export const PHOTO = 'data:image/jpeg;base64,' + JPEG_B64;

/* JPEG có EXIF ngày chụp (DateTimeOriginal), để thử chức năng tự đọc ngày ảnh body */
export function jpegWithExif(date /* 'YYYY:MM:DD HH:MM:SS' */, le = true) {
  const base = Buffer.from(JPEG_B64, 'base64');
  const u16 = v => { const b = Buffer.alloc(2); le ? b.writeUInt16LE(v) : b.writeUInt16BE(v); return b; };
  const u32 = v => { const b = Buffer.alloc(4); le ? b.writeUInt32LE(v) : b.writeUInt32BE(v); return b; };
  const str = Buffer.from(date + '\0', 'ascii');
  /* TIFF: header(8) · IFD0 tại 8 (2+12+4=18) · ExifIFD tại 26 (18) · chuỗi tại 44 */
  const tiff = Buffer.concat([Buffer.from(le ? 'II' : 'MM', 'ascii'), u16(42), u32(8),
    u16(1), u16(0x8769), u16(4), u32(1), u32(26), u32(0),
    u16(1), u16(0x9003), u16(2), u32(str.length), u32(44), u32(0), str]);
  const body = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
  const len = Buffer.alloc(2); len.writeUInt16BE(body.length + 2);
  return Buffer.concat([base.subarray(0, 2), Buffer.from([0xff, 0xe1]), len, body, base.subarray(2)]);
}

export const b64u = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
/* mã giáo án kiểu cũ SOTA1 (không nén) — app vẫn phải đọc được */
export const sota1 = data => 'SOTA1.' + b64u(JSON.stringify(data));
