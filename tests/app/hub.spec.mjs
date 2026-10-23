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
  const code = await app.page.locator('#hub-code-0').inputValue();
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
  await expect(app.sheet()).toContainText('Lan');
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
  const code = await app.page.locator('#hub-code-0').inputValue();
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

/* bộ xác thực ảo (như Face ID) cho một trang; khoá của nó chuyển sang máy khác để mô phỏng iCloud Keychain */
async function virtualAuth(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
  return { cdp, authenticatorId };
}
async function shareCredentials(from, to) {
  const { credentials } = await from.cdp.send('WebAuthn.getCredentials', { authenticatorId: from.authenticatorId });
  for (const credential of credentials) await to.cdp.send('WebAuthn.addCredential', { authenticatorId: to.authenticatorId, credential });
}
/* HLV thêm Lan và lấy thẻ; Lan nối máy và tập một buổi; đợi buổi đã lên máy chủ */
async function lanTrains(app, hub, device) {
  await seedHlv(app); await registerHlv(app, hub);
  await app.click('hub-add'); await app.page.fill('#hub-ten', 'Lan'); await app.click('hub-add-go');
  const code = await app.page.locator('#hub-code-0').inputValue(); await app.page.keyboard.press('Escape'); await app.flushed();
  const hv = await device();
  const d = basicPlan().days[0]; const done = session(d, TODAY, [[d.exercises[0], [[40, 8]]]]);
  await hv.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state({ days: [d], sessions: [done], settings: { pushServer: hub.url } }) } });
  await hv.more('drive'); await fakeCamera(hv.page, code); await hv.click('hub-reg');
  await expect(hv.toast()).toContainText('Đã nối với HLV · Lan');
  const { i, dk } = (await hv.state()).settings.sync;
  await expect.poll(async () => (await hub.req(`/s/doi?hv=${i}&since=0`, 'GET', null, `Bearer v.${i}.${dk}`)).j.recs.filter(r => r.k.startsWith('buoi:')).map(r => r.id), { timeout: 15000 }).toEqual([done.id]);
  return { hv, code, done, i };
}

test('BR-24.4 · máy học viên bật khôi phục bằng Face ID; máy trống khôi phục đủ buổi tập chỉ bằng Face ID', async ({ app, hub, device }) => {
  const { hv, done } = await lanTrains(app, hub, device);
  const pass = await virtualAuth(hv.page);
  await hv.click('hub-pk-add');
  await expect(hv.toast()).toContainText('Đã bật khôi phục bằng Face ID');

  const fresh = await device(); const passFresh = await virtualAuth(fresh.page);
  await shareCredentials(pass, passFresh);
  await fresh.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] }, states: { p1: state({ settings: { pushServer: hub.url } }) } });
  await fresh.more('drive'); await fresh.click('hub-restore');
  await expect(fresh.toast()).toContainText('Đã nối với HLV · Lan');
  await expect.poll(async () => (await fresh.state()).sessions.map(x => x.id), { timeout: 15000 }).toEqual([done.id]);
});

test('BR-24.4 · máy trống không có Face ID: quét lại thẻ học viên vẫn khôi phục đủ buổi tập', async ({ app, hub, device }) => {
  const { code, done } = await lanTrains(app, hub, device);
  const fresh = await device();
  await fresh.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] }, states: { p1: state({ settings: { pushServer: hub.url } }) } });
  await fresh.more('drive'); await fakeCamera(fresh.page, code); await fresh.click('hub-reg');
  await expect(fresh.toast()).toContainText('Đã nối với HLV · Lan');
  await expect.poll(async () => (await fresh.state()).sessions.map(x => x.id), { timeout: 15000 }).toEqual([done.id]);
});

test('BR-24.4 · máy chưa bật Face ID cho học viên nào: khôi phục bằng Face ID báo lỗi, không nối máy', async ({ app, hub, device }) => {
  await seedHlv(app); await registerHlv(app, hub);
  const fresh = await device(); await virtualAuth(fresh.page);
  await fresh.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] }, states: { p1: state({ settings: { pushServer: hub.url } }) } });
  await fresh.more('drive'); await fresh.click('hub-restore');
  await expect(fresh.toast()).toContainText('Không dùng được Face ID');
  expect((await fresh.state()).settings.sync).toBeUndefined();
});

test('BR-24.17 · chuyển học viên có sẵn sang máy chủ mới: thẻ QR; học viên nối máy nhận giáo án HLV và giữ buổi cũ', async ({ app, hub, device }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) } });
  await registerHlv(app, hub);
  const code = await autoCard(app, hub, 'p2');
  await app.page.keyboard.press('Escape');
  const i = JSON.parse(Buffer.from(code.split('.')[1], 'base64url').toString()).i;
  expect((await app.state()).settings.sync.map[i]).toBe('p2');

  const hv = await device();
  const d = basicPlan().days[0];
  const done = session(d, TODAY, [[d.exercises[0], [[40, 8]]]]);
  await hv.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state({ days: [], sessions: [done], settings: { pushServer: hub.url } }) } });
  await hv.more('drive'); await fakeCamera(hv.page, code); await hv.click('hub-reg');
  await expect(hv.toast()).toContainText('Đã nối với HLV · Lan');
  await expect.poll(async () => (await hv.state()).days.map(x => x.name), { timeout: 15000 }).toEqual(P.days.map(x => x.name));
  const { dk } = (await hv.state()).settings.sync;
  await expect.poll(async () => (await hub.req(`/s/doi?hv=${i}&since=0`, 'GET', null, `Bearer v.${i}.${dk}`)).j.recs.map(r => r.id), { timeout: 15000 }).toContain(done.id);
});

test('BR-24.9 · HLV đổi giáo án → học viên nhận trong vòng 20 giây; học viên hoàn tác được', async ({ app, hub, device }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) } });
  await registerHlv(app, hub);
  const code = await autoCard(app, hub, 'p2');
  await app.page.keyboard.press('Escape');
  const hv = await device();
  await hv.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state({ days: [], settings: { pushServer: hub.url } }) } });
  await hv.more('drive'); await fakeCamera(hv.page, code); await hv.click('hub-reg');
  await expect(hv.toast()).toContainText('Đã nối với HLV · Lan');
  await expect.poll(async () => (await hv.state()).days.length, { timeout: 15000 }).toBe(P.days.length);
  const { i, dk } = (await hv.state()).settings.sync;
  /* HLV đổi giáo án trên máy HLV: máy chủ nhận bản mới (đúng cách máy HLV gửi) */
  const bai = { name: 'Gập bụng', muscle: 'Bụng', type: 'upper', sets: 3, repMin: 8, repMax: 12, repTarget: 10 };
  await hub.req('/s/ghi', 'POST', { hv: i, recs: [{ k: 'plan@hlv', id: 'plan', t: Date.now() + 5000, vai: 'hlv', d: JSON.stringify({ plan: [{ n: 'Ngày đổi', e: [bai] }] }) }] }, hub.auth);
  await expect.poll(async () => (await hv.state()).days.map(x => x.name), { timeout: 45000 }).toContain('Ngày đổi');
  await hv.more('drive'); await hv.click('hub-plan-undo');
  await expect.poll(async () => (await hv.state()).days.map(x => x.name), { timeout: 5000 }).toEqual(P.days.map(x => x.name));
});

/* thẻ của học viên được tạo tự động (mọi học viên đều có thẻ): đợi máy HLV ghi nhận, rồi tính mã từ khoá HLV như máy HLV làm */
async function autoCard(app, hub, pid) {
  let hvId = null;
  await expect.poll(async () => { const m = (await app.state()).settings.sync?.map || {}; hvId = Object.keys(m).find(k => m[k] === pid) || null; return !!hvId; }, { timeout: 15000 }).toBe(true);
  const k = crypto.createHmac('sha256', hub.hk).update(`gadn-hv:${hvId}:0`).digest('base64url').slice(0, 32);
  return 'GAV1.' + Buffer.from(JSON.stringify({ s: hub.url, i: hvId, k })).toString('base64url');
}
/* HLV chuyển Lan sang máy chủ mới; máy Lan đã có giáo án riêng (localDays) rồi nối máy */
async function lanWithOwnPlan(app, hub, device, localDays) {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) } });
  await registerHlv(app, hub);
  const code = await autoCard(app, hub, 'p2');
  const hv = await device();
  await hv.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state({ days: localDays, settings: { pushServer: hub.url } }) } });
  await hv.more('drive'); await fakeCamera(hv.page, code); await hv.click('hub-reg');
  await expect(hv.toast()).toContainText('Đã nối với HLV · Lan');
  return { hv, P };
}

test('BR-24.9 · máy học viên có giáo án riêng khác HLV: hỏi người dùng kèm bảng so sánh; chọn giáo án HLV thì áp dụng', async ({ app, hub, device }) => {
  const P = basicPlan();
  const local = P.days.map((d, i) => (i === 0 ? { ...d, name: 'Ngày của tôi' } : d));
  const { hv } = await lanWithOwnPlan(app, hub, device, local);
  await expect(hv.view()).toContainText('Giáo án khác với HLV');
  await expect(hv.view()).toContainText('Chỉ có trên máy này');
  await expect(hv.view()).toContainText('Ngày của tôi');
  await hv.click('hub-conflict-remote');
  await expect.poll(async () => (await hv.state()).days.map(x => x.name), { timeout: 5000 }).toContain(P.days[0].name);
  expect((await hv.state()).sync.conflict).toBeFalsy();
  expect((await hv.state()).days.map(x => x.name)).not.toContain('Ngày của tôi');
  expect((await hv.state()).sync.prevDays.map(x => x.name)).toEqual(local.map(x => x.name));
});

test('BR-24.9 · máy học viên có giáo án riêng khác HLV: chọn giữ giáo án máy này thì không bị ghi đè', async ({ app, hub, device }) => {
  const P = basicPlan();
  const local = P.days.map((d, i) => (i === 0 ? { ...d, name: 'Ngày của tôi' } : d));
  const { hv } = await lanWithOwnPlan(app, hub, device, local);
  await expect(hv.view()).toContainText('Giáo án khác với HLV');
  await hv.click('hub-conflict-local');
  await expect(hv.view()).not.toContainText('Giáo án khác với HLV');
  expect((await hv.state()).days.map(x => x.name)).toEqual(local.map(x => x.name));
});

test('BR-24.15 · máy học viên hiện trạng thái đã gửi xong sau khi buổi lên máy chủ', async ({ app, hub, device }) => {
  const { hv } = await lanTrains(app, hub, device);
  await expect(hv.view()).toContainText('Đã gửi xong');
});

test('BR-24.6 · học viên xoá buổi → máy HLV cũng xoá buổi đó (trừ khi buổi đã được sửa sau đó)', async ({ app, hub, device }) => {
  const { hv, done } = await lanTrains(app, hub, device);
  const pid = (await app.profiles()).list.find(p => p.name === 'Lan').id;
  await app.page.reload();
  await expect.poll(async () => (await app.idb('kv', 'state:' + pid))?.sessions?.map(x => x.id), { timeout: 45000 }).toEqual([done.id]);
  /* xoá sau lúc buổi kết thúc (như khi người dùng xoá thật) */
  await hv.page.evaluate(id => { const s = window.__sota.state; s.syncDel = s.syncDel || { s: {}, e: {} }; s.syncDel.s[id] = Date.now() + 86400000; s.sessions = []; }, done.id);
  /* máy học viên gửi mỗi 20 giây, máy HLV kéo mỗi 20 giây: tối đa khoảng 40 giây, để dư khi máy chạy chậm */
  await expect.poll(async () => (await app.idb('kv', 'state:' + pid))?.sessions?.map(x => x.id), { timeout: 120000 }).toEqual([]);
});

test('BR-24.5 · khôi phục từ máy chủ thay buổi trên máy, có thể hoàn tác', async ({ app, hub, device }) => {
  const { hv, done } = await lanTrains(app, hub, device);
  await hv.click('hub-restore-manual');
  await hv.click('confirm-ok');
  await expect.poll(async () => (await hv.state()).sessions.map(x => x.id), { timeout: 10000 }).toEqual([done.id]);
  await expect(hv.view()).toContainText('Hoàn tác khôi phục');
  await hv.click('hub-restore-undo');
  await expect.poll(async () => (await hv.state()).sync.undo, { timeout: 5000 }).toBeFalsy();
  await expect.poll(async () => (await hv.state()).sessions.map(x => x.id), { timeout: 5000 }).toEqual([done.id]);
});

test('BR-24.2 · Phòng HLV: nút “Thẻ QR” của học viên mở đúng thẻ (thẻ có sẵn, không cần bấm gì thêm); máy chủ nhận mã đó', async ({ app, hub }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }], coach: { on: true, name: 'Tôi' } }, states: { p1: state(), p2: state({ days: P.days }) } });
  await registerHlv(app, hub);
  const code = await autoCard(app, hub, 'p2');
  await app.tab('more');
  await app.view().locator('[data-act="hub-card-show"][data-id="p2"]').click();
  await expect(app.sheet()).toContainText('Lan');
  expect(await app.page.locator('#hub-code-0').inputValue()).toBe(code);
  const { i, k } = JSON.parse(Buffer.from(code.split('.')[1], 'base64url').toString());
  expect((await hub.req('/s/noi', 'POST', { i, k, tb: 'iPhone Lan' })).s).toBe(200);
});

test('BR-24.2 · mã liên kết Drive cũ (GAL1) quét được thì báo rõ là kiểu cũ, không im lặng', async ({ app, device, hub }) => {
  await seedHlv(app); await registerHlv(app, hub);
  const hv = await device();
  await hv.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] }, states: { p1: state({ settings: { pushServer: hub.url } }) } });
  await hv.more('drive');
  await fakeCamera(hv.page, 'GAL1.ab12.1.1.' + Buffer.from('{"u":"x"}').toString('base64url'));
  await hv.click('hub-reg');
  await expect(hv.toast()).toContainText('kiểu gửi cũ');
});

test('BR-24.2 · học viên mới xuất hiện trên máy HLV (sau khi đã đăng ký) tự có thẻ, không cần bấm gì', async ({ app, hub }) => {
  await seedHlv(app); await registerHlv(app, hub);
  const sync = (await app.state()).settings.sync;
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p3', name: 'Minh', color: 2 }] }, state: state({ settings: { sync } }) });
  const code = await autoCard(app, hub, 'p3');
  expect(code.startsWith('GAV1.')).toBe(true);
});
