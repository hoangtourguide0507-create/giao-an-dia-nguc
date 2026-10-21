// Fixture chung: đồng hồ cố định, chặn mạng ngoài, đo coverage cho mọi test, và lớp App để thao tác app.
import { test as base, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { saveRaw, instrumentedHtml } from './coverage.mjs';
import { JPEG_B64, TODAY } from './data.mjs';

export const NOW = new Date(`${TODAY}T09:00:00+07:00`);
export { expect };

const COVER = !process.env.NO_COVERAGE;
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
  async tab(name) { await this.page.locator(`#nav-bar [data-tab="${name}"]`).click(); }
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

export const test = base.extend({
  page: async ({ page }, use, info) => {
    if (COVER) await page.route(/\/index\.html$/, route => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: instrumentedHtml() }));
    await page.clock.install({ time: NOW });
    await page.route(/^https?:\/\/(?!localhost)/, route => {
      const u = route.request().url();
      if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
      if (/raw\.githubusercontent\.com\/.*\.jpg$/.test(u)) return route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from(JPEG_B64, 'base64') });
      return route.abort();
    });
    page.on('pageerror', e => { page.__errors = [...(page.__errors || []), e]; });
    await use(page);
    await covSnap(page);
    if ((page.__errors || []).length && info.status === 'passed') throw new Error('Lỗi JS trong trang: ' + page.__errors.map(e => e.message).join(' | '));
  },
  app: async ({ page }, use) => { await use(new App(page)); }
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
/* lấy ảnh đang hiện trong bảng (ảnh mã QR, ảnh báo cáo) thành Buffer để chọn lại như ảnh trong thư viện */
export async function sheetImage(page) {
  const b64 = await page.evaluate(async () => { const src = document.querySelector('#sheet-body img').src; const b = await (await fetch(src)).blob();
    return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(b); }); });
  return Buffer.from(b64, 'base64');
}
