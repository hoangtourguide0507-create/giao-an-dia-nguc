// BR-22 Đồng bộ Google Drive giữa máy HLV và máy học viên (mã liên kết, tự đồng bộ hai chiều, ảnh máy, ngắt liên kết, lỗi).
import { test, expect, fakeCamera } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, session, addDays, TODAY, PHOTO } from '../helpers/data.mjs';

async function hlvLogin(app, gas, extraStates = {}) {
  await app.more('drive');
  await app.click('acc-hlv-new');
  await app.page.fill('#hn-sv', gas.url); await app.page.fill('#hn-key', gas.ma); await app.page.fill('#hn-ten', 'Hoàng');
  await app.page.fill('#hn-u', 'hoang'); await app.page.fill('#hn-p', 'matkhau1'); await app.page.fill('#hn-p2', 'matkhau1');
  await app.click('acc-hlv-go');
  await expect.poll(async () => (await app.state()).settings.acc?.u, { timeout: 15000 }).toBe('hoang');
}
const driveNow = async app => { await app.more('drive'); await app.click('drv-now'); await app.page.waitForTimeout(300); };
/* Phòng HLV: thẻ học viên có nút “☁ Mã liên kết” */
const linkBtn = (app, k) => app.view().locator('.tcard').nth(k).locator('[data-act="drv-hv"]');
async function lanCode(app) {
  await app.tab('more');
  await linkBtn(app, 1).click();
  await expect(app.sheet()).toContainText('Google Drive');
  await app.click('drv-copy');
  await expect(app.toast()).toContainText('Đã sao chép mã');
  return app.page.evaluate(() => navigator.clipboard.readText());
}

test('HLV cấp mã liên kết cho học viên → học viên dán mã → nhận giáo án HLV soạn, tập xong HLV tự nhận buổi', async ({ app, device, gas }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) } });
  await hlvLogin(app, gas);
  await expect.poll(async () => (await app.idb('kv', 'state:p2'))?.drv?.id, { timeout: 15000 }).toBeTruthy();
  /* mã liên kết: QR + mã chữ */
  await app.tab('more');
  await linkBtn(app, 1).click();
  await expect(app.sheet()).toContainText('Lan · Google Drive');
  expect(await app.page.locator('#qr-c').evaluate(c => c.width)).toBeGreaterThan(100);
  await app.click('drv-copy');
  const code = await app.page.evaluate(() => navigator.clipboard.readText());
  expect(code).toMatch(/^GAL1\.[a-z0-9]+\.1\.1\./);
  await app.closeSheet();
  /* máy học viên */
  const hv = await device();
  await hv.goto();
  await hv.page.evaluate(c => navigator.clipboard.writeText(c), code);
  await hv.more('drive');
  await hv.click('qr-scan');
  await hv.sheet().locator('[data-act="qr-paste"]').click();
  await expect(hv.sheet()).toContainText('Liên kết Google Drive');
  await expect(hv.sheet()).toContainText('Lan');
  await hv.click('drv-link');
  await expect.poll(async () => (await hv.state()).days.map(d => d.name), { timeout: 15000 }).toEqual(['Ngực + Tay sau', 'Lưng + Tay trước']);
  expect((await hv.state()).drv).toMatchObject({ u: gas.url });
  await hv.more('drive');
  await expect(hv.view().locator('.drv:not(.acc)')).toContainText('đã liên kết với HLV');
  /* học viên tập → đồng bộ → HLV nhận */
  await hv.tab('home');
  await hv.view().locator('.hero .tgo').click();
  for (const s of [0, 1, 2]) await hv.view().locator(`[data-act="set-done"][data-e="0"][data-s="${s}"]`).click();
  await hv.view().locator('.sess-actions [data-act="finish"]').click(); await hv.click('save-session'); await hv.closeSheet(); /* gợi ý chia sẻ cho PT (BR-23.11) */
  await driveNow(hv); await driveNow(app);
  await expect.poll(async () => (await app.idb('kv', 'state:p2'))?.sessions?.length, { timeout: 15000 }).toBe(1);
  /* HLV sửa giáo án (đổi mức tạ hiện tại) → học viên nhận */
  const st2 = await app.idb('kv', 'state:p2'); st2.days[0].exercises[0].currentKg = 55; st2.days[0].exercises[0].kgSetAt = Date.now() + 5000; st2.updatedAt = Date.now() + 5000;
  await app.page.evaluate(async st => { await new Promise(res => { const r = indexedDB.open('so-ta', 1); r.onsuccess = () => { const t = r.result.transaction('kv', 'readwrite'); t.objectStore('kv').put(st, 'state:p2'); t.oncomplete = res; }; }); }, st2);
  await app.reload();
  await driveNow(app); await driveNow(hv);
  await expect.poll(async () => (await hv.state()).days[0].exercises[0].currentKg, { timeout: 15000 }).toBe(55);
});

test('mã liên kết dán vào máy HLV bị từ chối; mã hỏng và mã kiểu cũ báo rõ; quét bằng camera', async ({ app, device, gas }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) } });
  await hlvLogin(app, gas);
  await expect.poll(async () => (await app.idb('kv', 'state:p2'))?.drv?.id, { timeout: 15000 }).toBeTruthy();
  const code = await lanCode(app);
  /* HLV dán mã của học viên */
  await app.closeSheet();
  await app.page.evaluate(c => navigator.clipboard.writeText(c), code);
  await app.page.evaluate(() => document.querySelector('[data-act="qr-paste"]') && 0);
  await app.page.evaluate(async () => { const b = document.createElement('button'); b.dataset.act = 'qr-paste'; document.body.appendChild(b); b.click(); b.remove(); });
  await expect(app.toast()).toHaveText('Đây là mã cho máy học viên. Máy HLV không cần quét.');
  /* máy học viên mới */
  const hv = await device();
  await hv.goto();
  await hv.click('qr-scan');
  await hv.page.locator('details.wpkeep summary').click();
  const body = code.split('.').slice(4).join('.');
  await hv.page.fill('#paste-in', 'xin chào, không có mã');
  await hv.click('paste-go');
  await expect(hv.toast()).toHaveText('Không tìm thấy mã liên kết trong nội dung vừa dán');
  await hv.toastGone();
  await hv.page.fill('#paste-in', 'SOTA2z.AAAA');
  await hv.click('paste-go');
  await expect(hv.toast()).toContainText('Mã này là kiểu gửi cũ, không còn dùng');
  await hv.toastGone();
  await hv.page.fill('#paste-in', 'GAL1.abcd.1.1.AAAA');
  await hv.click('paste-go');
  await expect(hv.toast()).toHaveText('Mã liên kết không đọc được');
  await hv.toastGone();
  /* mã nhiều trang thiếu trang */
  await hv.page.fill('#paste-in', 'GAL1.abcd.2.3.' + body.slice(0, 20));
  await hv.click('paste-go');
  await expect(hv.toast()).toHaveText('Mã nhiều phần đang thiếu trang 1, 3/3');
  await hv.toastGone();
  /* quét bằng camera */
  await fakeCamera(hv.page, code);
  await hv.closeSheet();
  await hv.click('qr-scan');
  await expect(hv.sheet()).toContainText('Liên kết Google Drive', { timeout: 10000 });
});

test('ngắt liên kết: dữ liệu trên máy giữ nguyên, ngừng đồng bộ; HLV cấp mã mới thì mã cũ hết hiệu lực', async ({ app, device, gas }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) } });
  await hlvLogin(app, gas);
  await expect.poll(async () => (await app.idb('kv', 'state:p2'))?.drv?.id, { timeout: 15000 }).toBeTruthy();
  const code = await lanCode(app);
  await app.closeSheet();
  const hv = await device();
  await hv.goto();
  await hv.page.evaluate(c => navigator.clipboard.writeText(c), code);
  await hv.more('drive');
  await hv.click('qr-scan');
  await hv.sheet().locator('[data-act="qr-paste"]').click();
  await hv.click('drv-link');
  await expect.poll(async () => (await hv.state()).days.length, { timeout: 15000 }).toBe(2);
  /* HLV cấp mã mới → máy học viên mất quyền */
  await app.tab('more');
  await linkBtn(app, 1).click();
  await app.click('drv-rekey');
  await expect(app.toast()).toHaveText('Đã cấp mã mới · gửi lại cho học viên');
  await driveNow(hv);
  await hv.more('drive');
  await expect(hv.view().locator('.drv .st.err')).toBeVisible({ timeout: 10000 });
  /* ngắt liên kết */
  await hv.click('drv-unlink');
  await expect(hv.sheet()).toContainText('Ngắt liên kết Google Drive?');
  await hv.click('confirm-ok');
  await expect(hv.toast()).toContainText('Đã ngắt');
  const st = await hv.state();
  expect(st.drv).toBeUndefined(); expect(st.days).toHaveLength(2);
});

test('HLV chưa cài Drive bấm mã liên kết: được dẫn tới Cài đặt; nhập MÃ HLV sai bị từ chối', async ({ app, gas }) => {
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }], coach: { on: true, name: 'Hoàng' } }, states: { p1: state(), p2: state() } });
  await app.tab('more');
  await linkBtn(app, 1).click();
  await expect(app.sheet()).toContainText('Chưa cài Google Drive');
  await app.sheet().locator('[data-act="tab"][data-tab="settings"]').click();
  await expect(app.view()).toContainText('Cài đặt');
});

test('dùng MÃ HLV kiểu cũ (không đăng nhập): kiểm tra link và mã, kết nối, đưa mọi hồ sơ lên Drive, tạo mã cho học viên', async ({ app, gas }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }], coach: { on: true, name: 'Hoàng' } },
    states: { p1: state({ settings: { drvUrl: 'https://script.google.com/macros/s/old/exec', drvKey: 'x'.repeat(32) } }), p2: state({ days: P.days }) } });
  await app.more('drive');
  await expect(app.view().locator('.drv:not(.acc)')).toContainText('Đồng bộ Google Drive');
  await app.page.fill('#drv-url', 'http://sai'); await app.page.fill('#drv-key', gas.ma); await app.click('drv-save');
  await expect(app.toast()).toHaveText('Link phải dạng https://script.google.com/macros/s/…/exec');
  await app.page.fill('#drv-url', gas.url); await app.page.fill('#drv-key', 'ngan'); await app.click('drv-save');
  await expect(app.toast()).toHaveText('MÃ HLV chưa đúng');
  await app.page.fill('#drv-key', 'y'.repeat(32)); await app.click('drv-save');
  await expect(app.toast()).toContainText('Không kết nối được');
  await app.toastGone();
  await app.page.fill('#drv-key', gas.ma); await app.click('drv-save');
  await expect(app.toast()).toContainText('Đã kết nối');
  await expect.poll(async () => (await gas.post({ a: 'tv.ds', ma: gas.ma })).ds.map(t => t.ten).sort(), { timeout: 15000 }).toEqual(['Hoàng', 'Lan']);
  await app.more('drive');
  await expect(app.view().locator('.drv:not(.acc) .st')).toContainText('Đã đồng bộ');
  await app.view().locator('.drv:not(.acc) [data-act="drv-hv"]').nth(1).click();
  await expect(app.sheet()).toContainText('Lan · Google Drive');
});

test('VD-02: thẻ “chưa tập buổi nào” trong Việc cần làm mở đúng mã liên kết của học viên', async ({ app, gas }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) } });
  await hlvLogin(app, gas);
  await expect.poll(async () => (await app.idb('kv', 'state:p2'))?.drv?.id, { timeout: 15000 }).toBeTruthy();
  await app.tab('more');
  await app.view().locator('.todo[data-act="coach-share"]').first().click();
  await expect(app.sheet()).toContainText('Lan · Google Drive');
  expect(await app.page.locator('#qr-c').evaluate(c => c.width)).toBeGreaterThan(100);
});

test('VD-33: đồng bộ ảnh máy tập qua Drive thật — mã băm ảnh có dấu “.” bị máy chủ Apps Script từ chối', async ({ app, device, gas }) => {
  const P = basicPlan(); P.bench.photos = ['ph1'];
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) }, photos: { ph1: PHOTO } });
  await hlvLogin(app, gas);
  await expect.poll(async () => (await app.idb('kv', 'state:p2'))?.drv?.id, { timeout: 15000 }).toBeTruthy();
  await driveNow(app);
  const code = await lanCode(app);
  await app.closeSheet();
  const hv = await device();
  await hv.goto();
  await hv.page.evaluate(c => navigator.clipboard.writeText(c), code);
  await hv.more('drive');
  await hv.click('qr-scan');
  await hv.sheet().locator('[data-act="qr-paste"]').click();
  await hv.click('drv-link');
  await expect.poll(async () => (await hv.state()).days.length, { timeout: 20000 }).toBe(2);
  await expect.poll(async () => (await hv.state()).days[0]?.exercises[0]?.photos?.length, { timeout: 20000 }).toBe(1);
  const pid = (await hv.state()).days[0].exercises[0].photos[0];
  expect(await hv.idb('photos', pid)).toMatch(/^data:image\/jpeg/);
});

/* PA-25: mã băm ảnh cũ (có dấu “.”) được đổi sang mã mới (dấu “_”) ở mọi chỗ còn lưu */
test('VD-33: mã băm ảnh cũ có dấu “.” trong danh sách đã gửi được chuyển sang mã mới', async ({ app, gas }) => {
  const P = basicPlan(); P.bench.photos = ['ph1'];
  const hashOf = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return [(h >>> 0).toString(36), s.length.toString(36)]; };
  const [a, b] = hashOf(PHOTO), oldH = a + '.' + b, newH = a + '_' + b;
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) }, photos: { ph1: PHOTO }, kv: { ['drvUp:' + gas.url]: [oldH, 'zz.9'] } });
  await hlvLogin(app, gas);
  await expect.poll(async () => (await app.idb('kv', 'state:p2'))?.drv?.id, { timeout: 15000 }).toBeTruthy();
  await driveNow(app);
  await expect.poll(async () => { const u = await app.idb('kv', 'drvUp:' + gas.url); return u && u.includes(newH) && u.includes('zz_9') && !u.some(h => h.includes('.')); }, { timeout: 15000 }).toBe(true);
});

test('lỗi mạng khi đồng bộ: báo trạng thái lỗi, thử lại được', async ({ app, device, gas }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) } });
  await hlvLogin(app, gas);
  await app.page.route('https://script.google.com/**', r => r.fulfill({ status: 500, body: 'lỗi' }));
  await driveNow(app);
  await expect(app.toast()).toContainText('Chưa đồng bộ được: Máy chủ trả lỗi 500');
  await app.page.unroute('https://script.google.com/**');
  await app.page.route('https://script.google.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html>Đăng nhập Google</html>' }));
  await driveNow(app);
  await expect(app.toast()).toContainText('Link Apps Script chưa đúng');
});

test('liên kết bằng ảnh chụp mã QR: chọn ảnh từ thư viện; ảnh không có mã thì báo', async ({ app, device, gas }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) } });
  await hlvLogin(app, gas);
  await expect.poll(async () => (await app.idb('kv', 'state:p2'))?.drv?.id, { timeout: 15000 }).toBeTruthy();
  await app.tab('more');
  await linkBtn(app, 1).click();
  /* ảnh chụp màn hình mã QR (canvas của app) */
  const png = Buffer.from((await app.page.locator('#qr-c').evaluate(c => c.toDataURL('image/png'))).split(',')[1], 'base64');
  const hv = await device();
  await hv.goto();
  await hv.more('drive');
  await hv.click('qr-scan');
  await hv.page.setInputFiles('#img-in', { name: 'ma.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
  await expect(hv.toast()).toHaveText('Không tìm thấy mã QR trong ảnh đã chọn');
  await hv.toastGone();
  await hv.page.setInputFiles('#img-in', { name: 'ma.png', mimeType: 'image/png', buffer: png });
  await expect(hv.sheet()).toContainText('Liên kết Google Drive');
  await hv.click('drv-link');
  await expect.poll(async () => (await hv.state()).drv?.id, { timeout: 15000 }).toBeTruthy();
  /* ảnh dài (cao hơn 1,6 lần chiều ngang) chứa mã ở giữa: app trượt khung để tìm */
  const tall = await hv.page.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height * 3; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, img.height); return c.toDataURL('image/png').split(',')[1]; }, png.toString('base64'));
  await hv.click('drv-unlink'); await hv.click('confirm-ok');
  await hv.toastGone();
  await hv.more('drive');
  await hv.click('qr-scan');
  await hv.page.setInputFiles('#img-in', { name: 'dai.png', mimeType: 'image/png', buffer: Buffer.from(tall, 'base64') });
  await expect(hv.sheet()).toContainText('Liên kết Google Drive');
});

test('gửi mã liên kết qua bảng chia sẻ; khi không chia sẻ/sao chép được thì hiện ô để tự sao chép', async ({ app, gas, page }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) } });
  await hlvLogin(app, gas);
  await expect.poll(async () => (await app.idb('kv', 'state:p2'))?.drv?.id, { timeout: 15000 }).toBeTruthy();
  await app.tab('more');
  await linkBtn(app, 1).click();
  await page.evaluate(() => { window.__sh = []; navigator.share = async d => { window.__sh.push(d.title); }; });
  await app.click('drv-copy');
  await expect.poll(() => page.evaluate(() => window.__sh)).toEqual(['Mã liên kết Google Drive']);
  await page.evaluate(() => { navigator.share = undefined; navigator.clipboard.writeText = async () => { throw new Error('chặn'); }; });
  await app.click('drv-copy');
  await expect(app.sheet()).toContainText('Bấm giữ vào ô bên dưới');
  await expect(page.locator('#manual-copy-box')).toHaveValue(/^GAL1\./);
  await app.click('copy');
  await expect(app.toast()).toHaveText('Đã chọn sẵn, bấm giữ để sao chép');
  await page.evaluate(() => { navigator.clipboard.writeText = async () => {}; });
  await app.click('copy');
  await expect(app.toast()).toHaveText('Đã sao chép');
});

test('quét mã: bộ nhớ tạm bị chặn thì mở ô dán chữ; camera chỉ thấy mã lạ thì tiếp tục chờ', async ({ app, page }) => {
  await app.goto();
  await app.click('qr-scan');
  await page.evaluate(() => { navigator.clipboard.readText = async () => { throw new Error('chặn'); }; });
  await app.sheet().locator('[data-act="qr-paste"]').click();
  await expect(page.locator('#paste-in')).toBeFocused();
  await expect(app.toast()).toHaveText('Chạm giữ vào ô chữ bên dưới → chọn Dán');
  await app.closeSheet();
  await fakeCamera(page, 'https://example.com/khong-phai-ma-lien-ket');
  await app.click('qr-scan');
  await expect(page.locator('#qr-st')).toHaveText('Giữ mã QR trong khung, cách khoảng 20–30 cm');
  await page.waitForTimeout(600);
  await expect(app.sheet()).toContainText('Quét mã liên kết');
});

test('học viên đang có hồ sơ liên kết với tài khoản khác đăng nhập: tạo hồ sơ mới cho tài khoản này', async ({ app, device, gas }) => {
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state({ days: basicPlan().days }), p2: state() } });
  await hlvLogin(app, gas);
  await expect.poll(async () => (await gas.post({ a: 'tv.ds', ma: gas.ma })).ds.length, { timeout: 15000 }).toBe(2);
  const lan = (await gas.post({ a: 'tv.ds', ma: gas.ma })).ds.find(t => t.ten === 'Lan');
  await gas.post({ a: 'tv.tk', ma: gas.ma, id: lan.id, u: 'lan', mk: 'lan12345' });
  const hv = await device();
  await hv.seed({ state: state({ days: basicPlan().days, drv: { id: 'tkkhac', m: 'm'.repeat(30), u: gas.url, hlvSeen: 0, hvRev: 0, sentH: '' } }) });
  await hv.more('drive');
  await hv.page.fill('#acc-u', 'lan'); await hv.page.fill('#acc-p', 'lan12345');
  if (!(await hv.page.locator('#acc-sv').isVisible())) await hv.page.locator('.acc-sv summary').click();
  await hv.page.fill('#acc-sv', gas.url);
  await hv.click('acc-login');
  await expect.poll(async () => (await hv.profiles()).list.length, { timeout: 15000 }).toBe(2);
  expect((await hv.profiles()).list.map(p => p.name)).toEqual(['Tôi', 'Lan']);
  await expect.poll(async () => (await hv.state()).drv?.id, { timeout: 15000 }).toBe(lan.id);
});
