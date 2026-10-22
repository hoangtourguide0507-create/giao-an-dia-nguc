// BR-03 Buổi tập: bắt đầu, ghi set, khởi động, drop set, đổi/thêm/bỏ bài, kết thúc, lưu, mở lại, huỷ.
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, session, addDays, TODAY, PHOTO } from '../helpers/data.mjs';

const setBtn = (app, e, s) => app.view().locator(`[data-act="set-done"][data-e="${e}"][data-s="${s}"]`);

async function startChest(app, extra = {}) {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days, ...extra }) });
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  await expect(app.view()).toContainText('Đang tập');
  return P;
}

test('bắt đầu buổi: thanh tiến độ, số set dự kiến, mức tạ lấy từ giáo án, nút tab đổi thành “Đang tập”', async ({ app, page }) => {
  const P = await startChest(app);
  const a = (await app.state()).active;
  expect(a).toMatchObject({ dayId: P.chest.id, dayName: 'Ngực + Tay sau', date: TODAY, deload: false });
  expect(a.entries.map(e => e.name)).toEqual([P.bench.name, P.fly.name, P.push.name]);
  expect(a.entries[0].sets).toEqual([{ kg: 40, reps: 10, done: false }, { kg: 40, reps: 10, done: false }, { kg: 40, reps: 10, done: false }]);
  await expect(page.locator('#prog-l')).toContainText('0/9 set · dự kiến');
  await expect(page.locator('#exnav button')).toHaveCount(3);
  await expect(page.locator('#nav-bar .fab')).toContainText('Đang tập');
  /* bài đang mở có thẻ lưu ý form, set khởi động 3 bậc cho bài lớn ≥ 40 kg */
  await expect(app.view().locator('article.ex.focus .fcue')).toContainText('Trước khi vào bài');
  await expect(app.view().locator('#warm-0 button')).toHaveText(['20×10', '27,5×5', '35×2']);
  /* chuyển tab rồi quay lại vẫn ở buổi đang tập */
  await app.tab('plan');
  await app.tab('today');
  await expect(app.view()).toContainText('Đang tập');
});

test('ghi set: chỉnh kg/rep bằng nút và ô nhập, bấm ✓ bắt đầu nghỉ, chấm độ khó', async ({ app, page }) => {
  await startChest(app);
  await app.view().locator('[data-act="step"][data-e="0"][data-s="0"][data-f="kg"][data-d="1"]').click();
  await app.view().locator('[data-act="step"][data-e="0"][data-s="0"][data-f="reps"][data-d="-1"]').click();
  let s0 = (await app.state()).active.entries[0].sets[0];
  expect(s0).toMatchObject({ kg: 42.5, reps: 9 });
  /* đổi kg set chính thì set khởi động tính lại theo 42,5 kg */
  await expect(app.view().locator('#warm-0 button').first()).toHaveText('22,5×10');
  const kgIn = app.view().locator('input[data-bind="set"][data-e="0"][data-s="1"][data-f="kg"]');
  await kgIn.fill('45');
  await expect.poll(async () => (await app.state()).active.entries[0].sets[1].kg).toBe(45);
  /* rep 0 thì không cho ✓ */
  const repIn = app.view().locator('input[data-bind="set"][data-e="0"][data-s="2"][data-f="reps"]');
  await repIn.fill('0');
  await setBtn(app, 0, 2).click();
  await expect(app.toast()).toHaveText('Nhập số rep trước khi bấm ✓');
  await setBtn(app, 0, 0).click();
  await expect(page.locator('#rest')).toBeVisible();
  await expect(page.locator('#rest-l')).toHaveText('Đang nghỉ');
  await expect(page.locator('#prog-l')).toContainText('1/9 set');
  /* chấm độ khó: Hỏng thì báo buổi sau giữ tạ */
  await app.view().locator('[data-act="eff"][data-e="0"][data-s="0"][data-v="f"]').click();
  await expect(app.toast()).toContainText('Đã ghi hỏng rep');
  expect((await app.state()).active.entries[0].sets[0].ef).toBe('f');
  await app.view().locator('[data-act="eff"][data-e="0"][data-s="0"][data-v="f"]').click();
  expect((await app.state()).active.entries[0].sets[0].ef).toBeUndefined();
  /* bỏ ✓ thì mất chấm độ khó */
  await app.view().locator('[data-act="eff"][data-e="0"][data-s="0"][data-v="m"]').click();
  await setBtn(app, 0, 0).click();
  s0 = (await app.state()).active.entries[0].sets[0];
  expect(s0.done).toBe(false); expect(s0.ef).toBeUndefined();
  /* ghi chú */
  await app.view().locator('textarea[data-bind="note"][data-e="0"]').fill('Đau nhẹ vai trái');
  await expect.poll(async () => (await app.state()).active.entries[0].note).toBe('Đau nhẹ vai trái');
});

test('set khởi động: bấm để đánh dấu, bài cô lập cùng nhóm chỉ 1 set làm quen máy', async ({ app }) => {
  await startChest(app);
  await app.view().locator('[data-act="warm"][data-e="0"][data-w="0"]').click();
  expect((await app.state()).active.entries[0].warm).toEqual([true]);
  await app.view().locator('[data-act="warm"][data-e="0"][data-w="0"]').click();
  expect((await app.state()).active.entries[0].warm).toEqual([false]);
  await app.page.locator('#exnav [data-i="1"]').click();
  await expect(app.view().locator('article.ex.focus')).toContainText('Set làm quen máy');
  await expect(app.view().locator('#warm-1 button')).toHaveText(['17,5×8']);
  /* bài tự trọng (0 kg) và bài chưa có mức tạ */
  await app.view().locator('input[data-bind="set"][data-e="1"][data-s="0"][data-f="kg"]').fill('0');
  await expect(app.view().locator('#warm-1')).toContainText('Bài tự trọng');
});

test('xong hết set của bài: đóng dấu XONG, nút sang bài kế; thanh số bài có ✓', async ({ app, page }) => {
  await startChest(app);
  for (const s of [0, 1, 2]) await setBtn(app, 0, s).click();
  await expect(app.view().locator('.donebar')).toContainText('3/3 set');
  await expect(app.view().locator('.nextex')).toContainText('Sang bài 2: Ép ngực máy');
  await expect(page.locator('#exnav button').first()).toHaveText('✓1');
  /* bài vẫn mở cho tới khi bấm “Sang bài” (PA-10 bỏ tự chuyển bài) */
  await app.page.waitForTimeout(1200);
  await expect(app.view().locator('article.ex.focus')).toHaveAttribute('data-i', '0');
  await app.view().locator('.nextex').click();
  await expect(app.view().locator('article.ex.focus')).toHaveAttribute('data-i', '1');
  await expect(app.view().locator('article.ex.done')).toContainText('✓ 40×10 · 40×10 · 40×10');
  /* bấm thẻ bài đã xong để mở lại sửa */
  await app.view().locator('article.ex.done [data-act="ex-focus"]').click();
  await expect(app.view().locator('article.ex.focus')).toHaveAttribute('data-i', '0');
});

test('thêm/bớt set, xoá set đã tập cần xác nhận', async ({ app }) => {
  await startChest(app);
  await app.view().locator('[data-act="add-set"][data-e="0"]').click();
  expect((await app.state()).active.entries[0].sets).toHaveLength(4);
  await app.view().locator('[data-act="rm-set"][data-e="0"]').click();
  expect((await app.state()).active.entries[0].sets).toHaveLength(3);
  for (const s of [0, 1, 2]) await setBtn(app, 0, s).click();
  await app.view().locator('article.ex[data-i="0"] [data-act="ex-focus"]').first().click().catch(() => {});
  await app.page.locator('#exnav [data-i="0"]').click();
  await app.view().locator('[data-act="rm-set"][data-e="0"]').click();
  await expect(app.sheet()).toContainText('Xoá set 3 đã tập?');
  await app.click('confirm-ok');
  expect((await app.state()).active.entries[0].sets).toHaveLength(2);
});

test('drop set: thêm 3 set giảm dần 80/65/50%, đổi tạ chính thì drop tính lại, không nghỉ giữa drop', async ({ app, page }) => {
  await startChest(app);
  await app.view().locator('[data-act="drop-toggle"][data-e="0"]').click();
  let sets = (await app.state()).active.entries[0].sets;
  expect(sets.filter(s => s.dr).map(s => s.kg)).toEqual([32.5, 25, 20]);
  await expect(app.view()).toContainText('Drop set · giảm tạ dần');
  await app.view().locator('[data-act="step"][data-e="0"][data-s="0"][data-f="kg"][data-d="1"]').click();
  sets = (await app.state()).active.entries[0].sets;
  expect(sets.filter(s => s.dr).map(s => s.kg)).toEqual([35, 27.5, 22.5]);
  /* tự sửa 1 set drop thì set đó không bị tính lại */
  await app.view().locator('[data-act="step"][data-e="0"][data-s="3"][data-f="kg"][data-d="-1"]').click();
  await app.view().locator('input[data-bind="set"][data-e="0"][data-s="1"][data-f="kg"]').fill('50');
  await expect.poll(async () => (await app.state()).active.entries[0].sets[3].m).toBe(1);
  sets = (await app.state()).active.entries[0].sets;
  expect(sets[3].kg).toBe(32.5);
  for (const s of [0, 1]) await setBtn(app, 0, s).click();
  await setBtn(app, 0, 2).click();
  await expect(app.toast()).toHaveText('Vào drop set ngay, không nghỉ');
  await expect(page.locator('#rest')).toBeHidden();
  await setBtn(app, 0, 3).click();
  await app.view().locator('[data-act="drop-toggle"][data-e="0"]').click();
  await expect(app.toast()).toHaveText('Đã tập set drop, không bỏ được');
});

test('bỏ drop set khi chưa tập', async ({ app }) => {
  await startChest(app);
  await app.view().locator('[data-act="drop-toggle"][data-e="0"]').click();
  await app.view().locator('[data-act="drop-toggle"][data-e="0"]').click();
  expect((await app.state()).active.entries[0].sets.some(s => s.dr)).toBe(false);
});

test('đổi bài khi máy bận: cùng ô hoặc cùng nhóm cơ, có thể đặt làm bài chính', async ({ app }) => {
  const P = basicPlan();
  const alt = ex('Đẩy ngực máy (Chest press)', { currentKg: 50 });
  P.bench.alts = [alt];
  await app.seed({ state: state({ days: P.days }) });
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  await app.click('swap-open');
  await expect(app.sheet()).toContainText('Cùng ô');
  /* bài cùng nhóm đã có trong buổi thì không hiện lại */
  await expect(app.sheet()).not.toContainText('Bài khác cùng nhóm');
  await app.page.locator('#swap-main').check();
  await app.sheet().locator(`[data-act="swap-do"][data-id="${alt.id}"]`).click();
  await expect(app.toast()).toContainText('Đã đổi sang Đẩy ngực máy · bài chính mới');
  const st = await app.state();
  expect(st.active.entries[0]).toMatchObject({ exId: alt.id, manual: false });
  expect(st.active.entries[0].sets[0].kg).toBe(50);
  expect(st.days[0].exercises[0].id).toBe(alt.id);
  /* đổi tạm (không đặt làm chính) sang bài cùng nhóm */
  await app.click('swap-open');
  await app.sheet().locator(`[data-act="swap-do"][data-id="${P.bench.id}"]`).click();
  expect((await app.state()).active.entries[0]).toMatchObject({ exId: P.bench.id, manual: true });
});

test('thêm bài vào buổi, bỏ bài khỏi buổi', async ({ app }) => {
  const P = await startChest(app);
  await app.click('add-ex-session');
  await expect(app.sheet()).toContainText('Thêm bài vào buổi này');
  await expect(app.sheet().locator('[data-act="add-entry"]')).toHaveCount(3);
  await app.sheet().locator(`[data-act="add-entry"][data-id="${P.lat.id}"]`).click();
  await expect(app.toast()).toHaveText('Đã thêm Kéo xô');
  expect((await app.state()).active.entries.map(e => e.exId)).toEqual([P.bench.id, P.fly.id, P.push.id, P.lat.id]);
  await app.view().locator('[data-act="rm-entry"][data-e="0"]').click();
  await expect(app.sheet()).toContainText('Bỏ “Đẩy ngực tạ đòn” khỏi buổi này?');
  await app.click('confirm-ok');
  expect((await app.state()).active.entries.map(e => e.exId)).toEqual([P.fly.id, P.push.id, P.lat.id]);
});

test('kết thúc buổi còn set chưa ✓: cảnh báo, tập tiếp hoặc vẫn lưu; cập nhật mức tạ đang tập', async ({ app, page }) => {
  const P = await startChest(app);
  await app.view().locator('[data-act="step"][data-e="0"][data-s="0"][data-f="kg"][data-d="1"]').click();
  for (const s of [0, 1]) await setBtn(app, 0, s).click();
  await app.view().locator('.sess-actions [data-act="finish"]').click();
  await expect(app.sheet()).toContainText('Còn 7 set chưa bấm ✓');
  await expect(app.sheet()).toContainText('(2 bài chưa tập)');
  await expect(app.sheet()).toContainText('Lần đầu tập buổi này.');
  await app.sheet().locator('[data-act="close-sheet"]').click();
  await expect(page.locator('#sheet')).toBeHidden();
  await app.view().locator('.sess-actions [data-act="finish"]').click();
  await app.click('save-session');
  await expect(app.toast()).toContainText('Đã lưu buổi tập');
  const st = await app.state();
  expect(st.active).toBeNull();
  expect(st.sessions).toHaveLength(1);
  expect(st.sessions[0].entries).toHaveLength(1);
  expect(st.sessions[0].entries[0].sets).toEqual([{ kg: 42.5, reps: 10 }, { kg: 40, reps: 10 }]);
  expect(st.days[0].exercises[0]).toMatchObject({ currentKg: 42.5, kgSetAt: null });
  expect(st.settings.cycleStart).toBe(TODAY);
  await expect(app.view()).toContainText('Hôm nay đã tập Ngực + Tay sau');
  /* hoàn tác từ toast = mở lại buổi, các bài chưa tập được thêm lại */
  await app.toast().locator('[data-act="reopen-session"]').click();
  const a = (await app.state()).active;
  expect(a.reopened).toBe(1);
  expect(a.entries.map(e => e.exId)).toEqual([P.bench.id, P.fly.id, P.push.id]);
  expect(a.entries[0].sets.map(s => s.done)).toEqual([true, true, false]);
  expect((await app.state()).sessions).toHaveLength(0);
});

test('kết thúc khi chưa xong set nào: đề nghị huỷ buổi', async ({ app }) => {
  await startChest(app);
  await app.view().locator('.sess-actions [data-act="finish"]').click();
  await expect(app.sheet()).toContainText('Chưa có set nào xong');
  await app.click('confirm-ok');
  await expect(app.toast()).toHaveText('Đã huỷ buổi tập');
  expect((await app.state()).active).toBeNull();
});

test('huỷ buổi tập đang tập', async ({ app }) => {
  await startChest(app);
  await app.click('cancel-session');
  await app.click('confirm-ok');
  const st = await app.state();
  expect(st.active).toBeNull(); expect(st.sessions).toHaveLength(0);
});

test('xong hết + kỷ lục mới: tổng kết so với lần trước, số bài đạt mục tiêu, dải KỶ LỤC MỚI', async ({ app, page }) => {
  const P = basicPlan();
  const prev = session(P.chest, addDays(TODAY, -7), [[P.bench, [[40, 10], [40, 10], [40, 10]]], [P.fly, [[30, 10], [30, 10], [30, 10]]], [P.push, [[20, 12], [20, 12], [20, 12]]]]);
  await app.seed({ state: state({ days: P.days, sessions: [prev], settings: { cycleStart: addDays(TODAY, -7) } }) });
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  /* tuần trước đạt 3×10 ở 40 kg → tuần này gợi ý 42,5 kg */
  expect((await app.state()).active.entries[0].sets[0].kg).toBe(40);
  await expect(app.view().locator('.sugchip.up')).toContainText('Gợi ý 42,5kg (+2,5)');
  for (let e = 0; e < 3; e++) {
    await page.locator(`#exnav [data-i="${e}"]`).click();
    if (e === 0) for (const s of [0, 1, 2]) await app.view().locator(`input[data-bind="set"][data-e="0"][data-s="${s}"][data-f="kg"]`).fill('42,5');
    for (const s of [0, 1, 2]) await setBtn(app, e, s).click();
  }
  await expect(app.view().locator('.nextex')).toContainText('Xong hết');
  await app.view().locator('.nextex').click();
  await expect(app.sheet()).toContainText('3/3');
  await expect(app.sheet()).toContainText('bài đạt đủ set × rep mục tiêu');
  await expect(app.sheet()).toContainText('Tổng tạ so với lần trước');
  await expect(app.sheet()).toContainText('Kỷ lục mới · 1RM ước tính');
  await expect(page.locator('.slam')).toContainText('KỶ LỤC MỚI');
  await app.click('save-session');
  expect((await app.state()).sessions).toHaveLength(2);
  /* buổi đã lưu trong ngày: xem lại */
  await app.view().locator('.restcard [data-act="open-session"]').click();
  await expect(app.sheet()).toContainText('So với lần trước');
  await expect(app.sheet().locator('[data-act="reopen-session"]')).toBeVisible();
});

test('tự chọn bài từ nhiều ngày tập', async ({ app }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.click('custom-open');
  await expect(app.sheet().locator('#custom-go')).toBeDisabled();
  await app.sheet().locator(`[data-act="custom-toggle"][data-id="${P.bench.id}"]`).click();
  await app.sheet().locator(`[data-act="custom-toggle"][data-id="${P.lat.id}"]`).click();
  await app.sheet().locator(`[data-act="custom-toggle"][data-id="${P.lat.id}"]`).click();
  await app.sheet().locator(`[data-act="custom-toggle"][data-id="${P.curl.id}"]`).click();
  await expect(app.sheet().locator('#custom-go')).toContainText('Bắt đầu (2 bài');
  await app.click('custom-start');
  const a = (await app.state()).active;
  expect(a).toMatchObject({ dayId: 'custom', dayName: 'Tự chọn · Ngực + Tay trước' });
  /* tạ đơn ghi kg mỗi tay */
  await app.page.locator('#exnav [data-i="1"]').click();
  await expect(app.view().locator('.sethead')).toContainText('Kg mỗi tay');
});

test('ảnh máy tập trong buổi: chụp thêm, lật ảnh', async ({ app, page }) => {
  const P = basicPlan();
  P.bench.photos = ['ph1', 'ph2'];
  await app.seed({ state: state({ days: P.days }), photos: { ph1: PHOTO, ph2: PHOTO } });
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  await expect(app.view().locator('.ex-hero .hdots i')).toHaveCount(2);
  await app.view().locator('[data-act="hero-ph"][data-d="1"]').click();
  await expect(app.view().locator('.ex-hero .hdots i.on')).toHaveCount(1);
  expect((await app.ui()).heroPh).toBe(1);
  await page.setInputFiles(`#cap-${P.bench.id}`, { name: 'm.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(PHOTO.split(',')[1], 'base64') });
  await expect(app.toast()).toHaveText('Đã lưu ảnh máy tập');
  expect((await app.state()).days[0].exercises[0].photos).toHaveLength(3);
});

test('đang có buổi dở thì không mở lại buổi khác; buổi đang tập chặn bắt đầu buổi mới', async ({ app }) => {
  const P = basicPlan();
  const s = session(P.back, TODAY, [[P.lat, [[45, 10]]]], { startedAt: Date.parse(`${TODAY}T07:00:00+07:00`) });
  await app.seed({ state: state({ days: P.days, sessions: [s] }) });
  await app.click('reopen-session');
  await expect(app.view()).toContainText('Đang tập');
  await app.page.evaluate(id => window.__sota, s.id);
  await app.page.evaluate(() => document.querySelector('#toast').hidden = true);
  /* gọi thẳng hàm mở lại khi đã có buổi dở */
  await app.page.evaluate(() => { const b = document.createElement('button'); b.dataset.act = 'reopen-session'; b.dataset.id = 'x'; document.body.appendChild(b); b.click(); });
  await expect(app.toast()).toContainText('Đang có buổi tập dở');
});

test('đổi bài sang bài khác cùng nhóm cơ ở ngày khác (không đặt làm bài chính)', async ({ app }) => {
  const P = basicPlan();
  const only = day('Ngực', [P.bench]), other = day('Ngực 2', [P.fly]);
  await app.seed({ state: state({ days: [only, other] }) });
  await app.view().locator(`.dchip[data-id="${only.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  await app.click('swap-open');
  await expect(app.sheet()).toContainText('Bài khác cùng nhóm Ngực');
  await app.sheet().locator(`[data-act="swap-do"][data-id="${P.fly.id}"]`).click();
  expect((await app.state()).active.entries[0]).toMatchObject({ exId: P.fly.id, manual: true });
});
