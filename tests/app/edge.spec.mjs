// Các tình huống phụ của từng nhóm tính năng: dữ liệu cũ, ảnh khi đồng bộ, quét các loại mã khác, báo cáo giảm so với tháng trước.
import { test, expect, fakeCamera } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, session, addDays, TODAY, MONDAY, PHOTO, b64u } from '../helpers/data.mjs';

const clip = page => page.evaluate(() => navigator.clipboard.readText());
const setClip = (page, t) => page.evaluate(t => navigator.clipboard.writeText(t), t);

test('danh sách người tập: số buổi tuần này, cân nặng và thay đổi so với ~1 tháng trước', async ({ app, page }) => {
  const P = basicPlan();
  const st2 = state({ days: P.days, sessions: [session(P.chest, MONDAY, [[P.bench, [[40, 10], [40, 10]]]]), session(P.back, TODAY, [[P.lat, [[45, 10]]]], { startedAt: Date.now() - 7200e3 })],
    body: [{ id: 'a', date: '2026-09-10', weight: 60 }, { id: 'b', date: '2026-10-15', weight: 61.5 }] });
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: st2 } });
  await page.locator('.who').click();
  const row = app.sheet().locator('.prow').nth(1);
  await expect(row).toContainText('2 buổi tuần này');
  await expect(row).toContainText('3 set');
  await expect(row).toContainText('61,5 kg ▲1,5');
  await expect(row).toContainText('Lần cuối: Lưng + Tay trước · hôm nay');
  await expect(app.sheet().locator('.prow').first()).toContainText('Chưa tập buổi nào');
});

test('bật HLV khi hồ sơ “Tôi” đã có dữ liệu: giữ lại và đổi tên; hoặc vẫn tự tập thì đổi thành tên HLV', async ({ app, page }) => {
  const P = basicPlan();
  const withData = state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -1), [[P.bench, [[40, 10]]]])] });
  const prof = { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'An', color: 1 }] };
  await app.seed({ profiles: prof, states: { p1: withData, p2: state() } });
  await app.click('coach-setup');
  await app.sheet().locator('[data-act="coach-self"][data-v="coach"]').click();
  await expect(app.sheet()).toContainText('Nếu đã có dữ liệu, app giữ lại');
  await app.click('coach-save');
  await expect(app.toast()).toContainText('hồ sơ cũ có dữ liệu nên được giữ lại');
  expect((await app.profiles()).list.map(p => p.name)).toEqual(['Hoàng (dữ liệu cũ)', 'An']);
  await app.seed({ profiles: prof, states: { p1: withData, p2: state() } });
  await app.click('coach-setup');
  await app.click('coach-save');
  expect((await app.profiles()).list.map(p => p.name)).toEqual(['Hoàng', 'An']);
});

test('buổi cũ có drop set kiểu cũ: mở lại, kết thúc, tổng kết vẫn tính drop', async ({ app }) => {
  const P = basicPlan();
  const s = session(P.chest, TODAY, [[P.bench, [[40, 10], [40, 10], [40, 10]], { drop: { kg: 30, reps: 12 } }]], { startedAt: Date.now() - 3600e3 });
  await app.seed({ state: state({ days: P.days, sessions: [s] }) });
  await app.view().locator('.restcard [data-act="reopen-session"]').click();
  await app.page.locator('#exnav [data-i="0"]').click();
  await expect(app.view().locator('#row-0-drop')).toBeVisible();
  await app.view().locator('.sess-actions [data-act="finish"]').click();
  await expect(app.sheet().locator('.kpi').nth(1)).toContainText('4');
  await app.click('save-session');
  const st = await app.state();
  expect(st.sessions[0].entries[0].drop).toEqual({ kg: 30, reps: 12 });
  await app.tab('week');
  await app.view().locator('.list [data-act="open-session"]').first().click();
  await expect(app.sheet()).toContainText('D 30×12');
});

test('kéo xuống làm mới khi không dùng tài khoản; kéo khi đang mở bảng thì không làm gì', async ({ app, page }) => {
  await app.goto();
  const pull = (y0, y1) => page.evaluate(([y0, y1]) => {
    const t = (type, y) => document.body.dispatchEvent(new TouchEvent(type, { bubbles: true, touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: document.body, clientY: y })] }));
    t('touchstart', y0); t('touchmove', y0 - 20); t('touchmove', y1); t('touchend', y1);
  }, [y0, y1]);
  await pull(100, 320);
  await expect(app.toast()).toHaveText('Đã cập nhật');
  await app.toastGone();
  await app.click('qr-scan');
  await pull(100, 320);
  await page.waitForTimeout(600);
  await expect(app.toast()).toBeHidden();
});

test('tuần ưu tiên: tạ đơn và bài thay thế dùng kế hoạch; bài chưa có mức tạ không cần duyệt', async ({ app }) => {
  const P = basicPlan();
  P.row.currentKg = null;
  const ss = [session(P.back, addDays(MONDAY, -6), [[P.lat, [[45, 10], [45, 10], [45, 10]]], [P.curl, [[10, 12], [10, 12], [10, 12]]]])];
  await app.seed({ state: state({ days: P.days, sessions: ss }) });
  await app.click('wp-open');
  await expect(app.sheet()).toContainText('bài giữ nguyên mức tạ');
  await app.sheet().locator('details.wpkeep summary').click();
  await expect(app.sheet().locator('details.wpkeep')).toContainText('chưa có mức tạ');
  await app.sheet().locator(`[data-act="wp-step"][data-id="${P.curl.id}"][data-d="-1"]`).click();
  await expect(app.sheet().locator('.wprow', { hasText: 'Cuốn tạ đơn' })).toContainText('kg/tay');
  await app.click('wp-approve');
  const plan = (await app.state()).weekPlans[MONDAY];
  expect(plan.kg[P.curl.id]).toBe(10);
  expect(plan.kg[P.row.id]).toBeUndefined();
});

test('chip gợi ý trong buổi: tuần giảm tải, đang đau; thẻ bài chưa tới: tự trọng / chưa có mức tạ', async ({ app }) => {
  const P = basicPlan();
  const dips = ex('Xà kép (Dips)', { currentKg: 0 }), cable = ex('Ép cáp (Cable fly)', { type: 'iso', currentKg: null });
  P.chest.exercises.push(dips, cable);
  const hist = session(P.chest, addDays(TODAY, -8), [[P.bench, [[40, 10], [40, 10], [40, 10]]], [P.push, [[20, 10], [20, 10], [20, 10]]]]);
  await app.seed({ state: state({ days: P.days, sessions: [hist], settings: { cycleStart: addDays(TODAY, -50) },
    pains: [{ id: 'p', area: 'Khuỷu tay', level: 1, since: addDays(TODAY, -1), resolvedAt: null }] }) });
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  expect((await app.state()).active.deload).toBe(true);
  await expect(app.view().locator('article.ex.focus .sugchip')).toHaveText('↓ Gợi ý 35kg · tuần giảm tải');
  await expect(app.view().locator('article.ex', { hasText: 'Xà kép' })).toContainText('3×10 · tự trọng');
  await expect(app.view().locator('article.ex', { hasText: 'Ép cáp' })).toContainText('chưa có mức tạ');
  await app.page.locator('#exnav [data-i="2"]').click();
  /* PA-29 (VD-16): deload + đau nhẹ lấy mức giảm thấp hơn (80% của 20 kg = 16 → 15 kg), không nhân dồn (trước đây 12,5 kg) */
  await expect(app.view().locator('article.ex.focus .sugchip')).toHaveText('↓ Gợi ý 15kg · đang đau');
  /* bài chưa có mức tạ: khởi động nhờ nhập kg */
  await app.page.locator('#exnav [data-i="4"]').click();
  await expect(app.view().locator('#warm-4')).toContainText('Nhập số kg ở một set bên dưới');
});

test('giờ nghỉ riêng không có trong danh sách (từ mã giáo án) vẫn hiện đúng khi sửa bài', async ({ app, page }) => {
  const b = ex('Đẩy ngực tạ đòn (Bench press)', { rest: 100 });
  await app.seed({ state: state({ days: [day('Ngực', [b])] }) });
  await app.tab('plan'); await app.click('toggle-day'); await app.click('edit-ex');
  await expect(page.locator('#f-rest')).toHaveValue('100');
  await expect(page.locator('#f-rest option:checked')).toHaveText('1:40 phút');
  await page.locator('#f-type').selectOption('lower');
  await expect(page.locator('#f-rest option').first()).toContainText('Tự động · 2:00');
});
