// BR-08 Đau & chấn thương: báo đau theo vùng và mức, app giảm tạ / bỏ bài liên quan, quay lại từ từ khi hết đau.
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, day, ex, session, addDays, TODAY } from '../helpers/data.mjs';

test('báo đau vai mức nhẹ: ghi lại, banner, bài liên quan giảm 20%', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.view().locator('.sec-head [data-act="pain"]').click();
  await expect(app.sheet()).toContainText('Đau & chấn thương');
  await expect(app.act('pain-save')).toBeDisabled();
  await app.sheet().locator('[data-act="pain-area"][data-v="Ngực"]').click();
  await expect(app.sheet()).toContainText('Ảnh hưởng 2 bài trong giáo án: Đẩy ngực tạ đòn, Ép ngực máy');
  await page.fill('#f-pnote', 'đau khi đẩy');
  await app.sheet().locator('[data-act="pain-lv"][data-v="1"]').click();
  await expect(page.locator('#f-pnote')).toHaveValue('đau khi đẩy');
  await app.click('pain-save');
  await expect(app.toast()).toHaveText('Đã ghi đau ngực · 2 bài được điều chỉnh');
  const p = (await app.state()).pains[0];
  expect(p).toMatchObject({ area: 'Ngực', level: 1, since: TODAY, note: 'đau khi đẩy', resolvedAt: null });
  await expect(app.view().locator('.banner.pain')).toContainText('Đang đau: Ngực · nhẹ');
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await expect(app.view().locator('.hero .painl')).toContainText('2 bài giảm 20% do đau nhẹ');
  /* 80% của 40 kg làm tròn xuống theo nấc 2,5 kg */
  await expect(app.view().locator('.hero li').first()).toContainText('30 kg ⚠');
  /* trong Tự chọn bài có ghi chú đau */
  await app.click('custom-open');
  await expect(app.sheet().locator(`[data-act="custom-toggle"][data-id="${P.bench.id}"]`)).toContainText('Đau ngực');
});

test('đau vừa: bỏ các bài liên quan khi bắt đầu buổi; nâng mức đau cùng vùng; hết đau thì quay lại 80%', async ({ app }) => {
  const P = basicPlan();
  const pain = { id: 'pa', area: 'Ngực', level: 2, since: addDays(TODAY, -3), note: '', resolvedAt: null };
  await app.seed({ state: state({ days: P.days, pains: [pain] }) });
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await expect(app.view().locator('.hero .painl')).toContainText('2 bài bỏ do đang đau');
  await expect(app.view().locator('.hero li').first()).toContainText('Bỏ · đau');
  await app.view().locator('.hero [data-act="start-day"]').click();
  await expect(app.toast()).toContainText('Đã bỏ 2 bài liên quan chỗ đau');
  expect((await app.state()).active.entries.map(e => e.exId)).toEqual([P.push.id]);
  /* trong buổi: báo thêm mức nặng cho cùng vùng → cập nhật, không tạo bản ghi mới */
  await app.view().locator('.sess-actions [data-act="pain"]').click();
  await app.sheet().locator('[data-act="pain-area"][data-v="Ngực"]').click();
  await expect(app.sheet().locator('[data-act="pain-lv"][data-v="2"]')).toHaveAttribute('aria-pressed', 'true');
  await app.sheet().locator('[data-act="pain-lv"][data-v="3"]').click();
  await app.click('pain-save');
  let st = await app.state();
  expect(st.pains).toHaveLength(1); expect(st.pains[0].level).toBe(3);
  await app.click('cancel-session'); await app.click('confirm-ok');
  await expect(app.view().locator('.banner.pain')).toContainText('nên đi khám bác sĩ');
  /* hết đau */
  await app.view().locator('.sec-head [data-act="pain"]').click();
  await expect(app.sheet().locator('.painrow')).toContainText('Ngực · Nặng');
  await app.click('pain-ok');
  await expect(app.toast()).toContainText('Hết đau ngực · buổi đầu quay lại tập khoảng 80% tạ');
  st = await app.state();
  expect(st.pains[0].resolvedAt).toBe(TODAY);
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await expect(app.view().locator('.hero .painl')).toContainText('2 bài mới hết đau, tập lại ~80%');
});

test('mọi bài của ngày đều dồn vào chỗ đau: không cho bắt đầu, gợi ý chọn buổi khác', async ({ app }) => {
  const b = ex('Đẩy ngực tạ đòn (Bench press)', { currentKg: 40 });
  const d = day('Ngực', [b]);
  await app.seed({ state: state({ days: [d, day('Chân', [ex('Squat', { muscle: 'Đùi trước', type: 'lower' })])], pains: [{ id: 'pa', area: 'Ngực', level: 2, since: TODAY, resolvedAt: null }] }) });
  await app.view().locator(`[data-act="pick-day"][data-id="${d.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  await expect(app.toast()).toContainText('Mọi bài của ngày này đều dồn lực vào chỗ đang đau');
  expect((await app.state()).active).toBeNull();
});

test('đau kéo dài từ 2 tuần: nhắc đi khám; bản ghi đã khỏi quá 60 ngày được dọn khi ghi đau mới', async ({ app }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days, pains: [
    { id: 'old', area: 'Gối', level: 1, since: '2026-06-01', resolvedAt: '2026-07-01' },
    { id: 'long', area: 'Cổ tay', level: 1, since: addDays(TODAY, -20), resolvedAt: null }] }) });
  await expect(app.view().locator('.banner.pain')).toContainText('kéo dài từ 2 tuần trở lên');
  await app.view().locator('.sec-head [data-act="pain"]').click();
  await app.sheet().locator('[data-act="pain-area"][data-v="Lưng dưới"]').click();
  await app.click('pain-save');
  const st = await app.state();
  expect(st.pains.map(p => p.id).includes('old')).toBe(false);
  expect(st.pains).toHaveLength(2);
});
