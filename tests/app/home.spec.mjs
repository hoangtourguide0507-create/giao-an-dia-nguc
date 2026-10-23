// BR-06 Trang chủ (trước khi vào buổi): gợi ý buổi theo độ hồi phục, chọn buổi khác, thẻ nhỏ, việc cần làm, chuông, nút Tập.
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, session, addDays, TODAY, MONDAY, PHOTO, at } from '../helpers/data.mjs';

const chip = (app, id) => app.view().locator(`.dchip[data-id="${id}"]`);

test('gợi ý buổi có nhóm cơ đã hồi phục; nhóm cơ lớn cần 72 giờ', async ({ app }) => {
  const P = basicPlan();
  /* hôm qua tập ngực → hôm nay gợi ý lưng */
  const s = session(P.chest, addDays(TODAY, -1), [[P.bench, [[40, 10], [40, 10], [40, 10]]], [P.push, [[20, 10], [20, 10]]]]);
  await app.seed({ state: state({ days: P.days, sessions: [s] }) });
  await expect(app.view().locator('.hero.tix .eyebrow')).toHaveText('Gợi ý hôm nay');
  await expect(app.view().locator('.hero .h1')).toHaveText('Lưng + Tay trước');
  await expect(app.view().locator('.hero .why')).toContainText('đã phục hồi');
  await expect(app.view().locator('.hero .meta')).toContainText('3 bài · 9 set');
  await expect(chip(app, P.back.id)).toContainText('Gợi ý');
  await expect(chip(app, P.back.id)).toHaveAttribute('aria-pressed', 'true');
  await expect(chip(app, P.chest.id).locator('i.rd')).toHaveClass(/low/);
  /* chọn buổi chưa hồi phục: cảnh báo, đề nghị đổi */
  await chip(app, P.chest.id).click();
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

test('thẻ nhỏ: tuần này (số buổi / mục tiêu, số set) và buổi gần nhất; chưa có buổi nào thì mời xem giáo án', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  const cards = app.view().locator('.g2 .card.mini');
  await expect(cards.nth(0)).toContainText('0/3 buổi');
  await expect(cards.nth(1)).toContainText('Chưa có buổi nào');
  await cards.nth(1).click();
  await expect(app.view()).toContainText('Lịch tập');
  const s = session(P.chest, TODAY, [[P.bench, [[40, 10], [40, 10]]]], { startedAt: at(TODAY, '07:00') });
  await app.seed({ state: state({ days: P.days, sessions: [s] }) });
  await expect(cards.nth(0)).toContainText('1/3 buổi');
  await expect(cards.nth(0)).toContainText('2 set');
  await expect(cards.nth(1)).toContainText('Ngực + Tay sau');
  await cards.nth(1).click();
  await expect(app.sheet()).toContainText('Ngực + Tay sau');
  await app.closeSheet();
  await cards.nth(0).click();
  await expect(app.view().locator('.ptabs')).toBeVisible();
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

test('việc cần làm: thẻ lật ngang có chấm trang, chuông hiện số việc, bấm chuông mở danh sách đủ', async ({ app, page }) => {
  const P = basicPlan();
  const body = [1, 2, 3, 4, 5].map(i => ({ id: 'b' + i, date: addDays(TODAY, -i), restHR: 60, hrv: 60 }));
  body.push({ id: 'b0', date: TODAY, restHR: 68, hrv: 45 });
  const odd = ex('Bài lạ XYZ', { muscle: 'Khác' });
  await app.seed({ state: state({ days: [...P.days, day('Lạ', [odd])], body, settings: { packSkip: TODAY } }) });
  const items = app.view().locator('#todos .tdi');
  await expect(items).toHaveCount(3);
  await expect(app.view().locator('#todos').locator('..')).toContainText('3 việc · vuốt ngang');
  await expect(items.nth(0)).toContainText('Kế hoạch tuần');
  await expect(items.nth(1)).toContainText('Cơ thể có thể chưa hồi phục hết');
  await expect(items.nth(1)).toContainText('nhịp tim nghỉ cao hơn mức thường ngày khoảng 8 bpm và HRV thấp hơn mức thường ngày khoảng 25%');
  await expect(items.nth(2)).toContainText('Có bài đang để nhóm cơ “Khác”');
  await expect(app.view().locator('#tdots i')).toHaveCount(3);
  await page.locator('#todos').evaluate(el => { el.scrollLeft = el.clientWidth * 2; });
  await expect(app.view().locator('#tdots i').nth(2)).toHaveClass(/on/);
  await expect(page.locator('#bell .bd')).toHaveText('3');
  await page.locator('#bell').click();
  await expect(app.sheet()).toContainText('Việc cần làm');
  await expect(app.sheet().locator('.todo-sheet .banner, .todo-sheet .restcard')).toHaveCount(3);
  await app.closeSheet();
});

test('không có việc gì: chuông ẩn và thẻ việc cần làm không hiện', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days, weekPlans: { [MONDAY]: { mode: 'balanced', focus: '', dec: {}, custom: {}, kg: {}, at: 1 } }, settings: { packSkip: TODAY } }) });
  await expect(page.locator('#bell')).toBeHidden();
  await expect(app.view().locator('#todos .tdi', { hasText: 'Tuần deload' })).toHaveCount(0);
});

test('banner nhắc chụp ảnh body sau 28 ngày → mở mục Ảnh trong Tiến độ', async ({ app }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days, bodyPhotos: [{ id: 'bp1', date: addDays(TODAY, -30), t: 1, pose: 'Trước', photoId: 'x' }] }), photos: { x: PHOTO } });
  await expect(app.view().locator('#todos')).toContainText('Đến lúc chụp ảnh body tháng này');
  await app.view().locator('#todos [data-act="tab"][data-tab="photos"]').click();
  await expect(app.view().locator('.ptabs [data-tab="photos"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(app.view()).toContainText('Ảnh trước / sau');
});

test('banner tải thư viện hình: “Để sau” ẩn 7 ngày', async ({ app }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await expect(app.view().locator('#todos')).toContainText('Tải thư viện hình hướng dẫn');
  await app.click('pack-skip');
  await expect(app.view()).not.toContainText('Tải thư viện hình hướng dẫn');
  expect((await app.state()).settings.packSkip).toBe(TODAY);
});

test('ngày tập không có bài: nút bắt đầu bị khoá', async ({ app }) => {
  await app.seed({ state: state({ days: [day('Trống', [])] }) });
  await expect(app.view().locator('.hero .tgo')).toBeDisabled();
});

test('nút Tập ở giữa thanh dưới: chọn buổi (gợi ý xếp đầu) hoặc tự chọn bài; chưa có giáo án thì về Trang chủ', async ({ app, page }) => {
  const P = basicPlan();
  const s = session(P.chest, addDays(TODAY, -1), [[P.bench, [[40, 10], [40, 10], [40, 10]]]]);
  await app.seed({ state: state({ days: [...P.days, day('Trống', [])], sessions: [s] }) });
  await expect(page.locator('#nav-bar .fab .lb')).toHaveText('Tập');
  await app.startPick();
  await expect(app.sheet()).toContainText('Bắt đầu buổi tập');
  const rows = app.sheet().locator('[data-act="start-day"]');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('Lưng + Tay trước');
  await expect(rows.first()).toContainText('Gợi ý');
  await app.sheet().locator('[data-act="custom-open"]').click();
  await expect(app.sheet()).toContainText('Tự chọn bài');
  await app.closeSheet();
  await app.startPick();
  await app.sheet().locator(`[data-act="start-day"][data-id="${P.chest.id}"]`).click();
  expect((await app.state()).active.dayId).toBe(P.chest.id);
  await expect(page.locator('#nav-bar .fab .lb')).toHaveText('Đang tập');
  /* đang tập: nút giữa quay lại buổi đang tập */
  await app.tab('plan');
  await page.locator('#nav-bar .fab').click();
  await expect(app.view()).toContainText('Đang tập');
  /* chưa có giáo án: bấm nút Tập chỉ về Trang chủ */
  await app.click('cancel-session'); await app.click('confirm-ok');
  await app.seed({ state: state() });
  await app.startPick();
  await expect(app.view()).toContainText('Cuốn sổ tạ trong túi bạn');
  await expect(page.locator('#sheet')).toBeHidden();
});

test('tuần deload (đủ 6 tuần): thẻ việc cần làm báo, “Xong deload” bắt đầu chu kỳ mới; đầu trang đổi nhãn tuần', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days, settings: { cycleStart: addDays(TODAY, -45), packSkip: TODAY }, wpSkip: MONDAY }) });
  await expect(page.locator('#cycle')).toHaveText('Tuần deload');
  const item = app.view().locator('#todos .tdi', { hasText: 'Tuần deload' });
  await expect(item).toContainText('Bạn đã tập 6 tuần liên tục');
  await item.locator('[data-act="deload-done"]').click();
  await expect(app.toast()).toHaveText('Bắt đầu chu kỳ mới');
  expect((await app.state()).settings.cycleStart).toBe(TODAY);
  await expect(page.locator('#cycle')).toHaveText('Tuần 1/6');
  await expect(app.view().locator('#todos .tdi', { hasText: 'Tuần deload' })).toHaveCount(0);
});

test('VD-03: sau 1 tuần deload mà không bấm “Xong deload” thì tự sang chu kỳ mới (cycleStart = thứ Hai)', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days, settings: { cycleStart: addDays(TODAY, -60), packSkip: TODAY }, wpSkip: MONDAY }) });
  /* TODAY 21/10: -60 ngày = 22/8 (thứ Bảy); tuần deload 3–9/10; tuần 8 bắt đầu 10/10 (thứ Bảy); thứ Hai đầu tiên sau đó là 12/10 */
  await expect(page.locator('#cycle')).toHaveText('Tuần 2/6');
  await expect(app.view().locator('#todos .tdi', { hasText: 'Tuần deload' })).toHaveCount(0);
  await expect.poll(async () => (await app.state()).settings.cycleStart).toBe('2026-10-12');
  /* đang trong tuần deload (tuần 7) thì giữ nguyên */
  await app.seed({ state: state({ days: P.days, settings: { cycleStart: addDays(TODAY, -45), packSkip: TODAY }, wpSkip: MONDAY }) });
  await expect(page.locator('#cycle')).toHaveText('Tuần deload');
  expect((await app.state()).settings.cycleStart).toBe(addDays(TODAY, -45));
});
