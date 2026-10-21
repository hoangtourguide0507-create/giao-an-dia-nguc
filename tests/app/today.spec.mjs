// BR-06 Màn Tập (chưa vào buổi): gợi ý buổi theo độ hồi phục, chọn buổi khác, các banner nhắc việc.
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, session, addDays, TODAY, PHOTO, at } from '../helpers/data.mjs';

test('gợi ý buổi có nhóm cơ đã hồi phục; nhóm cơ lớn cần 72 giờ', async ({ app }) => {
  const P = basicPlan();
  /* hôm qua tập ngực → hôm nay gợi ý lưng */
  const s = session(P.chest, addDays(TODAY, -1), [[P.bench, [[40, 10], [40, 10], [40, 10]]], [P.push, [[20, 10], [20, 10]]]]);
  await app.seed({ state: state({ days: P.days, sessions: [s] }) });
  await expect(app.view().locator('.hero .eyebrow')).toHaveText('Gợi ý hôm nay');
  await expect(app.view().locator('.hero .h1')).toHaveText('Lưng + Tay trước');
  await expect(app.view().locator('.hero .why')).toContainText('đã phục hồi');
  await expect(app.view().locator('.hero')).toContainText('3 bài · 9 set');
  await expect(app.view().locator(`.dcard[data-id="${P.back.id}"] .tag`)).toHaveText('Gợi ý');
  await expect(app.view().locator(`.dcard[data-id="${P.chest.id}"] .rs`)).toContainText('Đang hồi phục');
  /* chọn buổi chưa hồi phục: cảnh báo, đề nghị đổi */
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await expect(app.view().locator('.hero .eyebrow')).toHaveText('Bạn chọn');
  await expect(app.view().locator('.warnline')).toContainText('Nhóm cơ chính chưa phục hồi đủ');
  await app.view().locator('.warnline [data-act="pick-day"]').click();
  await expect(app.view().locator('.hero .eyebrow')).toHaveText('Bạn chọn · đúng gợi ý');
  /* thẻ độ hồi phục */
  const card = app.view().locator('details.rdy');
  await expect(card).toContainText('2 nhóm đang hồi phục');
  await card.locator('summary').click();
  await expect(card.locator('.rrow')).toHaveCount(4);
  await expect(card.locator('.rrow', { hasText: 'Ngực' })).toContainText('còn');
  await expect(card.locator('.rrow', { hasText: 'Lưng' })).toContainText('Sẵn sàng');
});

test('hôm nay đã tập: thẻ “đã tập”, gợi ý buổi tiếp theo; hiển thị nhiều bài hơn 4', async ({ app }) => {
  const P = basicPlan();
  P.chest.exercises.push(ex('Xà kép (Dips)', { currentKg: 0 }), ex('Ép cáp (Cable fly)', { type: 'iso', currentKg: 15 }));
  const s = session(P.back, TODAY, [[P.lat, [[45, 10]]]], { startedAt: at(TODAY, '07:00') });
  await app.seed({ state: state({ days: P.days, sessions: [s] }) });
  await expect(app.view().locator('.restcard')).toContainText('Hôm nay đã tập Lưng + Tay trước');
  await expect(app.view().locator('.hero .eyebrow')).toHaveText('Gợi ý buổi tiếp theo');
  await expect(app.view().locator('.hero li.more')).toHaveText('+1 bài khác');
  await expect(app.view().locator('.hero li', { hasText: 'Xà kép' })).toContainText('Tự trọng');
});

test('banner: cơ thể chưa hồi phục (nhịp tim nghỉ cao, HRV thấp)', async ({ app }) => {
  const P = basicPlan();
  const body = [1, 2, 3, 4, 5].map(i => ({ id: 'b' + i, date: addDays(TODAY, -i), restHR: 60, hrv: 60 }));
  body.push({ id: 'b0', date: TODAY, restHR: 68, hrv: 45 });
  await app.seed({ state: state({ days: P.days, body }) });
  await expect(app.view()).toContainText('Cơ thể có thể chưa hồi phục hết');
  await expect(app.view()).toContainText('nhịp tim nghỉ cao hơn mức thường ngày khoảng 8 bpm và HRV thấp hơn mức thường ngày khoảng 25%');
});

test('banner nhắc chụp ảnh body sau 28 ngày → mở tab Cơ thể', async ({ app }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days, bodyPhotos: [{ id: 'bp1', date: addDays(TODAY, -30), t: 1, pose: 'Trước', photoId: 'x' }] }), photos: { x: PHOTO } });
  await expect(app.view()).toContainText('Đến lúc chụp ảnh body tháng này');
  await app.view().locator('.banner [data-act="tab"][data-tab="body"]').click();
  await expect(app.view()).toContainText('Ảnh trước / sau');
});

test('banner nhắc sao lưu khi đã có ≥5 buổi; “Để sau” ẩn 7 ngày', async ({ app }) => {
  const P = basicPlan();
  const ss = [1, 3, 5, 8, 10].map(i => session(P.chest, addDays(TODAY, -i), [[P.bench, [[40, 10]]]]));
  await app.seed({ state: state({ days: P.days, sessions: ss }) });
  await expect(app.view()).toContainText('Nhắc sao lưu định kỳ');
  await expect(app.view()).toContainText('Bạn đã ghi 5 buổi tập trên máy này.');
  await app.click('backup-snooze');
  await expect(app.toast()).toHaveText('Sẽ nhắc lại sau 7 ngày');
  await expect(app.view()).not.toContainText('Nhắc sao lưu định kỳ');
  /* đã sao lưu lâu và tập thêm 5 buổi thì nhắc lại kèm số buổi mới */
  const st = state({ days: P.days, sessions: [...ss, ...[11, 12, 13, 14, 15].map(i => session(P.back, addDays(TODAY, -i), [[P.lat, [[45, 10]]]]))], settings: { lastBackupAt: Date.parse('2026-09-01T00:00:00Z'), lastBackupSess: 5 } });
  await app.seed({ state: st });
  await expect(app.view()).toContainText('Bạn đã tập thêm 5 buổi từ lần sao lưu trước');
});

test('banner tải thư viện hình: “Để sau” ẩn 7 ngày', async ({ app }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await expect(app.view()).toContainText('Tải thư viện hình hướng dẫn');
  await app.click('pack-skip');
  await expect(app.view()).not.toContainText('Tải thư viện hình hướng dẫn');
  expect((await app.state()).settings.packSkip).toBe(TODAY);
});

test('ngày tập không có bài: nút bắt đầu bị khoá', async ({ app }) => {
  await app.seed({ state: state({ days: [day('Trống', [])] }) });
  await expect(app.view().locator('.hero [data-act="start-day"]')).toBeDisabled();
  await expect(app.view().locator('.dcard .rs').first()).toHaveText('Chưa có bài');
});
