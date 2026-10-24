// BR-30 Giáo án HLV (PA-45 · A): khoá mức tạ, ghi chú HLV cho bài, trạng thái gửi giáo án lên máy chủ.
import crypto from 'node:crypto';
import { test, expect, fakeCamera } from '../helpers/fixtures.mjs';
import { calc } from '../helpers/calc.mjs';
import { state, basicPlan, ex, day, session, addDays, TODAY } from '../helpers/data.mjs';

const prof = (list, active = 'p1') => ({ active, list: list.map(([id, name, color = 0]) => ({ id, name, color })) });
const hubQR = (hub, k = hub.hk) => 'GAH1.' + Buffer.from(JSON.stringify({ s: hub.url, k })).toString('base64url');
async function registerHlv(app, hub) {
  await app.tab('more');
  await fakeCamera(app.page, hubQR(hub));
  await app.click('qr-scan');
  await expect(app.toast()).toContainText('Đã đăng ký làm HLV');
}
const sug = (A, id) => A.suggest(A.findEx(id));
const openEx = async (app, day, id) => {
  await app.tab('plan');
  await app.view().locator(`[data-act="toggle-day"][data-id="${day.id}"]`).click();
  await app.view().locator(`[data-act="edit-ex"][data-id="${id}"]`).first().click();
};

test.beforeEach(async ({ app }) => { await app.goto(); });

test('BR-30.1 · bài đủ điều kiện lên tạ: khoá bật → GIỮ ở mức hiện tại; bỏ khoá → TĂNG TẠ', async ({ page }) => {
  const b = ex('Đẩy ngực tạ đòn (Bench press)', { currentKg: 40, hold: true });
  const d = day('Ngực', [b]);
  const st = { days: [d], sessions: [session(d, addDays(TODAY, -7), [[b, [[40, 10], [40, 10], [40, 10]]]])], settings: { progMode: 'linear', pace: 'std', cycleStart: null, deloadEvery: 6 } };
  expect(await calc(page, st, sug, b.id)).toMatchObject({ kind: 'hold', label: 'GIỮ', kg: 40 });
  b.hold = false;
  expect(await calc(page, st, sug, b.id)).toMatchObject({ kind: 'up', label: 'TĂNG TẠ', kg: 42.5 });
});

test('BR-30.1 · HLV bật khoá và ghi chú trong sheet bài tập → Lịch tập hiện “HLV khoá” và ghi chú', async ({ app, hub }) => {
  const P = basicPlan();
  await app.seed({ profiles: prof([['p1', 'Hoàng']]), states: { p1: state({ days: P.days }) } });
  await registerHlv(app, hub);
  await openEx(app, P.chest, P.bench.id);
  await expect(app.sheet().locator('#f-hold')).toBeVisible();
  await app.page.check('#f-hold');
  await app.page.fill('#f-hlvnote', 'Giữ kỹ thuật, dừng ở 2 rep trước khi hỏng');
  await app.click('save-ex');
  const saved = (await app.state()).days[0].exercises[0];
  expect(saved).toMatchObject({ hold: true, hlvNote: 'Giữ kỹ thuật, dừng ở 2 rep trước khi hỏng' });
  await expect(app.view()).toContainText('HLV khoá');
  await expect(app.view()).toContainText('Giữ kỹ thuật, dừng ở 2 rep');
});

test('BR-30.2 · máy không phải HLV: không có công tắc khoá, ghi chú HLV chỉ đọc', async ({ app }) => {
  const P = basicPlan();
  P.bench.hold = true; P.bench.hlvNote = 'Không tăng tạ trong 2 tuần';
  await app.seed({ profiles: prof([['p1', 'Lan']]), states: { p1: state({ days: P.days }) } });
  await openEx(app, P.chest, P.bench.id);
  await expect(app.sheet()).toContainText('Không tăng tạ trong 2 tuần');
  await expect(app.sheet().locator('#f-hold')).toHaveCount(0);
  await expect(app.sheet().locator('#f-hlvnote')).toHaveCount(0);
});

test('BR-30.3 · HLV đang xem học viên có thẻ: gửi giáo án xong hiện giờ gửi lần cuối', async ({ app, hub }) => {
  const P = basicPlan();
  const k = crypto.createHmac('sha256', hub.hk).update('gadn-hv:lan:0').digest('base64url').slice(0, 32);
  const r = await hub.req('/s/tv/them', 'POST', { id: 'lan', ten: 'Lan', kieu: 'hv', skh: crypto.createHash('sha256').update(k).digest('base64url') }, hub.auth);
  expect(r.s).toBe(200);
  const sy = { s: hub.url, hk: hub.hk, map: { lan: 'p2' } };
  await app.seed({ profiles: prof([['p1', 'Hoàng'], ['p2', 'Lan', 1]]), states: { p1: state({ settings: { sync: sy } }), p2: state({ days: P.days }) } });
  await app.page.evaluate(() => window.__sota.switchProfile('p2'));
  await app.tab('plan');
  await expect(app.view()).toContainText('Chưa gửi lần nào');
  await openEx(app, P.chest, P.bench.id);
  await app.page.check('#f-hold');
  await app.click('save-ex');
  await expect(app.view()).toContainText('Gửi giáo án lần cuối lúc', { timeout: 10000 });
});

test('BR-30.3 · học viên chưa có thẻ QR: dòng trạng thái báo chưa có thẻ', async ({ app, hub }) => {
  const P = basicPlan();
  await app.seed({ profiles: prof([['p1', 'Hoàng'], ['p2', 'Bình', 1]]), states: { p1: state({ settings: { sync: { s: hub.url, hk: hub.hk, map: {} } } }), p2: state({ days: P.days }) } });
  await app.page.evaluate(() => window.__sota.switchProfile('p2'));
  await app.tab('plan');
  await expect(app.view()).toContainText('Học viên chưa có thẻ QR');
});
