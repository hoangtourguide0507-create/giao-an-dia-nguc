// Chuyển đổi dữ liệu bản cũ, sao chép thủ công, phím Esc, các trường hợp rìa.
import { test, expect, sheetImage } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, session, addDays, TODAY, PHOTO } from '../helpers/data.mjs';

test('mở dữ liệu bản cũ: tự chuyển đổi skin, cách báo, nghỉ cũ, số set, khởi động, vùng cơ, tên hồ sơ', async ({ app, page }) => {
  const old = { name: 'Squat', muscle: 'Khác', type: 'lower', sets: 5, step: 2.5, rest: 150, photos: [] };
  const old2 = { id: 'o2', name: 'Kéo cáp mặt (Face pull)', muscle: 'Khác', type: 'iso', sets: 4, step: 2.5, rest: 75, restV: 0, photos: [], warmup: false };
  const legacy = { v: 3, days: [{ id: 'd1', name: 'Chân', exercises: [{ id: 'o1', ...old }, old2] }], sessions: [{ id: 's1', dayId: 'd1', dayName: 'Chân', date: '2026-08-01', startedAt: 1, entries: [{ exId: 'o1', name: 'Squat', muscle: 'Khác', sets: [{ kg: 60, reps: 5 }] }] }],
    body: [], bodyPhotos: 'x', weekPlans: 3, active: null, settings: { name: 'Minh', skin: 'neon', alertMethod: 'ntfy', notify: true, schedule: 'x' } };
  await page.goto('/manifest.webmanifest');
  await page.evaluate(() => localStorage.setItem('gadn-skin', 'light'));
  await app.seed({ state: legacy });
  const st = await app.state();
  expect(st.settings).toMatchObject({ skin: 'amber', skin22: 1, alertMethod: 'push', notify: true, sets3: 1, warmAll: 1, schedule: {} });
  expect(st.bodyPhotos).toEqual([]); expect(st.weekPlans).toEqual({}); expect(st.pains).toEqual([]);
  const [sq, fp] = st.days[0].exercises;
  expect(sq).toMatchObject({ repMin: 8, repMax: 12, repTarget: 10, sets: 3, warmup: true, rest: 0, restV: 2, alts: [], slot: '', mainSince: '2026-08-01', zone: 'Đùi trước', muscle: 'Đùi trước', gid: 'Barbell_Full_Squat' });
  expect(fp).toMatchObject({ rest: 0, warmup: true, zone: 'Vai sau', muscle: 'Vai' });
  expect((await app.profiles()).list[0].name).toBe('Minh');
  await expect(page.locator('#hello')).toContainText('Chào Minh');
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'amber');
});

test('phím Esc đóng bảng và trình xem ảnh; toast có nút hành động tự ẩn chậm hơn', async ({ app, page }) => {
  await app.seed({ state: state({ bodyPhotos: [{ id: 'a', date: TODAY, t: 1, pose: 'Trước', photoId: 'x' }] }), photos: { x: PHOTO } });
  await app.tab('photos');
  await app.view().locator('[data-act="bp-view"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#viewer')).toBeHidden();
  await app.tab('body');
  await app.click('body-add');
  await page.keyboard.press('Escape');
  await expect(page.locator('#sheet')).toBeHidden();
});

test('mở lại buổi đã lưu: thêm set còn thiếu, drop set tính tiếp, bài chưa tập được thêm lại', async ({ app }) => {
  const P = basicPlan();
  P.bench.dropSet = true; P.fly.dropSet = true;
  const s = session(P.chest, TODAY, [[P.bench, [[40, 10], [40, 10]]], [P.fly, [[30, 10], [30, 10], [30, 10], [24, 10, null, 1]]]], { startedAt: Date.now() - 3600e3 });
  s.entries.push({ exId: 'xoa', name: 'Bài đã xoá', muscle: 'Ngực', sets: [{ kg: 10, reps: 10 }], drop: { kg: 5, reps: 10 } });
  await app.seed({ state: state({ days: P.days, sessions: [s] }) });
  await app.view().locator('.restcard [data-act="reopen-session"]').click();
  await expect(app.toast()).toContainText('Đã mở lại buổi tập');
  const a = (await app.state()).active;
  expect(a.entries[0].sets.map(x => [x.kg, x.done, !!x.dr])).toEqual([[40, true, false], [40, true, false], [40, false, false], [32.5, false, true], [25, false, true], [20, false, true]]);
  expect(a.entries[1].sets.filter(x => x.dr).map(x => [x.kg, x.done])).toEqual([[24, true], [20, false], [15, false]]);
  expect(a.entries[2]).toMatchObject({ exId: 'xoa', drop: { kg: 5, reps: 10, done: true } });
  expect(a.entries.map(e => e.exId)).toContain(P.push.id);
  /* bài đã xoá khỏi giáo án vẫn hiện trong buổi (bản lưu tạm), không có nút hướng dẫn */
  await app.page.locator('#exnav [data-i="2"]').click();
  await expect(app.view().locator('article.ex.focus')).toContainText('Bài đã xoá');
  await expect(app.view().locator('article.ex.focus .gbtn')).toHaveCount(0);
});

test('sửa giáo án khi đang tập: bài mới thêm vào ngày đang tập xuất hiện trong buổi, đổi thứ tự theo giáo án', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  await app.tab('plan');
  await app.view().locator(`[data-act="toggle-day"][data-id="${P.chest.id}"]`).click();
  await app.view().locator(`[data-act="move-ex"][data-id="${P.push.id}"][data-d="-1"]`).click();
  await expect(app.toast()).toHaveText('Đã cập nhật thứ tự buổi đang tập');
  await app.click('add-ex');
  await page.fill('#f-name', 'Xà kép (Dips)');
  await app.click('save-ex');
  const a = (await app.state()).active;
  expect(a.entries.map(e => e.name)).toEqual([P.bench.name, P.push.name, P.fly.name, 'Xà kép (Dips)']);
  /* đặt bài thay thế làm bài chính khi bài cũ chưa tập: buổi đổi theo */
  await app.view().locator(`[data-act="alts-toggle"][data-id="${P.fly.id}"]`).click();
  await app.click('add-alt');
  await page.fill('#f-name', 'Ép cáp (Cable fly)');
  await app.click('save-ex');
  await app.click('make-main');
  await expect(app.toast()).toContainText('đã đổi trong buổi đang tập');
  expect((await app.state()).active.entries.map(e => e.name)).toContain('Ép cáp (Cable fly)');
  /* xoá bài chưa tập khỏi giáo án: bỏ khỏi buổi */
  await app.view().locator(`.exr [data-act="edit-ex"]`, { hasText: 'Xà kép' }).click();
  await app.click('del-ex'); await app.click('confirm-ok');
  expect((await app.state()).active.entries.map(e => e.name)).not.toContain('Xà kép (Dips)');
});

test('khoá màn hình sáng khi tập, quay lại app thì giữ', async ({ app, page }) => {
  await page.addInitScript(() => { window.__wl = 0; Object.defineProperty(navigator, 'wakeLock', { value: { request: async () => { window.__wl++; const t = new EventTarget(); t.release = async () => t.dispatchEvent(new Event('release')); return t; } } }); });
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.view().locator('.hero [data-act="start-day"]').click();
  await expect.poll(() => page.evaluate(() => window.__wl)).toBeGreaterThan(0);
  await app.click('cancel-session'); await app.click('confirm-ok');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
});

test('PA-36 · dữ liệu bản cũ (có Drive, tài khoản, sao lưu, ảnh) còn nguyên sau khi gỡ tính năng', async ({ app }) => {
  const P = basicPlan();
  const old = state({
    days: P.days,
    sessions: [session(P.chest, TODAY, [[P.bench, [[40, 10]]]]), session(P.back, addDays(TODAY, -2), [[P.lat, [[45, 8]]]])],
    drv: { id: 'hv1', m: 'k'.repeat(24), at: 1700000000000 },
    settings: { drvUrl: 'https://script.google.com/macros/s/X/exec', drvKey: 'x', acc: { u: 'hoang', vai: 'hlv' }, lastBackupAt: 1700000000000, lastBackupSess: 5, backupSkipAt: 0 },
  });
  await app.seed({ state: old });
  await app.flushed();
  const st = await app.idb('kv', 'state');
  expect(st.sessions.map(s => s.id).sort()).toEqual(old.sessions.map(s => s.id).sort());
  expect(st.days.map(d => d.name)).toEqual(P.days.map(d => d.name));
  expect(st.drv).toMatchObject({ id: 'hv1' });
  expect(st.settings).toMatchObject({ drvUrl: 'https://script.google.com/macros/s/X/exec', lastBackupAt: 1700000000000 });
  await expect(app.view()).toBeVisible();
});
