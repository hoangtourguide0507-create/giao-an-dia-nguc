// BR-27.5 · BR-27.7 · BR-27.8 · BR-27.9 · BR-27.10 · BR-27.11 · BR-27.12: bỏ khôi phục/ngắt kết nối, thư viện hình cho học viên,
// thẻ "Lưu trên máy này", lịch tập (dòng tóm tắt, sắp theo sức khoẻ cơ, báo cơ chưa phục hồi).
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, session, addDays, TODAY } from '../helpers/data.mjs';

/* máy học viên: đã nối với HLV qua thẻ (có khoá dk) */
const hvSync = { s: 'https://gadn-push.test', i: 'hv-lan', dk: 'khoa-hv', ten: 'Lan', at: 1 };

test('BR-27.5 · máy chưa có vai: không còn “Khôi phục bằng Face ID” trong khối đăng nhập', async ({ app }) => {
  await app.seed({ state: state({ settings: { name: 'Tôi' } }) });
  await app.tab('more');
  await expect(app.view().locator('#login')).toContainText('Quét mã QR');
  await expect(app.view().locator('#login')).not.toContainText('Face ID');
  await expect(app.view()).not.toContainText('Khôi phục từ máy chủ');
});

test('BR-27.5 · máy học viên: không còn Bật khôi phục bằng Face ID, Khôi phục từ máy chủ, Ngắt kết nối', async ({ app }) => {
  await app.seed({ state: state({ settings: { name: 'Lan', sync: hvSync } }) });
  await app.tab('more');
  await expect(app.view().locator('.card', { hasText: 'Máy chủ đồng bộ mới' })).toBeVisible();
  for (const t of ['Face ID', 'Khôi phục từ máy chủ', 'Hoàn tác khôi phục', 'Ngắt kết nối trên máy này'])
    await expect(app.view()).not.toContainText(t);
  await expect(app.page.locator('[data-act="hub-restore-manual"], [data-act="hub-pk-add"], [data-act="hub-unlink"]')).toHaveCount(0);
});

test('BR-27.7 · học viên: thư viện hình chỉ có trạng thái, không có nút tải hay xoá', async ({ app }) => {
  await app.seed({ state: state({ settings: { name: 'Lan', sync: hvSync } }) });
  await app.tab('more');
  const row = app.view().locator('.grp', { hasText: 'Thư viện hình hướng dẫn' });
  await expect(row).toContainText('Chưa đồng bộ');
  await expect(row.locator('button')).toHaveCount(0);
  await expect(app.page.locator('[data-act="pack-load"]')).toHaveCount(0);
});

test('BR-27.8 · “Lưu trên máy này” chỉ còn tiêu đề; sau khi gửi lên máy chủ đổi màu và đổi chữ', async ({ app }) => {
  await app.seed({ state: state({ settings: { name: 'Tôi' } }) });
  await app.tab('more');
  await expect(app.page.locator('#sync h3')).toHaveText('Lưu trên máy này');
  await expect(app.page.locator('#sync p')).toHaveCount(0);
  await app.seed({ state: state({ settings: { name: 'Lan', sync: { ...hvSync, lastOk: Date.now() } } }) });
  await app.tab('more');
  await expect(app.page.locator('#sync h3')).toHaveText('Đã đồng bộ với server');
  await expect(app.page.locator('#sync')).toHaveClass(/ok/);
});

test('BR-27.9 · lịch tập: dòng “x bài · x set” nằm một hàng ngay dưới tiêu đề ngày', async ({ app }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.tab('plan');
  const meta = app.view().locator('.pday-h .pmeta').first();
  await expect(meta).toContainText('bài');
  expect(await meta.evaluate(el => getComputedStyle(el).whiteSpace)).toBe('nowrap');
  const b = await app.view().locator('.pday-h b').first().boundingBox(), m = await meta.boundingBox();
  expect(m.y).toBeGreaterThanOrEqual(b.y + b.height - 1);
  expect(m.y - (b.y + b.height)).toBeLessThan(12);
});

test('BR-27.10 · lịch tập: ngày có nhóm cơ vừa tập xếp sau ngày đã hồi phục', async ({ app }) => {
  const P = basicPlan();
  const ss = [session(P.chest, addDays(TODAY, -1), [[P.bench, [[40, 10], [40, 10]]]])];
  await app.seed({ state: state({ days: P.days, sessions: ss }) });
  await app.tab('plan');
  await expect(app.view().locator('.pday-h b').first()).toHaveText(P.days[1].name);
  await expect(app.view().locator('.pday-h b').nth(1)).toHaveText(P.days[0].name);
});

test('BR-27.11 · báo “cơ chưa phục hồi” ở nhóm cơ trong lịch tập; bấm lại thì bỏ báo; bộ đếm hồi phục không đổi', async ({ app }) => {
  const P = basicPlan();
  const ss = [session(P.chest, addDays(TODAY, -1), [[P.bench, [[40, 10], [40, 10]]]])];
  await app.seed({ state: state({ days: P.days, sessions: ss }) });
  await app.tab('plan');
  await app.view().locator('.pday-h', { hasText: P.days[0].name }).click();
  const chip = app.view().locator('[data-act="mpain"][data-m="Ngực"]');
  await chip.click();
  await expect(chip).toContainText('chưa phục hồi');
  expect((await app.state()).musclePain.map(x => x.m)).toEqual(['Ngực']);
  await chip.click();
  await expect(chip).not.toContainText('chưa phục hồi');
  expect((await app.state()).musclePain).toEqual([]);
});

test('BR-27.12 · báo cơ chưa phục hồi tự hết sau 24 giờ', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.tab('plan');
  await app.view().locator('.pday-h', { hasText: P.days[0].name }).click();
  await app.view().locator('[data-act="mpain"][data-m="Ngực"]').click();
  await expect(app.view().locator('[data-act="mpain"][data-m="Ngực"]')).toContainText('vừa báo');
  await page.clock.fastForward(25 * 3600 * 1000);
  await app.tab('home'); await app.tab('plan');   /* ngày đang mở vẫn mở: chỉ đổi nhãn */
  await expect(app.view().locator('[data-act="mpain"][data-m="Ngực"]')).not.toContainText('chưa phục hồi');
});
