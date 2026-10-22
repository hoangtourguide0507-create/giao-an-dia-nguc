// BR-11 Tài khoản & cài đặt cá nhân: danh mục trang con, giao diện, hiệu ứng, âm thanh, rung, chấm độ khó,
// lưu ý form, nhịp tập, chiều cao, cài app, xoá dữ liệu.
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, session, addDays, TODAY, PHOTO } from '../helpers/data.mjs';

test('trang Tài khoản: thẻ hồ sơ + danh mục các mục; bấm vào mở trang con, nút quay lại về danh mục', async ({ app, page }) => {
  const P = basicPlan();
  const ss = [0, 8, 15].map(i => session(P.chest, addDays(TODAY, -i), [[P.bench, [[40, 10], [40, 10]]]]));
  await app.seed({ state: state({ days: P.days, sessions: ss, settings: { name: 'Minh Anh', height: 172 } }) });
  await app.tab('more');
  await expect(app.view().locator('.acc-prof')).toContainText('Minh Anh');
  await expect(app.view().locator('.ap-stats')).toContainText('3buổi đã tập');
  await expect(app.view().locator('.ap-stats')).toContainText('3tuần liên tục');
  const rows = app.view().locator('.grow');
  await expect(rows).toHaveCount(10);
  await expect(app.view().locator('.gh')).toHaveText(['Đồng bộ & dữ liệu', 'Tập luyện', 'Giao diện', 'Khác']);
  await expect(rows.filter({ hasText: 'Chỉ số cơ thể' })).toContainText('Cao 172 cm');
  await expect(rows.filter({ hasText: 'Lưu ý form khi tập' })).toContainText('Đầy đủ');
  await expect(rows.filter({ hasText: 'Nhịp nghỉ & nhịp rep' })).toContainText('Nghỉ chuẩn · set 10 rep ≈ 35 giây');
  await expect(rows.filter({ hasText: 'Cài lên màn hình' })).toBeVisible();
  await rows.filter({ hasText: 'Chỉ số cơ thể' }).click();
  await expect(app.view().locator('.subhead h2')).toHaveText('Chỉ số cơ thể');
  await app.view().locator('.subhead [data-act="more-sec"]').click();
  await expect(app.view().locator('.acc-prof')).toBeVisible();
  /* đổi tab rồi quay lại: luôn về danh mục */
  await app.more('form');
  await app.tab('plan'); await app.tab('more');
  await expect(app.view().locator('.acc-prof')).toBeVisible();
});

test('đổi giao diện: Hổ Phách (mặc định) và Đen Tuyền, màu thanh trạng thái, nhớ qua lần mở sau', async ({ app, page }) => {
  await app.seed({ state: state({ settings: { skin: 'amber', skin22: 1 } }) });
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'amber');
  await app.more('skin');
  await expect(app.view().locator('[data-act="skin"]')).toHaveCount(2);
  await app.view().locator('[data-act="skin"][data-k="gold"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'gold');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#000000');
  /* bấm lại skin đang dùng thì không đổi gì */
  await app.view().locator('[data-act="skin"][data-k="gold"]').click();
  expect(await page.evaluate(() => localStorage.getItem('gadn-skin'))).toBe('gold');
  await app.flushed();
  await app.reload();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'gold');
  await app.more('skin');
  await app.view().locator('[data-act="skin"][data-k="amber"]').click();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#161518');
});

test('VD-32: người dùng mới chọn Đen Tuyền thì lần mở sau vẫn giữ Đen Tuyền', async ({ app, page }) => {
  await app.goto();
  await app.more('skin');
  await app.view().locator('[data-act="skin"][data-k="gold"]').click();
  await app.flushed();
  await app.reload();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'gold');
});

test('hiệu ứng bật/tắt, âm thanh, rung, chấm độ khó', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.more('skin');
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
  await app.tab('home');
  await app.view().locator('.hero [data-act="start-day"]').click();
  await app.view().locator('[data-act="set-done"][data-e="0"][data-s="0"]').click();
  await expect(app.view().locator('.eff')).toHaveCount(0);
});

test('lưu ý form: Đầy đủ (thu gọn sau set đầu, mở lại được) · Gọn · Tắt', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.view().locator(`.dchip[data-id="${P.chest.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  await expect(app.view().locator('.fcue')).toContainText('Ép bả vai ra sau');
  await app.view().locator('[data-act="set-done"][data-e="0"][data-s="0"]').click();
  await expect(app.view().locator('.fcue1[data-act="cue-open"]')).toContainText('+2 lưu ý');
  await app.view().locator('.fcue1[data-act="cue-open"]').click();
  await expect(app.view().locator('.fcue')).toBeVisible();
  await app.view().locator('.fcue [data-act="cue-open"]').click();
  await expect(app.view().locator('.fcue1')).toBeVisible();
  await app.more('form');
  await app.view().locator('[data-act="form-lv"][data-k="compact"]').click();
  await expect(app.toast()).toHaveText('Lưu ý form: Gọn');
  await app.tab('today');
  await expect(app.view().locator('.fcue1[data-act="guide"]')).toBeVisible();
  await app.more('form');
  await app.view().locator('[data-act="form-lv"][data-k="off"]').click();
  await app.tab('today');
  await expect(app.view().locator('.fcue, .fcue1')).toHaveCount(0);
});

test('nhịp rep và nhịp nghỉ đổi thời gian dự kiến của buổi', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  const est = () => app.view().locator('.hero .etm').textContent();
  const std = await est();
  await app.more('pace');
  await expect(app.view()).toContainText('set 10 rep ≈ 35 giây');
  await app.view().locator('[data-act="tempo"][data-k="4"]').click();
  await expect(app.view()).toContainText('set 10 rep ≈ 45 giây');
  await app.view().locator('[data-act="rest-mode"][data-k="heavy"]').click();
  await expect(app.toast()).toHaveText('Nhịp nghỉ: Nặng');
  await expect(app.view()).toContainText('Bài chân 3 phút');
  await app.tab('home');
  const slow = await est();
  expect(parseInt(slow.replace(/\D/g, ''))).toBeGreaterThan(parseInt(std.replace(/\D/g, '')));
  await app.more('pace');
  await app.view().locator('[data-act="rest-mode"][data-k="fast"]').click();
  await app.view().locator('[data-act="tempo"][data-k="2"]').click();
  expect((await app.state()).settings).toMatchObject({ restMode: 'fast', tempo: 2 });
});

test('chiều cao của hồ sơ', async ({ app, page }) => {
  await app.goto();
  await app.more('height');
  await page.locator('input[data-k="height"]').fill('172');
  await expect.poll(async () => (await app.state()).settings.height).toBe(172);
  await app.tab('more');
  await expect(app.view().locator('.grow', { hasText: 'Chỉ số cơ thể' })).toContainText('Cao 172 cm');
});

test('cài ứng dụng khi trình duyệt cho phép (Android/Chrome); đã cài (chạy toàn màn hình) thì ẩn mục này', async ({ app, page }) => {
  await app.goto();
  await app.more('install');
  await expect(app.view()).toContainText('Cài lên màn hình điện thoại');
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
    states: { p1: state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -1), [[P.bench, [[40, 10]]]])], settings: { skin: 'gold', skin22: 1 } }), p2: state({ days: [] }) },
    photos: { ph1: PHOTO }
  });
  await app.more('wipe');
  await app.click('wipe');
  await expect(app.sheet()).toContainText('Xoá toàn bộ dữ liệu?');
  await app.click('confirm-ok');
  await expect(app.toast()).toHaveText('Đã xoá dữ liệu');
  const st = await app.state();
  expect(st.days).toHaveLength(0); expect(st.sessions).toHaveLength(0);
  expect(st.settings.skin).toBe('gold');
  expect(await app.profiles()).toMatchObject({ active: 'p1', list: [{ id: 'p1', name: 'Tôi' }] });
  expect(await app.idb('photos')).toEqual([]);
  await app.flushed();
  expect(await app.idb('kv', 'state:p2')).toBeUndefined();
  await expect(app.view()).toContainText('Cuốn sổ tạ trong túi bạn');
});
