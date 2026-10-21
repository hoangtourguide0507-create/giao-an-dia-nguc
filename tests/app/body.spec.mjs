// BR-10 Cơ thể: số đo (cân nặng, % mỡ, cơ xương, vòng eo, mỡ nội tạng), đánh giá tăng cơ/giảm mỡ, biểu đồ, ảnh trước/sau.
import { test, expect } from '../helpers/fixtures.mjs';
import { state, addDays, TODAY, PHOTO, JPEG_B64, jpegWithExif } from '../helpers/data.mjs';

const B = (date, o) => ({ id: 'b' + date, date, ...o });

test('nhập số đo đầu tiên: chọn giới tính, bắt buộc ít nhất 1 chỉ số, so mức chuẩn', async ({ app, page }) => {
  await app.goto();
  await app.tab('body');
  await expect(app.view()).toContainText('Mỗi tháng đo 1–2 lần');
  await app.click('sex', '[data-k="m"]');
  await app.click('body-add');
  await app.click('body-save');
  await expect(app.toast()).toHaveText('Nhập ít nhất một chỉ số');
  await page.fill('#b-weight', '72,5');
  await page.fill('#b-bodyFat', '22');
  await page.fill('#b-waist', '88');
  await page.locator('details.bmore summary').click();
  await page.fill('#b-visceral', '11');
  await app.click('body-save');
  await expect(app.toast()).toHaveText('Đã lưu số đo');
  expect((await app.state()).body).toEqual([expect.objectContaining({ date: TODAY, weight: 72.5, bodyFat: 22, waist: 88, visceral: 11 })]);
  const tiles = app.view().locator('.btile');
  await expect(tiles.nth(0)).toContainText('72,5');
  await expect(tiles.nth(1)).toContainText('Cao');
  await expect(tiles.nth(2)).toContainText('Chưa nhập');
  await expect(tiles.nth(3)).toContainText('Chuẩn');
  await expect(app.view().locator('.bvis')).toContainText('Cao');
  await expect(app.view()).toContainText('Nhập cân nặng và tỉ lệ mỡ ở 2 lần đo trở lên');
  await expect(app.view()).toContainText('Mức chuẩn cho nam');
  await app.view().locator('[data-act="sex"][data-k=""]').click();
  await expect(app.view().locator('.bsex')).toBeVisible();
  await app.view().locator('.bsex [data-act="sex"][data-k="f"]').click();
  await expect(app.view()).toContainText('Mức chuẩn cho nữ');
});

test('sửa lần đo, đổi sang ngày đã có thì gộp, xoá phải bấm 2 lần', async ({ app, page }) => {
  await app.seed({ state: state({ body: [B('2026-09-10', { weight: 70 }), B('2026-10-01', { weight: 71, bodyFat: 20 })], settings: { sex: 'm' } }) });
  await app.tab('body');
  await app.view().locator('.bnow-h [data-act="body-edit"]').click();
  await expect(app.sheet()).toContainText('Sửa số đo');
  await page.fill('#b-date', '2026-09-10');
  await page.fill('#b-weight', '70,5');
  await app.click('body-save');
  let body = (await app.state()).body;
  expect(body).toHaveLength(1);
  expect(body[0]).toMatchObject({ date: '2026-09-10', weight: 70.5, bodyFat: 20 });
  await app.view().locator('.bhist [data-act="body-edit"]').first().click();
  const del = app.sheet().locator('[data-act="body-del"]');
  await del.click();
  await expect(del).toHaveText('Bấm lần nữa để xoá');
  await del.click();
  expect((await app.state()).body).toHaveLength(0);
});

test('đánh giá thay đổi thành phần cơ thể giữa 2 tháng', async ({ app }) => {
  const cases = [
    [{ weight: 70, bodyFat: 20, muscle: 32 }, { weight: 70.5, bodyFat: 18, muscle: 33 }, 'Tăng cơ, giảm mỡ'],
    [{ weight: 70, bodyFat: 20, muscle: 32 }, { weight: 71, bodyFat: 19.7, muscle: 33 }, 'Tăng cơ, mỡ giữ nguyên'],
    [{ weight: 70, bodyFat: 20, muscle: 32 }, { weight: 74, bodyFat: 23, muscle: 32.5 }, 'Tăng cả cơ và mỡ, mỡ tăng nhanh hơn'],
    [{ weight: 70, bodyFat: 20, muscle: 32 }, { weight: 72, bodyFat: 20.3, muscle: 33 }, 'Tăng cả cơ và mỡ'],
    [{ weight: 70, bodyFat: 20, muscle: 32 }, { weight: 69, bodyFat: 18.5, muscle: 32 }, 'Giảm mỡ, giữ được cơ'],
    [{ weight: 70, bodyFat: 20, muscle: 32 }, { weight: 67, bodyFat: 18.5, muscle: 31 }, 'Giảm mỡ nhưng mất cơ'],
    [{ weight: 70, bodyFat: 20, muscle: 32 }, { weight: 69, bodyFat: 20.3, muscle: 31 }, 'Đang mất cơ'],
    [{ weight: 70, bodyFat: 20, muscle: 32 }, { weight: 71, bodyFat: 21.3, muscle: 32 }, 'Đang tăng mỡ'],
    [{ weight: 70, bodyFat: 20 }, { weight: 70, bodyFat: 20 }, 'Ổn định']
  ];
  for (const [a, b, verdict] of cases) {
    await app.seed({ state: state({ body: [B('2026-09-12', a), B('2026-10-12', b)] }) });
    await app.tab('body');
    await expect(app.view().locator('.bverd .vt')).toContainText(verdict);
  }
  await expect(app.view().locator('.bverd .vl')).toContainText('Khối nạc ±0 kg · Mỡ ±0 kg');
});

test('biểu đồ cơ & mỡ, cân nặng, % mỡ, vòng eo; danh sách lần đo thu gọn 5 lần', async ({ app, page }) => {
  const body = ['2026-05-10', '2026-06-10', '2026-07-10', '2026-08-10', '2026-09-10', '2026-10-10'].map((d, i) => B(d, { weight: 70 + i, bodyFat: 20 - i * 0.5, muscle: 32 + i * 0.4, waist: 85 - i }));
  await app.seed({ state: state({ body }) });
  await app.tab('body');
  await expect(app.view().locator('[data-act="bm"]')).toHaveText(['Cơ & mỡ', 'Cân nặng', '% mỡ', 'Vòng eo']);
  await expect(app.view().locator('#body-chart svg.mline')).toHaveCount(2);
  await expect(app.view().locator('#body-chart')).toContainText('Cơ xương (kg)');
  await app.click('bm', '[data-k="weight"]');
  await expect(app.view().locator('#body-chart .ctitle')).toHaveText('Cân nặng (kg)');
  await app.click('bm', '[data-k="waist"]');
  await expect(app.view().locator('#body-chart .ctitle')).toHaveText('Vòng eo (cm)');
  await expect(app.view().locator('.bhist .li')).toHaveCount(5);
  await app.click('b-all');
  await expect(app.view().locator('.bhist .li')).toHaveCount(6);
  /* ô so với tháng trước */
  await expect(app.view().locator('.btile').first()).toContainText('▲ 1 so với T9');
});

test('chỉ có 1 lần đo có % mỡ: biểu đồ cơ & mỡ báo cần 2 lần', async ({ app }) => {
  await app.seed({ state: state({ body: [B('2026-10-01', { weight: 70, bodyFat: 20 }), B('2026-10-11', { weight: 71 })] }) });
  await app.tab('body');
  await expect(app.view().locator('#body-chart')).toContainText('Cần ít nhất 2 lần đo');
});

test('ảnh body: thêm nhiều ảnh, tự đọc ngày chụp trong ảnh, sửa tư thế, lưu theo tháng', async ({ app, page }) => {
  await app.goto();
  await app.tab('body');
  await expect(app.view()).toContainText('Mỗi tháng chụp 3 tư thế');
  await page.setInputFiles('#bp-in', [
    { name: 'truoc.jpg', mimeType: 'image/jpeg', buffer: jpegWithExif('2026:09:05 07:30:00') },
    { name: 'sau.jpg', mimeType: 'image/jpeg', buffer: jpegWithExif('2026:10:20 07:30:00', false) },
    { name: 'khong-exif.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(JPEG_B64, 'base64') }
  ]);
  await expect(app.sheet()).toContainText('Thêm 3 ảnh body');
  await expect(page.locator('#bpn-d-0')).toHaveValue('2026-09-05');
  await expect(page.locator('#bpn-d-1')).toHaveValue('2026-10-20');
  await expect(app.sheet().locator('.bpr').first()).toContainText('đọc từ ảnh');
  await app.sheet().locator('[data-act="bpn-pose"][data-i="2"][data-k="Nghiêng"]').click();
  await app.click('bpn-save');
  await expect(app.toast()).toHaveText('Đã lưu 3 ảnh');
  const P = (await app.state()).bodyPhotos;
  expect(P.map(p => [p.date, p.pose])).toEqual([['2026-09-05', 'Trước'], ['2026-10-20', 'Trước'], [TODAY, 'Nghiêng']]);
  /* đang xem tư thế của ảnh cuối (Nghiêng) */
  await app.click('pose', '[data-k="Trước"]');
  await expect(app.view().locator('#cmp')).toBeVisible();
  await expect(app.view().locator('#cmp .tag.r')).toContainText('T10/26 · 1 tháng');
  /* kéo thanh so sánh */
  await page.locator('#cmp-range').fill('30');
  await expect(page.locator('#cmp .handle')).toHaveAttribute('style', /left: 30%/);
  await page.locator('#cmp').scrollIntoViewIfNeeded();
  const box = await page.locator('#cmp').boundingBox(), cy = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.8, cy);
  await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.75, cy); await page.mouse.up();
  await expect(page.locator('#cmp .handle')).toHaveAttribute('style', /left: 7\d/);
  await expect(app.view().locator('.bgrid .bgr')).toHaveCount(2);
});

test('xem ảnh: đặt làm ảnh Trước/Sau, đổi ngày/tư thế, xoá; ô trống thêm ảnh đúng tháng', async ({ app, page }) => {
  const bp = (id, date, pose) => ({ id, date, t: 1, pose, photoId: 'x' + id });
  await app.seed({ state: state({ bodyPhotos: [bp('a', '2026-08-03', 'Trước'), bp('b', '2026-09-03', 'Trước'), bp('c', '2026-10-03', 'Trước')],
    body: [B('2026-08-04', { weight: 70, bodyFat: 20 }), B('2026-10-02', { weight: 72, bodyFat: 18 })] }), photos: { xa: PHOTO, xb: PHOTO, xc: PHOTO } });
  await app.tab('body');
  await expect(app.view().locator('.cmpnum')).toContainText('Tỉ lệ mỡ 20 → 18');
  await app.view().locator('[data-act="bp-view"][data-id="b"]').click();
  await expect(page.locator('#viewer')).toBeVisible();
  await page.locator('#viewer [data-act="bp-ab"][data-k="A"]').click();
  await expect(app.toast()).toHaveText('Đã đặt làm ảnh Trước');
  expect((await app.ui()).cmpA).toBe('b');
  await page.locator('[data-bind="cmp"][data-k="B"]').selectOption('a');
  expect((await app.ui()).cmpB).toBe('a');
  await app.view().locator('[data-act="bp-view"][data-id="c"]').click();
  await page.locator('#viewer [data-act="bp-edit"]').click();
  await page.fill('#bpe-d', '2026-10-05');
  await app.sheet().locator('[data-act="bpe-pose"][data-k="Sau"]').click();
  await app.click('bpe-save');
  expect((await app.state()).bodyPhotos.find(x => x.id === 'c')).toMatchObject({ date: '2026-10-05', pose: 'Sau' });
  await app.click('pose', '[data-k="Sau"]');
  await expect(app.view()).toContainText('Có từ 2 ảnh tư thế “Sau”');
  await app.view().locator('[data-act="bp-view"][data-id="c"]').click();
  const del = page.locator('#viewer [data-act="bp-del"]');
  await del.click(); await expect(del).toHaveText('Bấm lần nữa để xoá'); await del.click();
  await expect(app.toast()).toHaveText('Đã xoá ảnh');
  expect((await app.state()).bodyPhotos.map(x => x.id)).toEqual(['a', 'b']);
  await page.keyboard.press('Escape');
  /* ô trống của tháng 9 tư thế Nghiêng: ảnh mới vào giữa tháng 9 */
  const chooser = page.waitForEvent('filechooser');
  await app.view().locator('[data-act="bp-add"][data-m="2026-09"][data-k="Nghiêng"]').click();
  await (await chooser).setFiles({ name: 'n.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(JPEG_B64, 'base64') });
  await expect(page.locator('#bpn-d-0')).toHaveValue('2026-09-15');
  await app.click('bpn-cancel');
  await expect(page.locator('#sheet')).toBeHidden();
});

test('ảnh body cũ hơn 28 ngày: nhắc chụp tháng này; đặt cùng 1 ngày cho tất cả ảnh mới', async ({ app, page }) => {
  await app.seed({ state: state({ bodyPhotos: [{ id: 'a', date: '2026-09-01', t: 1, pose: 'Trước', photoId: 'xa' }] }), photos: { xa: PHOTO } });
  await app.tab('body');
  await expect(app.view()).toContainText('Đã 50 ngày chưa chụp');
  const f = { mimeType: 'image/jpeg', buffer: Buffer.from(JPEG_B64, 'base64') };
  await page.setInputFiles('#bp-in', [{ name: '1.jpg', ...f }, { name: '2.jpg', ...f }]);
  await page.fill('#bpn-all', '2026-10-19');
  await page.locator('#bpn-all').dispatchEvent('change');
  await expect(page.locator('#bpn-d-1')).toHaveValue('2026-10-19');
  await app.click('bpn-save');
  await expect(app.toast()).toHaveText('Đã lưu 2 ảnh');
  expect((await app.state()).bodyPhotos.slice(1).map(x => x.date)).toEqual(['2026-10-19', '2026-10-19']);
});
