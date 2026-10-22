// Giả lập Notification API, service worker + PushManager và máy chủ thông báo (Cloudflare Worker) cho test.
export const PUSH_URL = 'https://push.test';

/* perm: 'default' | 'granted' | 'denied' | 'none' (không có Notification) · reg: có đăng ký service worker không */
export async function mockNotifications(page, { perm = 'default', reg = true, subscribed = false } = {}) {
  await page.addInitScript(({ perm, reg, subscribed }) => {
    const shown = []; window.__shown = shown; window.__asked = 0; window.__grant = 'granted';
    if (perm === 'none') { delete window.Notification; }
    else {
      let p = perm;
      window.Notification = class { constructor(t, o) { shown.push(['ctor', t, o]); } static get permission() { return p; } static async requestPermission() { window.__asked++; p = window.__grant; return p; } };
    }
    const sub = { endpoint: 'https://push.example/ep1', toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'a', auth: 'b' } }; }, async unsubscribe() { sub.gone = true; cur = null; return true; } };
    let cur = subscribed ? sub : null;
    const registration = { showNotification: async (t, o) => { shown.push(['sw', t, o]); }, pushManager: { getSubscription: async () => cur, subscribe: async o => { cur = sub; window.__subscribed = o; return sub; } } };
    const sw = { getRegistration: async () => (window.__noReg || !reg) ? undefined : registration, ready: Promise.resolve(registration), register: async () => registration };
    Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true });
  }, { perm, reg, subscribed });
}

/* máy chủ thông báo giả: ghi lại mọi lời gọi; fail = { '/vapid': 500 } để mô phỏng lỗi */
export async function mockPushServer(page, { fail = {}, vapid = 'BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE' } = {}) {
  const calls = [];
  await page.route(PUSH_URL + '/**', async route => {
    const rq = route.request(), path = new URL(rq.url()).pathname;
    let body = null; try { body = JSON.parse(rq.postData() || 'null'); } catch (e) { /* không phải JSON */ }
    calls.push({ path, body });
    if (fail[path]) return route.fulfill({ status: fail[path], headers: { 'access-control-allow-origin': '*' }, body: '{}' });
    const out = path === '/vapid' ? { publicKey: vapid } : { ok: true, r: 'ok' };
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify(out) });
  });
  return calls;
}
