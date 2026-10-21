// BR-11 Cài đặt cá nhân: giao diện, hiệu ứng, âm thanh, rung, chấm độ khó, lưu ý form, nhịp tập, chiều cao, cài app, xoá dữ liệu.
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, session, addDays, TODAY, PHOTO } from '../helpers/data.mjs';

test('đổi giao diện: 4 skin, màu thanh trạng thái, nhớ qua lần mở sau', async ({ app, page }) => {
  await app.goto();
  await app.tab('more');
  await expect(app.view().locator('[data-act="skin"]')).toHaveCount(4);
  for (const [k, meta] of [['hell', '#0b0504'], ['ice', '#050c16'], ['oled', '#000000'], ['gold', '#0a0a0b']]) {
    await app.view().locator(`[data-act="skin"][data-k="${k}"]`).click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', k);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', meta);
  }
  await app.view().locator('[data-act="skin"][data-k="ice"]').click();
  /* bấm lại skin đang dùng thì không đổi gì */
  await app.view().locator('[data-act="skin"][data-k="ice"]').click();
  expect(await page.evaluate(() => localStorage.getItem('gadn-skin'))).toBe('ice');
  await app.flushed();
  await app.reload();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'ice');
});

test('hiệu ứng bật/tắt, âm thanh, rung, chấm độ khó', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.tab('more');
  await app.view().locator('[data-act="fx-lv"][data-k="off"]').click();
  await expect(app.toast()).toHaveText('Hiệu ứng: Tắt');
  await expect(page.locator('html')).toHaveAttribute('data-anim', 'off');
  await app.view().locator('[data-act="fx-lv"][data-k="full"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-anim', 'on');
  await page.locator('#sfx-t').uncheck();
  await page.locator('#haptics-t').uncheck();
  await page.locator('#eff-t').uncheck();
  expect((await app.state()).settings).toMatchObject({ sfx: false, haptics: false, eff: false });
  await page.locator('#sfx-t').check();
  await page.locator('#haptics-t').check();
  /* tắt chấm độ khó: xong set không hiện nút Dễ/Vừa/Sát/Hỏng */
  await app.tab('today');
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  await app.view().locator('[data-act="set-done"][data-e="0"][data-s="0"]').click();
  await expect(app.view().locator('.eff')).toHaveCount(0);
});

test('lưu ý form: Đầy đủ (thu gọn sau set đầu, mở lại được) · Gọn · Tắt', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  await expect(app.view().locator('.fcue')).toContainText('Ép bả vai ra sau');
  await app.view().locator('[data-act="set-done"][data-e="0"][data-s="0"]').click();
  await expect(app.view().locator('.fcue1[data-act="cue-open"]')).toContainText('+2 lưu ý');
  await app.view().locator('.fcue1[data-act="cue-open"]').click();
  await expect(app.view().locator('.fcue')).toBeVisible();
  await app.view().locator('.fcue [data-act="cue-open"]').click();
  await expect(app.view().locator('.fcue1')).toBeVisible();
  await app.tab('more');
  await app.view().locator('[data-act="form-lv"][data-k="compact"]').click();
  await expect(app.toast()).toHaveText('Lưu ý form: Gọn');
  await app.tab('today');
  await expect(app.view().locator('.fcue1[data-act="guide"]')).toBeVisible();
  await app.tab('more');
  await app.view().locator('[data-act="form-lv"][data-k="off"]').click();
  await app.tab('today');
  await expect(app.view().locator('.fcue, .fcue1')).toHaveCount(0);
});

test('nhịp rep và nhịp nghỉ đổi thời gian dự kiến của buổi', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  const est = () => app.view().locator('.hero .etm').textContent();
  const std = await est();
  await app.tab('more');
  await expect(app.view()).toContainText('set 10 rep ≈ 35 giây');
  await app.view().locator('[data-act="tempo"][data-k="4"]').click();
  await expect(app.view()).toContainText('set 10 rep ≈ 45 giây');
  await app.view().locator('[data-act="rest-mode"][data-k="heavy"]').click();
  await expect(app.toast()).toHaveText('Nhịp nghỉ: Nặng');
  await expect(app.view()).toContainText('Bài chân 3 phút');
  await app.tab('today');
  const slow = await est();
  expect(parseInt(slow.replace(/\D/g, ''))).toBeGreaterThan(parseInt(std.replace(/\D/g, '')));
  await app.tab('more');
  await app.view().locator('[data-act="rest-mode"][data-k="fast"]').click();
  await app.view().locator('[data-act="tempo"][data-k="2"]').click();
  expect((await app.state()).settings).toMatchObject({ restMode: 'fast', tempo: 2 });
});

test('chiều cao, tên phím tắt, sao chép tên phím tắt, chẩn đoán thông báo', async ({ app, page }) => {
  await app.goto();
  await app.tab('more');
  await page.locator('input[data-k="height"]').fill('172');
  await expect.poll(async () => (await app.state()).settings.height).toBe(172);
  await page.locator('input[data-k="shortcutName"]').fill('Nghỉ tập');
  await app.click('copy-sc');
  await expect(app.toast()).toHaveText('Đã sao chép tên phím tắt');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Nghỉ tập');
  await expect(app.view().locator('.diag')).toContainText('Phiên bản app');
  /* bảng chẩn đoán cập nhật tên mới ở lần vẽ lại */
  await app.tab('today'); await app.tab('more');
  await expect(app.view().locator('.diag')).toContainText('Nghỉ tập');
  /* chưa mở từ màn hình chính: hiện hướng dẫn cài */
  await expect(app.view()).toContainText('Cài lên màn hình điện thoại');
});

test('cài ứng dụng khi trình duyệt cho phép (Android/Chrome)', async ({ app, page }) => {
  await app.goto();
  await app.tab('more');
  await page.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = () => { window.__prompted = true; }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); });
  await app.click('install');
  expect(await page.evaluate(() => window.__prompted)).toBe(true);
  await expect(app.act('install')).toHaveCount(0);
});

test('xoá toàn bộ dữ liệu: mọi hồ sơ, ảnh; giữ cài đặt giao diện', async ({ app, page }) => {
  const P = basicPlan();
  P.bench.photos = ['ph1'];
  await app.seed({
    profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Vợ', color: 1 }] },
    states: { p1: state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -1), [[P.bench, [[40, 10]]]])], settings: { skin: 'hell' } }), p2: state({ days: [] }) },
    photos: { ph1: PHOTO }
  });
  await app.tab('more');
  await app.click('wipe');
  await expect(app.sheet()).toContainText('Xoá toàn bộ dữ liệu?');
  await app.click('confirm-ok');
  await expect(app.toast()).toHaveText('Đã xoá dữ liệu');
  const st = await app.state();
  expect(st.days).toHaveLength(0); expect(st.sessions).toHaveLength(0);
  expect(st.settings.skin).toBe('hell');
  expect(await app.profiles()).toMatchObject({ active: 'p1', list: [{ id: 'p1', name: 'Tôi' }] });
  expect(await app.idb('photos')).toEqual([]);
  await app.flushed();
  expect(await app.idb('kv', 'state:p2')).toBeUndefined();
  await expect(app.view()).toContainText('Cuốn sổ tạ trong túi bạn');
});
