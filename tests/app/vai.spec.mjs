// BR-25 Vai của máy: HLV (quét QR HLV) hoặc HV (nối bằng thẻ học viên). Không còn chế độ HLV; giao diện HLV hiện cùng lúc cả hai bộ tính năng.
import { test, expect, fakeCamera } from '../helpers/fixtures.mjs';
import { state, basicPlan } from '../helpers/data.mjs';

const prof = (list, active = 'p1') => ({ active, list: list.map(([id, name, color = 0]) => ({ id, name, color })) });
/* mã QR HLV như trong ảnh thẻ: GAH1 + JSON {s, k} mã base64url */
const hubQR = (hub, k = hub.hk) => 'GAH1.' + Buffer.from(JSON.stringify({ s: hub.url, k })).toString('base64url');
async function registerHlv(app, hub) {
  await app.tab('more');
  await fakeCamera(app.page, hubQR(hub));
  await app.click('qr-scan');
  await expect(app.toast()).toContainText('Đã đăng ký làm HLV');
}

test('BR-25.1 · máy chưa có vai: Tài khoản không có nút bật chế độ HLV, không có banner gợi ý', async ({ app }) => {
  await app.seed({ profiles: prof([['p1', 'Tôi']]), states: { p1: state() } });
  await app.tab('more');
  await expect(app.view()).not.toContainText('Bật chế độ HLV');
  await expect(app.view()).not.toContainText('Huấn luyện viên');
  await app.tab('home');
  await expect(app.view()).not.toContainText('Bạn đang kèm');
});

test('BR-25.1 · dữ liệu cũ: máy từng bật chế độ HLV nhưng chưa có khoá HLV → không có Phòng HLV, giữ mọi hồ sơ, báo quét QR HLV, bỏ trường chế độ', async ({ app, page }) => {
  await app.seed({ profiles: { ...prof([['p1', 'Tôi'], ['p2', 'An', 1], ['p3', 'Bình', 2]]), coach: { on: true, name: 'Hoàng' } }, states: { p1: state(), p2: state(), p3: state() } });
  await expect(page.locator('#nav-bar [data-tab="more"]')).toContainText('Tài khoản');
  await expect(app.view()).not.toContainText('Phòng HLV');
  await expect(app.view()).toContainText('Quét mã QR HLV để làm HLV');
  const pr = await app.profiles();
  expect(pr.list.map(p => p.name)).toEqual(['Tôi', 'An', 'Bình']);
  expect(pr.coach).toBeUndefined();
});

test('BR-25.1 · máy chưa có vai chỉ có một hồ sơ: không có nút thêm người tập', async ({ app }) => {
  await app.seed({ profiles: prof([['p1', 'Tôi']]), states: { p1: state() } });
  await app.tab('more');
  await app.view().locator('[data-act="profiles"]').first().click();
  await expect(app.sheet()).toContainText('Học viên');
  await expect(app.sheet().locator('[data-act="prof-add"]')).toHaveCount(0);
});

test('BR-25.4 · HLV thấy Phòng HLV và Trang chủ của mình cùng lúc; thanh dưới 5 mục, mục cuối là Tài khoản', async ({ app, hub, page }) => {
  const P = basicPlan();
  await app.seed({ profiles: prof([['p1', 'Tôi'], ['p2', 'An', 1], ['p3', 'Bình', 2]]), states: { p1: state({ days: P.days }), p2: state({ days: P.days }), p3: state({ days: P.days }) } });
  await registerHlv(app, hub);
  await app.tab('home');
  await expect(app.view()).toContainText('Phòng HLV');
  await expect(app.view()).toContainText('Gợi ý');
  await expect(page.locator('#nav-bar [data-tab="more"]')).toContainText('Tài khoản');
  await expect(page.locator('#nav-bar button .lb')).toHaveText(['Trang chủ', 'Lịch tập', 'Tập', 'Tiến độ', 'Tài khoản']);
});

test('BR-12.1 · tối đa 8 người trên một máy, kể cả với HLV', async ({ app, hub, page }) => {
  await app.seed({ profiles: prof([1, 2, 3, 4, 5, 6, 7, 8].map(i => ['p' + i, 'N' + i])), states: { p1: state() } });
  await registerHlv(app, hub);
  await page.locator('.who').click();
  await app.click('prof-add');
  await page.fill('#f-pname', 'Chín');
  await app.click('prof-create');
  await expect(app.toast()).toHaveText('Tối đa 8 người trên một máy');
});

test('BR-25.3 · HV (nối bằng thẻ) không thấy mục nào của HLV: không Phòng HLV, không Bảng HLV, không nút Bật chế độ HLV', async ({ app, hub }) => {
  await app.seed({ profiles: prof([['p1', 'Tôi']]), states: { p1: state({ settings: { sync: { s: hub.url, i: 'hv1', dk: 'k'.repeat(32), ten: 'Hoàng' } } }) } });
  await app.tab('home');
  await expect(app.view()).not.toContainText('Phòng HLV');
  await app.tab('week');
  await expect(app.view()).not.toContainText('Bảng HLV');
  await app.tab('more');
  await expect(app.view()).toContainText('Đã nối với HLV Hoàng');
  await expect(app.view()).not.toContainText('Bật chế độ HLV');
  await expect(app.view().locator('[data-act="coach-setup"]')).toHaveCount(0);
});

test('BR-25.4 · HLV: chữ “học viên” trong Chỉ số cơ thể; học viên chưa mở hồ sơ trên máy được báo trong Phòng HLV', async ({ app, hub }) => {
  const P = basicPlan();
  await app.seed({ profiles: prof([['p1', 'Tôi'], ['p2', 'An', 1], ['p3', 'Chi', 2]]), states: { p1: state(), p2: state({ days: P.days }) } });
  await registerHlv(app, hub);
  await app.more('height');
  await expect(app.view()).toContainText('Đổi tên người tập ở danh sách học viên');
  await app.tab('home');
  await expect(app.view().locator('.tcard', { hasText: 'Chi' })).toContainText('Chưa mở hồ sơ này trên máy');
});
