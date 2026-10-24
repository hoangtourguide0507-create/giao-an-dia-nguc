// BR-09 Tiến độ: theo tuần/tháng, chỉ số so với kỳ trước, set mỗi nhóm cơ, vùng cơ 4 tuần, từng bài, lịch sử buổi.
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, session, addDays, TODAY, MONDAY } from '../helpers/data.mjs';

function history() {
  const P = basicPlan();
  const S = (d, date, list) => session(d, date, list);
  const ss = [
    S(P.chest, addDays(TODAY, -30), [[P.bench, [[35, 10], [35, 10], [35, 10]]], [P.fly, [[30, 10], [30, 10]]]]),
    S(P.chest, addDays(TODAY, -21), [[P.bench, [[37.5, 10], [37.5, 10], [37.5, 10]]], [P.fly, [[30, 10], [30, 9]]]]),
    S(P.chest, addDays(TODAY, -9), [[P.bench, [[40, 10], [40, 10], [40, 10]]], [P.fly, [[30, 8], [30, 7]]]]),
    S(P.back, addDays(MONDAY, -2), [[P.lat, [[45, 10], [45, 10], [45, 10]]], [P.curl, [[10, 12], [10, 12]]]]),
    S(P.chest, MONDAY, [[P.bench, [[42.5, 8], [42.5, 8], [42.5, 7]]], [P.fly, [[30, 8], [30, 7]]], [P.push, [[20, 12], [20, 12], [20, 12]]]]),
    S(P.back, addDays(MONDAY, 1), [[P.lat, [[47.5, 10], [47.5, 9]]], [P.row, [[40, 10], [40, 10]]]])
  ];
  return { P, st: state({ days: P.days, sessions: ss }) };
}

test('theo tuần: chấm ngày tập, 4 chỉ số so với tuần trước, lùi/tiến tuần', async ({ app, page }) => {
  const { st } = history();
  await app.seed({ state: st });
  await app.tab('week');
  await expect(app.view().locator('.wl')).toHaveText('Tuần này');
  await expect(app.view().locator('.dots div.on')).toHaveCount(2);
  await expect(app.view().locator('.dots div.today')).toContainText('21');
  const k = app.view().locator('.kpis .kpi');
  await expect(k.nth(0)).toContainText('2');
  /* BR-38.1/38.5: hôm nay T4 → chỉ so T2–T4 tuần trước (1 buổi, 5 set) */
  await expect(k.nth(0).locator('.delta')).toContainText('▲ 1');
  await expect(k.nth(1).locator('.delta')).toContainText('▲ 7');
  /* BR-38.2/38.4: chỉ bench, fly chung; bench −18,5 %, fly 0 % → trung bình đều −9 % */
  await expect(k.nth(2).locator('.delta')).toContainText('▼ 9%');
  await expect(app.view().locator('.hero.ton')).toContainText('-9% so với tuần trước');
  await expect(app.view()).not.toContainText('So với 1');
  await expect(k.nth(3)).toContainText('2'); /* bài lên tạ: bench 40→42,5, lat 45→47,5 */
  await expect(app.act('period', '[data-d="1"]')).toBeDisabled();
  await app.click('period', '[data-d="-1"]');
  await expect(app.view().locator('.wl')).toHaveText('Tuần trước');
  await app.click('period', '[data-d="-1"]');
  await expect(app.view().locator('.wl')).toHaveText('05/10 – 11/10');
  await expect(app.view()).toContainText('Buổi đã tập · 0');
  await expect(app.view()).toContainText('Chưa có buổi tập nào trong tuần này');
  await app.click('period', '[data-d="1"]');
  await app.click('period', '[data-d="1"]');
  await expect(app.view().locator('.wl')).toHaveText('Tuần này');
});

test('theo tháng: lịch tháng có tên buổi, bấm ngày mở buổi tập; nhóm cơ tính trung bình mỗi tuần', async ({ app }) => {
  const { st } = history();
  await app.seed({ state: st });
  await app.tab('week');
  await app.click('pmode', '[data-k="month"]');
  await expect(app.view().locator('.wl')).toHaveText('Tháng này');
  await expect(app.view().locator('.mcal button.on')).toHaveCount(4);
  await expect(app.view().locator('.mcal button.td')).toHaveText('21');
  await app.view().locator('.mcal button.on').first().click();
  await expect(app.sheet()).toContainText('Ngực + Tay sau');
  await app.closeSheet();
  await expect(app.view().locator('details.mus summary')).toContainText('trung bình mỗi tuần');
  await app.click('period', '[data-d="-1"]');
  await expect(app.view().locator('.wl')).toHaveText('Tháng trước');
  await app.click('period', '[data-d="-1"]');
  await expect(app.view().locator('.wl')).toHaveText('Tháng 8/2026');
});

test('set mỗi nhóm cơ (thiếu / đạt / cao) và vùng cơ 4 tuần (vùng chưa tập, lệch)', async ({ app }) => {
  const { st } = history();
  await app.seed({ state: st });
  await app.tab('week');
  const mus = app.view().locator('details.mus');
  await expect(mus.locator('summary')).toContainText('mục tiêu 10–20 set/tuần');
  await mus.locator('summary').click();
  await expect(mus.locator('.vrow')).toHaveCount(4);
  await expect(mus.locator('.vrow', { hasText: 'Ngực' })).toContainText('Thiếu');
  expect((await app.ui()).musOpen).toBe(true);
  const z = app.view().locator('details.zcard');
  await expect(z.locator('summary')).toContainText('vùng chưa tập');
  await z.locator('summary').click();
  await expect(z.locator('.zr').first()).toBeVisible();
  expect((await app.ui()).zOpen).toBe(true);
});

test('từng bài: tiến bộ nhiều nhất, đang chững; tất cả bài có tìm kiếm; chi tiết bài có lộ trình và biểu đồ', async ({ app, page }) => {
  const { P, st } = history();
  await app.seed({ state: st });
  await app.tab('week');
  await expect(app.view()).toContainText('Tiến bộ nhiều nhất · 4 tuần');
  await expect(app.view().locator('.pgr').first()).toContainText('+');
  await expect(app.view()).toContainText('Đang chững · cần chú ý');
  await app.click('allex');
  await expect(app.sheet()).toContainText('Tất cả bài tập');
  await page.fill('#allex-q', 'kéo');
  await page.locator('#allex-q').dispatchEvent('input');
  await expect(app.sheet().locator('.pgr')).toHaveCount(1);
  await page.fill('#allex-q', 'zzz');
  await page.locator('#allex-q').dispatchEvent('input');
  await expect(app.sheet()).toContainText('Không tìm thấy');
  await app.closeSheet();
  await app.view().locator(`[data-act="prog"][data-id="${P.bench.id}"]`).first().click();
  await expect(app.sheet()).toContainText('Lộ trình tăng tạ 8 tuần tới');
  await expect(app.sheet().locator('.tbl tbody tr')).toHaveCount(4);
  await expect(app.sheet().locator('#prog-chart .ctitle')).toHaveText('Mức tạ cao nhất mỗi buổi (kg)');
  /* rê lên biểu đồ hiện giá trị */
  const svg = app.sheet().locator('#prog-chart svg');
  const box = await svg.boundingBox();
  await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2);
  await expect(app.sheet().locator('#prog-chart .tip')).toBeVisible();
  await expect(app.sheet().locator('#prog-chart .tip')).toContainText('42,5');
  await page.mouse.move(box.x - 50, box.y - 50);
  await expect(app.sheet().locator('#prog-chart .tip')).toBeHidden();
  await app.sheet().locator('[data-act="pm"][data-k="e1"]').click();
  await expect(app.sheet().locator('#prog-chart .ctitle')).toContainText('1RM ước tính');
  await app.sheet().locator('[data-act="pm"][data-k="vol"]').click();
  await expect(app.sheet().locator('#prog-chart .ctitle')).toContainText('Tổng khối lượng');
  await app.sheet().locator('[data-act="edit-ex"]').click();
  await expect(app.sheet()).toContainText('Sửa bài tập');
});

test('bài chỉ có 1 lần tập: biểu đồ báo cần ít nhất 2 lần; bài chưa có mức tạ', async ({ app }) => {
  const P = basicPlan();
  P.row.currentKg = null;
  await app.seed({ state: state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -2), [[P.bench, [[40, 10]]]])] }) });
  await app.tab('week');
  await app.click('allex');
  /* nhóm cơ đóng sẵn, bấm để mở */
  await app.sheet().locator('details.grp summary', { hasText: 'Ngực' }).click();
  await app.sheet().locator(`[data-act="prog"][data-id="${P.bench.id}"]`).click();
  await expect(app.sheet().locator('#prog-chart')).toContainText('Cần ít nhất 2 lần ghi');
  await app.closeSheet();
  await app.click('allex');
  await app.sheet().locator('details.grp summary', { hasText: 'Lưng' }).click();
  await app.sheet().locator(`[data-act="prog"][data-id="${P.row.id}"]`).click();
  await expect(app.sheet()).toContainText('Điền mức tạ đang tập trong Giáo án để xem lộ trình');
});

test('xem lại buổi đã tập, xoá buổi (có xác nhận, ghi dấu xoá để đồng bộ)', async ({ app }) => {
  const { st } = history();
  await app.seed({ state: st });
  await app.tab('week');
  await expect(app.view()).toContainText('Buổi đã tập · 2');
  await app.view().locator('.list [data-act="open-session"]').first().click();
  await expect(app.sheet()).toContainText('Lưng + Tay trước');
  await expect(app.sheet()).toContainText('So với lần trước');
  await app.click('del-session');
  await app.click('confirm-ok');
  const s2 = await app.state();
  expect(s2.sessions).toHaveLength(5);
  expect(Object.keys(s2.syncDel.s)).toHaveLength(1);
  await expect(app.view()).toContainText('Buổi đã tập · 1');
});

test('Tiến độ → từng bài: nhãn gợi ý (lên tạ, đang đau, tuần deload, giữ mức)', async ({ app }) => {
  const P = basicPlan();
  const mk = (e, kg) => session(P.chest, addDays(TODAY, -8), [[e, [[kg, 10], [kg, 10], [kg, 10]]]]);
  const ss = [mk(P.bench, 40), mk(P.push, 20)];
  await app.seed({ state: state({ days: P.days, sessions: ss, pains: [{ id: 'p', area: 'Ngực', level: 1, since: addDays(TODAY, -1), resolvedAt: null }], weekPlans: {} }) });
  await app.tab('week');
  await app.click('allex');
  await app.sheet().locator('details.grp summary', { hasText: 'Ngực' }).click();
  await expect(app.sheet().locator(`[data-act="prog"][data-id="${P.bench.id}"]`)).toContainText('đau nhẹ');
  await app.sheet().locator('details.grp summary', { hasText: 'Tay sau' }).click();
  await expect(app.sheet().locator(`[data-act="prog"][data-id="${P.push.id}"]`)).toContainText('Lên 22,5 kg buổi tới');
  await app.closeSheet();
  await app.seed({ state: state({ days: P.days, sessions: ss, settings: { cycleStart: addDays(TODAY, -45) } }) });
  await app.tab('week'); await app.click('allex');
  await app.sheet().locator('details.grp summary', { hasText: 'Tay sau' }).click();
  await expect(app.sheet().locator(`[data-act="prog"][data-id="${P.push.id}"]`)).toContainText('Tuần deload');
});

/* ---- PA-49 · BR-38: so theo ngày, sức mạnh chỉ so bài chung ---- */
const cp = (page, mode, off, today) => page.evaluate(([m, o, t]) => window.__sota.comparePeriod(m, o, t), [mode, off, today]);
const sc = (page, cur, prev) => page.evaluate(([c, p]) => window.__sota.strengthCompare(c, p), [cur, prev]);
const SS = list => list.map(([name, sets, extra]) => ({ entries: [{ exId: 'x-' + name, name, sets: sets.map(([kg, reps]) => ({ kg, reps })), drop: null, each: false, ...(extra || {}) }] }));

test('BR-38.1 comparePeriod: kỳ đang diễn ra chỉ so đúng khoảng ngày đã trôi qua', async ({ app, page }) => {
  await app.seed({ state: history().st });
  expect(await cp(page, 'week', 0, '2026-10-24')).toMatchObject({ from: '2026-10-19', to: '2026-10-24', pFrom: '2026-10-12', pTo: '2026-10-17', scale: 1 });
  expect(await cp(page, 'week', 0, '2026-10-19')).toMatchObject({ from: '2026-10-19', to: '2026-10-19', pFrom: '2026-10-12', pTo: '2026-10-12' });
  expect(await cp(page, 'week', 0, '2026-10-25')).toMatchObject({ to: '2026-10-25', pTo: '2026-10-18' });
  expect(await cp(page, 'month', 0, '2026-10-24')).toMatchObject({ from: '2026-10-01', to: '2026-10-24', pFrom: '2026-09-01', pTo: '2026-09-24', scale: 1 });
  /* kỳ đã qua: cả kỳ so cả kỳ liền trước */
  expect(await cp(page, 'week', -1, '2026-10-24')).toMatchObject({ from: '2026-10-12', to: '2026-10-18', pFrom: '2026-10-05', pTo: '2026-10-11', scale: 1 });
});

test('BR-38.1/Q3 comparePeriod: tháng dài ngắn khác nhau → cả tháng trước, quy về trung bình theo ngày', async ({ app, page }) => {
  await app.seed({ state: history().st });
  const a = await cp(page, 'month', 0, '2026-10-31'); /* tháng 9 chỉ 30 ngày */
  expect(a).toMatchObject({ from: '2026-10-01', to: '2026-10-31', pFrom: '2026-09-01', pTo: '2026-09-30' });
  expect(a.scale).toBeCloseTo(31 / 30, 6);
  const b = await cp(page, 'month', 0, '2026-03-30'); /* tháng 2/2026 có 28 ngày */
  expect(b).toMatchObject({ pFrom: '2026-02-01', pTo: '2026-02-28' });
  expect(b.scale).toBeCloseTo(30 / 28, 6);
  const c = await cp(page, 'month', -1, '2026-10-24'); /* tháng 9 (30) so tháng 8 (31) */
  expect(c).toMatchObject({ from: '2026-09-01', to: '2026-09-30', pFrom: '2026-08-01', pTo: '2026-08-31' });
  expect(c.scale).toBeCloseTo(30 / 31, 6);
});

test('BR-38.2/38.3 strengthCompare: chỉ bài chung; bài lặp lấy trung bình theo buổi', async ({ app, page }) => {
  await app.seed({ state: history().st });
  /* B: kỳ trước 1 buổi 1000; kỳ này 2 buổi 1200 và 1400 → TB 1300 (+30 %); A chỉ kỳ này, C chỉ kỳ trước */
  const r = await sc(page, SS([['A', [[50, 10]]], ['B', [[120, 10]]], ['B', [[140, 10]]]]), SS([['B', [[100, 10]]], ['C', [[80, 10]]]]));
  expect(r.n).toBe(1);
  expect(r.rows).toHaveLength(1);
  expect(r.rows[0]).toMatchObject({ name: 'B', c: 1300, p: 1000 });
  expect(r.pct).toBeCloseTo(30, 6);
});

test('BR-38.4 strengthCompare: % từng bài rồi trung bình đều; không bài chung → null', async ({ app, page }) => {
  await app.seed({ state: history().st });
  /* bài nhỏ 100 → 120 (+20 %), bài nặng 10000 → 10000 (0 %) → +10 %, không phải ~+0,2 % theo tổng */
  const r = await sc(page, SS([['Nhỏ', [[10, 12]]], ['Nặng', [[100, 100]]]]), SS([['Nhỏ', [[10, 10]]], ['Nặng', [[100, 100]]]]));
  expect(r.n).toBe(2);
  expect(r.pct).toBeCloseTo(10, 6);
  const none = await sc(page, SS([['A', [[50, 10]]]]), SS([['B', [[50, 10]]]]));
  expect(none).toMatchObject({ n: 0, pct: null });
  const zero = await sc(page, SS([['A', [[50, 10]]]]), SS([['A', [[0, 10]]]]));
  expect(zero).toMatchObject({ n: 0, pct: null });
});

test('BR-38.3 strengthCompare: công thức cũ — tạ đơn ×2, drop tính; bài chính/thay thế cùng ô gộp một bài', async ({ app, page }) => {
  await app.seed({ state: history().st });
  const e = (sets, extra) => SS([['Tạ đơn', sets, { each: true, ...(extra || {}) }]]);
  const r = await sc(page, e([[10, 10]], { drop: { kg: 5, reps: 10 } }), e([[10, 10]]));
  expect(r.rows[0]).toMatchObject({ c: 300, p: 200 });
  expect(r.pct).toBeCloseTo(50, 6);
});

test('BR-38: chỉ tính hiển thị, không đổi dữ liệu', async ({ app, page }) => {
  await app.seed({ state: history().st });
  await app.tab('week');
  const before = await page.evaluate(() => JSON.stringify(window.__sota.state));
  await cp(page, 'month', 0, '2026-10-31');
  await page.evaluate(() => window.__sota.strengthCompare(window.__sota.state.sessions, window.__sota.state.sessions));
  await app.click('pmode', '[data-k="month"]');
  expect(await page.evaluate(() => JSON.stringify(window.__sota.state))).toBe(before);
});
