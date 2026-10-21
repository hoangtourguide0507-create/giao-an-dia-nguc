// BR-16 Hướng dẫn bài tập: hình minh hoạ 2 tư thế, nhóm cơ trên hình người, điểm form, video; thư viện hình offline.
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, JPEG_B64 } from '../helpers/data.mjs';

async function openGuide(app, o = {}) {
  const b = ex('Đẩy ngực tạ đòn (Bench press)', { currentKg: 40, ...o });
  if (!('gid' in o)) delete b.gid;
  const d = day('Ngực', [b]);
  await app.seed({ state: state({ days: [d] }) });
  await app.tab('plan');
  await app.click('toggle-day');
  await app.click('edit-ex');
  await app.sheet().locator('[data-act="guide"]').click();
  return b;
}

test('mở hướng dẫn: tự tìm hình minh hoạ, hiện nhóm cơ chính/phụ, điểm form, link YouTube', async ({ app, page }) => {
  const b = await openGuide(app);
  await expect(app.sheet().locator('.sh-title')).toHaveText(b.name);
  await expect(app.sheet()).toContainText('Minh hoạ: Barbell Bench Press - Medium Grip');
  await expect(app.sheet().locator('#g-demo img.a')).toHaveAttribute('src', /^data:image\/jpeg/);
  await expect(app.sheet().locator('.gmap .lg')).toContainText('Chính: Ngực');
  await expect(app.sheet().locator('.gmap svg g.m.p')).not.toHaveCount(0);
  await expect(app.sheet().locator('ol.gcues li').first()).toHaveText('Ép bả vai ra sau, đè vai xuống ghế');
  await expect(app.sheet().locator('a[href*="youtube.com"]')).toHaveAttribute('href', /Bench%20press%20exercise%20proper%20form/);
  expect((await app.state()).days[0].exercises[0].gid).toBe('Barbell_Bench_Press_-_Medium_Grip');
  /* hình đã lưu vào máy để xem offline */
  expect((await app.idb('photos')).filter(k => String(k).startsWith('exdb:Barbell_Bench'))).toHaveLength(2);
});

test('lời nhắc riêng hiện đầu tiên khi tập; link video riêng', async ({ app, page }) => {
  await openGuide(app);
  await page.fill('#g-cues', 'Đè vai\nGồng core');
  await page.fill('#g-vlink', 'https://youtu.be/abc');
  await expect.poll(async () => (await app.state()).days[0].exercises[0]).toMatchObject({ cues: 'Đè vai\nGồng core', vlink: 'https://youtu.be/abc' });
  await app.sheet().locator('[data-act="close-sheet"]').last().click();
  await app.tab('today');
  await app.view().locator('.hero [data-act="start-day"]').click();
  await expect(app.view().locator('.fcue li.mine')).toHaveText(['Đè vai', 'Gồng core']);
  await app.view().locator('.gbtn[data-act="guide"]').click();
  await expect(app.sheet().locator('a', { hasText: 'Mở link video' })).toHaveAttribute('href', 'https://youtu.be/abc');
});

test('video của tôi: quay/chọn video, xem lại, xoá', async ({ app, page }) => {
  await openGuide(app);
  await page.setInputFiles('#g-vin', { name: 'form.mp4', mimeType: 'video/mp4', buffer: Buffer.from('00000018667479706d703432', 'hex') });
  await expect(app.toast()).toHaveText('Đã lưu video của bạn');
  const vid = (await app.state()).days[0].exercises[0].vid;
  expect(vid).toMatch(/^vid:/);
  await expect(app.sheet().locator('#g-vid')).toHaveAttribute('src', /^blob:/);
  await app.click('vid-del');
  await expect(app.toast()).toHaveText('Đã xoá video');
  expect((await app.state()).days[0].exercises[0].vid).toBeNull();
  expect(await app.idb('photos', vid)).toBeUndefined();
});

test('đổi hình minh hoạ: gợi ý theo tên, tìm tiếng Anh, chọn, bỏ hình', async ({ app, page }) => {
  await openGuide(app);
  await app.click('guide-pick');
  await expect(app.sheet()).toContainText('Chọn hình minh hoạ');
  await expect(app.sheet().locator('[data-act="guide-set"]').first()).toBeVisible();
  await page.fill('#g-q', 'hammer curl');
  await expect(app.sheet().locator('[data-act="guide-set"]').first()).toContainText(/Hammer/i);
  await app.sheet().locator('[data-act="guide-set"]').first().click();
  await expect(app.sheet()).toContainText('Minh hoạ: ');
  const gid = (await app.state()).days[0].exercises[0].gid;
  expect(gid).toMatch(/Hammer/i);
  await app.click('guide-pick');
  await app.click('guide-back');
  await expect(app.sheet()).toContainText('Điểm form');
  await app.click('guide-pick');
  await app.click('guide-none');
  await expect(app.sheet()).toContainText('Chưa có hình minh hoạ cho bài này');
  expect((await app.state()).days[0].exercises[0].gid).toBeNull();
});

test('bài không có trong thư viện: vùng cơ đoán theo tên, lời nhắc chung', async ({ app }) => {
  const b = ex('Bài tự chế XYZ', { muscle: 'Vai', zone: 'Vai giữa' });
  delete b.gid;
  await app.seed({ state: state({ days: [day('Vai', [b])] }) });
  await app.tab('plan'); await app.click('toggle-day'); await app.click('edit-ex');
  await app.sheet().locator('[data-act="guide"]').click();
  await expect(app.sheet()).toContainText('Vùng cơ: Vai giữa');
  await expect(app.sheet()).toContainText('Chưa có hình minh hoạ');
  await expect(app.sheet().locator('ol.gcues li')).toHaveText(['Khởi động 1–2 set nhẹ trước', 'Giữ đúng form trước, tăng tạ sau']);
  await expect(app.sheet().locator('a[href*="youtube.com"]')).toHaveAttribute('href', /k%E1%BB%B9%20thu%E1%BA%ADt/);
});

/* gói hình offline định dạng GAP1: 'GAP1' + độ dài chỉ mục (u32) + chỉ mục JSON + dữ liệu ảnh */
function pack(keys) {
  const img = Buffer.from(JPEG_B64, 'base64'); let off = 0;
  const idx = keys.map(k => { const r = [k, off, img.length]; off += img.length; return r; });
  const head = Buffer.from(JSON.stringify(idx)), len = Buffer.alloc(4); len.writeUInt32LE(head.length);
  return Buffer.concat([Buffer.from('GAP1'), len, head, ...keys.map(() => img)]);
}

test('tải thư viện hình offline: 2 gói, báo tiến độ, ghi nhớ đã tải; tải lại được', async ({ app, page }) => {
  await page.route('**/exdb-1.bin', r => r.fulfill({ status: 200, body: pack(['A:0', 'A:1']) }));
  await page.route('**/exdb-2.bin', r => r.fulfill({ status: 200, body: pack(['B:0']) }));
  await app.seed({ state: state({ days: basicPlan().days }) });
  await app.view().locator('.banner [data-act="pack-load"]').click();
  await expect(app.sheet()).toContainText('Thư viện hình offline');
  await expect(page.locator('#pack-st')).toHaveText('Xong: 3 hình đã nằm trong máy, dùng được khi không có mạng.');
  expect(await app.idb('photos', 'exdb:A:1')).toMatch(/^data:image\/webp;base64,/);
  expect(await app.idb('kv', 'exdbPack')).toMatchObject({ n: 3 });
  await app.closeSheet();
  await app.tab('more');
  await expect(app.view()).toContainText('Đã tải 3 hình');
  await app.view().locator('[data-act="pack-load"]').click();
  await expect(page.locator('#pack-st')).toContainText('Xong: 3 hình');
});

test('tải thư viện hình lỗi mạng: báo rõ, tải được một phần thì báo gói lỗi', async ({ app, page }) => {
  await page.route('**/exdb-1.bin', r => r.fulfill({ status: 200, body: pack(['A:0']) }));
  await page.route('**/exdb-2.bin', r => r.fulfill({ status: 404, body: '' }));
  await app.goto();
  await app.tab('more');
  await app.view().locator('[data-act="pack-load"]').click();
  await expect(page.locator('#pack-st')).toHaveText('Tải được 1 hình, còn 1 gói lỗi. Thử lại khi mạng ổn định.');
  await page.unroute('**/exdb-1.bin');
  await page.route('**/exdb-1.bin', r => r.fulfill({ status: 200, body: 'NOTAPACK' }));
  await app.closeSheet();
  await app.view().locator('[data-act="pack-load"]').click();
  await expect(page.locator('#pack-st')).toContainText('Không tải được. Kiểm tra mạng rồi thử lại.');
});
