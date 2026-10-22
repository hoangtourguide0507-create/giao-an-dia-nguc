// BR-24.1 · BR-24.2 Máy chủ đồng bộ mới (PA-34.1): HLV đăng ký bằng QR HLV, thêm học viên bằng thẻ QR vĩnh viễn.
import crypto from 'node:crypto';
import { test, expect, fakeCamera } from '../helpers/fixtures.mjs';
import { state, basicPlan, session, TODAY } from '../helpers/data.mjs';

const seedHlv = app => app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }] }, states: { p1: state() } });
/* mã QR HLV như trong ảnh thẻ: GAH1 + JSON {s, k} mã base64url */
const hubQR = (hub, k = hub.hk) => 'GAH1.' + Buffer.from(JSON.stringify({ s: hub.url, k })).toString('base64url');
async function registerHlv(app, hub) {
  await app.more('drive');
  await fakeCamera(app.page, hubQR(hub));
  await app.click('hub-reg');
  await expect(app.toast()).toContainText('Đã đăng ký làm HLV');
}
/* thẻ học viên như HLV tạo trong app: k = HMAC-SHA256(khoá HLV, "gadn-hv:<mã>:0") cắt 32 ký tự; máy chủ chỉ giữ băm của k */
async function makeCard(hub, id, ten) {
  const k = crypto.createHmac('sha256', hub.hk).update(`gadn-hv:${id}:0`).digest('base64url').slice(0, 32);
  const r = await hub.req('/s/tv/them', 'POST', { id, ten, kieu: 'hv', skh: crypto.createHash('sha256').update(k).digest('base64url') }, hub.auth);
  if (r.s !== 200) throw new Error('them ' + r.s);
  return { k, code: 'GAV1.' + Buffer.from(JSON.stringify({ s: hub.url, i: id, k })).toString('base64url') };
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

test('BR-24.3 · học viên quét thẻ của HLV → nối máy; máy chủ ghi nhận thêm một máy', async ({ app, hub }) => {
  const { code } = await makeCard(hub, 'lan-7k3f', 'Lan');
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state() } });
  await app.more('drive');
  await fakeCamera(app.page, code);
  await app.click('hub-reg');
  await expect(app.toast()).toContainText('Đã nối với HLV · Lan');
  expect((await app.state()).settings.sync).toMatchObject({ i: 'lan-7k3f', ten: 'Lan' });
  const list = await hub.req('/s/tv', 'GET', null, hub.auth);
  expect(list.j.hv.find(x => x.id === 'lan-7k3f').tb).toHaveLength(1);
});

test('BR-24.6 · buổi đã tập tự gửi lên máy chủ; buổi đang tập dở không gửi', async ({ app, hub }) => {
  const { k } = await makeCard(hub, 'lan-7k3f', 'Lan');
  const dk = (await hub.req('/s/noi', 'POST', { i: 'lan-7k3f', k, tb: 'Máy thử' })).j.dk;
  const d = basicPlan().days[0];
  const done = session(d, TODAY, [[d.exercises[0], [[40, 8]]]]);
  const dang = { ...session(d, TODAY, [[d.exercises[0], [[42, 8]]]]), finishedAt: null };
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] },
    states: { p1: state({ days: [d], sessions: [done], active: dang, settings: { sync: { s: hub.url, i: 'lan-7k3f', dk, ten: 'Lan' } } }) } });
  const doi = () => hub.req('/s/doi?hv=lan-7k3f&since=0', 'GET', null, `Bearer v.lan-7k3f.${dk}`);
  await expect.poll(async () => (await doi()).j.recs.map(r => r.id), { timeout: 15000 }).toEqual([done.id]);
  const rec = (await doi()).j.recs[0];
  expect(JSON.parse(rec.d)).toMatchObject({ id: done.id, dayName: done.dayName });
  expect(rec).toMatchObject({ k: 'buoi:' + done.id, vai: 'hv' });
});

test('BR-24.4 · HLV thêm học viên → học viên nối máy và tập xong → máy HLV kéo buổi về đúng hồ sơ học viên', async ({ app, hub, device }) => {
  await seedHlv(app);
  await registerHlv(app, hub);
  await app.click('hub-add');
  await app.page.fill('#hub-ten', 'Lan');
  await app.click('hub-add-go');
  const code = await app.page.locator('#hub-code').inputValue();
  await app.page.keyboard.press('Escape');
  await app.flushed();
  const pid = (await app.profiles()).list.find(p => p.name === 'Lan').id;

  const hv = await device();
  const d = basicPlan().days[0];
  const done = session(d, TODAY, [[d.exercises[0], [[40, 8]]]]);
  done.entries[0].name = 'x'.repeat(200);   // máy học viên gửi tên quá dài: máy HLV phải cắt bớt khi nhận
  await hv.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state({ days: [d], sessions: [done] }) } });
  await hv.more('drive');
  await fakeCamera(hv.page, code);
  await hv.click('hub-reg');
  await expect(hv.toast()).toContainText('Đã nối với HLV · Lan');

  await app.page.reload();
  await expect.poll(async () => (await app.idb('kv', 'state:' + pid))?.sessions?.map(x => x.id), { timeout: 45000 }).toEqual([done.id]);
  const rec = (await app.idb('kv', 'state:' + pid)).sessions[0];
  expect(rec).toMatchObject({ dayName: done.dayName, date: TODAY });
  expect(rec.entries[0].name).toHaveLength(80);
});
