// Fixture chung: đồng hồ cố định, chặn mạng ngoài, đo coverage cho mọi test, và lớp App để thao tác app.
import { test as base, expect, devices } from '@playwright/test';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { saveRaw, instrumentedHtml } from './coverage.mjs';
import { JPEG_B64, TODAY } from './data.mjs';

export const GAS_URL_TEST = 'https://script.google.com/macros/s/AKtest/exec';
export const NOW = new Date(`${TODAY}T09:00:00+07:00`);
export { expect };

/* chỉ đo coverage khi COVERAGE=1 (npm run test:cov, hook post-merge trên main): đo làm app chậm ~2,3 lần */
const COVER = !!process.env.COVERAGE;
/* bộ đếm coverage nằm trong trang: lấy ra trước mỗi lần tải lại trang và khi test xong */
async function covSnap(page) { if (!COVER) return; try { saveRaw(randomUUID(), await page.evaluate(() => window.__coverage__)); } catch (e) { /* trang đã đóng */ } }

class App {
  constructor(page) { this.page = page; }
  async goto(hash = '') { if (this.page.url().startsWith('http')) await covSnap(this.page); await this.page.goto('/index.html' + hash); await this.ready(); }
  async reload() { await covSnap(this.page); await this.page.reload(); await this.ready(); }
  async ready() { await this.page.waitForFunction(() => window.__sota && document.querySelector('#nav-bar button')); await this.page.waitForTimeout(50); }
  /* ghi thẳng vào IndexedDB của app rồi mở lại trang */
  async seed({ state, profiles, states, kv, photos } = {}) {
    /* rời app sang một trang tĩnh cùng nguồn để app không kịp ghi đè dữ liệu vừa đặt */
    if (this.page.url().startsWith('http')) await covSnap(this.page);
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
     'body' và 'photos' nằm trong Tiến độ; 'settings' là Cài đặt khi bật HLV. */
  async tab(name) {
    const nav = n => this.page.locator(`#nav-bar [data-tab="${n}"]`).first().click();
    if (name === 'body' || name === 'photos') { await nav('week'); await this.page.locator(`.ptabs [data-tab="${name}"]`).click(); return; }
    if (name === 'today') { const active = await this.page.evaluate(() => !!window.__sota.state.active); await nav(active ? 'today' : 'home'); return; }
    if (name === 'settings') { await nav('more'); return; }
    await nav(name);
  }
  /* mở một trang con trong Tài khoản: drive · backup · pack · pace · form · height · notif · skin · install · wipe */
  async more(key) {
    await this.tab('more');
    /* khi bật chế độ HLV, tab này là Phòng HLV: vào Cài đặt bằng nút ⚙ */
    const gear = this.page.locator('#view [data-act="tab"][data-tab="settings"]'); if (await gear.count()) await gear.first().click();
    await this.page.locator(`[data-act="more-sec"][data-k="${key}"]`).first().click();
  }
  async startPick() { await this.page.locator('#nav-bar .fab').click(); }
  sheet() { return this.page.locator('#sheet-body'); }
  view() { return this.page.locator('#view'); }
  async closeSheet() { await this.page.evaluate(() => document.querySelector('.sheet-bg').click()); }
  toast() { return this.page.locator('#toast'); }
  /* chờ toast tự ẩn (tua nhanh đồng hồ) để nó không che nút */
  async toastGone() { await this.page.clock.fastForward(8000); await expect(this.toast()).toBeHidden(); }
  /* ghi lại các lần app mở liên kết ngoài (shortcuts://…) mà không để trình duyệt test điều hướng thật */
  async navSpy() {
    const cdp = await this.page.context().newCDPSession(this.page); await cdp.send('Page.enable');
    const urls = []; cdp.on('Page.frameRequestedNavigation', e => { if (!/^https?:/.test(e.url)) urls.push(e.url); }); return urls;
  }
  /* bấm nút mà nút đó mở liên kết ngoài: bấm bằng sự kiện DOM để Playwright không chờ điều hướng */
  async tap(locator) { await locator.first().evaluate(el => setTimeout(() => el.click(), 0)); await this.page.waitForTimeout(100); }
  /* chờ app ghi xuống IndexedDB (save() trễ 300 ms) */
  async flushed() { await this.page.waitForTimeout(400); }
}

/* chuẩn bị một trang: phục vụ index.html có bộ đếm coverage, đồng hồ giả, chặn mạng ngoài (trừ máy chủ Drive giả) */
async function prep(page) {
  if (COVER) await page.route(/\/index\.html$/, route => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: instrumentedHtml() }));
  await page.clock.install({ time: NOW });
  await page.route(/^https?:\/\/(?!localhost|script\.google\.com)/, route => {
    const u = route.request().url();
    if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    if (/raw\.githubusercontent\.com\/.*\.jpg$/.test(u)) return route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from(JPEG_B64, 'base64') });
    return route.abort();
  });
  /* máy chủ Drive giả (nếu test dùng fixture gas): chuyển yêu cầu tới script.google.com sang máy chủ cục bộ */
  await page.route('https://script.google.com/**', async route => {
    if (!currentGas) return route.abort();
    /* máy chủ giả có thể vừa bị tắt (hết test, trang vẫn đang gửi) hoặc đứt kết nối: coi như mất mạng, đừng làm hỏng test */
    try {
      const rq = route.request(), r = await fetch(`http://localhost:${currentGas}/`, { method: rq.method() === 'POST' ? 'POST' : 'GET', body: rq.method() === 'POST' ? rq.postData() || '' : undefined });
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: await r.text() });
    } catch (e) { await route.abort().catch(() => {}); }
  });
  page.on('pageerror', e => { page.__errors = [...(page.__errors || []), e]; });
}
let currentGas = 0;
async function finish(page, info) {
  await covSnap(page);
  if ((page.__errors || []).length && info.status === 'passed') throw new Error('Lỗi JS trong trang: ' + page.__errors.map(e => e.message).join(' | '));
}
const GAS_URL = 'https://script.google.com/macros/s/AKtest/exec';

export const test = base.extend({
  page: async ({ page }, use, info) => { await prep(page); await use(page); await finish(page, info); },
  app: async ({ page }, use) => { await use(new App(page)); },
  /* máy chủ Drive giả: chạy đúng drive/Code.gs (tests/gas_server.js); mỗi test một máy chủ riêng */
  gas: async ({}, use) => {
    const port = 21000 + Math.floor(Math.random() * 20000);
    const proc = spawn(process.execPath, [fileURLToPath(new URL('../gas_server.js', import.meta.url)), String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
    const ma = await new Promise((res, rej) => { proc.stdout.once('data', d => res(String(d).trim().split('\n')[0])); proc.once('error', rej); });
    const post = async q => (await fetch(`http://localhost:${port}/`, { method: 'POST', body: JSON.stringify(q) })).json();
    currentGas = port;
    await use({ url: GAS_URL, ma, port, post, props: async () => (await fetch(`http://localhost:${port}/__props`)).json() });
    currentGas = 0; proc.kill();
  },
  /* thêm một thiết bị (ngữ cảnh trình duyệt riêng, dữ liệu riêng) nối vào máy chủ Drive giả: máy HLV, máy học viên… */
  device: async ({ browser, gas }, use, info) => {
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
