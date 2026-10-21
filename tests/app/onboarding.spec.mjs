// BR-01 Khởi đầu: màn chào mừng, giáo án mẫu, tạo ngày tập đầu tiên.
import { test, expect } from '../helpers/fixtures.mjs';

test('lần đầu mở app: màn chào mừng, 5 tab, không lỗi', async ({ app, page }) => {
  await app.goto();
  await expect(app.view()).toContainText('Cuốn sổ tạ trong túi bạn');
  await expect(page.locator('#nav-bar button')).toHaveCount(5);
  /* hồ sơ mặc định tên “Tôi” nên lời chào thành “Chào Tôi” (xem docs: điểm chưa ổn) */
  await expect(page.locator('#hello')).toContainText('Chào Tôi');
  await expect(page.locator('#today-l')).toHaveText('Thứ Tư, 21/10');
  expect(await app.profiles()).toMatchObject({ active: 'p1', list: [{ id: 'p1', name: 'Tôi' }] });
});

test('dùng giáo án mẫu 4 ngày: tạo đủ ngày và bài, chuyển sang tab Giáo án', async ({ app }) => {
  await app.goto();
  await app.click('onb-sample');
  await expect(app.toast()).toContainText('Đã tạo giáo án mẫu');
  const st = await app.state();
  expect(st.days.map(d => d.name)).toEqual(['Lưng', 'Ngực + Tay trước'.replace('trước', 'sau'), 'Chân', 'Vai + Tay trước']);
  expect(st.days.every(d => d.exercises.length === 5)).toBe(true);
  const bench = st.days[1].exercises[0];
  expect(bench).toMatchObject({ name: 'Đẩy ngực tạ đòn (Bench press)', muscle: 'Ngực', type: 'upper', sets: 3, repTarget: 10, step: 2.5, warmup: true });
  /* bài tạ đơn tự ghi kg mỗi tay, bước 2 kg */
  const db = st.days[0].exercises.find(e => /Dumbbell row/.test(e.name));
  expect(db).toMatchObject({ each: true, step: 2 });
  await expect(app.view()).toContainText('Giáo án của Tôi');
  await app.flushed();
  expect((await app.idb('kv', 'state')).days).toHaveLength(4);
});

test('tạo ngày tập đầu tiên từ màn chào mừng', async ({ app }) => {
  await app.goto();
  await app.click('onb-new');
  await expect(app.sheet()).toContainText('Ngày tập mới');
  await app.sheet().locator('[data-act="qpick"][data-v="Push"]').click();
  await expect(app.page.locator('#f-dayname')).toHaveValue('Push');
  await app.click('save-day');
  const st = await app.state();
  expect(st.days).toHaveLength(1);
  expect(st.days[0]).toMatchObject({ name: 'Push', exercises: [] });
  await expect(app.view()).toContainText('Chưa có bài tập');
});

test('nút quét mã ở màn chào mừng mở màn quét / dán mã', async ({ app }) => {
  await app.goto();
  await app.click('qr-scan');
  await expect(app.sheet()).toContainText('Quét hoặc dán mã');
  await app.click('qr-close');
  await expect(app.page.locator('#sheet')).toBeHidden();
});
