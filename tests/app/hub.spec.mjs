// BR-24.1 · BR-24.2 Máy chủ đồng bộ mới (PA-34.1): HLV đăng ký bằng QR HLV, thêm học viên bằng thẻ QR vĩnh viễn.
import { test, expect, fakeCamera } from '../helpers/fixtures.mjs';
import { state } from '../helpers/data.mjs';

const seedHlv = app => app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }] }, states: { p1: state() } });
/* mã QR HLV như trong ảnh thẻ: GAH1 + JSON {s, k} mã base64url */
const hubQR = (hub, k = hub.hk) => 'GAH1.' + Buffer.from(JSON.stringify({ s: hub.url, k })).toString('base64url');
async function registerHlv(app, hub) {
  await app.more('drive');
  await fakeCamera(app.page, hubQR(hub));
  await app.click('hub-reg');
  await expect(app.toast()).toContainText('Đã đăng ký làm HLV');
}
/* đọc mã thẻ học viên đang hiện trong bảng và trả về {i, k} */
async function thẻCode(app) {
  const code = await app.page.locator('#hub-code').inputValue();
  return JSON.parse(Buffer.from(code.split('.')[1], 'base64url').toString());
}

test('BR-24.1 · HLV quét mã QR HLV → đăng ký thành công, khoá lưu trên máy này', async ({ app, hub }) => {
  await seedHlv(app);
  await registerHlv(app, hub);
  expect(await app.state()).toMatchObject({ settings: { sync: { s: hub.url, hk: hub.hk } } });
});

test('BR-24.1 · mã QR HLV sai hoặc máy chủ không nhận → báo lỗi, không lưu khoá', async ({ app, hub }) => {
  await seedHlv(app);
  await app.more('drive');
  await fakeCamera(app.page, hubQR(hub, 'khoa-sai'));
  await app.click('hub-reg');
  await expect(app.toast()).toContainText('Mã HLV không đúng');
  expect((await app.state()).settings.sync?.hk).toBeFalsy();
});

test('BR-24.1 · thẻ học viên quét trên máy HLV → báo chưa dùng ở đây', async ({ app, hub }) => {
  await seedHlv(app);
  await registerHlv(app, hub);
  await app.more('drive');
  await fakeCamera(app.page, 'GAV1.' + Buffer.from('{"s":"x","i":"lan","k":"y"}').toString('base64url'));
  await app.click('hub-reg');
  await expect(app.toast()).toContainText('Thẻ này dành cho máy của học viên');
});

test('BR-24.2 · HLV thêm học viên → thẻ QR; máy chủ nhận đúng học viên; khoá trên thẻ nối được máy', async ({ app, hub }) => {
  await seedHlv(app);
  await registerHlv(app, hub);
  await app.click('hub-add');
  await app.page.fill('#hub-ten', 'Lan');
  await app.click('hub-add-go');
  await expect(app.sheet()).toContainText('Thẻ QR của Lan');
  const { i, k } = await thẻCode(app);
  expect(i).toMatch(/^lan-[a-z0-9]{4}$/);
  const list = await hub.req('/s/tv', 'GET', null, hub.auth);
  expect(list.j.hv.map(x => x.id)).toContain(i);
  const noi = await hub.req('/s/noi', 'POST', { i, k, tb: 'iPhone Lan' });
  expect(noi.s).toBe(200);
  expect(noi.j).toMatchObject({ id: i, ten: 'Lan' });
});

test('BR-24.2 · hai học viên trùng tên → hai thẻ khác mã', async ({ app, hub }) => {
  await seedHlv(app);
  await registerHlv(app, hub);
  await app.click('hub-add');
  await app.page.fill('#hub-ten', 'Lan');
  await app.click('hub-add-go');
  const a = await thẻCode(app);
  await app.page.keyboard.press('Escape');
  await app.click('hub-add');
  await app.page.fill('#hub-ten', 'Lan');
  await app.click('hub-add-go');
  const b = await thẻCode(app);
  expect(a.i).not.toBe(b.i);
  expect(a.k).not.toBe(b.k);
});
