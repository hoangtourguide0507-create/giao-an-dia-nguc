// Các tình huống phụ của từng nhóm tính năng: dữ liệu cũ, ảnh khi đồng bộ, quét các loại mã khác, báo cáo giảm so với tháng trước.
import { test, expect, fakeCamera } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, session, addDays, TODAY, MONDAY, PHOTO, b64u } from '../helpers/data.mjs';

const clip = page => page.evaluate(() => navigator.clipboard.readText());
const setClip = (page, t) => page.evaluate(t => navigator.clipboard.writeText(t), t);

test('danh sách người tập: số buổi tuần này / buổi theo lịch cũ, cân nặng và thay đổi so với ~1 tháng trước', async ({ app, page }) => {
  const P = basicPlan();
  const st2 = state({ days: P.days, sessions: [session(P.chest, MONDAY, [[P.bench, [[40, 10], [40, 10]]]]), session(P.back, TODAY, [[P.lat, [[45, 10]]]], { startedAt: Date.now() - 7200e3 })],
    body: [{ id: 'a', date: '2026-09-10', weight: 60 }, { id: 'b', date: '2026-10-15', weight: 61.5 }], settings: { schedule: { 1: P.chest.id, 3: P.back.id, 5: 'khong-con' } } });
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: st2 } });
  await page.locator('.who').click();
  const row = app.sheet().locator('.prow').nth(1);
  await expect(row).toContainText('2/2 buổi tuần này');
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

test('đồng bộ file kiểu cũ có kèm ảnh máy tập: nhận ảnh mới, báo ảnh chưa kèm', async ({ app, page }) => {
  const P = basicPlan(); P.bench.photos = ['local1'];
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'An', color: 0 }], coach: { on: true, name: 'H' } }, states: { p1: state({ days: P.days }) }, photos: { local1: PHOTO } });
  const exo = (name, o = {}) => ({ i: [], name, muscle: 'Ngực', type: 'upper', sets: 3, repTarget: 10, repMin: 8, repMax: 12, step: 2.5, ph: [], l: [], ...o });
  const pkg = { app: 'gadn-sync', v: 1, role: 'student', link: { pk: 'p1', cn: '' }, name: 'An', at: Date.now(), sessions: [], del: { s: {}, e: {} },
    plan: [{ n: 'Ngực + Tay sau', e: [exo(P.bench.name, { ph: ['h1', 'h2'], currentKg: 45, kgSetAt: Date.now() + 1000, l: [exo('Đẩy ngực máy (Chest press)', { fs: true })] }), exo('Bài học viên tự thêm', { fs: true, ph: ['h1'] })] }],
    photos: { h1: PHOTO.replace('/9j', '/9j/') } };
  await app.tab('more');
  await app.view().locator('[data-act="tab"][data-tab="settings"]').click();
  await page.setInputFiles('#restore-file', { name: 'cu.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pkg)) });
  await expect(app.sheet()).toContainText('Dữ liệu từ máy của An');
  await expect(app.sheet()).toContainText('ảnh máy tập');
  await expect(app.sheet()).toContainText('1 ảnh máy tập chưa kèm trong gói này');
  await expect(app.sheet()).toContainText('1 bài có mức tạ mới');
  await app.click('sync-apply');
  await expect(app.toast()).toContainText('Đã gộp vào An');
  const st = await app.state();
  expect(st.days[0].exercises[0]).toMatchObject({ currentKg: 45 });
  expect(st.days[0].exercises[0].photos).toHaveLength(2);
  expect(st.days[0].exercises.map(e => e.name)).toContain('Bài học viên tự thêm');
});

test('học viên đã liên kết HLV gửi lên: chỉ gửi bài tự thêm và mức tạ tự sửa; HLV nhận đúng hồ sơ', async ({ app, page }) => {
  const P = basicPlan();
  for (const e of P.days.flatMap(d => d.exercises)) e.srcId = '~c' + e.id;
  P.bench.kgSetAt = Date.now() - 1000; P.bench.currentKg = 47.5;
  P.lat.alts = [ex('Hít xà (Pull-up)', { muscle: 'Lưng', kgSetAt: Date.now() - 500, currentKg: 5, srcId: '~cpull' })];
  P.back.exercises.push(ex('Bài em tự thêm', { muscle: 'Lưng' }));
  await app.seed({ state: state({ days: P.days, coachLink: { pk: 'p2', name: 'Hoàng' } }) });
  await app.tab('more');
  await app.click('sync-open');
  await expect(app.sheet()).toContainText('Đồng bộ với HLV Hoàng');
  await app.click('sync-copy');
  await expect(app.toast()).toContainText('Đã sao chép mã');
  const code = await clip(page);
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'A', color: 0 }, { id: 'p2', name: 'Em', color: 1 }], coach: { on: true, name: 'Hoàng' } }, states: { p1: state(), p2: state({ days: basicPlan().days }) } });
  await setClip(page, code);
  await app.tab('more');
  await app.view().locator('[data-act="qr-scan"]').click();
  await app.sheet().locator('[data-act="qr-paste"]').click();
  await expect(app.sheet()).toContainText('Gộp vào hồ sơ Em');
  await expect(app.sheet()).toContainText('1 bài mới trong giáo án');
  await app.click('sync-apply');
  await expect(app.toast()).toContainText('Đã gộp vào Em');
});

test('quét bằng camera mã kết quả cũ GAQ1 và mã đồng bộ cũ GAS1', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'An', color: 0 }], coach: { on: true, name: 'H' } }, states: { p1: state({ days: P.days }) } });
  const gaq = 'GAQ1.ab12.1.1.p' + b64u(JSON.stringify({ v: 1, k: 'p1', n: 'An', s: [['q9', TODAY, Date.now() - 3600e3, 0, 0, 'Ngực + Tay sau', [['', P.bench.name, 'Ngực', 0, [[40, 10]], 0]]]] }));
  await fakeCamera(page, gaq);
  await app.tab('more');
  await app.view().locator('[data-act="qr-scan"]').click();
  await expect(app.toast()).toHaveText('Đã nhận 1 buổi tập của An', { timeout: 8000 });
  const pkg = { app: 'gadn-sync', v: 1, role: 'student', link: { pk: 'p1', cn: '' }, name: 'An', at: Date.now(), plan: null, del: { s: {}, e: {} },
    sessions: [{ id: 'g7', date: addDays(TODAY, -4), startedAt: Date.now() - 4 * 864e5, dayName: 'Ngực + Tay sau', entries: [] }] };
  await fakeCamera(page, 'GAS1.cd34.1.1.p' + b64u(JSON.stringify(pkg)));
  await app.toastGone();
  await app.view().locator('.tcard').first().locator('[data-act="sync-open"]').click();
  await app.click('sync-scan');
  await expect(app.sheet()).toContainText('1 buổi tập mới', { timeout: 8000 });
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

test('báo cáo tháng ít hơn tháng trước: mũi tên giảm, ảnh báo cáo vẫn tạo được', async ({ app }) => {
  const P = basicPlan();
  const ss = [5, 8, 12, 15].map(d => session(P.chest, `2026-09-${String(d).padStart(2, '0')}`, [[P.bench, [[40, 10], [40, 10]]]]));
  ss.push(session(P.chest, '2026-10-02', [[P.bench, [[40, 10]]]]));
  await app.seed({ state: state({ days: P.days, sessions: ss }) });
  await app.tab('week');
  await app.click('report');
  await expect(app.sheet().locator('.kpi').first().locator('.delta')).toContainText('▼ 3');
  await app.click('rep-img');
  await expect(app.sheet().locator('#rep-out img.repimg')).toBeVisible();
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
  /* đau nhẹ khuỷu tay: giảm 20% tính trên mức deload (20 → 17,5 → 12,5 kg) */
  await expect(app.view().locator('article.ex.focus .sugchip')).toHaveText('↓ Gợi ý 12,5kg · đang đau');
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
