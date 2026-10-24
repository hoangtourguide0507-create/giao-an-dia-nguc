// PA-46 (BR-33.6): buổi tập kéo từ máy chủ phải nối lại với bài trong giáo án (exId, dayId), nếu không màn giáo án mất số tạ.
import { test, expect } from '../helpers/fixtures.mjs';
import { state, ex, day, session, TODAY, at } from '../helpers/data.mjs';

const squat = ex('Đạp đùi · máy', { muscle: 'Đùi trước', currentKg: null });
const plan = day('Chân', [squat]);
const seed = (app, sessions = []) => app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'An', color: 0 }] }, states: { p1: state({ days: [plan], sessions }) } });
/* buổi như máy khác ghi lên máy chủ: mã bài và mã ngày của máy đó, không trùng máy này */
const tuMayKhac = () => { const s = session(null, TODAY, [[{ id: 'ex-may-khac', name: squat.name, muscle: 'Đùi trước' }, [[60, 10], [80, 10]]]], { id: 'buoi-xa', dayId: 'day-may-khac', dayName: 'Chân' }); return s; };

test('BR-33.6 · kéo buổi từ máy chủ → bài trong giáo án có lịch sử và hiện mức tạ', async ({ app }) => {
  await seed(app);
  const s = tuMayKhac();
  await app.page.evaluate(([rec, pid]) => window.__sota.hubApplySession(pid, rec), [{ k: 'buoi:buoi-xa', id: 'buoi-xa', t: s.finishedAt, vai: 'hv', d: JSON.stringify(s) }, 'p1']);
  const r = await app.page.evaluate(id => ({ n: window.__sota.exHistory(id).length, kg: window.__sota.baseKg(window.__sota.findEx(id)), s: window.__sota.state.sessions[0] }), squat.id);
  expect(r.n).toBe(1);
  expect(r.kg).toBe(80);
  expect(r.s.entries[0].exId).toBe(squat.id);
  expect(r.s.dayId).toBe(plan.id);
});

test('BR-33.6 · buổi đã có trên máy mà thiếu mã bài → mở app tự nối lại, không đổi tạ/rep', async ({ app }) => {
  const s = tuMayKhac(); s.entries[0].exId = undefined; delete s.dayId;
  await seed(app, [s]);
  const r = await app.page.evaluate(id => ({ n: window.__sota.exHistory(id).length, kg: window.__sota.baseKg(window.__sota.findEx(id)), s: window.__sota.state.sessions[0] }), squat.id);
  expect(r.n).toBe(1);
  expect(r.kg).toBe(80);
  expect(r.s.dayId).toBe(plan.id);
  expect(r.s.entries[0].sets.map(z => [z.kg, z.reps])).toEqual([[60, 10], [80, 10]]);
});

test('BR-33.6 · bài đã bỏ khỏi giáo án: buổi cũ vẫn giữ nguyên, không gán nhầm bài khác', async ({ app }) => {
  await seed(app);
  const s = tuMayKhac(); s.entries[0].name = 'Bài đã xoá';
  await app.page.evaluate(([rec, pid]) => window.__sota.hubApplySession(pid, rec), [{ k: 'buoi:buoi-xa', id: 'buoi-xa', t: s.finishedAt, vai: 'hv', d: JSON.stringify(s) }, 'p1']);
  const r = await app.page.evaluate(id => ({ n: window.__sota.exHistory(id).length, s: window.__sota.state.sessions[0] }), squat.id);
  expect(r.n).toBe(0);
  expect(r.s.entries[0].sets.length).toBe(2);
});
