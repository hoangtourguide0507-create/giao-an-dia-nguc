// BR-32 Chất lượng buổi tập (PA-45 · C): hoàn thành, đủ rep, cảm giác, nhãn Tốt/Ổn/Cần xem lại; HLV thấy, học viên không thấy.
import { test, expect, fakeCamera } from '../helpers/fixtures.mjs';
import { state, basicPlan, session, TODAY } from '../helpers/data.mjs';
import { calc } from '../helpers/calc.mjs';

const prof = (list, active = 'p1') => ({ active, list: list.map(([id, name, color = 0]) => ({ id, name, color })) });
const hubQR = (hub, k = hub.hk) => 'GAH1.' + Buffer.from(JSON.stringify({ s: hub.url, k })).toString('base64url');
async function registerHlv(app, hub) {
  await app.tab('more');
  await fakeCamera(app.page, hubQR(hub));
  await app.click('qr-scan');
  await expect(app.toast()).toContainText('Đã đăng ký làm HLV');
}
const quality = (st, id) => calc(st.page, st.data, (A, arg) => A.sessQuality(A.state.sessions.find(s => s.id === arg)), id);

test.beforeEach(async ({ app }) => { await app.goto(); });

test('BR-32.1–32.4 · tính hoàn thành, đủ rep và nhãn từ kế hoạch và thực tế', async ({ app }) => {
  const P = basicPlan();
  const good = session(P.chest, TODAY, [[P.bench, [[40, 10, 'm'], [40, 10, 'e'], [40, 10, 'm']]]]);
  const short = session(P.chest, TODAY, [[P.bench, [[40, 8, 'h']]]]);
  const gone = session(P.chest, TODAY, [[P.bench, [[40, 10]]]]);
  gone.entries = [{ exId: 'gone', name: 'Bài đã xoá', muscle: 'Ngực', note: '', each: false, sets: [{ kg: 20, reps: 10 }], drop: null }];
  const st = { page: app.page, data: { days: P.days, sessions: [good, short, gone] } };
  expect(await quality(st, good.id)).toMatchObject({ label: 'Tốt', plan: 3, done: 3, repOk: 3, comp: 1, rep: 1, eff: { e: 1, m: 2, h: 0, f: 0 } });
  expect(await quality(st, short.id)).toMatchObject({ label: 'Cần xem lại', plan: 3, done: 1, repOk: 0, comp: 1 / 3, rep: 0 });
  expect(await quality(st, gone.id)).toBeNull();
});

test('BR-32.5 · HLV mở buổi học viên thấy nhãn chất lượng và số set hoàn thành', async ({ app, hub }) => {
  const P = basicPlan();
  const s1 = session(P.chest, TODAY, [[P.bench, [[40, 10], [40, 10], [40, 10]]]]);
  await app.seed({ profiles: prof([['p1', 'Hoàng'], ['p2', 'Lan', 1]]), states: { p1: state(), p2: state({ days: P.days, sessions: [s1] }) } });
  await registerHlv(app, hub);
  await app.page.evaluate(() => window.__sota.switchProfile('p2'));
  await app.tab('week');
  await app.click('open-session', `[data-id="${s1.id}"]`);
  await expect(app.sheet()).toContainText('Chất lượng: Tốt');
  await expect(app.sheet()).toContainText('Hoàn thành 3/3 set');
});

test('BR-32.5 · máy học viên không thấy nhãn chất lượng trong chi tiết buổi', async ({ app }) => {
  const P = basicPlan();
  const s1 = session(P.chest, TODAY, [[P.bench, [[40, 10], [40, 10], [40, 10]]]]);
  await app.seed({ profiles: prof([['p1', 'Lan']]), states: { p1: state({ days: P.days, sessions: [s1] }) } });
  await app.tab('week');
  await app.click('open-session', `[data-id="${s1.id}"]`);
  await expect(app.sheet()).toContainText('Kế hoạch 3×10 · làm 3/3 set');
  await expect(app.sheet()).not.toContainText('Chất lượng');
});

test('BR-32.5 · Bảng HLV: dòng Lần cuối của học viên có nhãn chất lượng', async ({ app, hub }) => {
  const P = basicPlan();
  const s1 = session(P.chest, TODAY, [[P.bench, [[40, 8], [40, 8], [40, 8]]]]);
  await app.seed({ profiles: prof([['p1', 'Hoàng'], ['p2', 'Lan', 1]]), states: { p1: state(), p2: state({ days: P.days, sessions: [s1] }) } });
  await registerHlv(app, hub);
  await app.page.evaluate(() => window.__sota.switchProfile('p1'));
  await app.tab('week');
  await app.click('coach');
  await expect(app.sheet()).toContainText('Lần cuối');
  await expect(app.sheet()).toContainText('Cần xem lại');
});
