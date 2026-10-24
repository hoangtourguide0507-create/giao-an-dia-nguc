// BR-31 Học viên đã tập (PA-45 · B): HLV xem các buổi đã tập của học viên theo tuần, và kế hoạch cạnh thực tế trong chi tiết buổi.
import { test, expect, fakeCamera } from '../helpers/fixtures.mjs';
import { state, basicPlan, session, addDays, TODAY } from '../helpers/data.mjs';

const prof = (list, active = 'p1') => ({ active, list: list.map(([id, name, color = 0]) => ({ id, name, color })) });
const hubQR = (hub, k = hub.hk) => 'GAH1.' + Buffer.from(JSON.stringify({ s: hub.url, k })).toString('base64url');
async function registerHlv(app, hub) {
  await app.tab('more');
  await fakeCamera(app.page, hubQR(hub));
  await app.click('qr-scan');
  await expect(app.toast()).toContainText('Đã đăng ký làm HLV');
}

test.beforeEach(async ({ app }) => { await app.goto(); });

test('BR-31.1 · HLV xem học viên: chế độ Đã tập hiện số ngày giáo án đã tập trong tuần, mở được buổi', async ({ app, hub }) => {
  const P = basicPlan();
  const s1 = session(P.chest, TODAY, [[P.bench, [[40, 10, 'm'], [40, 10, 'm'], [40, 10, 'm']]]]);
  const s2 = session(P.back, addDays(TODAY, -1), [[P.lat, [[45, 10, 'm'], [45, 10, 'm'], [45, 10, 'm']]]]);
  await app.seed({ profiles: prof([['p1', 'Hoàng'], ['p2', 'Lan', 1]]), states: { p1: state(), p2: state({ days: P.days, sessions: [s1, s2] }) } });
  await registerHlv(app, hub);
  await app.page.evaluate(() => window.__sota.switchProfile('p2'));
  await app.tab('plan');
  await app.click('plan-view', '[data-k="done"]');
  await expect(app.view()).toContainText('2/2 ngày');
  await expect(app.view().locator('[data-act="open-session"]')).toHaveCount(2);
  await app.view().locator(`[data-act="open-session"][data-id="${s1.id}"]`).click();
  await expect(app.sheet()).toContainText('Kế hoạch 3×10 · làm 3/3 set');
});

test('BR-31.2 · bài làm thiếu set hiện đúng số set đã làm so với kế hoạch; bài đã bỏ khỏi giáo án hiện “Kế hoạch —”', async ({ app }) => {
  const P = basicPlan();
  const s1 = session(P.chest, TODAY, [[P.bench, [[40, 10], [40, 10]]], [P.fly, [[30, 10], [30, 10], [30, 10]]]]);
  s1.entries.push({ exId: 'gone', name: 'Bài đã xoá', muscle: 'Ngực', note: '', each: false, sets: [{ kg: 20, reps: 10 }], drop: null });
  await app.seed({ profiles: prof([['p1', 'Hoàng']]), states: { p1: state({ days: P.days, sessions: [s1] }) } });
  await app.tab('week');
  await app.click('open-session', `[data-id="${s1.id}"]`);
  await expect(app.sheet()).toContainText('Kế hoạch 3×10 · làm 2/3 set');
  await expect(app.sheet()).toContainText('Kế hoạch 3×10 · làm 3/3 set');
  await expect(app.sheet()).toContainText('Kế hoạch —');
});

test('BR-31.1 · máy học viên (không phải HLV) không có chế độ Đã tập', async ({ app }) => {
  const P = basicPlan();
  await app.seed({ profiles: prof([['p1', 'Lan']]), states: { p1: state({ days: P.days, sessions: [session(P.chest, TODAY, [[P.bench, [[40, 10]]]])] }) } });
  await app.tab('plan');
  await expect(app.view()).not.toContainText('Đã tập');
  await expect(app.view().locator('[data-act="plan-view"]')).toHaveCount(0);
});
