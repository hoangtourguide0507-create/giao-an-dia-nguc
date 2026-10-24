// Fixture chung: đồng hồ cố định, chặn mạng ngoài, máy chủ đồng bộ giả, và lớp App để thao tác app.
import { test as base, expect, devices } from '@playwright/test';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { JPEG_B64, TODAY } from './data.mjs';

export const NOW = new Date(`${TODAY}T09:00:00+07:00`);
export { expect };

class App {
  constructor(page) { this.page = page; }
  async goto(hash = '') { await this.page.goto('/index.html' + hash); await this.ready(); }
  async reload() { await this.page.reload(); await this.ready(); }
  async ready() { await this.page.waitForFunction(() => window.__sota && document.querySelector('#nav-bar button')); await this.page.waitForTimeout(50); }
  /* ghi thẳng vào IndexedDB của app rồi mở lại trang */
  async seed({ state, profiles, states, kv, photos } = {}) {
    /* rời app sang một trang tĩnh cùng nguồn để app không kịp ghi đè dữ liệu vừa đặt */
    await this.page.goto('/manifest.webmanifest');
    await this.page.evaluate(async ({ state, profiles, states, kv, photos }) => {
      const db = await new Promise((res, rej) => { const r = indexedDB.open('so-ta', 1); r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('photos'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      const put = (store, k, v) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); });
      await new Promise(res => { const t = db.transaction(['kv', 'photos'], 'readwrite'); t.objectStore('kv').clear(); t.objectStore('photos').clear(); t.oncomplete = res; });
      if (profiles) await put('kv', 'profiles', profiles);
      if (state) await put('kv', 'state', state);
      for (const [pid, st] of Object.entries(states || {})) await put('kv', pid === 'p1' ? 'state' : 'state:' + pid, st);
      for (const [k, v] of Object.entries(kv || {})) await put('kv', k, v);
      for (const [k, v] of Object.entries(photos || {})) await put('photos', k, v);
      db.close();
    }, { state, profiles, states, kv, photos });
    await this.page.goto('/index.html'); await this.ready();
  }
  state() { return this.page.evaluate(() => JSON.parse(JSON.stringify(window.__sota.state))); }
  ui() { return this.page.evaluate(() => { const u = window.__sota.ui; return JSON.parse(JSON.stringify(u, (k, v) => v instanceof Set ? [...v] : v)); }); }
  profiles() { return this.page.evaluate(() => JSON.parse(JSON.stringify(window.__sota.profiles))); }
  /* đọc thẳng kho lưu của app */
  idb(store, key) {
    return this.page.evaluate(async ({ store, key }) => {
      const db = await new Promise(res => { const r = indexedDB.open('so-ta', 1); r.onsuccess = () => res(r.result); });
      const v = await new Promise(res => { const t = db.transaction(store, 'readonly'); const q = key == null ? t.objectStore(store).getAllKeys() : t.objectStore(store).get(key); q.onsuccess = () => res(q.result); });
      db.close(); return v;
    }, { store, key });
  }
  act(name, extra = '') { return this.page.locator(`[data-act="${name}"]${extra}`); }
  async click(name, extra = '') { await this.act(name, extra).first().click(); }
  /* thanh dưới: home · plan · (nút Tập) · week · more. 'today' = nút giữa khi đang tập, không thì Trang chủ.
     'body' và 'photos' nằm trong Tiến độ. */
  async tab(name) {
    const nav = n => this.page.locator(`#nav-bar [data-tab="${n}"]`).first().click();
    if (name === 'body' || name === 'photos') { await nav('week'); await this.page.locator(`.ptabs [data-tab="${name}"]`).click(); return; }
    if (name === 'today') { const active = await this.page.evaluate(() => !!window.__sota.state.active); await nav(active ? 'today' : 'home'); return; }
    await nav(name);
  }
  /* mở một trang con trong Tài khoản: pack · pace · form · height · notif · skin · install · wipe */
  async more(key) {
    await this.tab('more');
    await this.page.locator(`[data-act="more-sec"][data-k="${key}"]`).first().click();
  }
  async startPick() { await this.page.locator('#nav-bar .fab').click(); }
  sheet() { return this.page.locator('#sheet-body'); }
  view() { return this.page.locator('#view'); }
  async closeSheet() { await this.page.evaluate(() => document.querySelector('.sheet-bg').click()); }
  toast() { return this.page.locator('#toast'); }
  /* chờ toast tự ẩn (tua nhanh đồng hồ) để nó không che nút */
  async toastGone() { await this.page.clock.fastForward(8000); await expect(this.toast()).toBeHidden(); }
  /* chờ app ghi xuống IndexedDB (save() trễ 300 ms) */
  async flushed() { await this.page.waitForTimeout(400); }
}

/* chuẩn bị một trang: đồng hồ giả, chặn mạng ngoài, máy chủ đồng bộ giả */
async function prep(page) {
  await page.clock.install({ time: NOW });
  await page.route(/^https?:\/\/(?!localhost|gadn-push\.test)/, route => {
    const u = route.request().url();
    if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    if (/raw\.githubusercontent\.com\/.*\.jpg$/.test(u)) return route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from(JPEG_B64, 'base64') });
    return route.abort();
  });
  /* máy chủ đồng bộ giả (fixture hub): chuyển yêu cầu tới tests/hub_server.mjs đang chạy */
  await page.route('https://gadn-push.test/**', async route => {
    if (!currentHub) return route.abort();
    const rq = route.request(), u = new URL(rq.url());
    if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HUB });
    try {
      const h = rq.headers(), r = await fetch(`http://localhost:${currentHub}${u.pathname}${u.search}`, { method: rq.method(), headers: { 'Content-Type': h['content-type'] || 'application/json', ...(h.authorization ? { Authorization: h.authorization } : {}) }, body: ['GET', 'HEAD'].includes(rq.method()) ? undefined : rq.postDataBuffer() });
      await route.fulfill({ status: r.status, headers: { ...CORS_HUB, 'Content-Type': r.headers.get('content-type') || 'application/json' }, body: Buffer.from(await r.arrayBuffer()) });
    } catch (e) { await route.abort().catch(() => {}); }
  });
  page.on('pageerror', e => { page.__errors = [...(page.__errors || []), e]; });
}
const CORS_HUB = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Content-Type, Authorization', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS' };
async function finish(page, info) {
  if ((page.__errors || []).length && info.status === 'passed') throw new Error('Lỗi JS trong trang: ' + page.__errors.map(e => e.message).join(' | '));
}
let currentHub = 0;

export const test = base.extend({
  page: async ({ page }, use, info) => { await prep(page); await use(page); await finish(page, info); },
  app: async ({ page }, use) => { await use(new App(page)); },
  /* máy chủ đồng bộ giả: chạy tests/hub_server.mjs với một khoá HLV ngẫu nhiên; mỗi test một máy chủ riêng */
  hub: async ({}, use) => {
    const port = 21000 + Math.floor(Math.random() * 20000), hk = randomBytes(32).toString('base64url');
    const proc = spawn(process.execPath, [fileURLToPath(new URL('../hub_server.mjs', import.meta.url)), String(port)], { stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, HK: hk, RP_ID: 'localhost', RP_ORIGIN: `http://localhost:${process.env.PORT || 4173}` } });
    await new Promise((res, rej) => { proc.stdout.once('data', res); proc.once('error', rej); });
    currentHub = port;
    const req = async (path, method = 'GET', body, auth) => { const r = await fetch(`http://localhost:${port}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
    await use({ url: 'https://gadn-push.test', hk, port, req, auth: 'Bearer h.' + hk });
    currentHub = 0; proc.kill();
  },
  /* thêm một thiết bị (ngữ cảnh trình duyệt riêng, dữ liệu riêng) nối vào máy chủ Drive giả: máy HLV, máy học viên… */
  device: async ({ browser }, use, info) => {
    const opened = [];
    await use(async () => {
      const { defaultBrowserType, ...dev } = devices['iPhone 13'];
      const ctx = await browser.newContext({ ...dev, baseURL: `http://localhost:${process.env.PORT || 4173}`, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', permissions: ['clipboard-read', 'clipboard-write'] });
      const page = await ctx.newPage(); await prep(page); opened.push(page);
      return new App(page);
    });
    for (const pg of opened) await finish(pg, info);
  }
});

/* giả camera sau: phát hình một mã QR (vẽ bằng thư viện qrcode có sẵn trong app) */
export async function fakeCamera(page, text) {
  await page.evaluate(text => {
    navigator.mediaDevices.getUserMedia = async () => {
      const c = document.createElement('canvas'); c.width = c.height = 640; const g = c.getContext('2d');
      const q = qrcode(0, 'L'); q.addData(text); q.make(); const n = q.getModuleCount(), sc = Math.floor(600 / (n + 8));
      const draw = () => { g.fillStyle = '#fff'; g.fillRect(0, 0, 640, 640); g.fillStyle = '#000'; for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect(20 + (k + 4) * sc, 20 + (r + 4) * sc, sc, sc); };
      draw(); setInterval(draw, 100); return c.captureStream(15);
    };
  }, text);
}
/* lấy ảnh đang hiện trong bảng (ảnh mã QR) thành Buffer để chọn lại như ảnh trong thư viện */
export async function sheetImage(page) {
  const b64 = await page.evaluate(async () => { const src = document.querySelector('#sheet-body img').src; const b = await (await fetch(src)).blob();
    return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(b); }); });
  return Buffer.from(b64, 'base64');
}
