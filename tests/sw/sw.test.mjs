// BR-19 Chạy offline (service worker sw.js): lưu vỏ app, mở trang khi mất mạng, cache font, thông báo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../../sw.js', import.meta.url));
const SRC = readFileSync(FILE, 'utf8');
const CACHE = SRC.match(/const CACHE = '([^']+)'/)[1];

/* dựng môi trường service worker giả: self, caches, fetch, clients */
function boot({ online = true, failAdd = [], cached = {}, otherCaches = [], clients = [] } = {}) {
  const H = {}, stores = { [CACHE]: new Map(Object.entries(cached)) }, log = [];
  for (const k of otherCaches) stores[k] = new Map();
  const keyOf = r => typeof r === 'string' ? new URL(r, 'https://app.test/').href : r.url;
  const cacheObj = name => { stores[name] = stores[name] || new Map(); const m = stores[name]; return {
    add: async u => { if (failAdd.includes(u)) throw new Error('404'); m.set(keyOf(u), { body: 'net:' + u }); },
    put: async (r, res) => { m.set(keyOf(r), res); log.push('put ' + keyOf(r)); },
    match: async r => m.get(keyOf(r)) } };
  const ctx = {
    location: { origin: 'https://app.test' }, URL,
    caches: { open: async n => cacheObj(n), keys: async () => Object.keys(stores), delete: async k => { log.push('delete ' + k); return delete stores[k]; },
      match: async r => { for (const m of Object.values(stores)) { const v = m.get(keyOf(r)); if (v) return v; } } },
    fetch: async r => { log.push('fetch ' + keyOf(r)); if (!online) throw new Error('offline'); return { body: 'net:' + keyOf(r), clone() { return { ...this, cloned: true }; } }; },
    self: null
  };
  ctx.self = { addEventListener: (t, f) => { H[t] = f; }, skipWaiting: () => log.push('skipWaiting'),
    clients: { claim: () => log.push('claim'), matchAll: async () => clients, openWindow: async u => log.push('open ' + u) },
    registration: { showNotification: async (t, o) => log.push(['notify', t, o]) } };
  vm.runInNewContext(SRC, ctx, { filename: FILE });
  const ev = extra => { const e = { waits: [], waitUntil(p) { this.waits.push(p); }, respondWith(p) { this.res = p; }, ...extra }; return e; };
  return { H, stores, log, ev, async fire(type, extra) { const e = ev(extra); H[type](e); await Promise.all(e.waits); if (e.res) e.result = await e.res; return e; } };
}
const req = (url, o = {}) => ({ url: new URL(url, 'https://app.test/').href, method: 'GET', mode: 'cors', ...o });

test('cài đặt: lưu vỏ app (bỏ qua file lỗi), kích hoạt ngay', async () => {
  const S = boot({ failAdd: ['./icon-512.png'] });
  await S.fire('install');
  assert.ok(S.stores[CACHE].has('https://app.test/index.html'));
  assert.ok(S.stores[CACHE].has('https://app.test/manifest.webmanifest'));
  assert.ok(!S.stores[CACHE].has('https://app.test/icon-512.png'));
  assert.ok(S.log.includes('skipWaiting'));
});

test('kích hoạt: xoá cache phiên bản cũ, giữ bản hiện tại, nhận quyền điều khiển trang', async () => {
  const S = boot({ otherCaches: ['gadn-v1', 'gadn-v2'] });
  await S.fire('activate');
  assert.deepEqual(Object.keys(S.stores), [CACHE]);
  assert.ok(S.log.includes('claim'));
});

test('mở trang có mạng: lấy bản mới nhất và cập nhật cache; mất mạng: dùng bản đã lưu', async () => {
  let S = boot();
  let e = await S.fire('fetch', { request: req('/index.html', { mode: 'navigate' }) });
  assert.equal(e.result.body, 'net:https://app.test/index.html');
  await new Promise(r => setTimeout(r, 0));
  assert.ok(S.log.includes('put https://app.test/index.html'));
  S = boot({ online: false, cached: { 'https://app.test/index.html': { body: 'cached-index' } } });
  e = await S.fire('fetch', { request: req('/?nhap=1', { mode: 'navigate' }) });
  assert.equal(e.result.body, 'cached-index');
  S = boot({ online: false, cached: { 'https://app.test/': { body: 'cached-root' } } });
  e = await S.fire('fetch', { request: req('/', { mode: 'navigate' }) });
  assert.equal(e.result.body, 'cached-root');
});

test('tài nguyên cùng nguồn: ưu tiên cache, chưa có thì tải rồi lưu; gói hình .bin và yêu cầu POST không đi qua cache', async () => {
  const S = boot({ cached: { 'https://app.test/icon-192.png': { body: 'cached-icon' } } });
  let e = await S.fire('fetch', { request: req('/icon-192.png') });
  assert.equal(e.result.body, 'cached-icon');
  e = await S.fire('fetch', { request: req('/apple-touch-icon.png') });
  assert.equal(e.result.body, 'net:https://app.test/apple-touch-icon.png');
  await new Promise(r => setTimeout(r, 0));
  assert.ok(S.stores[CACHE].has('https://app.test/apple-touch-icon.png'));
  e = await S.fire('fetch', { request: req('/exdb-1.bin') });
  assert.equal(e.res, undefined);
  e = await S.fire('fetch', { request: req('/index.html', { method: 'POST' }) });
  assert.equal(e.res, undefined);
  e = await S.fire('fetch', { request: req('https://raw.githubusercontent.com/x.jpg') });
  assert.equal(e.res, undefined);
});

test('font Google: dùng bản đã lưu và làm mới ngầm; chưa có thì tải; mất mạng vẫn dùng bản đã lưu', async () => {
  const F = 'https://fonts.gstatic.com/s/a.woff2';
  let S = boot({ cached: { [F]: { body: 'cached-font' } } });
  let e = await S.fire('fetch', { request: req(F) });
  assert.equal(e.result.body, 'cached-font');
  S = boot();
  e = await S.fire('fetch', { request: req('https://fonts.googleapis.com/css2?family=X') });
  assert.equal(e.result.body, 'net:https://fonts.googleapis.com/css2?family=X');
  S = boot({ online: false, cached: { [F]: { body: 'cached-font' } } });
  e = await S.fire('fetch', { request: req(F) });
  assert.equal(e.result.body, 'cached-font');
});

test('bấm thông báo: mở lại cửa sổ app đang có, không có thì mở mới', async () => {
  let focused = 0;
  let S = boot({ clients: [{ focus: () => focused++ }] });
  let closed = 0;
  await S.fire('notificationclick', { notification: { close: () => closed++ } });
  assert.equal(focused, 1); assert.equal(closed, 1);
  S = boot();
  await S.fire('notificationclick', { notification: { close() {} } });
  assert.ok(S.log.includes('open ./'));
});

test('thông báo đẩy: đọc JSON (kể cả dạng {notification}), chữ thường, hoặc mặc định “Hết giờ nghỉ”', async () => {
  const S = boot();
  await S.fire('push', { data: { json: () => ({ title: 'A', body: 'B', tag: 't' }) } });
  await S.fire('push', { data: { json: () => ({ notification: { title: 'N' } }) } });
  await S.fire('push', { data: { json: () => { throw new Error('x'); }, text: () => 'chữ' } });
  await S.fire('push', {});
  const n = S.log.filter(x => Array.isArray(x));
  assert.deepEqual(n.map(x => [x[1], x[2].body, x[2].tag]), [['A', 'B', 't'], ['N', 'Vào set tiếp theo thôi!', 'rest'], ['Hết giờ nghỉ', 'chữ', 'rest'], ['Hết giờ nghỉ', 'Vào set tiếp theo thôi!', 'rest']]);
  assert.equal(n[0][2].data.url, './');
});
