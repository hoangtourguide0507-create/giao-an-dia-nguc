// BR-37 Thông tin cơ thể của học viên (số đo, ảnh body, chiều cao, giới tính): HV → máy chủ → HLV; HLV chỉ xem; HV máy mới lấy lại.
import crypto from 'node:crypto';
import { test, expect, fakeCamera } from '../helpers/fixtures.mjs';
import { state, basicPlan, addDays, TODAY, PHOTO } from '../helpers/data.mjs';

const hubQR = (hub, k = hub.hk) => 'GAH1.' + Buffer.from(JSON.stringify({ s: hub.url, k })).toString('base64url');
async function registerHlv(app, hub) {
  await app.tab('more'); await fakeCamera(app.page, hubQR(hub)); await app.click('qr-scan');
  await expect(app.toast()).toContainText('Đã đăng ký làm HLV');
}
async function cardOf(app, hub, pid) {
  let hvId = null;
  await expect.poll(async () => { const m = (await app.state()).settings.sync?.map || {}; hvId = Object.keys(m).find(k => m[k] === pid) || null; return !!hvId; }, { timeout: 15000 }).toBe(true);
  const k = crypto.createHmac('sha256', hub.hk).update(`gadn-hv:${hvId}:0`).digest('base64url').slice(0, 32);
  return 'GAV1.' + Buffer.from(JSON.stringify({ s: hub.url, i: hvId, k })).toString('base64url');
}
const join = async (hv, code) => { await hv.tab('more'); await fakeCamera(hv.page, code); await hv.click('qr-scan'); await expect(hv.toast()).toContainText('Đã nối với HLV · Lan'); };
const B = (id, date, o, u) => ({ id, date, ...(u ? { u } : {}), ...o });
const D10 = addDays(TODAY, -10), D3 = addDays(TODAY, -3);
const hlvState = () => ({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: basicPlan().days }) } });
/* HLV (p1 = hồ sơ HLV, p2 = Lan) và máy học viên Lan (dữ liệu cơ thể seed trước khi nối) */
async function pair(app, hub, device, hvOver = {}, photos) {
  await app.seed(hlvState()); await registerHlv(app, hub);
  const code = await cardOf(app, hub, 'p2'); await app.page.keyboard.press('Escape');
  const hv = await device();
  await hv.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state({ settings: { pushServer: hub.url }, ...hvOver }) }, photos });
  await join(hv, code);
  return { hv, code };
}
const p2 = app => app.idb('kv', 'state:p2');
/* HLV hỏi máy chủ mỗi 20 giây: tua đồng hồ giả để lần hỏi tới ngay */
const after = async (app, f) => { await app.page.clock.fastForward(21000); return f(); };

test('BR-37.1/37.3/37.4 · số đo, chiều cao, giới tính có sẵn trên máy HV được gửi bù và HLV nhận vào hồ sơ HV', async ({ app, hub, device }) => {
  await pair(app, hub, device, { body: [B('b1', D10, { weight: 70, bodyFat: 20 }), B('b2', D3, { weight: 69.5, bodyFat: 19.5, muscle: 31 })], settings: { pushServer: hub.url, height: 170, sex: 'm' } });
  await expect.poll(async () => (await p2(app)).body?.length, { timeout: 20000 }).toBe(2);
  const st = await p2(app);
  expect(st.body.find(e => e.id === 'b2')).toMatchObject({ date: D3, weight: 69.5, bodyFat: 19.5, muscle: 31 });
  expect(st.settings).toMatchObject({ height: 170, sex: 'm' });
  expect((await app.state()).settings.sync.ctSum.p2).toMatchObject({ date: D3, w: 69.5, f: 19.5 });   /* BR-37.7 */
});

test('BR-37.1 · HV nhập, sửa, xoá số đo → HLV thấy theo', async ({ app, hub, device }) => {
  const { hv } = await pair(app, hub, device);
  await hv.tab('body'); await hv.click('body-add');
  await hv.page.fill('#b-weight', '70,5'); await hv.page.fill('#b-bodyFat', '21');
  await hv.click('body-save');
  await expect.poll(async () => (await p2(app)).body?.[0]?.weight, { timeout: 20000 }).toBe(70.5);
  await hv.tab('body'); await hv.click('body-edit');
  await hv.page.fill('#b-weight', '69'); await hv.click('body-save');
  await expect.poll(() => after(app, async () => (await p2(app)).body?.[0]?.weight), { timeout: 20000 }).toBe(69);
  await hv.click('body-edit'); await hv.click('body-del'); await hv.click('body-del');
  await expect.poll(() => after(app, async () => (await p2(app)).body?.length), { timeout: 20000 }).toBe(0);
});

test('BR-37.2/37.4 · ảnh body của HV lên máy chủ; HLV nhận dòng ảnh và tải ảnh về; xoá ảnh cũng đồng bộ', async ({ app, hub, device }) => {
  await pair(app, hub, device, { bodyPhotos: [{ id: 'pa', date: D10, t: 1, pose: 'Trước', photoId: 'xa1234' }] }, { xa1234: PHOTO });
  await expect.poll(async () => (await p2(app)).bodyPhotos?.length, { timeout: 20000 }).toBe(1);
  await expect.poll(async () => !!(await app.idb('photos', 'xa1234')), { timeout: 20000 }).toBe(true);
  expect((await p2(app)).bodyPhotos[0]).toMatchObject({ date: D10, pose: 'Trước', photoId: 'xa1234' });
  await app.page.evaluate(() => window.__sota.switchProfile('p2'));
  await app.tab('photos');
  await expect(app.view().locator('img').first()).toBeVisible();
});

test('BR-37.5 · hồ sơ HV trên máy HLV chỉ xem: không nút thêm/sửa/xoá số đo, ảnh, giới tính; hồ sơ HLV tự tập vẫn sửa được', async ({ app, hub, device }) => {
  await pair(app, hub, device, { body: [B('b1', D3, { weight: 70, bodyFat: 20 })], bodyPhotos: [{ id: 'pa', date: D3, t: 1, pose: 'Trước', photoId: 'xa1234' }] }, { xa1234: PHOTO });
  await expect.poll(async () => (await p2(app)).bodyPhotos?.length, { timeout: 20000 }).toBe(1);
  await app.page.evaluate(() => window.__sota.switchProfile('p2'));
  await app.tab('body');
  await expect(app.view()).toContainText('70');
  for (const a of ['body-add', 'sex']) await expect(app.act(a).first()).toBeHidden();
  await expect(app.view().locator('.bnow-h .link')).toBeHidden();
  await app.tab('photos');
  await expect(app.view().locator('label[for="bp-in"]')).toBeHidden();
  /* chặn cả ở tầng hàm: gọi thẳng hành động ghi cũng không đổi dữ liệu */
  await app.page.evaluate(() => { for (const a of ['body-edit']) document.body.insertAdjacentHTML('beforeend', `<button id="t-${a}" data-act="${a}" data-id="b1"></button>`); document.getElementById('t-body-edit').click(); });
  await expect(app.toast()).toContainText('HLV chỉ xem');
  await expect(app.sheet().locator('#b-weight')).toHaveCount(0);
  expect((await p2(app)).body).toHaveLength(1);
  /* hồ sơ tự tập của HLV không bị khoá */
  await expect.poll(async () => (await app.profiles()).list.some(p => p.id === 'sl:tu-tap'), { timeout: 15000 }).toBe(true);
  await app.page.evaluate(() => window.__sota.switchProfile('sl:tu-tap'));
  await app.tab('body');
  await expect(app.act('body-add').first()).toBeVisible();
});

test('BR-37.6 · máy HLV không gửi số đo/ảnh của học viên lên máy chủ', async ({ app, hub, device }) => {
  await app.seed({ ...hlvState(), states: { p1: state(), p2: state({ days: basicPlan().days, body: [B('x1', D3, { weight: 80 })] }) } });
  await registerHlv(app, hub);
  await cardOf(app, hub, 'p2');
  await app.page.waitForTimeout(1500);
  const r = await hub.req('/s/doi?since=0', 'GET', null, hub.auth);
  expect(r.j.recs.filter(x => ['do@hv', 'anh@hv', 'ho-so@hv'].includes(x.k))).toHaveLength(0);
});

test('BR-37.8 · HV đổi sang máy mới: lấy lại số đo, ảnh, chiều cao từ máy chủ', async ({ app, hub, device }) => {
  const { hv, code } = await pair(app, hub, device, { body: [B('b1', D10, { weight: 70 }), B('b2', D3, { weight: 69 })], bodyPhotos: [{ id: 'pa', date: D10, t: 1, pose: 'Sau', photoId: 'xa1234' }], settings: { pushServer: hub.url, height: 172, sex: 'f' } }, { xa1234: PHOTO });
  await expect.poll(async () => (await p2(app)).body?.length, { timeout: 20000 }).toBe(2);
  await expect.poll(async () => !!(await app.idb('photos', 'xa1234')), { timeout: 20000 }).toBe(true);
  const hv2 = await device();
  await hv2.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state({ settings: { pushServer: hub.url } }) } });
  await join(hv2, code);
  await expect.poll(async () => (await hv2.state()).body.length, { timeout: 20000 }).toBe(2);
  const st = await hv2.state();
  expect(st.settings).toMatchObject({ height: 172, sex: 'f' });
  expect(st.bodyPhotos[0]).toMatchObject({ id: 'pa', pose: 'Sau', photoId: 'xa1234' });
  await expect.poll(async () => !!(await hv2.idb('photos', 'xa1234')), { timeout: 20000 }).toBe(true);
});

test('BR-37.9 · máy mới đã có số đo riêng khi nối: gộp theo thời điểm sửa; một ngày một lần đo, bản mới hơn thắng; không mất số đo khác ngày', async ({ app, hub, device }) => {
  const OLD = Date.now() - 5 * 86400e3 * 1000;   /* rất cũ */
  const { hv, code } = await pair(app, hub, device, { body: [B('s1', D10, { weight: 70 }, 1000), B('s2', D3, { weight: 68 }, 1000)] });
  await expect.poll(async () => (await p2(app)).body?.length, { timeout: 20000 }).toBe(2);
  /* máy mới: cùng ngày D10 nhưng số đo mới hơn (id khác), và một ngày khác chưa có trên máy chủ */
  const hv2 = await device();
  await hv2.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state({ settings: { pushServer: hub.url }, body: [B('n1', D10, { weight: 71 }, 4102444800000), B('n2', addDays(TODAY, -1), { weight: 67 }, 4102444800000)] }) } });
  await join(hv2, code);
  await expect.poll(async () => (await hv2.state()).body.length, { timeout: 20000 }).toBe(3);
  const mine = (await hv2.state()).body;
  expect(mine.find(e => e.date === D10)).toMatchObject({ id: 'n1', weight: 71 });   /* bản mới hơn thắng */
  expect(mine.filter(e => e.date === D10)).toHaveLength(1);
  expect(mine.map(e => e.date).sort()).toEqual([D10, D3, addDays(TODAY, -1)].sort());
  /* máy chủ và HLV theo bản đã gộp */
  await expect.poll(() => after(app, async () => { const b = (await p2(app)).body || []; return b.length === 3 && b.find(e => e.date === D10)?.weight === 71; }), { timeout: 25000 }).toBe(true);
});
