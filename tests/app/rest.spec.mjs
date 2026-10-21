// BR-04 Đồng hồ nghỉ giữa set và báo hết giờ (trong app + Phím tắt iPhone).
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan } from '../helpers/data.mjs';

async function startAndRest(app, settings = {}) {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days, settings }) });
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  await app.view().locator('[data-act="set-done"][data-e="0"][data-s="0"]').click();
  return P;
}

test('bài lớn thân trên nghỉ 90 giây (nhịp Chuẩn); +15s, −15s, bỏ qua', async ({ app, page }) => {
  await startAndRest(app);
  await expect(page.locator('#rest')).toBeVisible();
  await expect(page.locator('#rest-t')).toHaveText(/^1:(30|29)$/);
  await page.locator('[data-act="rest-add"]').click();
  await expect(page.locator('#rest-t')).toHaveText(/^1:4[45]$/);
  await page.locator('[data-act="rest-sub"]').click();
  await page.locator('[data-act="rest-sub"]').click();
  await expect(page.locator('#rest-t')).toHaveText(/^1:1[45]$/);
  await page.locator('[data-act="rest-skip"]').click();
  await expect(page.locator('#rest')).toBeHidden();
});

test('hết giờ nghỉ: đếm 3-2-1, chuông + hộp báo, bấm “Vào set tiếp” để tắt; +15s sau khi hết giờ thì nghỉ thêm', async ({ app, page }) => {
  await startAndRest(app);
  await page.clock.fastForward(81000);
  await expect(page.locator('.rest-in')).toHaveClass(/glow/);
  await page.clock.fastForward(7500);
  await expect(page.locator('.rest-in')).toHaveClass(/final/);
  await page.clock.fastForward(3000);
  await expect(page.locator('#alarm')).toBeVisible();
  await expect(page.locator('#alarm-sub')).toContainText('Vào set tiếp: Đẩy ngực tạ đòn');
  await expect(page.locator('#rest-l')).toHaveText('Hết giờ nghỉ · vào set tiếp');
  await page.locator('[data-act="alarm-ok"]').click();
  await expect(page.locator('#alarm')).toBeHidden();
  await expect(page.locator('#rest')).toBeHidden();
  /* −15s khi còn dưới 15 giây = bỏ qua */
  await app.view().locator('[data-act="set-done"][data-e="0"][data-s="1"]').click();
  await page.clock.fastForward(80000);
  await page.locator('[data-act="rest-sub"]').click();
  await expect(page.locator('#rest')).toBeHidden();
});

test('app chạy nền lúc hết giờ: mở lại thì hiện hộp báo “Đã hết giờ từ … trước”', async ({ app, page }) => {
  await startAndRest(app);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.fastForward(100000);
  await expect(page.locator('#alarm')).toBeHidden();
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#alarm')).toBeVisible();
  await expect(page.locator('#alarm-sub')).toContainText('Đã hết giờ từ');
});

test('nhịp nghỉ Nặng và nghỉ riêng của bài; bài cô lập nghỉ ngắn hơn', async ({ app, page }) => {
  const P = await startAndRest(app, { restMode: 'heavy' });
  await expect(page.locator('#rest-t')).toHaveText(/^2:(30|29)$/);
  await page.locator('[data-act="rest-skip"]').click();
  await page.locator('#exnav [data-i="1"]').click();
  await app.view().locator('[data-act="set-done"][data-e="1"][data-s="0"]').click();
  await expect(page.locator('#rest-t')).toHaveText(/^1:(30|29)$/);
});

test('bật báo qua Phím tắt iPhone: mỗi lần nghỉ app gọi shortcuts:// với số giây nghỉ', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.tab('more');
  await expect(app.act('push-test')).toBeDisabled();
  await page.locator('#notify-t').check();
  await expect(app.toast()).toContainText('Đã bật. Bấm “Chạy thử 10 giây”');
  expect((await app.state()).settings.notify).toBe(true);
  const urls = await app.navSpy();
  await app.tap(app.act('push-test'));
  await expect.poll(() => urls).toEqual(['shortcuts://run-shortcut?name=Ngh%E1%BB%89%20gi%E1%BB%AFa%20set&input=text&text=10']);
  /* đổi tên phím tắt, rồi vào tập: mỗi lần bấm ✓ gọi phím tắt với đúng số giây nghỉ */
  await page.locator('input[data-k="shortcutName"]').fill('Nghỉ');
  await app.tab('today');
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  await app.tap(app.view().locator('[data-act="set-done"][data-e="0"][data-s="0"]'));
  await expect(page.locator('#rest')).toBeVisible();
  await expect.poll(() => urls.length).toBe(2);
  expect(urls[1]).toBe('shortcuts://run-shortcut?name=Ngh%E1%BB%89&input=text&text=90');
  /* tắt lại: nút Chạy thử bị khoá */
  await app.tab('more');
  await page.locator('#notify-t').uncheck();
  expect((await app.state()).settings.notify).toBe(false);
  await expect(app.act('push-test')).toBeDisabled();
});
