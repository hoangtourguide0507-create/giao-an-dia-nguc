// BR-12 Nhiều người tập trên một máy & chế độ huấn luyện viên (Phòng HLV).
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, session, addDays, TODAY, MONDAY, PHOTO } from '../helpers/data.mjs';

const prof = (list, active = 'p1', coach) => ({ active, list: list.map(([id, name, color = 0]) => ({ id, name, color })), ...(coach ? { coach } : {}) });

test('thêm người tập (sao chép giáo án + ảnh máy), chuyển qua lại, mỗi người dữ liệu riêng', async ({ app, page }) => {
  const P = basicPlan();
  P.bench.photos = ['ph1'];
  await app.seed({ state: state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -1), [[P.bench, [[40, 10]]]])] }), photos: { ph1: PHOTO } });
  await page.locator('.who').click();
  await expect(app.sheet()).toContainText('Học viên');
  await app.click('prof-add');
  await app.click('prof-create');
  await expect(app.toast()).toHaveText('Nhập tên người tập');
  await app.sheet().locator('[data-act="qpick-p"][data-v="Vợ"]').click();
  await page.locator('#f-pfrom').selectOption('p1');
  await app.click('prof-create');
  await expect(app.toast()).toHaveText('Đang xem: Vợ');
  const pr = await app.profiles();
  expect(pr.list.map(p => p.name)).toEqual(['Tôi', 'Vợ']);
  let st = await app.state();
  expect(st.days.map(d => d.name)).toEqual(['Ngực + Tay sau', 'Lưng + Tay trước']);
  expect(st.sessions).toHaveLength(0);
  expect(st.days[0].exercises[0]).toMatchObject({ currentKg: null });
  expect(st.days[0].exercises[0].photos[0]).not.toBe('ph1');
  await expect(page.locator('#hello')).toContainText('Vợ');
  await expect(page.locator('#avatar')).toHaveClass(/pcol/);
  /* đổi tên */
  await page.locator('.who').click();
  await app.click('prof-rename');
  await page.fill('#f-prename', '');
  await app.click('prof-rename-go');
  await expect(app.toast()).toHaveText('Nhập tên');
  await page.fill('#f-prename', 'Lan');
  await app.click('prof-rename-go');
  expect((await app.profiles()).list[1].name).toBe('Lan');
  /* chuyển về người đầu: lịch sử còn nguyên */
  await page.locator('.who').click();
  await app.sheet().locator('[data-act="switch-profile"][data-id="p1"]').click();
  await expect(app.toast()).toHaveText('Đang xem: Tôi');
  expect((await app.state()).sessions).toHaveLength(1);
  /* bấm lại người đang xem chỉ đóng bảng */
  await page.locator('.who').click();
  await app.sheet().locator('[data-act="switch-profile"][data-id="p1"]').click();
  await expect(page.locator('#sheet')).toBeHidden();
});

test('sao chép giáo án từ người khác (thêm / thay toàn bộ), xoá hồ sơ', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ profiles: prof([['p1', 'Tôi'], ['p2', 'Em', 1]], 'p2'), states: { p1: state({ days: P.days }), p2: state({ days: [day('Cũ', [ex('Squat', { muscle: 'Đùi trước' })])] }) } });
  await page.locator('.who').click();
  await app.click('prof-copy');
  await page.locator('#f-cfrom').selectOption('p1');
  await app.sheet().locator('[data-act="prof-copy-go"][data-m="add"]').click();
  await expect(app.toast()).toContainText('Đã chép 2 ngày tập');
  await expect.poll(async () => (await app.state()).days.length).toBe(3);
  expect((await app.state()).days.map(d => d.name)).toEqual(['Cũ', 'Ngực + Tay sau', 'Lưng + Tay trước']);
  await page.locator('.who').click();
  await app.click('prof-copy');
  await app.sheet().locator('[data-act="prof-copy-go"][data-m="replace"]').click();
  await expect.poll(async () => (await app.state()).days.map(d => d.name)).toEqual(['Ngực + Tay sau', 'Lưng + Tay trước']);
  await page.locator('.who').click();
  await app.click('prof-del');
  await expect(app.sheet()).toContainText('Xoá hồ sơ Em?');
  await app.click('confirm-ok');
  await expect(app.toast()).toHaveText('Đã xoá hồ sơ Em');
  expect((await app.profiles()).list.map(p => p.id)).toEqual(['p1']);
});

test('tối đa 8 người trên một máy', async ({ app, page }) => {
  await app.seed({ profiles: prof([1, 2, 3, 4, 5, 6, 7, 8].map(i => ['p' + i, 'N' + i])), states: { p1: state() } });
  await page.locator('.who').click();
  await app.click('prof-add');
  await page.fill('#f-pname', 'Chín');
  await app.click('prof-create');
  await expect(app.toast()).toHaveText('Tối đa 8 người trên một máy');
});

test('nhiều người mà chưa bật HLV: gợi ý bật chế độ HLV, “Để sau” thì ẩn; bảng tổng quan cả nhóm', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ profiles: prof([['p1', 'Tôi'], ['p2', 'An', 1], ['p3', 'Bình', 2]]), states: { p1: state({ days: P.days }), p2: state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -1), [[P.bench, [[40, 10]]]])] }) } });
  await expect(app.view()).toContainText('Bạn đang kèm 3 người?');
  await app.tab('week');
  await app.click('coach');
  await expect(app.sheet()).toContainText('Tổng quan cả nhóm');
  await expect(app.sheet().locator('.coach')).toHaveCount(3);
  await expect(app.sheet().locator('.coach').nth(2)).toContainText('Chưa mở hồ sơ này lần nào trên máy');
  await expect(app.sheet().locator('.coach').nth(1)).toContainText('Lần cuối: Ngực + Tay sau');
  await app.closeSheet();
  await app.tab('today');
  await app.click('coach-dismiss');
  await expect(app.view()).not.toContainText('Bạn đang kèm 3 người?');
  expect((await app.profiles()).coach).toMatchObject({ dismiss: true });
});

test('bật chế độ HLV: hồ sơ “Tôi” đổi tên theo HLV hoặc bỏ đi nếu trống; Phòng HLV; tắt chế độ', async ({ app, page }) => {
  const P = basicPlan();
  const st2 = state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -6), [[P.bench, [[40, 10], [40, 10], [40, 10]]]])], pains: [{ id: 'x', area: 'Vai', level: 1, since: addDays(TODAY, -2), resolvedAt: null }] });
  await app.seed({ profiles: prof([['p1', 'Tôi'], ['p2', 'An', 1], ['p3', 'Bình', 2]]), states: { p1: state(), p2: st2, p3: state({ days: P.days }) } });
  await app.click('coach-setup');
  await expect(app.sheet()).toContainText('Hồ sơ “Tôi” trong danh sách');
  await page.fill('#f-cname', 'Hoàng');
  await app.sheet().locator('[data-act="coach-self"][data-v="coach"]').click();
  await expect(page.locator('#f-cname')).toHaveValue('Hoàng');
  await app.click('coach-save');
  await expect(app.toast()).toContainText('đã bỏ hồ sơ “Tôi” trống');
  const pr = await app.profiles();
  expect(pr.coach).toMatchObject({ on: true, name: 'Hoàng' });
  expect(pr.list.map(p => p.name)).toEqual(['An', 'Bình']);
  await expect(page.locator('#nav-bar [data-tab="more"]')).toContainText('HLV');
  await expect(page.locator('#today-l')).toContainText('HLV Hoàng');
  /* Phòng HLV */
  await app.tab('more');
  await expect(app.view()).toContainText('Phòng HLV');
  await expect(app.view().locator('.chero')).toContainText('HLV Hoàng · 2 học viên');
  await expect(app.view().locator('.todo')).toContainText(['Nhắc An: 6 ngày chưa tập', 'An đang đau vai', 'Duyệt kế hoạch tuần cho An', 'Bình chưa tập buổi nào']);
  await expect(app.view().locator('.tcard')).toHaveCount(2);
  await expect(app.view().locator('.tcard').first()).toContainText('ĐANG ĐAU');
  /* đổi mục tiêu buổi/tuần: 5 → 6 → 3 */
  await app.view().locator('[data-act="goal"][data-id="p2"]').click();
  await expect(app.toast()).toHaveText('Mục tiêu An: 6 buổi mỗi tuần');
  await app.view().locator('[data-act="goal"][data-id="p2"]').click();
  await expect(app.toast()).toHaveText('Mục tiêu An: 3 buổi mỗi tuần');
  /* duyệt kế hoạch tuần cho học viên từ việc cần làm */
  await app.view().locator('.todo[data-act="coach-plan"]').click();
  await expect(app.sheet()).toContainText('Kế hoạch tuần');
  await expect(app.sheet()).toContainText('An · mục tiêu 3 buổi');
  await app.click('wp-approve');
  /* bấm tên ở đầu trang mở lại Phòng HLV */
  await page.locator('.who').click();
  await expect(app.view()).toContainText('Phòng HLV');
  /* vào cài đặt từ Phòng HLV */
  await app.view().locator('[data-act="tab"][data-tab="settings"]').click();
  await expect(app.view()).toContainText('HLV Hoàng · 2 học viên.');
  await app.click('coach-setup');
  await expect(app.sheet()).not.toContainText('Hồ sơ “Tôi”');
  await app.closeSheet();
  await app.click('coach-off');
  await expect(app.toast()).toHaveText('Đã tắt chế độ HLV');
  await expect(page.locator('#nav-bar [data-tab="more"]')).toContainText('Tài khoản');
});

test('Phòng HLV: bảng xếp hạng khi có từ 4 học viên, nhắc học viên nghỉ lâu, mở hồ sơ học viên để ghi buổi', async ({ app, page }) => {
  const P = basicPlan();
  const mk = (ago, kg) => state({ days: P.days, weekPlans: { [MONDAY]: { mode: 'balanced', kg: {}, dec: {}, custom: {}, at: 1 } }, sessions: [session(P.chest, addDays(TODAY, -ago), [[P.bench, [[kg, 10], [kg, 10]]]])] });
  await app.seed({ profiles: prof([['p1', 'A'], ['p2', 'B', 1], ['p3', 'C', 2], ['p4', 'D', 3]], 'p1', { on: true, name: 'Hoàng' }),
    states: { p1: mk(1, 40), p2: mk(2, 60), p3: mk(10, 30), p4: { ...mk(3, 50), active: { id: 'act', dayId: P.chest.id, dayName: 'Ngực + Tay sau', date: TODAY, startedAt: Date.now(), entries: [] } } } });
  await app.tab('more');
  await expect(app.view()).toContainText('Bảng xếp hạng');
  await expect(app.view().locator('.lbr').first()).toContainText('B');
  await app.click('lb', '[data-k="n7"]');
  await app.click('lb', '[data-k="up"]');
  expect((await app.ui()).lb).toBe('up');
  await expect(app.view().locator('.todo')).toContainText(['Nhắc C: 10 ngày chưa tập', 'D đang tập']);
  await expect(app.view().locator('.tcard').nth(2)).toContainText('10 NGÀY NGHỈ');
  await expect(app.view().locator('.tcard').nth(3)).toContainText('ĐANG TẬP');
  await expect(app.view().locator('.tcard').first()).toContainText('Tuần này: cân bằng');
  await app.view().locator('.tcard').nth(1).locator('[data-act="switch-profile"]').click();
  await expect(app.toast()).toHaveText('Đang xem: B');
  await expect(app.view().locator('.hero')).toBeVisible();
  /* nghỉ giữa set ghi tên học viên */
  await app.view().locator('.hero [data-act="start-day"]').click();
  await app.view().locator('[data-act="set-done"][data-e="0"][data-s="0"]').click();
  await page.clock.fastForward(95000);
  await expect(page.locator('#alarm-t')).toHaveText('Hết giờ nghỉ · B');
});

test('VD-02: Phòng HLV — thẻ “chưa tập buổi nào” mở Mã liên kết Google Drive của đúng học viên', async ({ app }) => {
  const P = basicPlan();
  await app.seed({ profiles: prof([['p1', 'A'], ['p2', 'B', 1]], 'p1', { on: true, name: 'H' }), states: { p1: state({ days: P.days }), p2: state({ days: P.days }) } });
  await app.tab('more');
  await app.view().locator('.todo[data-act="coach-share"]').first().click();
  await expect(app.sheet()).toContainText('Google Drive');
  await expect(app.sheet()).not.toContainText('QR');
  await expect(app.sheet()).not.toContainText('Zalo');
});
