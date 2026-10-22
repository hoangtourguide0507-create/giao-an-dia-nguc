// BR-07 Kế hoạch tuần: tổng kết tuần trước, chọn trọng tâm (cân bằng / ưu tiên / deload), duyệt mức tạ từng bài.
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, session, addDays, TODAY, MONDAY } from '../helpers/data.mjs';

function setup(extra = {}) {
  const P = basicPlan();
  const last = addDays(MONDAY, -5);
  const ss = [session(P.chest, last, [[P.bench, [[40, 10], [40, 10], [40, 10]]], [P.fly, [[30, 9], [30, 8], [30, 8]]]]),
    session(P.back, addDays(MONDAY, -6), [[P.lat, [[45, 10], [45, 10], [45, 10]]]])];
  return { P, st: state({ days: P.days, sessions: ss, wpSkip: null, ...extra }) };
}

test('đầu tuần tự mở kế hoạch tuần; duyệt theo gợi ý thì buổi tập dùng mức tạ đã duyệt', async ({ app, page }) => {
  const { P, st } = setup();
  await app.seed({ state: st });
  await expect(app.sheet()).toContainText('Kế hoạch tuần 19/10 – 25/10', { timeout: 3000 });
  await expect(app.sheet().locator('.wpsum')).toContainText('2');
  await expect(app.sheet()).toContainText('Duyệt mức tạ · 2 bài thay đổi');
  await expect(app.sheet()).toContainText('Nhóm cơ còn thiếu set: Ngực, Lưng, Tay trước, Tay sau.');
  await expect(app.sheet().locator('.wprow')).toHaveCount(2);
  await expect(app.sheet().locator('.wprow.up').first()).toContainText('42,5');
  await expect(app.sheet()).toContainText('bài giữ nguyên mức tạ');
  await app.click('wp-approve');
  await expect(app.toast()).toHaveText('Đã duyệt kế hoạch tuần');
  const plan = (await app.state()).weekPlans[MONDAY];
  expect(plan).toMatchObject({ mode: 'balanced', kg: { [P.bench.id]: 42.5, [P.lat.id]: 47.5, [P.fly.id]: 30 } });
  await app.tab('plan');
  await expect(app.view().locator('.restcard')).toContainText('Tuần cân bằng · đã duyệt');
  await expect(app.view().locator('.restcard')).toContainText('2 bài lên tạ tuần này');
  await app.tab('home');
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  await expect(app.view().locator('.target')).toContainText('Lần trước · 14/10');
});

test('giữ mức cũ hoặc tự chỉnh từng bài, đổi chế độ deload/ưu tiên rồi duyệt', async ({ app }) => {
  const { P, st } = setup({ settings: { cycleStart: addDays(MONDAY, -14) } });
  const pull = ex('Hít xà (Pull-up)', { muscle: 'Lưng', currentKg: 0 });
  st.days[0].exercises.push(pull);
  await app.seed({ state: st });
  await expect(app.sheet()).toContainText('Kế hoạch tuần', { timeout: 3000 });
  await app.sheet().locator(`[data-act="wp-dec"][data-id="${P.bench.id}"][data-v="hold"]`).click();
  await expect(app.sheet().locator('.wprow').first()).not.toHaveClass(/up/);
  await app.sheet().locator(`[data-act="wp-step"][data-id="${P.lat.id}"][data-d="1"]`).click();
  await app.sheet().locator(`[data-act="wp-step"][data-id="${P.lat.id}"][data-d="1"]`).click();
  await expect(app.sheet().locator('.wprow').nth(1)).toContainText('52,5');
  await app.sheet().locator(`[data-act="wp-dec"][data-id="${P.bench.id}"][data-v="ok"]`).click();
  /* chế độ deload: tạ ~90% */
  await app.sheet().locator('[data-act="wp-mode"][data-k="deload"]').click();
  await expect(app.sheet()).toContainText('Tuần nhẹ: tạ ~90%');
  await expect(app.sheet().locator('.wprow').first()).toContainText('35');
  /* chế độ ưu tiên một nhóm cơ */
  await app.sheet().locator('[data-act="wp-mode"][data-k="focus"]').click();
  await expect(app.sheet().locator('[data-act="wp-focus"]')).toHaveText(['Ngực', 'Lưng', 'Tay']);
  await app.sheet().locator('[data-act="wp-focus"][data-k="Lưng"]').click();
  await expect(app.sheet()).toContainText('Áp dụng cho');
  await app.click('wp-approve');
  await expect(app.toast()).toHaveText('Đã duyệt · tuần ưu tiên Lưng');
  const plan = (await app.state()).weekPlans[MONDAY];
  expect(plan).toMatchObject({ mode: 'focus', focus: 'Lưng', dec: { [P.bench.id]: 'ok', [P.lat.id]: 'custom' }, kg: { [P.lat.id]: 52.5 } });
  await app.tab('plan');
  await expect(app.view().locator('.restcard')).toContainText('Tuần ưu tiên Lưng · đã duyệt');
  await app.tab('home');
  /* buổi Lưng trong tuần ưu tiên Lưng: dưới 3 bài lưng nên thêm 1 bài lưng từ ngày khác, bài lưng lên đầu */
  await app.view().locator(`[data-act="pick-day"][data-id="${P.back.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  const a = (await app.state()).active;
  expect(a.focus).toBe('Lưng');
  expect(a.entries.map(e => e.exId)).toEqual([P.lat.id, P.row.id, pull.id, P.curl.id]);
  /* PA-29 (VD-05): số set luôn giữ nguyên, và chữ hướng dẫn nói đúng như vậy */
  expect(a.entries.map(e => e.sets.length)).toEqual([3, 3, 3, 3]);
  /* mở lại kế hoạch đã duyệt để sửa */
  await app.click('cancel-session'); await app.click('confirm-ok');
  await app.toastGone();
  await app.tab('plan');
  await app.click('wp-open');
  await expect(app.sheet().locator('[data-act="wp-mode"][data-k="focus"]')).toHaveAttribute('aria-pressed', 'true');
  await app.click('wp-mode', '[data-k="deload"]');
  await app.click('wp-approve');
  await expect(app.toast()).toHaveText('Đã duyệt · tuần deload');
  await app.tab('plan');
  await expect(app.view().locator('.restcard')).toContainText('Tuần deload · đã duyệt');
});

test('“Để sau” hoặc đóng: không tự mở lại trong tuần; banner vẫn cho mở', async ({ app, page }) => {
  const { st } = setup();
  await app.seed({ state: st });
  await expect(app.sheet()).toContainText('Kế hoạch tuần', { timeout: 3000 });
  await app.click('wp-later');
  expect((await app.state()).wpSkip).toBe(MONDAY);
  await expect(app.view()).toContainText('Kế hoạch tuần 19/10 chưa duyệt');
  await app.flushed();
  await app.reload();
  await page.waitForTimeout(900);
  await expect(page.locator('#sheet')).toBeHidden();
  await app.click('wp-open');
  await app.closeSheet();
  await expect(page.locator('#sheet')).toBeHidden();
});

test('đủ 6 tuần: kế hoạch tuần gợi ý deload; giáo án chưa có buổi thì không tự mở', async ({ app, page }) => {
  const { st } = setup({ settings: { cycleStart: addDays(TODAY, -45) } });
  await app.seed({ state: st });
  await expect(app.sheet()).toContainText('Đã đủ 6 tuần, nên deload tuần này.', { timeout: 3000 });
  await expect(page.locator('#cycle')).toHaveText('Tuần deload');
  await app.sheet().locator('[data-act="wp-mode"][data-k="balanced"]').click();
  await expect(app.sheet()).toContainText('Gợi ý: đã đủ 6 tuần, nên chọn Deload.');
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days, wpSkip: null, settings: { cycleStart: addDays(TODAY, -8) } }) });
  await page.waitForTimeout(900);
  await expect(page.locator('#sheet')).toBeHidden();
  await expect(page.locator('#cycle')).toHaveText('Tuần 2/6');
});

test.fixme('VD-31: duyệt kế hoạch tuần Deload khi hồ sơ chưa có ngày bắt đầu chu kỳ làm lỗi vẽ lại màn hình', async ({ app, page }) => {
  const { st } = setup();
  await app.seed({ state: st });
  await expect(app.sheet()).toContainText('Kế hoạch tuần', { timeout: 3000 });
  await app.sheet().locator('[data-act="wp-mode"][data-k="deload"]').click();
  await app.click('wp-approve');
  await expect(app.toast()).toHaveText('Đã duyệt · tuần deload');
  expect(page.__errors || []).toEqual([]);
});

test('tổng kết tuần trước ghi số bài đã lên tạ và bài đang chững', async ({ app }) => {
  const P = basicPlan();
  const prev = addDays(MONDAY, -6), older = addDays(MONDAY, -13);
  const ss = [session(P.chest, older, [[P.bench, [[37.5, 10], [37.5, 10], [37.5, 10]]], [P.fly, [[30, 10], [30, 9], [30, 8]]]]),
    session(P.chest, addDays(older, 1), [[P.fly, [[30, 9], [30, 8], [30, 7]]]]),
    session(P.chest, prev, [[P.bench, [[40, 10], [40, 10], [40, 10]]], [P.fly, [[30, 8], [30, 7], [30, 6]]]])];
  await app.seed({ state: state({ days: P.days, sessions: ss, wpSkip: null }) });
  await expect(app.sheet()).toContainText('Kế hoạch tuần', { timeout: 3000 });
  await expect(app.sheet().locator('.wpnote').first()).toContainText('1 bài');
  await expect(app.sheet().locator('.wpnote').first()).toContainText('đã lên tạ');
});

test('PA-29 (VD-05): chữ kế hoạch tuần khớp hành vi — mọi bài giữ nguyên số set, kể cả Ưu tiên và Deload', async ({ app }) => {
  const { P, st } = setup();
  await app.seed({ state: st });
  await expect(app.sheet()).toContainText('Kế hoạch tuần', { timeout: 3000 });
  await app.sheet().locator('[data-act="wp-mode"][data-k="focus"]').click();
  await app.sheet().locator('[data-act="wp-focus"][data-k="Lưng"]').click();
  const f = await app.sheet().locator('.wpfocus + .wpnote').textContent();
  expect(f).not.toMatch(/\+1 set|−1 set/);
  expect(f).toContain('giữ nguyên số set');
  await app.sheet().locator('[data-act="wp-mode"][data-k="deload"]').click();
  const d = await app.sheet().locator('.wpmode ~ .wpnote').first().textContent();
  expect(d).not.toContain('giảm một nửa');
  expect(d).toContain('giữ nguyên số set');
  /* bảng duyệt: mỗi dòng hiện đủ 3×10, không còn 2×10 */
  const why = await app.sheet().locator('.wprow .why').allTextContents();
  expect(why.length).toBeGreaterThan(0);
  for (const w of why) expect(w).toMatch(/^3×10/);
  expect(P.bench.sets).toBe(3);
});

test('PA-29 (VD-05): gợi ý và banner tuần deload không hứa giảm nửa số set', async ({ app }) => {
  const { st } = setup({ settings: { cycleStart: addDays(TODAY, -50) }, wpSkip: MONDAY });
  await app.seed({ state: st });
  await app.tab('home');
  await expect(app.view()).toContainText('Tuần deload');
  expect(await app.view().textContent()).not.toContain('một nửa số set');
});
