// BR-24.1 · BR-24.2 Máy chủ đồng bộ mới (PA-34.1): HLV đăng ký bằng QR HLV, thêm học viên bằng thẻ QR vĩnh viễn.
import crypto from 'node:crypto';
import { test, expect, fakeCamera } from '../helpers/fixtures.mjs';
import { state, basicPlan, session, TODAY } from '../helpers/data.mjs';

const seedHlv = app => app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }] }, states: { p1: state() } });
/* mã QR HLV như trong ảnh thẻ: GAH1 + JSON {s, k} mã base64url */
const hubQR = (hub, k = hub.hk) => 'GAH1.' + Buffer.from(JSON.stringify({ s: hub.url, k })).toString('base64url');
async function registerHlv(app, hub) {
  await app.tab('more');
  await fakeCamera(app.page, hubQR(hub));
  await app.click('qr-scan');
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
  await app.tab('more');
  await fakeCamera(app.page, hubQR(hub, 'khoa-sai'));
  await app.click('qr-scan');
  await expect(app.toast()).toContainText('Mã HLV không đúng');
  expect((await app.state()).settings.sync?.hk).toBeFalsy();
});

test('BR-24.1 · thẻ học viên quét trên máy HLV → báo chưa dùng ở đây', async ({ app, hub }) => {
  await seedHlv(app);
  await registerHlv(app, hub);
  await app.tab('more');
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
  await app.tab('more');
  await fakeCamera(app.page, code);
  await app.click('qr-scan');
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
  await hv.tab('more');
  await fakeCamera(hv.page, code);
  await hv.click('qr-scan');
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
  await hv.tab('more'); await fakeCamera(hv.page, code); await hv.click('qr-scan');
  await expect(hv.toast()).toContainText('Đã nối với HLV · Lan');
  const { i, dk } = (await hv.state()).settings.sync;
  await expect.poll(async () => (await hub.req(`/s/doi?hv=${i}&since=0`, 'GET', null, `Bearer v.${i}.${dk}`)).j.recs.filter(r => r.k.startsWith('buoi:')).map(r => r.id), { timeout: 15000 }).toEqual([done.id]);
  return { hv, code, done, i };
}

test('BR-24.4 · máy trống không có Face ID: quét lại thẻ học viên vẫn khôi phục đủ buổi tập', async ({ app, hub, device }) => {
  const { code, done } = await lanTrains(app, hub, device);
  const fresh = await device();
  await fresh.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] }, states: { p1: state({ settings: { pushServer: hub.url } }) } });
  await fresh.tab('more'); await fakeCamera(fresh.page, code); await fresh.click('qr-scan');
  await expect(fresh.toast()).toContainText('Đã nối với HLV · Lan');
  await expect.poll(async () => (await fresh.state()).sessions.map(x => x.id), { timeout: 15000 }).toEqual([done.id]);
});

/* BR-24.17 đã bỏ (PA-41): không còn "Chuyển học viên có sẵn"; học viên có sẵn tự có thẻ (BR-24.19) */
test('BR-24.17 · đã bỏ: HLV không còn nút Chuyển học viên có sẵn; hồ sơ học viên có sẵn tự có thẻ QR', async ({ app, hub }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) } });
  await registerHlv(app, hub);
  await app.tab('more');
  await expect(app.view().locator('[data-act="hub-migrate"]')).toHaveCount(0);
  const code = await autoCard(app, hub, 'p2');
  expect(code.startsWith('GAV1.')).toBe(true);
});

test('BR-24.9 · HLV đổi giáo án → học viên nhận trong vòng 20 giây; không có nút hoàn tác giáo án (PA-41)', async ({ app, hub, device }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) } });
  await registerHlv(app, hub);
  const code = await autoCard(app, hub, 'p2');
  await app.page.keyboard.press('Escape');
  const hv = await device();
  await hv.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state({ days: [], settings: { pushServer: hub.url } }) } });
  await hv.tab('more'); await fakeCamera(hv.page, code); await hv.click('qr-scan');
  await expect(hv.toast()).toContainText('Đã nối với HLV · Lan');
  await expect.poll(async () => (await hv.state()).days.length, { timeout: 15000 }).toBe(P.days.length);
  const { i, dk } = (await hv.state()).settings.sync;
  /* HLV đổi giáo án trên máy HLV: máy chủ nhận bản mới (đúng cách máy HLV gửi) */
  const bai = { name: 'Gập bụng', muscle: 'Bụng', type: 'upper', sets: 3, repMin: 8, repMax: 12, repTarget: 10 };
  await hub.req('/s/ghi', 'POST', { hv: i, recs: [{ k: 'plan@hlv', id: 'plan', t: Date.now() + 5000, vai: 'hlv', d: JSON.stringify({ plan: [{ n: 'Ngày đổi', e: [bai] }] }) }] }, hub.auth);
  await expect.poll(async () => (await hv.state()).days.map(x => x.name), { timeout: 45000 }).toContain('Ngày đổi');
  await hv.tab('more');
  await expect(hv.view().locator('[data-act="hub-plan-undo"]')).toHaveCount(0);
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
  await hv.tab('more'); await fakeCamera(hv.page, code); await hv.click('qr-scan');
  await expect(hv.toast()).toContainText('Đã nối với HLV · Lan');
  return { hv, P };
}

test('BR-27.6 · máy học viên có ngày riêng chỉ một bên đổi: gộp tự động từng ngày, không hỏi', async ({ app, hub, device }) => {
  const P = basicPlan();
  const local = P.days.map((d, i) => (i === 0 ? { ...d, name: 'Ngày của tôi' } : d));
  const { hv } = await lanWithOwnPlan(app, hub, device, local);
  await expect.poll(async () => (await hv.state()).days.map(x => x.name), { timeout: 5000 }).toContain(P.days[0].name);
  const names = (await hv.state()).days.map(x => x.name);
  expect(names).toContain('Ngày của tôi');
  expect((await hv.state()).sync.conflict).toBeFalsy();
  await expect(hv.view()).not.toContainText('ngày khác với HLV');
});

test('BR-27.6 · cùng một ngày bị đổi cả hai bên: chỉ hỏi đúng ngày đó; giữ bản máy này thì không bị ghi đè', async ({ app, hub, device }) => {
  const P = basicPlan();
  const local = P.days.map((d, i) => (i === 0 ? { ...d, exercises: d.exercises.slice(1) } : d));
  const { hv } = await lanWithOwnPlan(app, hub, device, local);
  await expect(hv.view()).toContainText('1 ngày khác với HLV');
  await expect(hv.view()).toContainText(P.days[0].name);
  await hv.page.locator(`[data-act="hub-conflict-day"][data-n="${P.days[0].name}"][data-v="local"]`).click();
  await expect(hv.view()).not.toContainText('ngày khác với HLV');
  expect((await hv.state()).days.map(x => x.name)).toEqual(local.map(x => x.name));
  expect((await hv.state()).days[0].exercises.length).toBe(local[0].exercises.length);
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
  /* như khi người dùng quay lại app: cả hai máy tự đồng bộ ngay, không chờ bộ hẹn giờ */
  await hv.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await app.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  /* máy học viên gửi mỗi 20 giây, máy HLV kéo mỗi 20 giây: tối đa khoảng 40 giây, để dư khi máy chạy chậm */
  await expect.poll(async () => (await app.idb('kv', 'state:' + pid))?.sessions?.map(x => x.id), { timeout: 120000 }).toEqual([]);
});

test('BR-24.2 · Phòng HLV: nút “Thẻ QR” của học viên mở đúng thẻ (thẻ có sẵn, không cần bấm gì thêm); máy chủ nhận mã đó', async ({ app, hub }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) } });
  await registerHlv(app, hub);
  const code = await autoCard(app, hub, 'p2');
  await app.tab('home');
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
  await hv.tab('more');
  await fakeCamera(hv.page, 'GAL1.ab12.1.1.' + Buffer.from('{"u":"x"}').toString('base64url'));
  await hv.click('qr-scan');
  await expect(hv.toast()).toContainText('kiểu gửi cũ');
});

test('BR-24.2 · học viên mới xuất hiện trên máy HLV (sau khi đã đăng ký) tự có thẻ, không cần bấm gì', async ({ app, hub }) => {
  await seedHlv(app); await registerHlv(app, hub);
  const sync = (await app.state()).settings.sync;
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p3', name: 'Minh', color: 2 }] }, state: state({ settings: { sync } }) });
  const code = await autoCard(app, hub, 'p3');
  expect(code.startsWith('GAV1.')).toBe(true);
});

/* Hồ sơ HLV (Tài khoản → Hồ sơ HLV): chọn hồ sơ tự tập của HLV */
/* BR-28.5 (PA-44): hồ sơ HLV cũ đang trống thì xoá khỏi máy khi đổi hồ sơ HLV, không tạo thẻ học viên */
test('Hồ sơ HLV · hồ sơ trống: chọn không cần xác nhận; thẻ của học viên được chọn bị thu hồi; hồ sơ HLV cũ trống bị xoá, không thành học viên', async ({ app, hub }) => {
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state() } });
  await registerHlv(app, hub);
  await autoCard(app, hub, 'p2');
  await app.tab('more');
  await app.click('hub-self-open');
  await app.page.locator('[data-act="hub-self-pick"][data-id="p2"]').click();
  await app.click('hub-self-go');
  await expect.poll(async () => (await app.state()).settings.sync.self, { timeout: 5000 }).toBe('p2');
  await expect.poll(async () => (await app.profiles()).list.map(p => p.id), { timeout: 8000 }).toEqual(['p2']);
  const sy = (await app.state()).settings.sync;
  expect(Object.values(sy.map || {})).not.toContain('p2');
  expect((await hub.req('/s/tv', 'GET', null, hub.auth)).j.hv.filter(x => x.kieu === 'hv')).toHaveLength(0);
});

test('Hồ sơ HLV · hồ sơ đang có dữ liệu: phải quét đúng mã QR HLV mới đổi được; mã sai thì không đổi', async ({ app, hub }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state({ days: P.days, sessions: [session(P.chest, TODAY, [[P.bench, [[40, 10]]]])] }), p2: state({ days: P.days }) } });
  await registerHlv(app, hub);
  await app.tab('more');
  await app.click('hub-self-open');
  await app.page.locator('[data-act="hub-self-pick"][data-id="p2"]').click();
  await expect(app.sheet()).toContainText('cần xác nhận bằng mã QR HLV');
  await fakeCamera(app.page, 'GAH1.' + Buffer.from(JSON.stringify({ s: hub.url, k: 'khoa-sai-hoan-toan' })).toString('base64url'));
  await app.click('hub-self-auth');
  await expect(app.toast()).toContainText('không khớp');
  expect((await app.state()).settings.sync.self).toBeUndefined();
  await app.page.keyboard.press('Escape');   /* đóng khung quét còn mở */
  await app.tab('more');
  await app.click('hub-self-open');
  await app.page.locator('[data-act="hub-self-pick"][data-id="p2"]').click();
  await fakeCamera(app.page, hubQR(hub));
  await app.click('hub-self-auth');
  await expect.poll(async () => (await app.state()).settings.sync.self, { timeout: 8000 }).toBe('p2');
});

/* BR-24.24 (PA-42): máy HLV trống đăng nhập bằng QR HLV thì tự có học viên của HLV */
test('BR-24.24 · máy HLV trống đăng nhập bằng QR HLV: tự có hồ sơ học viên, giáo án và buổi tập từ máy chủ, không tạo thẻ trùng', async ({ app, hub, device }) => {
  const P = basicPlan(), d = P.days[0];
  const done = session(d, TODAY, [[d.exercises[0], [[40, 8]]]]);
  /* máy HLV thứ nhất có học viên Lan, Lan nối máy và tập một buổi */
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: P.days }) } });
  await registerHlv(app, hub);
  const code = await autoCard(app, hub, 'p2');
  const hv = await device();
  await hv.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state({ days: P.days, sessions: [done], settings: { pushServer: hub.url } }) } });
  await hv.tab('more'); await fakeCamera(hv.page, code); await hv.click('qr-scan');
  await expect(hv.toast()).toContainText('Đã nối với HLV · Lan');
  const { i, dk } = (await hv.state()).settings.sync;
  await expect.poll(async () => (await hub.req(`/s/doi?hv=${i}&since=0`, 'GET', null, `Bearer v.${i}.${dk}`)).j.recs.map(r => r.k), { timeout: 20000 }).toEqual(expect.arrayContaining(['buoi:' + done.id, 'plan@hlv']));
  /* máy HLV mới, chưa có gì, đăng nhập bằng cùng QR HLV */
  const fresh = await device();
  await fresh.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] }, states: { p1: state() } });
  await registerHlv(fresh, hub);
  await expect.poll(async () => (await fresh.profiles()).list.map(p => p.name), { timeout: 20000 }).toContain('Lan');
  const pid = (await fresh.profiles()).list.find(p => p.name === 'Lan').id;
  await expect.poll(async () => (await fresh.idb('kv', 'state:' + pid))?.sessions?.map(x => x.id), { timeout: 30000 }).toContain(done.id);
  /* giáo án và buổi tập về trong cùng lượt kéo nhưng không cùng thứ tự: chờ đến khi giáo án có */
  await expect.poll(async () => (await fresh.idb('kv', 'state:' + pid))?.days?.map(x => x.name), { timeout: 30000 }).toEqual(P.days.map(x => x.name));
  /* học viên đã có thẻ: máy mới nhận thẻ có sẵn, không tạo thẻ thứ hai */
  await fresh.page.waitForTimeout(3000);
  expect((await hub.req('/s/tv', 'GET', null, hub.auth)).j.hv.filter(x => x.kieu === 'hv')).toHaveLength(1);
  expect(Object.values((await fresh.state()).settings.sync.map)).toEqual([pid]);
  /* máy HLV trống vừa nối không được gửi giáo án trống đè lên giáo án của học viên trên máy chủ */
  const lanId = Object.keys((await fresh.state()).settings.sync.map)[0];
  const planRec = (await hub.req(`/s/doi?hv=${lanId}&since=0`, 'GET', null, hub.auth)).j.recs.find(r => r.k === 'plan@hlv');
  expect(JSON.parse(planRec.d).plan.map(x => x.n)).toEqual(P.days.map(x => x.name));
});

// BR-24.25 · PA-43: máy chủ không còn công nhận máy học viên → báo lỗi hỗ trợ, nối lại không mất dữ liệu
test('BR-24.25 · máy chủ từ chối máy học viên (thẻ bị thu hồi/máy chủ làm mới) → thẻ đồng bộ báo lỗi và có nút nối lại, không nói “sẽ thử lại tự động”', async ({ app, hub, device }) => {
  const { hv, i } = await lanTrains(app, hub, device);
  const x = await hub.req('/s/tv/xoa', 'POST', { id: i }, hub.auth); expect(x.s).toBe(200);
  await hv.page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(hv.view()).toContainText('không còn công nhận máy này', { timeout: 15000 });
  await expect(hv.view()).toContainText('Dữ liệu trên máy vẫn còn nguyên');
  await expect(hv.view()).toContainText('Nhắn HLV');
  await expect(hv.view()).not.toContainText('Sẽ thử lại tự động');
  await expect(hv.page.locator('[data-act="hub-reg"]')).toBeVisible();
  expect((await hv.state()).sessions.length).toBe(1);   // không mất gì trên máy
});

test('BR-24.25 · nối lại bằng thẻ mới: báo lỗi mất, dữ liệu trên máy giữ nguyên, buổi cũ gửi lại cho máy chủ', async ({ app, hub, device }) => {
  const { hv, i, done } = await lanTrains(app, hub, device);
  await hub.req('/s/tv/xoa', 'POST', { id: i }, hub.auth);
  await hv.page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(hv.view()).toContainText('không còn công nhận máy này', { timeout: 15000 });
  const card = await makeCard(hub, 'lan-moi1', 'Lan');
  await fakeCamera(hv.page, card.code); await hv.click('hub-reg');
  await expect(hv.toast()).toContainText('Đã nối với HLV · Lan');
  await expect(hv.view()).not.toContainText('không còn công nhận máy này');
  const { i: j, dk } = (await hv.state()).settings.sync; expect(j).toBe('lan-moi1');
  await expect.poll(async () => (await hub.req(`/s/doi?hv=${j}&since=0`, 'GET', null, `Bearer v.${j}.${dk}`)).j.recs.filter(r => r.k.startsWith('buoi:')).map(r => r.id), { timeout: 15000 }).toEqual([done.id]);
  expect((await hv.state()).sessions.map(s => s.id)).toEqual([done.id]);
});

/* BR-28 · PA-44: hồ sơ tập của HLV có một bản duy nhất trên máy chủ (sl:tu-tap), đọc bằng khoá HLV */
const selfRecs = async (hub, prefix = '') => (await hub.req('/s/doi?hv=sl:tu-tap&since=0', 'GET', null, hub.auth)).j.recs.filter(r => r.k.startsWith(prefix));
const hvRecords = async hub => (await hub.req('/s/tv', 'GET', null, hub.auth)).j.hv.filter(x => x.kieu === 'hv');

test('BR-28.1 · HLV có buổi tập và giáo án trong hồ sơ tập → máy chủ nhận vào hồ sơ tập của HLV (sl:tu-tap)', async ({ app, hub }) => {
  const P = basicPlan(), d = P.days[0];
  const done = session(d, TODAY, [[d.exercises[0], [[40, 8]]]]);
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] }, states: { p1: state({ days: P.days, sessions: [done] }) } });
  await registerHlv(app, hub);
  await expect.poll(async () => (await selfRecs(hub, 'buoi:')).map(r => r.id), { timeout: 15000 }).toEqual([done.id]);
  await expect.poll(async () => (await selfRecs(hub, 'plan@hlv')).length, { timeout: 15000 }).toBe(1);
  expect(await hvRecords(hub)).toHaveLength(0);   // không tạo học viên cho hồ sơ tập
});

test('BR-28.1 · máy HLV thứ hai đăng nhập bằng cùng QR HLV: hồ sơ tập có buổi tập và giáo án từ máy chủ', async ({ app, hub, device }) => {
  const P = basicPlan(), d = P.days[0];
  const done = session(d, TODAY, [[d.exercises[0], [[40, 8]]]]);
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] }, states: { p1: state({ days: P.days, sessions: [done] }) } });
  await registerHlv(app, hub);
  await expect.poll(async () => (await selfRecs(hub, 'buoi:')).map(r => r.id), { timeout: 15000 }).toEqual([done.id]);
  const b = await device();
  await b.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] }, states: { p1: state() } });
  await registerHlv(b, hub);
  await expect.poll(async () => (await b.state()).sessions.map(x => x.id), { timeout: 20000 }).toEqual([done.id]);
  expect((await b.state()).days.map(x => x.name)).toEqual(P.days.map(x => x.name));
  expect(await hvRecords(hub)).toHaveLength(0);
  /* máy HLV trống vừa nối không được gửi giáo án trống đè lên giáo án trên máy chủ */
  await b.page.waitForTimeout(3000);
  expect(JSON.parse((await selfRecs(hub, 'plan@hlv'))[0].d).plan.map(x => x.n)).toEqual(P.days.map(x => x.name));
});

/* BR-28.4 (PA-44): đổi hồ sơ HLV khi hồ sơ HLV cũ có dữ liệu → hồ sơ cũ thành học viên có thẻ, buổi tập của nó chuyển lên học viên mới;
   học viên được chọn mất thẻ và dữ liệu trên máy chủ (BR-24.20); hồ sơ được chọn trở thành hồ sơ tập của HLV và đang mở */
test('BR-28.4 · đổi hồ sơ HLV có dữ liệu: buổi tập của hồ sơ HLV cũ chuyển lên học viên mới, học viên được chọn bị gỡ khỏi máy chủ', async ({ app, hub }) => {
  const P = basicPlan(), d = P.days[0];
  const done = session(d, TODAY, [[d.exercises[0], [[40, 8]]]]);
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state({ days: P.days, sessions: [done] }), p2: state() } });
  await registerHlv(app, hub);
  await autoCard(app, hub, 'p2');
  await expect.poll(async () => (await selfRecs(hub, 'buoi:')).map(r => r.id), { timeout: 15000 }).toEqual([done.id]);
  await app.tab('more');
  await app.click('hub-self-open');
  await app.page.locator('[data-act="hub-self-pick"][data-id="p2"]').click();
  await expect(app.sheet()).toContainText('cần xác nhận bằng mã QR HLV');
  await fakeCamera(app.page, hubQR(hub));
  await app.click('hub-self-auth');
  await expect.poll(async () => (await app.state()).settings.sync.self, { timeout: 8000 }).toBe('p2');
  await expect.poll(async () => (await app.profiles()).active, { timeout: 8000 }).toBe('p2');
  /* hồ sơ HLV cũ “Tôi” thành học viên mới: có đúng buổi tập của nó trên máy chủ */
  await expect.poll(async () => {
    const hv = await hvRecords(hub); const toi = hv.find(x => x.ten === 'Tôi'); if (!toi) return null;
    return (await hub.req(`/s/doi?hv=${toi.id}&since=0`, 'GET', null, hub.auth)).j.recs.filter(r => r.k.startsWith('buoi:')).map(r => r.id);
  }, { timeout: 15000 }).toEqual([done.id]);
  expect((await hvRecords(hub)).map(x => x.ten)).toEqual(['Tôi']);   // Lan không còn là học viên
  expect(await selfRecs(hub, 'buoi:')).toEqual([]);                  // Lan chưa có buổi tập
});

/* BR-28.5 (PA-44): hồ sơ HLV cũ trống thì xoá khỏi máy khi đổi hồ sơ HLV */
test('BR-28.5 · đổi hồ sơ HLV khi hồ sơ HLV cũ trống: hồ sơ cũ bị xoá khỏi máy, không tạo thẻ học viên', async ({ app, hub }) => {
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state() } });
  await registerHlv(app, hub);
  await autoCard(app, hub, 'p2');
  await app.tab('more');
  await app.click('hub-self-open');
  await app.page.locator('[data-act="hub-self-pick"][data-id="p2"]').click();
  await app.click('hub-self-go');
  await expect.poll(async () => (await app.profiles()).list.map(p => p.id), { timeout: 8000 }).toEqual(['p2']);
  expect(await hvRecords(hub)).toHaveLength(0);
});
