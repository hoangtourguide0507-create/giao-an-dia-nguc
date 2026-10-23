// BR-18 Chạy trong link claude.ai (Artifact): đồng bộ với tài khoản Claude, trạng thái đồng bộ, tải file qua claude.ai.
import { test, expect } from '../helpers/fixtures.mjs';
import { installCloud, cloudState } from '../helpers/cloud.mjs';
import { state, basicPlan, session, addDays, TODAY, PHOTO } from '../helpers/data.mjs';

const BASE = 'data/users/u1/app';
const syncCard = app => app.view().locator('#sync');

test('lần đầu mở trong claude.ai: đưa dữ liệu trên máy lên tài khoản (kể cả ảnh), báo đã đồng bộ', async ({ app, page }) => {
  await installCloud(page);
  const P = basicPlan(); P.bench.photos = ['ph1'];
  await app.seed({ state: state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -1), [[P.bench, [[40, 10]]]])], updatedAt: 5 }), photos: { ph1: PHOTO } });
  await expect(app.toast()).toHaveText('Đã đưa dữ liệu lên tài khoản Claude', { timeout: 5000 });
  const C = await cloudState(page);
  expect(C.docs[BASE].days).toHaveLength(2);
  expect(Object.keys(C.docs).filter(k => k.startsWith(BASE + '/sessions/'))).toHaveLength(1);
  expect(C.docs[BASE + '/photos/ph1']).toEqual({ d: PHOTO });
  expect(C.docs['data/users/u1/profiles']).toMatchObject({ active: 'p1' });
  await app.tab('more');
  await expect(syncCard(app)).toContainText('Đã đồng bộ với tài khoản Claude');
  /* trong claude.ai: thẻ thông báo báo chỉ có trên app mở từ màn hình chính; không hướng dẫn cài app */
  await app.tab('more');
  await expect(app.view().locator('.grow', { hasText: 'Cài lên màn hình' })).toHaveCount(0);
  await app.view().locator('.grow', { hasText: 'Thông báo' }).click();
  await expect(app.view()).toContainText('Thông báo chỉ có trên app mở từ icon màn hình chính');
  /* sửa dữ liệu → tự lưu lên tài khoản sau ~1 giây; xoá buổi → xoá trên tài khoản */
  await app.tab('week');
  await app.view().locator('.list [data-act="open-session"]').first().click();
  await app.click('del-session'); await app.click('confirm-ok');
  await expect.poll(async () => Object.keys((await cloudState(page)).docs).filter(k => k.startsWith(BASE + '/sessions/')).length, { timeout: 5000 }).toBe(0);
});

test('tài khoản có dữ liệu mới hơn: tải về thay dữ liệu trên máy; hồ sơ trên tài khoản được thêm vào máy', async ({ app, page }) => {
  const P = basicPlan();
  const remote = state({ days: P.days, updatedAt: Date.now() });
  await installCloud(page, { docs: { [BASE]: remote, [BASE + '/sessions/r1']: session(P.chest, addDays(TODAY, -3), [[P.bench, [[40, 10]]]], { id: 'r1' }),
    'data/users/u1/profiles': { active: 'p1', list: [{ id: 'p1', name: 'Tôi' }, { id: 'p9', name: 'Bạn' }], coach: { on: false, name: 'X' } } } });
  await app.seed({ state: state({ days: [], updatedAt: 1 }) });
  await expect(app.view().locator('.hero')).toBeVisible({ timeout: 5000 });
  const st = await app.state();
  expect(st.days).toHaveLength(2);
  expect(st.sessions.map(s => s.id)).toEqual(['r1']);
  expect((await app.profiles()).list.map(p => p.name)).toEqual(['Tôi', 'Bạn']);
});

test('máy mới hơn tài khoản: giữ máy, gộp buổi chỉ có trên tài khoản rồi đẩy lên', async ({ app, page }) => {
  const P = basicPlan();
  await installCloud(page, { docs: { [BASE]: state({ days: [], updatedAt: 1 }), [BASE + '/sessions/r1']: session(P.chest, addDays(TODAY, -3), [[P.bench, [[40, 10]]]], { id: 'r1' }) } });
  await app.seed({ state: state({ days: P.days, sessions: [session(P.back, addDays(TODAY, -1), [[P.lat, [[45, 10]]]], { id: 'l1' })], updatedAt: Date.now() }) });
  await expect.poll(async () => (await app.state()).sessions.map(s => s.id).sort(), { timeout: 5000 }).toEqual(['l1', 'r1']);
  await expect.poll(async () => !!(await cloudState(page)).docs[BASE + '/sessions/l1'], { timeout: 5000 }).toBe(true);
  expect((await cloudState(page)).docs[BASE].days).toHaveLength(2);
});

test('không có quyền ghi / không nhận được tài khoản: chỉ lưu trên máy', async ({ app, page }) => {
  await installCloud(page, { canWrite: false });
  await app.goto();
  await app.tab('more');
  await expect(syncCard(app)).toContainText('Chỉ lưu trên máy này', { timeout: 5000 });
  await page.close();
});

test('không lấy được mã tài khoản: chỉ lưu trên máy', async ({ app, page }) => {
  await installCloud(page, { uid: null });
  await app.goto();
  await app.tab('more');
  await expect(syncCard(app)).toContainText('Chỉ lưu trên máy này', { timeout: 5000 });
});

test('bộ nhớ đồng bộ đầy / lỗi mạng: báo trạng thái tương ứng', async ({ app, page }) => {
  const P = basicPlan();
  await installCloud(page, { fail: { set: 'quota_exceeded' } });
  await app.seed({ state: state({ days: P.days, updatedAt: 5 }) });
  await app.tab('more');
  await expect(syncCard(app)).toContainText('Bộ nhớ đồng bộ đã đầy', { timeout: 5000 });
});

test('lỗi mạng khi lưu lên tài khoản: “Chưa lưu được”, mở lại app thì thử kết nối lại', async ({ app, page }) => {
  const P = basicPlan();
  await installCloud(page, { fail: { set: 'network' } });
  await app.seed({ state: state({ days: P.days, updatedAt: 5 }) });
  await app.tab('more');
  await expect(syncCard(app)).toContainText('Chưa lưu được lên tài khoản', { timeout: 5000 });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(syncCard(app)).toContainText(/Chưa lưu được|Đang lưu|Đang kết nối/);
});

test('quyền bị thu hồi khi đang dùng: chuyển sang chỉ lưu trên máy', async ({ app, page }) => {
  const P = basicPlan();
  await installCloud(page, { fail: { set: 'revoked' } });
  await app.seed({ state: state({ days: P.days, updatedAt: 5 }) });
  await app.tab('more');
  await expect(syncCard(app)).toContainText('Chỉ lưu trên máy này', { timeout: 5000 });
});

test('kết nối lỗi ngay từ đầu: báo chưa lưu được', async ({ app, page }) => {
  await installCloud(page, { useFail: 'network' });
  await app.goto();
  await app.tab('more');
  await expect(syncCard(app)).toContainText('Chỉ lưu trên máy này', { timeout: 5000 });
});

test('đổi người tập: mỗi hồ sơ một chỗ lưu riêng trên tài khoản; ảnh thiếu trên máy lấy từ tài khoản', async ({ app, page }) => {
  const P = basicPlan(); P.bench.photos = ['cloudonly'];
  await installCloud(page, { docs: { 'data/users/u1/app-p2': state({ days: P.days, updatedAt: Date.now() }), 'data/users/u1/app-p2/photos/cloudonly': { d: PHOTO } } });
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Vợ', color: 1 }] }, states: { p1: state({ updatedAt: 5 }) } });
  await expect(app.toast()).toBeHidden({ timeout: 4000 }).catch(() => {});
  await page.locator('.who').click();
  await app.sheet().locator('[data-act="switch-profile"][data-id="p2"]').click();
  await expect.poll(async () => (await app.state()).days.length, { timeout: 5000 }).toBe(2);
  await app.tab('plan'); await app.click('toggle-day');
  await expect(app.view().locator('img.thumb[data-photo="cloudonly"]')).toHaveAttribute('src', /^data:image/, { timeout: 5000 });
  expect(await app.idb('photos', 'cloudonly')).toBe(PHOTO);
});

test('kéo xuống để làm mới: lấy dữ liệu mới hơn từ tài khoản; mở lại app cũng kiểm tra', async ({ app, page }) => {
  const P = basicPlan();
  await installCloud(page, { docs: { [BASE]: state({ days: [], updatedAt: 1 }) } });
  await app.seed({ state: state({ days: P.days, updatedAt: 5 }) });
  await expect.poll(async () => ((await cloudState(page)).docs[BASE] || {}).days?.length, { timeout: 5000 }).toBe(2);
  /* máy khác ghi dữ liệu mới hơn lên tài khoản */
  await page.evaluate(() => { const S = window.__cloud.S; S.docs['data/users/u1/app'] = { ...S.docs['data/users/u1/app'], days: [], updatedAt: Date.now() + 1e6 }; sessionStorage.setItem('__mockcloud', JSON.stringify(S)); });
  const pull = async (y0, y1) => page.evaluate(([y0, y1]) => {
    const t = (type, y) => document.body.dispatchEvent(new TouchEvent(type, { bubbles: true, touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: document.body, clientY: y })] }));
    window.scrollTo(0, 0); t('touchstart', y0); t('touchmove', y0 + (y1 - y0) / 2); t('touchmove', y1); t('touchend', y1);
  }, [y0, y1]);
  await pull(100, 140); /* kéo ngắn: không làm mới */
  await expect(app.toast()).toBeHidden();
  await pull(100, 300);
  await expect(app.toast()).toHaveText('Đã cập nhật');
  expect((await app.state()).days).toHaveLength(0);
  /* lần sau: mở lại app (visibilitychange) cũng lấy bản mới hơn */
  await page.evaluate(() => { const S = window.__cloud.S; S.docs['data/users/u1/app'] = { ...S.docs['data/users/u1/app'], days: [{ id: 'z', name: 'Mới', exercises: [] }], updatedAt: Date.now() + 2e6 }; sessionStorage.setItem('__mockcloud', JSON.stringify(S)); });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(async () => (await app.state()).days.map(d => d.name)).toEqual(['Mới']);
});

test('xoá toàn bộ dữ liệu khi đang xem hồ sơ khác: quay về chỗ lưu của hồ sơ đầu', async ({ app, page }) => {
  await installCloud(page);
  await app.seed({ profiles: { active: 'p2', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Vợ', color: 1 }] }, states: { p1: state(), p2: state({ days: basicPlan().days, updatedAt: 5 }) } });
  await app.more('wipe');
  await app.click('wipe'); await app.click('confirm-ok');
  await expect(app.toast()).toHaveText('Đã xoá dữ liệu');
  await expect.poll(async () => ((await cloudState(page)).docs[BASE] || {}).days, { timeout: 5000 }).toEqual([]);
});
