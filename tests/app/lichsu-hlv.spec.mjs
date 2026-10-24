// PA-45 · Hạng mục 2 (BR-33): HLV xem lịch sử học viên, không ghi lịch sử; giáo án HLV chỉnh về máy học viên.
import crypto from 'node:crypto';
import { test, expect, fakeCamera } from '../helpers/fixtures.mjs';
import { state, basicPlan, session, TODAY } from '../helpers/data.mjs';

const seedHlv = (app, days = basicPlan().days) => app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days }) } });
const hubQR = (hub, k = hub.hk) => 'GAH1.' + Buffer.from(JSON.stringify({ s: hub.url, k })).toString('base64url');
async function registerHlv(app, hub) {
  await app.tab('more');
  await fakeCamera(app.page, hubQR(hub));
  await app.click('qr-scan');
  await expect(app.toast()).toContainText('Đã đăng ký làm HLV');
}
/* thẻ của học viên được tạo tự động: đợi máy HLV ghi nhận, rồi tính mã như máy HLV làm */
async function autoCard(app, hub, pid) {
  let hvId = null;
  await expect.poll(async () => { const m = (await app.state()).settings.sync?.map || {}; hvId = Object.keys(m).find(k => m[k] === pid) || null; return !!hvId; }, { timeout: 15000 }).toBe(true);
  const k = crypto.createHmac('sha256', hub.hk).update(`gadn-hv:${hvId}:0`).digest('base64url').slice(0, 32);
  return 'GAV1.' + Buffer.from(JSON.stringify({ s: hub.url, i: hvId, k })).toString('base64url');
}
/* HLV có Lan với giáo án P; máy Lan (học viên) nối máy và có sẵn các buổi do `mk(P)` tạo */
async function linkLan(app, hub, device, mk = () => [], hlvDays) {
  const P = basicPlan();
  await seedHlv(app, hlvDays); await registerHlv(app, hub);
  const code = await autoCard(app, hub, 'p2'); await app.page.keyboard.press('Escape');
  const hv = await device();
  await hv.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state({ days: P.days, sessions: mk(P), settings: { pushServer: hub.url } }) } });
  await hv.tab('more'); await fakeCamera(hv.page, code); await hv.click('qr-scan');
  await expect(hv.toast()).toContainText('Đã nối với HLV · Lan');
  return { hv, P };
}

/* BR-33.1 · hàm thuần mapSession: buổi về máy HLV (không có exId/dayId) được gắn đúng bài và ngày giáo án */
test('BR-33.1 · buổi học viên thiếu exId/dayId: gắn đúng bài theo tên và ngày theo dayName; bài lạ thì id mồ côi', async ({ app }) => {
  const P = basicPlan(), d = P.days[0], ex0 = d.exercises[0];
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] }, states: { p1: state({ days: P.days }) } });
  const raw = session(d, TODAY, [[ex0, [[40, 8]]], [{ ...ex0, id: 'la', name: 'Bài lạ' }, [[10, 5]]]]);
  for (const en of raw.entries) { delete en.exId; }
  delete raw.dayId;
  const out = await app.page.evaluate(({ days, s }) => window.__sota.mapSession(days, s), { days: P.days, s: raw });
  expect(out.dayId).toBe(d.id);
  expect(out.entries[0].exId).toBe(ex0.id);
  expect(out.entries[1].exId).toMatch(/^~/);
  expect(out.entries[1].k).toBeUndefined();
});

/* BR-33.5 · buổi cũ (chưa có exId) được gắn lại một lần khi hồ sơ được mở */
test('BR-33.5 · buổi cũ của hồ sơ không còn exId: mở hồ sơ là gắn lại, lịch sử bài có dữ liệu', async ({ app }) => {
  const P = basicPlan(), d = P.days[0], ex0 = d.exercises[0];
  const old = session(d, TODAY, [[ex0, [[40, 8]]]]);
  delete old.dayId; delete old.entries[0].exId;
  await app.seed({ profiles: { active: 'p2', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p2: state({ days: P.days, sessions: [old] }) } });
  await app.reload();
  const s = await app.page.evaluate(() => window.__sota.state.sessions[0]);
  expect(s.dayId).toBe(d.id);
  expect(s.entries[0].exId).toBe(ex0.id);
  expect(await app.page.evaluate(ex => window.__sota.exHistory(ex).length, ex0.id)).toBe(1);
});

/* BR-33.2 · tổng quan theo ngày tập cho HLV, và BR-33.3 · không có nút tập trên hồ sơ học viên */
test('BR-33.2 · HLV mở hồ sơ học viên → Đã tập hiện tổng quan theo ngày; BR-33.3 · không có nút Tập ngày này', async ({ app, hub, device }) => {
  const { P } = await linkLan(app, hub, device, P => [session(P.days[0], TODAY, [[P.days[0].exercises[0], [[40, 8]]]])]);
  const d = P.days[0];
  await expect.poll(async () => (await app.idb('kv', 'state:p2'))?.sessions?.length ?? 0, { timeout: 45000 }).toBe(1);
  await app.page.evaluate(() => window.__sota.switchProfile('p2'));
  await app.tab('plan');
  await app.click('plan-view', '[data-k="done"]');
  await expect(app.view()).toContainText('Theo ngày tập');
  await expect(app.view()).toContainText(d.name);
  await expect(app.view()).toContainText(d.exercises[0].name);
  /* nút Tập ở thanh dưới vẫn còn (giữ bố cục menu); bấm vào chỉ báo HLV chỉ xem */
  await expect(app.page.locator('#nav-bar .fab')).toBeVisible();
  await app.page.locator('#nav-bar .fab').click();
  await expect(app.toast()).toContainText('HLV chỉ xem');
  await app.click('plan-view', '[data-k="plan"]');
  await expect(app.act('start-day').first()).toBeHidden();
});

/* BR-33.4 · hàm thuần planDiff: liệt kê ngày/bài HLV đổi */
test('BR-33.4 · planDiff liệt kê ngày mới và bài đổi số set; giáo án giống nhau thì không có gì', async ({ app }) => {
  const P = basicPlan(), d = P.days[0];
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] }, states: { p1: state({ days: P.days }) } });
  const changed = JSON.parse(JSON.stringify(P.days)); changed[0].exercises[0].sets += 1; changed.push({ id: 'dm', name: 'Ngày mới', exercises: [] });
  const r = await app.page.evaluate(({ a, b }) => ({ same: window.__sota.planDiff(a, a), diff: window.__sota.planDiff(a, b) }), { a: P.days, b: changed });
  expect(r.same).toEqual([]);
  const txt = r.diff.join('|');
  expect(txt).toContain('Ngày mới');
  expect(txt).toContain(d.exercises[0].name);
});

/* BR-33.4 · máy học viên hiện banner khi HLV đổi giáo án, bấm Đã xem thì ẩn */
test('BR-33.4 · HLV đổi giáo án → máy học viên hiện “HLV vừa chỉnh giáo án”, bấm Đã xem thì ẩn', async ({ app, hub, device }) => {
  const P = basicPlan();
  await seedHlv(app); await registerHlv(app, hub);
  const code = await autoCard(app, hub, 'p2'); await app.page.keyboard.press('Escape');
  const hv = await device();
  await hv.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state({ days: [], settings: { pushServer: hub.url } }) } });
  await hv.tab('more'); await fakeCamera(hv.page, code); await hv.click('qr-scan');
  await expect(hv.toast()).toContainText('Đã nối với HLV · Lan');
  await expect.poll(async () => (await hv.state()).days.length, { timeout: 15000 }).toBe(P.days.length);
  const { i } = (await hv.state()).settings.sync;
  const bai = { name: 'Gập bụng', muscle: 'Bụng', type: 'upper', sets: 3, repMin: 8, repMax: 12, repTarget: 10 };
  await hub.req('/s/ghi', 'POST', { hv: i, recs: [{ k: 'plan@hlv', id: 'plan', t: Date.now() + 5000, vai: 'hlv', d: JSON.stringify({ plan: [{ n: 'Ngày đổi', e: [bai] }] }) }] }, hub.auth);
  await expect.poll(async () => (await hv.state()).days.map(x => x.name), { timeout: 45000 }).toContain('Ngày đổi');
  await hv.tab('plan');
  await expect(hv.view()).toContainText('HLV vừa chỉnh giáo án');
  await expect(hv.view()).toContainText('Ngày đổi');
  await hv.click('plan-diff-ok');
  await expect(hv.view()).not.toContainText('HLV vừa chỉnh giáo án');
});

/* BR-34.1 · học viên có giáo án riêng mà hồ sơ trên máy HLV còn trống: HLV nhận giáo án và thấy lịch sử */
test('BR-34.1 · giáo án riêng của học viên về máy HLV khi hồ sơ trên máy HLV còn trống; Lịch tập hiện ngày tập và lịch sử', async ({ app, hub, device }) => {
  const { P } = await linkLan(app, hub, device, P => [session(P.days[0], TODAY, [[P.days[0].exercises[0], [[40, 8]]]])], []);
  await expect.poll(async () => (await app.idb('kv', 'state:p2'))?.days?.length ?? 0, { timeout: 45000 }).toBe(P.days.length);
  await expect.poll(async () => (await app.idb('kv', 'state:p2'))?.sessions?.length ?? 0, { timeout: 45000 }).toBe(1);
  await app.page.evaluate(() => window.__sota.switchProfile('p2'));
  await app.tab('plan');
  await expect(app.view()).toContainText(P.days[0].name);
  await app.click('plan-view', '[data-k="done"]');
  await expect(app.view()).toContainText('Theo ngày tập');
  await expect(app.view()).toContainText(P.days[0].exercises[0].name);
});

/* BR-34.2 · hồ sơ học viên có buổi tập nhưng chưa có ngày tập: Lịch tập vẫn hiện lịch sử, không trống */
test('BR-34.2 · hồ sơ học viên chưa có giáo án nhưng có buổi tập: Lịch tập hiện lịch sử', async ({ app, hub }) => {
  const P = basicPlan(), d = P.days[0];
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Fiddle', color: 1 }] }, states: { p1: state(), p2: state({ days: [], sessions: [session(d, TODAY, [[d.exercises[0], [[40, 8]]]])] }) } });
  await registerHlv(app, hub);
  await app.page.evaluate(() => window.__sota.switchProfile('p2'));
  await app.tab('plan');
  await expect(app.view()).toContainText('Theo ngày tập');
  await expect(app.view()).toContainText(d.exercises[0].name);
});
