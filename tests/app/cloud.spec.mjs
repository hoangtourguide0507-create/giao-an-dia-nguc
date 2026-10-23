// BR-18 (đã gỡ, PA-41): app chạy trong claude.ai không còn đồng bộ với tài khoản Claude; mọi dữ liệu chỉ nằm trên máy.
import { test, expect } from '../helpers/fixtures.mjs';
import { installCloud, cloudState } from '../helpers/cloud.mjs';
import { state, basicPlan, session, addDays, TODAY, PHOTO } from '../helpers/data.mjs';

test('BR-18 · đã gỡ: trong claude.ai, lưu buổi tập và ảnh không ghi gì lên tài khoản Claude', async ({ app, page }) => {
  await installCloud(page);
  const P = basicPlan(); P.bench.photos = ['ph1'];
  await app.seed({ state: state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -1), [[P.bench, [[40, 10]]]])], updatedAt: 5 }), photos: { ph1: PHOTO } });
  await app.tab('week');
  await app.view().locator('.list [data-act="open-session"]').first().click();
  await app.click('del-session'); await app.click('confirm-ok');
  await app.page.waitForTimeout(2000);
  expect((await cloudState(page)).docs).toEqual({});
  expect((await cloudState(page)).log).toEqual([]);
});

test('BR-18 · đã gỡ: trang Tài khoản không có trạng thái tài khoản Claude', async ({ app, page }) => {
  await installCloud(page);
  await app.seed({ state: state({ updatedAt: 5 }) });
  await app.tab('more');
  await expect(app.view().locator('#sync h3')).toHaveText('Lưu trên máy này');   /* chỉ tiêu đề, không có trạng thái tài khoản (BR-27.8) */
  await expect(app.view()).not.toContainText('tài khoản Claude');
});
