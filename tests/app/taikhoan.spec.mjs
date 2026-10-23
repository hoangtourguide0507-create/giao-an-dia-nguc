// BR-26 Tài khoản HLV: thẻ QR học viên (lấy, chia sẻ), bỏ "Vai trên máy này" và "Đồng bộ với HLV", đăng nhập bằng QR hoặc mã.
import crypto from 'node:crypto';
import { test, expect, fakeCamera } from '../helpers/fixtures.mjs';
import { state } from '../helpers/data.mjs';

const seedHlv = app => app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }] }, states: { p1: state() } });
const hubQR = (hub, k = hub.hk) => 'GAH1.' + Buffer.from(JSON.stringify({ s: hub.url, k })).toString('base64url');
async function registerHlv(app, hub) {
  await app.tab('more');
  await fakeCamera(app.page, hubQR(hub));
  await app.click('qr-scan');
  await expect(app.toast()).toContainText('Đã đăng ký làm HLV');
}
/* dán mã vào khối Đăng nhập: mở phần “Hoặc dán mã” rồi đăng nhập */
async function pasteLogin(app, text) {
  await expect(app.page.locator('#login')).toBeVisible();
  await app.page.locator('#login summary').click();
  await app.page.fill('#login-in', text);
  await app.click('login-go');
}
/* mở lại thẻ QR của Lan trên Tài khoản */
async function openLanCard(app) {
  await app.tab('more');
  await app.page.locator('[data-act="hub-card-show"]').first().click();
}
/* HLV thêm học viên Lan trong app; trả về mã thẻ và đóng sheet */
async function addLan(app) {
  await app.click('hub-add');
  await app.page.fill('#hub-ten', 'Lan');
  await app.click('hub-add-go');
  await expect(app.sheet()).toContainText('Lan');
  const code = await app.page.locator('#hub-code-0').inputValue();
  await app.page.keyboard.press('Escape');
  return code;
}
/* thẻ học viên như HLV tạo trong app, dùng để máy học viên quét hoặc dán */
async function makeCard(hub, id, ten) {
  const k = crypto.createHmac('sha256', hub.hk).update(`gadn-hv:${id}:0`).digest('base64url').slice(0, 32);
  const r = await hub.req('/s/tv/them', 'POST', { id, ten, kieu: 'hv', skh: crypto.createHash('sha256').update(k).digest('base64url') }, hub.auth);
  if (r.s !== 200) throw new Error('them ' + r.s);
  return 'GAV1.' + Buffer.from(JSON.stringify({ s: hub.url, i: id, k })).toString('base64url');
}

test('BR-26.3 · BR-26.4 · Tài khoản HLV không còn "Vai trên máy này" và "Đồng bộ với HLV"', async ({ app, hub }) => {
  await seedHlv(app);
  await registerHlv(app, hub);
  await app.tab('more');
  await expect(app.view()).not.toContainText('Vai trên máy này');
  await expect(app.view()).not.toContainText('Đồng bộ với HLV');
  await expect(app.act('more-sec', '[data-k="drive"]')).toHaveCount(0);
});

test('BR-26.3 · BR-26.6 · máy HV không thấy "Vai trên máy này" và khối Đăng nhập', async ({ app, hub }) => {
  const code = await makeCard(hub, 'lan-7k3f', 'Lan');
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state() } });
  await app.tab('more');
  await fakeCamera(app.page, code);
  await app.click('qr-scan');
  await expect(app.toast()).toContainText('Đã nối với HLV · Lan');
  await app.tab('more');
  await expect(app.view()).not.toContainText('Vai trên máy này');
  await expect(app.act('login-go')).toHaveCount(0);
});

test('BR-26.5 · máy chưa đăng nhập: khối Đăng nhập có Quét QR và Nhập mã', async ({ app }) => {
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] }, states: { p1: state() } });
  await app.tab('more');
  await expect(app.act('qr-scan')).toBeVisible();
  await expect(app.page.locator('#login-in')).toHaveCount(1);
  await expect(app.act('login-go')).toHaveCount(1);
});

test('BR-26.5 · dán mã GAH1 vào Nhập mã → đăng ký làm HLV', async ({ app, hub }) => {
  await seedHlv(app);
  await app.tab('more');
  await pasteLogin(app, hubQR(hub));
  await expect(app.toast()).toContainText('Đã đăng ký làm HLV');
  expect((await app.state()).settings.sync).toMatchObject({ s: hub.url, hk: hub.hk });
});

test('BR-26.5 · dán mã GAV1 vào Nhập mã → nối máy học viên', async ({ app, hub }) => {
  const code = await makeCard(hub, 'lan-7k3f', 'Lan');
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state() } });
  await app.tab('more');
  await pasteLogin(app, code);
  await expect(app.toast()).toContainText('Đã nối với HLV · Lan');
  expect((await app.state()).settings.sync).toMatchObject({ i: 'lan-7k3f', ten: 'Lan' });
});

test('BR-26.5 · dán chuỗi không phải mã liên kết → báo lỗi, không lưu gì', async ({ app }) => {
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] }, states: { p1: state() } });
  await app.tab('more');
  await pasteLogin(app, 'xin chào');
  await expect(app.toast()).toContainText('Không tìm thấy mã liên kết');
  expect((await app.state()).settings.sync?.hk).toBeFalsy();
});

test('BR-26.5 · quét ảnh hoặc camera từ Tài khoản → đăng ký làm HLV', async ({ app, hub }) => {
  await seedHlv(app);
  await app.tab('more');
  await fakeCamera(app.page, hubQR(hub));
  await app.click('qr-scan');
  await expect(app.toast()).toContainText('Đã đăng ký làm HLV');
});

test('BR-26.1 · HLV mở thẻ QR của một học viên → thấy ảnh QR và mã GAV1 đúng học viên', async ({ app, hub }) => {
  await seedHlv(app);
  await registerHlv(app, hub);
  await addLan(app);
  const pid = (await app.profiles()).list.find(p => p.name === 'Lan').id;
  await app.tab('more');
  await app.page.locator(`[data-act="hub-card-show"][data-id="${pid}"]`).click();
  await expect(app.sheet()).toContainText('Lan');
  await expect(app.page.locator('#hub-qr-0')).toHaveAttribute('src', /^data:image\//);
  const code = await app.page.locator('#hub-code-0').inputValue();
  expect(code).toMatch(/^GAV1\./);
  const { i } = JSON.parse(Buffer.from(code.split('.')[1], 'base64url').toString());
  expect(i).toMatch(/^lan-[a-z0-9]{4}$/);
});

test('BR-26.1 · học viên chưa có thẻ QR → bấm mở thì được tạo thẻ mới trên máy chủ', async ({ app, hub }) => {
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Mai', color: 1 }] }, states: { p1: state(), p2: state() } });
  await registerHlv(app, hub);
  await app.tab('more');
  await app.page.locator('[data-act="hub-card-show"][data-id="p2"]').click();
  await expect(app.sheet()).toContainText('Mai');
  const code = await app.page.locator('#hub-code-0').inputValue();
  const { i } = JSON.parse(Buffer.from(code.split('.')[1], 'base64url').toString());
  const list = await hub.req('/s/tv', 'GET', null, hub.auth);
  expect(list.j.hv.map(x => x.id)).toContain(i);
});

test('BR-26.2 · Chia sẻ ảnh QR đưa file PNG cho bảng chia sẻ của máy', async ({ app, hub }) => {
  await seedHlv(app);
  await registerHlv(app, hub);
  await addLan(app);
  await app.page.evaluate(() => {
    navigator.canShare = () => true;
    navigator.share = async d => { window.__shared = { title: d.title, files: (d.files || []).map(f => ({ name: f.name, type: f.type })) }; };
  });
  await openLanCard(app);
  await app.page.locator('[data-act="hub-share-img"]').first().click();
  await expect.poll(async () => (await app.page.evaluate(() => window.__shared))?.files).toEqual([{ name: expect.stringMatching(/\.png$/), type: 'image/png' }]);
});

test('BR-26.2 · Chia sẻ mã gửi chuỗi GAV1 qua bảng chia sẻ của máy', async ({ app, hub }) => {
  await seedHlv(app);
  await registerHlv(app, hub);
  await addLan(app);
  await app.page.evaluate(() => {
    navigator.canShare = () => true;
    navigator.share = async d => { window.__shared = { text: d.text }; };
  });
  await openLanCard(app);
  await app.page.locator('[data-act="hub-share-code"]').first().click();
  await expect.poll(async () => (await app.page.evaluate(() => window.__shared))?.text).toMatch(/^GAV1\./);
});

test('BR-26.2 · máy không có bảng chia sẻ file → tải ảnh QR về', async ({ app, hub }) => {
  await seedHlv(app);
  await registerHlv(app, hub);
  await addLan(app);
  await app.page.evaluate(() => { navigator.share = undefined; navigator.canShare = undefined; });
  await openLanCard(app);
  const download = app.page.waitForEvent('download');
  await app.page.locator('[data-act="hub-share-img"]').first().click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
});
