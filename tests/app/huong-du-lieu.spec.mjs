// BR-35 Hướng dữ liệu: giáo án (GA) HLV → HV; lịch sử tập (LST) HV → HLV; HLV tập trên hồ sơ của mình; HV không sửa GA.
import crypto from 'node:crypto';
import { test, expect, fakeCamera } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, session, TODAY, addDays } from '../helpers/data.mjs';

const hubQR = (hub, k = hub.hk) => 'GAH1.' + Buffer.from(JSON.stringify({ s: hub.url, k })).toString('base64url');
async function registerHlv(app, hub) {
  await app.tab('more'); await fakeCamera(app.page, hubQR(hub)); await app.click('qr-scan');
  await expect(app.toast()).toContainText('Đã đăng ký làm HLV');
}
async function autoCard(app, hub, pid) {
  let hvId = null;
  await expect.poll(async () => { const m = (await app.state()).settings.sync?.map || {}; hvId = Object.keys(m).find(k => m[k] === pid) || null; return !!hvId; }, { timeout: 15000 }).toBe(true);
  const k = crypto.createHmac('sha256', hub.hk).update(`gadn-hv:${hvId}:0`).digest('base64url').slice(0, 32);
  return 'GAV1.' + Buffer.from(JSON.stringify({ s: hub.url, i: hvId, k })).toString('base64url');
}
/* HLV (p1 = hồ sơ HLV, p2 = Lan) và máy học viên Lan nối bằng thẻ */
async function pair(app, hub, device, { hlvDays, hvDays = [], hvSessions = [] } = {}) {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state({ days: hlvDays ?? P.days }) } });
  await registerHlv(app, hub);
  const code = await autoCard(app, hub, 'p2'); await app.page.keyboard.press('Escape');
  const hv = await device();
  await hv.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Lan', color: 0 }] }, states: { p1: state({ days: hvDays, sessions: hvSessions, settings: { pushServer: hub.url } }) } });
  await hv.tab('more'); await fakeCamera(hv.page, code); await hv.click('qr-scan');
  await expect(hv.toast()).toContainText('Đã nối với HLV · Lan');
  return { hv, P };
}
const hlvSeed = (app, p2) => app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2 } });

test('BR-35.1 · HLV đang xem hồ sơ HV bấm Tập → chuyển về hồ sơ HLV; lịch sử HV không đổi', async ({ app, hub }) => {
  const P = basicPlan();
  await hlvSeed(app, state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -3), [[P.bench, [[40, 8]]]])] }));
  await registerHlv(app, hub);
  await expect.poll(async () => (await app.profiles()).list.some(p => p.id === 'sl:tu-tap'), { timeout: 15000 }).toBe(true);
  await app.page.evaluate(() => window.__sota.switchProfile('p2'));
  await expect.poll(async () => (await app.profiles()).active).toBe('p2');
  await app.page.locator('#nav-bar .fab').click();
  await expect.poll(async () => (await app.profiles()).active).toBe('sl:tu-tap');
  await expect(app.toast()).toContainText('Đã chuyển về hồ sơ HLV');
  expect((await app.idb('kv', 'state:p2')).sessions).toHaveLength(1);
});

test('BR-35.2 · hồ sơ HV trên máy HLV: không có Tập tiếp / Mở lại buổi đã xong hôm nay', async ({ app, hub }) => {
  const P = basicPlan();
  await hlvSeed(app, state({ days: P.days, sessions: [session(P.chest, TODAY, [[P.bench, [[40, 8]]]])] }));
  await registerHlv(app, hub);
  await app.page.evaluate(() => window.__sota.switchProfile('p2'));
  await app.tab('home');
  await expect(app.view()).toContainText('Hôm nay đã tập');
  await expect(app.act('reopen-session')).toHaveCount(0);
  await app.act('open-session').first().click();
  await expect(app.act('reopen-session')).toHaveCount(0);
});

test('BR-35.3 · máy HV không có nút sửa giáo án; sửa bài chỉ còn mức tạ; máy không vai vẫn sửa được', async ({ app, hub, device }) => {
  const { hv, P } = await pair(app, hub, device, { hvDays: [] });
  await expect.poll(async () => (await hv.state()).days.length, { timeout: 15000 }).toBe(P.days.length);
  await hv.tab('plan');
  for (const a of ['add-day', 'rename-day', 'del-day', 'move-ex', 'add-ex', 'add-alt', 'lib-open', 'prof-copy']) {
    const n = await hv.act(a).count();
    if (n) await expect(hv.act(a).first()).toBeHidden();
  }
  await hv.act('toggle-day').first().click();
  await hv.act('edit-ex').first().click();
  await expect(hv.page.locator('#f-cur')).toBeVisible();
  await expect(hv.page.locator('#f-name')).toHaveCount(0);
  await hv.page.locator('#f-cur').fill('47.5');
  await hv.click('save-kg');
  const e0 = (await hv.state()).days[0].exercises[0];
  expect(e0.currentKg).toBe(47.5);
  expect(e0.name).toBe(P.days[0].exercises[0].name);
});

test('BR-35.3 · máy không có vai (tự tập một mình) vẫn thêm ngày tập', async ({ app }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.tab('plan');
  await expect(app.act('add-day').first()).toBeVisible();
});

test('BR-35.4 · HV có giáo án riêng cũ → GA của HLV thay hẳn bản của HV', async ({ app, hub, device }) => {
  const own = day('Ngày riêng của HV', [ex('Bài riêng', { muscle: 'Tay trước' })]);
  const { hv, P } = await pair(app, hub, device, { hvDays: [own] });
  await expect.poll(async () => (await hv.state()).days.map(d => d.name), { timeout: 30000 }).toEqual(P.days.map(d => d.name));
  const st = await hv.state();
  expect(st.days.flatMap(d => d.exercises).map(e => e.name)).not.toContain('Bài riêng');
});

test('BR-35.5 · máy HV không gửi giáo án lên máy chủ (không có plan@hv)', async ({ app, hub, device }) => {
  const own = day('Ngày riêng', [ex('Bài riêng', { muscle: 'Tay trước' })]);
  const done = session(own, TODAY, [[own.exercises[0], [[10, 10]]]]);
  const { hv } = await pair(app, hub, device, { hvDays: [own], hvSessions: [done] });
  const { i, dk } = (await hv.state()).settings.sync;
  const doi = () => hub.req(`/s/doi?hv=${i}&since=0`, 'GET', null, `Bearer v.${i}.${dk}`);
  await expect.poll(async () => (await doi()).j.recs.filter(r => r.k.startsWith('buoi:')).length, { timeout: 20000 }).toBe(1);
  expect((await doi()).j.recs.find(r => r.k === 'plan@hv')).toBeUndefined();
});

test('BR-35.6 · planFromHistory: mỗi ngày trong lịch sử thành một ngày, mỗi bài thành một bài theo buổi gần nhất', async ({ app }) => {
  const P = basicPlan();
  await app.seed({ state: state() });
  const s1 = session(P.chest, addDays(TODAY, -7), [[P.bench, [[37.5, 10], [37.5, 10]]]]);
  const s2 = session(P.chest, addDays(TODAY, -2), [[P.bench, [[40, 8], [40, 8], [40, 7]]], [P.fly, [[30, 12]]]]);
  const s3 = session(P.back, addDays(TODAY, -1), [[P.lat, [[45, 10], [45, 9]]]]);
  const plan = await app.page.evaluate(s => window.__sota.planFromHistory(s), [s1, s2, s3]);
  expect(plan.map(d => d.name).sort()).toEqual([P.chest.name, P.back.name].sort());
  const chest = plan.find(d => d.name === P.chest.name);
  expect(chest.exercises.map(e => e.name)).toEqual([P.bench.name, P.fly.name]);
  expect(chest.exercises[0]).toMatchObject({ sets: 3, currentKg: 40, muscle: 'Ngực' });
  expect(chest.exercises[1]).toMatchObject({ sets: 1, currentKg: 30 });
});

test('BR-35.6 · hồ sơ HV chưa có GA mà có lịch sử → HLV bấm “Tạo giáo án từ lịch sử” → có ngày tập', async ({ app, hub }) => {
  const P = basicPlan();
  await hlvSeed(app, state({ days: [], sessions: [session(P.chest, addDays(TODAY, -2), [[P.bench, [[40, 8], [40, 8]]]]), session(P.back, addDays(TODAY, -1), [[P.lat, [[45, 10]]]])] }));
  await registerHlv(app, hub);
  await app.page.evaluate(() => window.__sota.switchProfile('p2'));
  await app.tab('plan');
  await app.click('plan-view', '[data-k="plan"]');
  await app.click('plan-from-history');
  await expect.poll(async () => (await app.idb('kv', 'state:p2')).days.map(d => d.name).sort()).toEqual([P.chest.name, P.back.name].sort());
});

test('BR-35.7 · HLV mở sửa bài trên hồ sơ HV → thấy lịch sử gần đây của bài', async ({ app, hub }) => {
  const P = basicPlan();
  await hlvSeed(app, state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -2), [[P.bench, [[40, 8], [40, 8]]]]), session(P.chest, addDays(TODAY, -9), [[P.bench, [[37.5, 10]]]])] }));
  await registerHlv(app, hub);
  await app.page.evaluate(() => window.__sota.switchProfile('p2'));
  await app.tab('plan');
  await app.act('toggle-day', `[data-id="${P.chest.id}"]`).click();
  await app.act('edit-ex', `[data-id="${P.bench.id}"]`).first().click();
  await expect(app.page.locator('.sheet')).toContainText('Lịch sử gần đây');
  await expect(app.page.locator('.sheet')).toContainText('40×8');
  await expect(app.page.locator('.sheet')).toContainText('37,5×10');
});

test('BR-35.8 · tập bài thay thế vẫn tính cùng ô: tổng quan HLV gộp một dòng; nhóm cơ và chất lượng buổi tính', async ({ app }) => {
  const P = basicPlan();
  const alt = ex('Đẩy ngực tạ đơn (DB press)', { muscle: 'Ngực', currentKg: 16, each: true });
  P.bench.alts = [alt];
  await app.seed({ state: state({ days: P.days }) });
  const s1 = session(P.chest, addDays(TODAY, -4), [[P.bench, [[40, 8], [40, 8], [40, 8]]]]);
  const s2 = session(P.chest, addDays(TODAY, -2), [[alt, [[16, 10], [16, 10], [16, 10]]]]);
  const r = await app.page.evaluate(({ s1, s2 }) => {
    const ov = window.__sota.dayOverview([s1, s2], en => { const so = window.__sota.slotOf(en.exId); return so ? { key: so.main.id, name: so.main.name } : { key: 'n:' + en.name, name: en.name }; });
    return { ov, q: window.__sota.sessQuality(s2) };
  }, { s1, s2 });
  expect(r.ov).toHaveLength(1);
  expect(r.ov[0].ex).toHaveLength(1);
  expect(r.ov[0].ex[0].name).toBe(P.bench.name);
  expect(r.ov[0].ex[0]).toMatchObject({ best: 40, lastKg: 16 });
  expect(r.q).toMatchObject({ plan: 3, done: 3, label: 'Tốt' });
});
