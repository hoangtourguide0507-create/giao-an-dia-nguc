// BR-23 Thông báo: Notification API không cần máy chủ, báo hết giờ nghỉ, máy chủ thông báo (Web Push), nhắc lịch tập, tin từ Drive.
import { test, expect, NOW } from '../helpers/fixtures.mjs';
import { mockNotifications, mockPushServer, PUSH_URL, DEFAULT_PUSH } from '../helpers/notify.mjs';
import { state, basicPlan } from '../helpers/data.mjs';

const card = app => app.view().locator('.ncard');

test('trình duyệt không có Notification: báo chưa hỗ trợ; trên iPhone nhắc mở bằng icon màn hình chính', async ({ app, page }) => {
  await mockNotifications(page, { perm: 'none' });
  await app.goto();
  await app.more('notif');
  await expect(card(app)).toContainText('Trên iPhone, mở app bằng icon trên màn hình chính');
  await page.evaluate(() => Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 14)', configurable: true }));
  await app.tab('plan'); await app.more('notif');
  await expect(card(app)).toContainText('Trình duyệt này chưa hỗ trợ thông báo');
});

test('quyền thông báo: đã chặn → hướng dẫn bật lại; chưa hỏi → xin quyền', async ({ app, page }) => {
  await mockNotifications(page, { perm: 'denied' });
  await app.goto();
  await app.tab('more');
  await expect(app.view().locator('.grow', { hasText: 'Thông báo' })).toContainText('Đã chặn trong Cài đặt iPhone');
  await app.more('notif');
  await expect(card(app)).toContainText('Bạn đã chặn thông báo');
});

test('xin quyền → bật báo hết giờ nghỉ → thử thông báo (qua service worker hoặc Notification trực tiếp)', async ({ app, page }) => {
  await mockNotifications(page, { perm: 'default' });
  const pc = await mockPushServer(page);
  await app.goto();
  await app.tab('more');
  await expect(app.view().locator('.grow', { hasText: 'Thông báo' })).toContainText('Chưa bật');
  await app.more('notif');
  await app.click('notif-allow');
  await expect(app.toast()).toHaveText('🔔 Đã bật thông báo');
  expect(await page.evaluate(() => window.__asked)).toBeGreaterThanOrEqual(1);
  expect((await app.state()).settings.notify).toBe(true);
  /* PA-23: cho phép xong là tự nối máy chủ thông báo dựng sẵn */
  await expect.poll(() => pc.map(c => c.path)).toEqual(expect.arrayContaining(['/vapid', '/sub']));
  /* từ chối quyền */
  await app.more('notif');
  await expect(card(app).locator('#notify-t')).toBeChecked();
  await card(app).locator('#notify-t').uncheck();
  expect((await app.state()).settings.notify).toBe(false);
  await card(app).locator('#notify-t').check();
  expect((await app.state()).settings.notify).toBe(true);
  await expect(app.toast()).toHaveText('Đã bật báo hết giờ nghỉ');
  await app.click('notif-local-test');
  expect(await page.evaluate(() => window.__shown.map(x => [x[0], x[1], x[2].body]))).toEqual([['sw', 'Giáo Án Địa Ngục', 'Thông báo đã hoạt động 💪']]);
  /* không có đăng ký service worker: dùng Notification trực tiếp */
  await page.evaluate(() => { window.__noReg = true; });
  await app.click('notif-local-test');
  expect(await page.evaluate(() => window.__shown.map(x => x[0]))).toEqual(['sw', 'ctor']);
});

test('người dùng từ chối khi được xin quyền', async ({ app, page }) => {
  await mockNotifications(page, { perm: 'default' });
  await app.goto();
  await page.evaluate(() => { window.__grant = 'denied'; });
  await app.more('notif');
  await app.click('notif-allow');
  await expect(app.toast()).toContainText('Chưa được phép');
});

test('hết giờ nghỉ khi app ở nền: hiện thông báo (đã bật báo, chưa có máy chủ)', async ({ app, page }) => {
  await mockNotifications(page, { perm: 'granted' });
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days, settings: { notify: true } }) });
  await app.view().locator('.hero .tgo').click();
  await app.view().locator('[data-act="set-done"][data-e="0"][data-s="0"]').click();
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.fastForward(100000);
  expect(await page.evaluate(() => window.__shown.map(x => [x[0], x[1], x[2].tag]))).toEqual([['sw', 'Hết giờ nghỉ', 'rest']]);
  /* không đăng ký service worker → dùng Notification trực tiếp; app ở nền nên không hiện hộp báo trong app */
  await page.evaluate(() => { window.__noReg = true; Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#alarm')).toBeVisible();
});

test('kết nối máy chủ thông báo: kiểm tra địa chỉ, xin quyền, đăng ký đẩy, báo hết giờ đúng giờ kể cả khi khoá màn hình', async ({ app, page }) => {
  await mockNotifications(page, { perm: 'granted' });
  const calls = await mockPushServer(page);
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days, settings: { notify: true } }) });
  /* PA-23: đã cho phép thông báo + có máy chủ dựng sẵn → tự nối khi mở app, không cần dán địa chỉ */
  await app.more('notif');
  await expect(card(app)).toContainText('Máy này nhận được thông báo đẩy');
  await expect.poll(() => calls.map(c => c.path)).toEqual(expect.arrayContaining(['/vapid', '/sub']));
  await expect(card(app).locator('input[data-k="pushServer"]')).toHaveAttribute('placeholder', DEFAULT_PUSH);
  /* đổi sang máy chủ riêng (có dấu / thừa) rồi đăng ký lại */
  await page.fill('input[data-k="pushServer"]', PUSH_URL + '/');
  await app.click('push-on');
  await expect(app.toast()).toHaveText('🔔 Đã bật thông báo trên máy này');
  await expect(card(app)).toContainText('Máy này nhận được thông báo đẩy');
  expect(await page.evaluate(() => window.__subscribed.userVisibleOnly)).toBe(true);
  await expect.poll(() => calls.map(c => c.path)).toEqual(expect.arrayContaining(['/vapid', '/sub', '/remind']));
  const remind = calls.find(c => c.path === '/remind').body;
  expect(remind.rules).toEqual([{ dow: 0, hm: '20:00', title: 'Cuối tuần rồi', body: 'Nhập cân nặng, số đo tuần này và tải bản sao lưu dữ liệu.', tag: 'weekly' }]);
  /* gửi thử */
  await app.click('push-try');
  await expect(app.toast()).toHaveText('Đã gửi · thông báo sẽ hiện trong vài giây');
  /* nhắc lịch tập: chọn thứ, giờ, tắt/bật */
  await card(app).locator('[data-act="n-day"][data-d="1"]').click();
  await card(app).locator('[data-act="n-day"][data-d="3"]').click();
  await card(app).locator('[data-act="n-day"][data-d="3"]').click();
  expect((await app.state()).settings.nDays).toEqual([1]);
  await card(app).locator('#n-time').fill('18:15');
  await card(app).locator('#n-time').dispatchEvent('change');
  expect((await app.state()).settings.nTime).toBe('18:15');
  await page.clock.fastForward(3000);
  const hasRemind = c => c.path === '/remind' && c.body.rules.some(r => r.tag === 'remind' && r.dow === 1 && r.hm === '18:15');
  await expect.poll(() => calls.some(hasRemind), { timeout: 8000 }).toBe(true);
  expect(calls.find(hasRemind).body.rules.find(r => r.tag === 'remind')).toMatchObject({ dow: 1, hm: '18:15', title: 'Đến giờ tập rồi 💪' });
  await card(app).locator('#n-weekly').uncheck();
  await card(app).locator('#n-drive').uncheck();
  await card(app).locator('#n-remind').uncheck();
  expect((await app.state()).settings).toMatchObject({ nWeekly: false, nDrive: false, nRemind: false });
  /* bắt đầu nghỉ → hẹn giờ trên máy chủ; bỏ qua nghỉ → huỷ */
  await app.tab('home');
  await app.view().locator('.hero .tgo').click();
  await app.view().locator('[data-act="set-done"][data-e="0"][data-s="0"]').click();
  await expect.poll(() => calls.some(c => c.path === '/schedule')).toBe(true);
  const sch = calls.find(c => c.path === '/schedule').body;
  expect(sch).toMatchObject({ title: 'Hết giờ nghỉ', body: 'Vào set tiếp: Đẩy ngực tạ đòn', tag: 'rest' });
  expect(sch.at).toBeGreaterThan(NOW.getTime());
  await page.locator('[data-act="rest-skip"]').click();
  await expect.poll(() => calls.some(c => c.path === '/cancel')).toBe(true);
});

test('máy chủ thông báo lỗi: báo không kết nối được; gửi thử lỗi', async ({ app, page }) => {
  await mockNotifications(page, { perm: 'granted' });
  const calls = await mockPushServer(page, { fail: { '/vapid': 500 } });
  await app.seed({ state: state({ settings: { notify: true, pushServer: PUSH_URL } }) });
  await app.more('notif');
  await app.click('push-on');
  await expect(app.toast()).toHaveText('Không kết nối được máy chủ thông báo. Kiểm tra mạng và địa chỉ máy chủ rồi thử lại.');
  expect(calls.some(c => c.path === '/vapid')).toBe(true);
});

test('máy đã đăng ký đẩy từ trước: tự đăng ký nhắc khi mở app; đăng ký lại; gửi thử lỗi', async ({ app, page }) => {
  await mockNotifications(page, { perm: 'granted', subscribed: true });
  const calls = await mockPushServer(page, { fail: { '/test': 500 } });
  await app.seed({ state: state({ settings: { notify: true, pushServer: PUSH_URL, pushKey: 'khac' } }) });
  await expect.poll(() => calls.map(c => c.path), { timeout: 8000 }).toEqual(expect.arrayContaining(['/sub', '/remind']));
  await app.more('notif');
  await expect(card(app)).toContainText('Có máy chủ thông báo: báo đúng giờ kể cả khi khoá màn hình');
  await app.click('push-on');
  await expect(app.toast()).toHaveText('🔔 Đã bật thông báo trên máy này');
  /* khoá máy chủ đổi → huỷ đăng ký cũ và đăng ký lại */
  expect(await page.evaluate(() => !!window.__subscribed)).toBe(true);
  await app.click('push-try');
  await expect(app.toast()).toContainText('Gửi thử không được');
});

test('HLV/học viên nhận tin qua Drive: máy chủ thông báo được gọi khi giáo án đổi hoặc học viên tập xong', async ({ app, device, gas, page }) => {
  await mockNotifications(page, { perm: 'granted', subscribed: true });
  const calls = await mockPushServer(page);
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state({ settings: { pushServer: PUSH_URL, notify: true } }), p2: state({ days: P.days }) } });
  await app.more('drive');
  await app.click('acc-hlv-new');
  await page.fill('#hn-sv', gas.url); await page.fill('#hn-key', gas.ma); await page.fill('#hn-ten', 'Hoàng'); await page.fill('#hn-u', 'hoang'); await page.fill('#hn-p', 'matkhau1'); await page.fill('#hn-p2', 'matkhau1');
  await app.click('acc-hlv-go');
  /* chờ lần đẩy đầu tiên xong (đã ghi dấu giáo án đã gửi) rồi mới sửa */
  await expect.poll(async () => (await app.idb('kv', 'state:p2'))?.drv?.nP, { timeout: 20000 }).toBeTruthy();
  /* HLV đổi giáo án của Lan rồi đồng bộ → báo cho học viên */
  const st = await app.idb('kv', 'state:p2'); st.days[0].name = 'Ngực mới'; st.updatedAt = Date.now() + 9999;
  await page.evaluate(async st => { await new Promise(res => { const r = indexedDB.open('so-ta', 1); r.onsuccess = () => { const t = r.result.transaction('kv', 'readwrite'); t.objectStore('kv').put(st, 'state:p2'); t.oncomplete = res; }; }); }, st);
  await app.flushed();
  await app.reload();
  await app.more('drive'); await app.click('drv-now');
  await expect.poll(() => calls.filter(c => c.path === '/notify').length, { timeout: 15000 }).toBeGreaterThan(0);
  const n = calls.filter(c => c.path === '/notify').pop().body;
  expect(n).toMatchObject({ tag: 'drive', title: 'HLV Hoàng vừa cập nhật giáo án' });
});
