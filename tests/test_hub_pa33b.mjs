// PA-33b: máy chủ đồng bộ — passkey (WebAuthn) và ảnh máy tập (/s/anh/*), chạy đúng push-server/src/index.js
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { Hub } from '../push-server/src/index.js';

const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const b64u = b => Buffer.from(b).toString('base64url');
const unb = s => new Uint8Array(Buffer.from(s, 'base64url'));
const rnd = n => b64u(crypto.randomBytes(n));
const shaFull = s => b64u(crypto.createHash('sha256').update(s).digest());
const RP_ORIGIN = 'https://gym.fiddle.vn', RP_ID = 'gym.fiddle.vn';

// ---------- DO giả: KV + SQL (node:sqlite) ----------
const db = new DatabaseSync(':memory:');
const mem = new Map();
const storage = {
  get: async k => mem.get(k), put: async (k, v) => { mem.set(k, structuredClone(v)); },
  delete: async k => { for (const x of [].concat(k)) mem.delete(x); return 1; },
  list: async ({ prefix = '', limit } = {}) => { const m = new Map([...mem].filter(([k]) => k.startsWith(prefix))); return limit ? new Map([...m].slice(0, limit)) : m; },
  setAlarm: async () => {}, deleteAlarm: async () => {},
  sql: {
    exec(q, ...b) {
      const st = db.prepare(q);
      const rows = /^\s*(select|with)/i.test(q) ? st.all(...b) : (st.run(...b), []);
      return { toArray: () => rows, one: () => rows[0] };
    }
  }
};
const HK = rnd(32);
const mk = (extra = {}) => new Hub({ storage, blockConcurrencyWhile: f => f() }, { HLV_HASH: shaFull(HK), ...extra });
let hub = mk();
const sent = []; globalThis.fetch = async (url) => { sent.push(url); return new Response(null, { status: 201 }); };

const call = async (h, path, body, auth, method = 'POST', raw) => {
  const headers = { ...(auth ? { Authorization: auth } : {}) };
  let payload;
  if (raw) { payload = raw; headers['Content-Type'] = 'application/octet-stream'; }
  else if (method !== 'GET') { payload = JSON.stringify(body || {}); headers['Content-Type'] = 'application/json'; }
  const r = await h.fetch(new Request('https://x' + path, { method, headers, body: method === 'GET' ? undefined : payload }));
  const ct = r.headers.get('Content-Type') || '';
  return { s: r.status, j: ct.includes('json') ? await r.json() : null, bin: ct.includes('json') ? null : new Uint8Array(await r.arrayBuffer()) };
};
const H = 'Bearer h.' + HK;
const V = (hv, dk) => `Bearer v.${hv}.${dk}`;

// ---------- chuẩn bị: một HLV, một học viên, một máy ----------
const kLan = rnd(24);
await call(hub, '/s/tv/them', { id: 'lan-7k3f', ten: 'Lan', kieu: 'hv', skh: shaFull(kLan) }, H);
const dk = (await call(hub, '/s/noi', { i: 'lan-7k3f', k: kLan, tb: 'iPhone Lan' })).j.dk;
const VL = V('lan-7k3f', dk);

// =====================================================================
// A. Passkey (WebAuthn)
// =====================================================================
// khoá giả lập đúng như Secure Enclave: P-256, ký ECDSA SHA-256
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const spki = b64u(new Uint8Array(await crypto.subtle.exportKey('spki', kp.publicKey)));
const CRED = rnd(32);

// chữ ký WebAuthn là DER; WebCrypto trả dạng r||s, nên test đổi sang DER như trình duyệt
const toDer = raw => {
  const enc = n => { let b = [...n]; while (b.length > 1 && b[0] === 0) b.shift(); if (b[0] & 0x80) b.unshift(0); return [0x02, b.length, ...b]; };
  const r = enc(raw.slice(0, 32)), s = enc(raw.slice(32));
  return new Uint8Array([0x30, r.length + s.length, ...r, ...s]);
};
const clientData = (type, chal, origin = RP_ORIGIN) => b64u(new TextEncoder().encode(JSON.stringify({ type, challenge: chal, origin, crossOrigin: false })));
const authData = (flags = 0x05, rpId = RP_ID) => {
  const ad = new Uint8Array(37); ad.set(crypto.createHash('sha256').update(rpId).digest(), 0); ad[32] = flags; return ad;
};
const signAssert = async (ad, cdj, priv = kp.privateKey) => {
  const h = new Uint8Array(crypto.createHash('sha256').update(unb(cdj)).digest());
  const data = new Uint8Array([...ad, ...h]);
  return toDer(new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, priv, data)));
};

const th1 = await call(hub, '/s/pk/thach', {});
ok(th1.s === 200 && typeof th1.j.chal === 'string' && th1.j.chal.length >= 40, 'Passkey: lấy thách thức (không cần đăng nhập)');
const dky = await call(hub, '/s/pk/dky', { cred: CRED, pub: spki, cdj: clientData('webauthn.create', th1.j.chal), chal: th1.j.chal }, VL);
ok(dky.s === 200 && dky.j.ok, 'Passkey: đăng ký khoá máy (máy học viên đã nối)');
ok((await call(hub, '/s/pk/dky', { cred: rnd(32), pub: spki, cdj: clientData('webauthn.create', th1.j.chal), chal: th1.j.chal }, VL)).s === 400, 'Passkey: thách thức đã dùng thì không đăng ký lại');
const th2 = await call(hub, '/s/pk/thach', {});
ok((await call(hub, '/s/pk/dky', { cred: rnd(32), pub: spki, cdj: clientData('webauthn.get', th2.j.chal), chal: th2.j.chal }, VL)).s === 400, 'Passkey: đăng ký bằng dữ liệu kiểu "get" bị từ chối');
ok((await call(hub, '/s/pk/dky', { cred: rnd(32), pub: spki, cdj: clientData('webauthn.create', th2.j.chal), chal: th2.j.chal }, null)).s === 401, 'Passkey: đăng ký cần máy đã nối (401 nếu không có)');

// khôi phục trên máy trống: không có khoá máy, chỉ có chữ ký passkey
const th3 = await call(hub, '/s/pk/thach', {});
const ad = authData(0x05);
const sig = await signAssert(ad, clientData('webauthn.get', th3.j.chal));
const vao = await call(hub, '/s/pk/vao', { cred: CRED, ad: b64u(ad), cdj: clientData('webauthn.get', th3.j.chal), sig: b64u(sig), chal: th3.j.chal });
ok(vao.s === 200 && vao.j.id === 'lan-7k3f' && vao.j.ten === 'Lan' && vao.j.dk, 'Khôi phục bằng passkey: máy trống lấy lại đúng học viên và nhận khoá máy mới');
ok((await call(hub, '/s/doi?hv=lan-7k3f&since=0', null, V('lan-7k3f', vao.j.dk), 'GET')).s === 200, 'Khôi phục bằng passkey: máy mới đọc được dữ liệu ngay');

// các trường hợp từ chối
const th4 = await call(hub, '/s/pk/thach', {});
const ad4 = authData(0x05), sig4 = await signAssert(ad4, clientData('webauthn.get', th4.j.chal));
const cdjBad = clientData('webauthn.get', th4.j.chal, 'https://evil.example');
ok((await call(hub, '/s/pk/vao', { cred: CRED, ad: b64u(ad4), cdj: cdjBad, sig: b64u(sig4), chal: th4.j.chal })).s === 403, 'Passkey: sai origin → 403');
const th5 = await call(hub, '/s/pk/thach', {});
const sigSai = await signAssert(authData(0x05), clientData('webauthn.get', th5.j.chal), (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])).privateKey);
ok((await call(hub, '/s/pk/vao', { cred: CRED, ad: b64u(authData(0x05)), cdj: clientData('webauthn.get', th5.j.chal), sig: b64u(sigSai), chal: th5.j.chal })).s === 403, 'Passkey: chữ ký của khoá khác → 403');
const th6 = await call(hub, '/s/pk/thach', {});
ok((await call(hub, '/s/pk/vao', { cred: CRED, ad: b64u(authData(0x01)), cdj: clientData('webauthn.get', th6.j.chal), sig: b64u(await signAssert(authData(0x01), clientData('webauthn.get', th6.j.chal))), chal: th6.j.chal })).s === 403, 'Passkey: không xác minh được người dùng (không có cờ UV) → 403');
const th7 = await call(hub, '/s/pk/thach', {});
ok((await call(hub, '/s/pk/vao', { cred: CRED, ad: b64u(authData(0x05, 'evil.example')), cdj: clientData('webauthn.get', th7.j.chal), sig: b64u(await signAssert(authData(0x05, 'evil.example'), clientData('webauthn.get', th7.j.chal))), chal: th7.j.chal })).s === 403, 'Passkey: sai miền (rpId) → 403');
ok((await call(hub, '/s/pk/vao', { cred: CRED, ad: b64u(ad), cdj: clientData('webauthn.get', th3.j.chal), sig: b64u(sig), chal: th3.j.chal })).s === 400, 'Passkey: thách thức dùng lại (replay) → 400');
ok((await call(hub, '/s/pk/vao', { cred: rnd(32), ad: b64u(ad4), cdj: clientData('webauthn.get', th4.j.chal), sig: b64u(sig4), chal: th4.j.chal })).s === 400, 'Passkey: mã khoá không tồn tại (thách thức đã dùng) → 400, không lộ thông tin');
const th8 = await call(hub, '/s/pk/thach', {});
ok((await call(hub, '/s/pk/vao', { cred: rnd(32), ad: b64u(authData(0x05)), cdj: clientData('webauthn.get', th8.j.chal), sig: b64u(await signAssert(authData(0x05), clientData('webauthn.get', th8.j.chal))), chal: th8.j.chal })).s === 403, 'Passkey: mã khoá không có trên máy chủ → 403');

// thách thức hết hạn
const th9 = await call(hub, '/s/pk/thach', {});
sql(`UPDATE chal SET exp = 0 WHERE c = '${th9.j.chal}'`);
ok((await call(hub, '/s/pk/vao', { cred: CRED, ad: b64u(authData(0x05)), cdj: clientData('webauthn.get', th9.j.chal), sig: b64u(await signAssert(authData(0x05), clientData('webauthn.get', th9.j.chal))), chal: th9.j.chal })).s === 400, 'Passkey: thách thức hết hạn → 400');

// khoá máy bị khoá học viên → không khôi phục được
await call(hub, '/s/tv/khoa', { id: 'lan-7k3f', khoa: true }, H);
const th10 = await call(hub, '/s/pk/thach', {});
ok((await call(hub, '/s/pk/vao', { cred: CRED, ad: b64u(authData(0x05)), cdj: clientData('webauthn.get', th10.j.chal), sig: b64u(await signAssert(authData(0x05), clientData('webauthn.get', th10.j.chal))), chal: th10.j.chal })).s === 403, 'Passkey: học viên bị khoá thì không khôi phục được → 403');
await call(hub, '/s/tv/khoa', { id: 'lan-7k3f', khoa: false }, H);

function sql(q) { db.prepare(q).run(); }

// =====================================================================
// B. Ảnh máy tập
// =====================================================================
const IMG = new Uint8Array(1000).map((_, i) => i % 251);
const hA = 'IMGabcd1', hB = 'IMGzzzz9';
const up = await call(hub, `/s/anh/${hA}?hv=lan-7k3f`, null, VL, 'PUT', IMG);
ok(up.s === 200 && up.j.ok, 'Ảnh: học viên đẩy ảnh máy tập của mình');
ok((await call(hub, `/s/anh/${hA}?hv=lan-7k3f`, null, VL, 'PUT', IMG)).s === 200, 'Ảnh: đẩy lại cùng ảnh không lỗi (ghi đè, idempotent)');
const co = await call(hub, '/s/anh/co', { hv: 'lan-7k3f', hs: [hA, hB] }, VL);
ok(co.s === 200 && JSON.stringify(co.j.thieu) === JSON.stringify([hB]), 'Ảnh: hỏi trước — chỉ đẩy ảnh máy chủ chưa có');
const get = await call(hub, `/s/anh/${hA}?hv=lan-7k3f`, null, VL, 'GET');
ok(get.s === 200 && get.bin.length === IMG.length && get.bin.every((x, i) => x === IMG[i]), 'Ảnh: tải về đúng từng byte');
ok((await call(hub, `/s/anh/${hA}?hv=lan-7k3f`, null, H, 'GET')).s === 200, 'Ảnh: HLV đọc được ảnh của học viên');
ok((await call(hub, `/s/anh/${hA}?hv=minh-1a2b`, null, VL, 'PUT', IMG)).s === 403, 'Ảnh: học viên ghi sang hồ sơ người khác → 403');
ok((await call(hub, `/s/anh/${hA}?hv=lan-7k3f`, null, null, 'GET')).s === 401, 'Ảnh: không có khoá → 401');
ok((await call(hub, '/s/anh/a.b?hv=lan-7k3f', null, VL, 'PUT', IMG)).s === 400, 'Ảnh: tên ảnh sai định dạng (có dấu chấm) → 400');
ok((await call(hub, `/s/anh/IMGbig999?hv=lan-7k3f`, null, VL, 'PUT', new Uint8Array(1200001))).s === 413, 'Ảnh: quá 1,2 MB → 413');
ok((await call(hub, `/s/anh/IMGnone1?hv=lan-7k3f`, null, VL, 'GET')).s === 404, 'Ảnh: ảnh không tồn tại → 404');
ok((await call(hub, `/s/anh/${hA}?hv=lan-7k3f`, null, VL, 'PUT', new Uint8Array(0))).s === 400, 'Ảnh: ảnh rỗng → 400');

// hạn mức: tách học viên Minh để không lẫn với ảnh đã đẩy ở trên
const kMinh = rnd(24);
await call(hub, '/s/tv/them', { id: 'minh-1a2b', ten: 'Minh', kieu: 'hv', skh: shaFull(kMinh) }, H);
const VM = V('minh-1a2b', (await call(hub, '/s/noi', { i: 'minh-1a2b', k: kMinh, tb: 'Android Minh' })).j.dk);

// hạn mức theo học viên (máy chủ nhỏ dùng chung dữ liệu): Minh có tối đa 3000 byte ảnh
const small = mk({ IMG_QUOTA_HV: '3000' });
ok((await call(small, '/s/anh/IMGq0001?hv=minh-1a2b', null, VM, 'PUT', new Uint8Array(1000))).s === 200, 'Hạn mức: ảnh 1 của Minh (1000/3000)');
ok((await call(small, '/s/anh/IMGq0002?hv=minh-1a2b', null, VM, 'PUT', new Uint8Array(1000))).s === 200, 'Hạn mức: ảnh 2 của Minh (2000/3000)');
ok((await call(small, '/s/anh/IMGq0003?hv=minh-1a2b', null, VM, 'PUT', new Uint8Array(1000))).s === 200, 'Hạn mức: ảnh 3 của Minh (3000/3000)');
ok((await call(small, '/s/anh/IMGq0004?hv=minh-1a2b', null, VM, 'PUT', new Uint8Array(1))).s === 507, 'Hạn mức: vượt 3000 byte → 507 Insufficient Storage');
ok((await call(small, '/s/ghi', { hv: 'minh-1a2b', recs: [{ k: 'buoi:van-nhan', id: 'van-nhan', t: 1, d: '{}' }] }, VM)).j.ok, 'Hạn mức: ảnh đầy vẫn nhận chữ');
ok((await call(small, '/s/anh/IMGq0001?hv=minh-1a2b', null, VM, 'PUT', new Uint8Array(400))).s === 200, 'Hạn mức: thay ảnh cùng tên bằng ảnh nhỏ hơn (tính lại, không cộng dồn)');

// hạn mức toàn phòng: máy chủ đã có 3000 byte của Minh + 1000 của Lan
const roomCap = mk({ IMG_QUOTA_ROOM: '3500', IMG_QUOTA_HV: '999999' });
ok((await call(roomCap, '/s/anh/IMGroom01?hv=lan-7k3f', null, VL, 'PUT', new Uint8Array(1000))).s === 507, 'Hạn mức phòng: toàn phòng quá 3500 byte → 507');
