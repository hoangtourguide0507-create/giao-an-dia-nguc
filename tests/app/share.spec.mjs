// BR-13 Gửi & nhận giáo án: mã QR, sao chép mã gửi Zalo, ảnh mã; nhận bằng camera, ảnh, dán mã, link cũ #nhap=.
import { test, expect, fakeCamera, sheetImage } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, session, addDays, TODAY, sota1 } from '../helpers/data.mjs';

const clip = page => page.evaluate(() => navigator.clipboard.readText());

test('gửi giáo án: hiện mã QR, sao chép mã; người nhận dán mã → xem trước → nhập thành ngày mới', async ({ app, page }) => {
  const P = basicPlan();
  P.bench.alts = [ex('Đẩy ngực máy (Chest press)')]; P.bench.slot = 'Đẩy ngực'; P.bench.setup = 'Ghế nấc 3'; P.bench.dropSet = true;
  await app.seed({ state: state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -2), [[P.bench, [[40, 10]]]])] }) });
  await app.tab('more');
  await app.click('share');
  await expect(app.sheet()).toContainText('2 ngày tập · 6 bài');
  await expect(app.sheet()).toContainText('Mức tạ, lịch sử và ảnh của bạn không được gửi đi');
  expect(await page.locator('#qr-c').evaluate(c => c.width)).toBeGreaterThan(100);
  await app.click('plan-copy');
  await expect(app.toast()).toContainText('Đã sao chép mã');
  const code = await clip(page);
  expect(code).toMatch(/^SOTA2z\.[A-Za-z0-9_-]+$/);
  await app.click('qr-close');
  /* máy người nhận: chưa có giáo án */
  await app.seed({ state: state() });
  await page.evaluate(c => navigator.clipboard.writeText(c), code);
  await app.click('qr-scan');
  await app.sheet().locator('[data-act="qr-paste"]').click();
  await expect(app.sheet()).toContainText('Giáo án nhận được');
  await expect(app.sheet()).toContainText('2 ngày tập');
  await app.click('import-apply');
  await expect(app.toast()).toContainText('Đã nhập giáo án. Bấm từng bài để điền mức tạ của bạn.');
  const st = await app.state();
  expect(st.days.map(d => d.name)).toEqual(['Ngực + Tay sau', 'Lưng + Tay trước']);
  const b = st.days[0].exercises[0];
  expect(b).toMatchObject({ name: P.bench.name, slot: 'Đẩy ngực', setup: 'Ghế nấc 3', dropSet: true, currentKg: null });
  expect(b.alts.map(a => a.name)).toEqual(['Đẩy ngực máy (Chest press)']);
  expect(st.days[1].exercises[2]).toMatchObject({ each: true, step: 2 });
  expect(st.sessions).toHaveLength(0);
});

test('nhận giáo án khi đã có giáo án: “Cập nhật” giữ lịch sử và mức tạ, có hoàn tác', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.tab('more'); await app.click('share'); await app.click('plan-copy');
  const code = await clip(page);
  /* máy nhận có cùng bài Đẩy ngực đã tập 40 kg, thiếu các bài khác */
  const mine = ex('Đẩy ngực tạ đòn (Bench press)', { currentKg: 40, sets: 4 });
  const d = day('Ngực + Tay sau', [mine]);
  await app.seed({ state: state({ days: [d], sessions: [session(d, addDays(TODAY, -3), [[mine, [[40, 10]]]])] }) });
  await page.evaluate(c => navigator.clipboard.writeText(c), code);
  await app.tab('more');
  await app.view().locator('[data-act="qr-paste"]').click();
  await expect(app.sheet()).toContainText('Đã có giáo án? Chọn Cập nhật');
  await app.click('import-update');
  await expect(app.toast()).toContainText('Đã cập nhật giáo án');
  let st = await app.state();
  expect(st.days.map(x => x.name)).toEqual(['Ngực + Tay sau', 'Lưng + Tay trước']);
  expect(st.days[0].exercises[0]).toMatchObject({ id: mine.id, sets: 3, currentKg: 40 });
  expect(st.sessions).toHaveLength(1);
  await app.toast().locator('[data-act="sync-undo"]').click();
  await expect(app.toast()).toHaveText('Đã hoàn tác lần đồng bộ');
  st = await app.state();
  expect(st.days.map(x => x.name)).toEqual(['Ngực + Tay sau']);
  expect(st.days[0].exercises[0].sets).toBe(4);
});

test('gửi giáo án bằng ảnh mã: lưu ảnh; máy kia chọn ảnh từ thư viện để nhập', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.tab('more'); await app.click('share');
  await app.click('plan-img');
  await expect(app.sheet()).toContainText('Ảnh mã');
  const png = await sheetImage(page);
  const dl = page.waitForEvent('download');
  await app.click('img-save');
  expect((await dl).suggestedFilename()).toBe('giao-an-toi.png');
  await app.seed({ state: state() });
  await app.click('qr-scan');
  await page.setInputFiles('#img-in', { name: 'ma.png', mimeType: 'image/png', buffer: png });
  await expect(app.sheet()).toContainText('Giáo án nhận được');
  await app.click('import-apply');
  expect((await app.state()).days).toHaveLength(2);
});

test.fixme('quét mã QR giáo án bằng camera (lỗi đã biết: bộ quét tách mã theo dấu “.” nên mất phần sau “SOTA2z.”)', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.tab('more'); await app.click('share'); await app.click('plan-copy');
  const code = await clip(page);
  await app.seed({ state: state() });
  await fakeCamera(page, 'GAP2.abcd.1.1.' + code);
  await app.click('qr-scan');
  await expect(app.sheet()).toContainText('Giáo án nhận được', { timeout: 8000 });
});

test('giáo án dài chia nhiều mã QR: bấm “mã tiếp theo”; dán thiếu trang thì báo thiếu', async ({ app, page }) => {
  const days = Array.from({ length: 6 }, (_, i) => day('Ngày ' + i, Array.from({ length: 8 }, (_, k) => ex(`Bài tự đặt số ${i}-${k} có tên rất dài để mã không nén được nhiều`, { setup: 'Ghi chú chỉnh máy riêng ' + i + k + ' '.repeat(20) + Math.random().toString(36) }))));
  await app.seed({ state: state({ days }) });
  await app.tab('more'); await app.click('share');
  await expect(app.sheet()).toContainText('Giáo án dài nên chia');
  await expect(page.locator('#qr-pg')).toHaveText(/^Mã 1\/\d+$/);
  await page.locator('#qr-next').click();
  await expect(page.locator('#qr-pg')).toHaveText(/^Mã 2\//);
  /* dán 1 trang lẻ */
  await app.click('qr-close');
  await page.evaluate(() => navigator.clipboard.writeText('GAP2.zzzz.2.3.abc'));
  await app.view().locator('[data-act="qr-paste"]').click();
  await expect(app.toast()).toHaveText('Mã nhiều phần đang thiếu trang 1, 3/3');
});

test('mã cũ SOTA1 (kèm mức tạ HLV đặt sẵn) và link #nhap=', async ({ app, page }) => {
  const code = sota1({ v: 2, p: 'pkHLV', q: 'Thầy Tâm', d: [{ n: 'Chân', e: [
    { n: 'Squat', m: 'Đùi trước', t: 'lower', s: 99, g: 10, a: 8, b: 12, d: 0, k: 2.5, r: 150, u: 'Chân rộng bằng vai', h: 0, c: 60, i: 'srcA', o: 'Squat', l: [{ n: 'Hack squat', m: 'Đùi trước', t: 'lower' }] },
    { n: 'Bài lạ', m: 'Không có', t: 'xx', s: 3 }] }] });
  await app.goto('#nhap=' + encodeURIComponent(code));
  await expect(app.sheet()).toContainText('Giáo án nhận được');
  await expect(app.sheet()).toContainText('từ HLV Thầy Tâm');
  await expect(page).toHaveURL(/index\.html$/);
  await app.click('import-apply');
  await expect(app.toast()).toHaveText('Đã nhập giáo án kèm mức tạ HLV đặt sẵn');
  const st = await app.state();
  expect(st.coachLink).toEqual({ pk: 'pkHLV', name: 'Thầy Tâm' });
  expect(st.days[0].exercises[0]).toMatchObject({ name: 'Squat', sets: 10, rest: 150, currentKg: 60, srcId: 'srcA', slot: 'Squat' });
  expect(st.days[0].exercises[0].alts[0].name).toBe('Hack squat');
  expect(st.days[0].exercises[1]).toMatchObject({ muscle: 'Khác', type: 'upper' });
});

test('mã hỏng hoặc không có mã: báo lỗi rõ ràng', async ({ app, page }) => {
  await app.goto();
  await app.click('qr-scan');
  await page.locator('details.wpkeep summary').click();
  await app.click('paste-go');
  await expect(app.toast()).toHaveText('Dán mã vào ô chữ trước');
  await page.fill('#paste-in', 'chào bạn, không có mã nào');
  await app.click('paste-go');
  await expect(app.toast()).toHaveText('Không tìm thấy mã hợp lệ trong nội dung vừa dán');
  await page.fill('#paste-in', 'SOTA2z.AAAA');
  await app.click('paste-go');
  await expect(app.sheet()).toContainText('Không đọc được giáo án');
  await app.toastGone();
  await app.sheet().locator('[data-act="qr-scan"]').click();
  await page.evaluate(() => navigator.clipboard.writeText(''));
  await app.sheet().locator('[data-act="qr-paste"]').click();
  await expect(page.locator('#paste-in')).toBeFocused();
  await page.fill('#paste-in', sota1({ v: 2, d: [] }));
  await app.click('paste-go');
  await expect(app.sheet()).toContainText('Giáo án trống.');
  /* ảnh không có mã QR */
  await app.toastGone();
  await app.sheet().locator('[data-act="qr-scan"]').click();
  await page.setInputFiles('#img-in', { name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
  await expect(app.toast()).toHaveText('Không tìm thấy mã QR trong ảnh đã chọn');
  /* không có camera */
  await expect(page.locator('#qr-st')).toContainText('Không mở được camera');
});
