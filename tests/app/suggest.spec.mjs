// BR-05 Gợi ý mức tạ: tăng theo tuần (linear), tăng theo rep (double), deload, đau, kế hoạch tuần, lộ trình, khởi động.
import { test, expect } from '../helpers/fixtures.mjs';
import { calc } from '../helpers/calc.mjs';
import { ex, day, session, addDays, TODAY, MONDAY } from '../helpers/data.mjs';

const S = (sets, kg = 40) => sets.map(r => Array.isArray(r) ? r : [kg, r]);
function world(history, o = {}) {
  const b = ex('Đẩy ngực tạ đòn (Bench press)', { currentKg: o.cur ?? null, kgSetAt: o.kgSetAt ?? null, ...(o.ex || {}) });
  const d = day('Ngực', [b]);
  const sessions = history.map(([ago, sets, extra]) => session(d, addDays(TODAY, -ago), [[b, sets]], extra));
  return { b, st: { days: [d], sessions, pains: o.pains || [], weekPlans: o.weekPlans || {}, settings: { progMode: 'linear', pace: 'std', cycleStart: null, deloadEvery: 6, ...(o.settings || {}) } } };
}
const sug = (A, id) => A.suggest(A.findEx(id));

test.beforeEach(async ({ app }) => { await app.goto(); });

test.describe('tăng theo tuần (mặc định)', () => {
  test('chưa có lịch sử: buổi đầu tự chọn mức tạ, hoặc bắt đầu từ mức đang tập', async ({ page }) => {
    let w = world([]);
    expect(await calc(page, w.st, sug, w.b.id)).toMatchObject({ kind: 'new', label: 'BUỔI ĐẦU', kg: null, reps: [10, 10, 10] });
    w = world([], { cur: 40 });
    const g = await calc(page, w.st, sug, w.b.id);
    expect(g).toMatchObject({ kind: 'start', kg: 40 });
    expect(g.text).toContain('tuần sau tăng lên 42,5 kg');
  });

  test('đạt đủ 3×10 tuần trước → TĂNG TẠ đúng 1 nấc máy', async ({ page }) => {
    const w = world([[7, S([10, 10, 10])]]);
    expect(await calc(page, w.st, sug, w.b.id)).toMatchObject({ kind: 'up', label: 'TĂNG TẠ', kg: 42.5, prev: 40, reps: [8, 8, 8] });
  });

  test('đạt đủ rep nhưng chưa qua 6 ngày từ buổi đầu ở mức này → ĐÃ ĐẠT, hẹn ngày tăng', async ({ page }) => {
    const w = world([[2, S([10, 10, 10])]]);
    const g = await calc(page, w.st, sug, w.b.id);
    expect(g).toMatchObject({ kind: 'almost', label: 'ĐÃ ĐẠT', kg: 40, next: 42.5 });
    expect(g.text).toContain('từ CN 25/10');
    /* đã tập mức này từ tuần trước thì tăng luôn */
    const w2 = world([[2, S([10, 10, 10])], [9, S([10, 9, 8])]]);
    expect(await calc(page, w2.st, sug, w2.b.id)).toMatchObject({ kind: 'up', kg: 42.5 });
  });

  test('có set hỏng rep (chấm “Hỏng”) → GIỮ thêm 1 buổi dù đủ rep', async ({ page }) => {
    const w = world([[7, [[40, 10, 'm'], [40, 10, 'h'], [40, 10, 'f']]]]);
    const g = await calc(page, w.st, sug, w.b.id);
    expect(g).toMatchObject({ kind: 'hold', failHold: true, kg: 40 });
    expect(g.text).toContain('hỏng rep');
  });

  test('tốc độ Thận trọng cần 2 tuần liền đạt; mọi set đều Dễ thì không phải chờ', async ({ page }) => {
    let w = world([[7, S([10, 10, 10])]], { settings: { pace: 'slow' } });
    expect(await calc(page, w.st, sug, w.b.id)).toMatchObject({ kind: 'almost', label: 'SẮP TĂNG' });
    w = world([[7, [[40, 10, 'e'], [40, 11, 'e'], [40, 12, 'e']]]], { settings: { pace: 'slow' } });
    expect(await calc(page, w.st, sug, w.b.id)).toMatchObject({ kind: 'up', kg: 42.5 });
    w = world([[7, S([10, 10, 10])], [14, S([10, 10, 10])]], { settings: { pace: 'slow' } });
    expect(await calc(page, w.st, sug, w.b.id)).toMatchObject({ kind: 'up' });
  });

  test('chưa đủ rep → GIỮ, mục tiêu mỗi set +1 rep', async ({ page }) => {
    const w = world([[7, S([10, 9, 8])]]);
    expect(await calc(page, w.st, sug, w.b.id)).toMatchObject({ kind: 'hold', label: 'GIỮ', kg: 40, reps: [10, 10, 9] });
  });

  test('3 buổi liền không tiến bộ → GIẢM ~10%; 2 buổi liền dưới rep tối thiểu → GIẢM 1 nấc', async ({ page }) => {
    let w = world([[2, S([9, 8, 8])], [5, S([9, 9, 8])], [9, S([9, 9, 8])]]);
    expect(await calc(page, w.st, sug, w.b.id)).toMatchObject({ kind: 'down', kg: 35 });
    w = world([[2, S([10, 7, 6])], [5, S([12, 9, 7])]]);
    expect(await calc(page, w.st, sug, w.b.id)).toMatchObject({ kind: 'down', kg: 37.5 });
  });

  test('mức tạ tự nhập mới hơn buổi tập gần nhất được ưu tiên', async ({ page }) => {
    const w = world([[7, S([10, 10, 10])]], { cur: 50, kgSetAt: Date.now() });
    expect(await calc(page, w.st, sug, w.b.id)).toMatchObject({ kind: 'start', kg: 50 });
    expect(await calc(page, w.st, (A, id) => A.baseKg(A.findEx(id)), w.b.id)).toBe(50);
  });

  test('tạ đơn ghi kg mỗi tay: lời gợi ý ghi “kg/tay”', async ({ page }) => {
    const w = world([[7, S([10, 10, 10], 12)]], { ex: { each: true, step: 2 } });
    const g = await calc(page, w.st, sug, w.b.id);
    expect(g.kg).toBe(14);
    expect(g.text).toContain('kg/tay');
  });
});

test('tăng theo rep (double progression): đạt rep tối đa 2 buổi liền mới tăng', async ({ page }) => {
  const set = { settings: { progMode: 'double' } };
  let w = world([[2, S([12, 12, 12])], [5, S([12, 12, 12])]], set);
  expect(await calc(page, w.st, sug, w.b.id)).toMatchObject({ kind: 'up', kg: 42.5, reps: [8, 8, 8] });
  w = world([[2, S([12, 12, 12])], [5, S([11, 10, 10])]], set);
  expect(await calc(page, w.st, sug, w.b.id)).toMatchObject({ kind: 'almost', kg: 40, reps: [12, 12, 12] });
  w = world([[2, S([10, 9, 9])], [5, S([10, 10, 9])], [9, S([10, 10, 9])]], set);
  expect(await calc(page, w.st, sug, w.b.id)).toMatchObject({ kind: 'down', kg: 35 });
  w = world([[2, S([12, 12, 7])], [5, S([12, 9, 7])]], set);
  expect(await calc(page, w.st, sug, w.b.id)).toMatchObject({ kind: 'down', kg: 37.5, reps: [8, 8, 8] });
  w = world([[2, S([11, 10, 9])]], set);
  expect(await calc(page, w.st, sug, w.b.id)).toMatchObject({ kind: 'hold', reps: [12, 11, 10] });
});

test('tuần deload (sau 6 tuần liên tục): ~90% tạ, buổi deload không tính vào tiến độ', async ({ page }) => {
  const w = world([[7, S([10, 10, 10])], [3, S([5, 5], 36), { deload: true }]], { settings: { cycleStart: addDays(TODAY, -42) } });
  const g = await calc(page, w.st, sug, w.b.id);
  expect(g).toMatchObject({ kind: 'deload', label: 'DELOAD', kg: 35 });
  /* lộ trình tuần deload: tuần sau quay lại mức cũ rồi tăng tiếp */
  const r = await calc(page, w.st, (A, id) => A.roadmap(A.findEx(id), 3), w.b.id);
  expect(r.weeks.map(x => [x.kg, x.dl])).toEqual([[35, true], [40, false], [42.5, false]]);
});

test.describe('đau & chấn thương', () => {
  const pain = (area, level, o = {}) => ({ id: 'p' + area, area, level, since: addDays(TODAY, -3), note: '', resolvedAt: null, ...o });
  test('đau nhẹ: giảm ~20% tạ; đau vừa trở lên: nên bỏ bài', async ({ page }) => {
    let w = world([[7, S([10, 10, 10])]], { pains: [pain('Ngực', 1)] });
    let g = await calc(page, w.st, sug, w.b.id);
    expect(g).toMatchObject({ kind: 'pain', label: 'ĐAU NHẸ', kg: 32.5 });
    w = world([[7, S([10, 10, 10])]], { pains: [pain('Vai', 2), pain('Ngực', 1)] });
    g = await calc(page, w.st, sug, w.b.id);
    expect(g).toMatchObject({ kind: 'pain', label: 'NÊN BỎ', skip: true });
  });
  test('mới hết đau (trong 21 ngày, chưa tập lại): quay lại ~80%', async ({ page }) => {
    const w = world([[7, S([10, 10, 10])]], { pains: [pain('Ngực', 2, { resolvedAt: addDays(TODAY, -1) })] });
    expect(await calc(page, w.st, sug, w.b.id)).toMatchObject({ kind: 'pain', label: 'QUAY LẠI', kg: 32.5 });
    /* đã tập lại sau khi hết đau thì về bình thường */
    const w2 = world([[0, S([10, 10, 10])]], { pains: [pain('Ngực', 2, { resolvedAt: addDays(TODAY, -1) })] });
    expect((await calc(page, w2.st, sug, w2.b.id)).kind).not.toBe('pain');
  });
});

test('kế hoạch tuần đã duyệt ghi đè mức tạ gợi ý', async ({ page }) => {
  const base = world([[7, S([10, 10, 10])]]);
  const plan = id => ({ [MONDAY]: { mode: 'balanced', focus: '', dec: { [id]: 'hold' }, custom: {}, kg: { [id]: 40 }, at: Date.now() } });
  const w = world([[7, S([10, 10, 10])]], { weekPlans: {} });
  w.st.weekPlans = plan(w.b.id);
  const g = await calc(page, w.st, sug, w.b.id);
  expect(g).toMatchObject({ kind: 'hold', planned: true, kg: 40, label: 'ĐÃ DUYỆT' });
  expect(g.text).toContain('bạn chọn giữ mức cũ tuần này');
  w.st.weekPlans[MONDAY].dec[w.b.id] = 'custom'; w.st.weekPlans[MONDAY].kg[w.b.id] = 45;
  const g2 = await calc(page, w.st, sug, w.b.id);
  expect(g2).toMatchObject({ kind: 'up', kg: 45, label: 'TĂNG TẠ' });
  expect(g2.text).toContain('bạn tự chỉnh');
  expect(base).toBeTruthy();
});

test('lộ trình 8 tuần: tăng mỗi tuần 1 nấc, có tuần deload, dự kiến ngày đạt mục tiêu', async ({ page }) => {
  const w = world([], { cur: 40, ex: { targetKg: 50 }, settings: { cycleStart: addDays(TODAY, -2) } });
  const r = await calc(page, w.st, (A, id) => A.roadmap(A.findEx(id), 8), w.b.id);
  /* tuần thứ 7 là deload (~90% của 52,5 → 47,5), tuần sau quay lại 52,5 */
  expect(r.weeks.map(x => x.kg)).toEqual([40, 42.5, 45, 47.5, 50, 52.5, 47.5, 52.5]);
  expect(r.weeks[6].dl).toBe(true);
  expect(r.hitWeek).toBe(4);
  expect(r.hitDate).toBe(addDays(MONDAY, 28));
  /* chưa có mức tạ thì không có lộ trình */
  const w2 = world([]);
  expect(await calc(page, w2.st, (A, id) => A.roadmap(A.findEx(id)), w2.b.id)).toBeNull();
});

test('set khởi động theo mức tạ làm việc', async ({ page }) => {
  const W = (o, kg, kind) => calc(page, {}, (A, [o, kg, kind]) => A.warmSets(o, kg, kind), [o, kg, kind]);
  expect(await W({ type: 'upper', step: 2.5 }, 60)).toEqual([{ kg: 30, reps: 10 }, { kg: 42.5, reps: 5 }, { kg: 50, reps: 2 }]);
  expect(await W({ type: 'upper', step: 2.5 }, 30)).toEqual([{ kg: 15, reps: 10 }, { kg: 22.5, reps: 5 }]);
  expect(await W({ type: 'iso', step: 2.5 }, 20)).toEqual([{ kg: 10, reps: 12 }, { kg: 15, reps: 6 }]);
  expect(await W({ type: 'iso', step: 5 }, 20, 'feel')).toEqual([{ kg: 10, reps: 8 }]);
  /* tạ quá nhẹ so với nấc máy: 1 set ở nấc thấp hơn, hoặc nấc nhẹ nhất */
  expect(await W({ type: 'iso', step: 5 }, 6)).toEqual([{ kg: 5, reps: 12 }]);
  expect(await W({ type: 'iso', step: 5 }, 7)).toEqual([{ kg: 5, reps: 12 }]);
  expect(await W({ type: 'iso', step: 10 }, 10)).toEqual([{ kg: 10, reps: 12, light: true }]);
  expect(await W({ type: 'iso', step: 5 }, 4)).toEqual([{ kg: 4, reps: 12, light: true }]);
  expect(await W({ type: 'iso', step: 5 }, 0)).toEqual([]);
});
