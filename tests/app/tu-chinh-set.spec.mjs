// BR-36 Tự chỉnh set sau mỗi set: set chưa tập nhận kg và rep theo set vừa xong (rep chỉ giảm, không tăng).
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, TODAY } from '../helpers/data.mjs';

const setBtn = (app, e, s) => app.view().locator(`[data-act="set-done"][data-e="${e}"][data-s="${s}"]`);
const inp = (app, e, s, f) => app.view().locator(`input[data-bind="set"][data-e="${e}"][data-s="${s}"][data-f="${f}"]`);

async function startChest(app, mod = p => p) {
  const P = mod(basicPlan());
  await app.seed({ state: state({ days: P.days }) });
  await app.view().locator(`[data-act="pick-day"][data-id="${P.chest.id}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  await expect(app.view()).toContainText('Đang tập');
  return P;
}
const sets = async app => (await app.state()).active.entries[0].sets.map(s => [s.kg, s.reps, !!s.done]);

test('BR-36.1 · set 1 làm 42,5 × 8 (kế hoạch 40 × 10) → set 2 và 3 chỉnh thành 42,5 × 8', async ({ app }) => {
  await startChest(app);
  await inp(app, 0, 0, 'kg').fill('42.5'); await inp(app, 0, 0, 'reps').fill('8');
  await setBtn(app, 0, 0).click();
  expect(await sets(app)).toEqual([[42.5, 8, true], [42.5, 8, false], [42.5, 8, false]]);
  await expect(inp(app, 0, 1, 'kg')).toHaveValue('42,5');   // màn hình cũng đổi theo
});

test('BR-36.1 · rep vượt kế hoạch (40 × 12) → set sau vẫn 40 × 10: rep chỉ giảm, không tự tăng', async ({ app }) => {
  await startChest(app);
  await inp(app, 0, 0, 'reps').fill('12');
  await setBtn(app, 0, 0).click();
  expect(await sets(app)).toEqual([[40, 12, true], [40, 10, false], [40, 10, false]]);
});

test('BR-36.2 · set đã tự sửa tay giữ nguyên; set đã tập không bị đổi; bỏ ✓ không hoàn lại', async ({ app }) => {
  await startChest(app);
  await inp(app, 0, 2, 'kg').fill('35');                       // sửa tay set 3
  await inp(app, 0, 0, 'kg').fill('42.5'); await inp(app, 0, 0, 'reps').fill('8');
  await setBtn(app, 0, 0).click();
  expect(await sets(app)).toEqual([[42.5, 8, true], [42.5, 8, false], [35, 10, false]]);   // set 3 giữ 35 kg
  await setBtn(app, 0, 1).click();                              // set 2 xong: không đụng set 1 đã tập
  expect((await sets(app))[0]).toEqual([42.5, 8, true]);
  await setBtn(app, 0, 0).click();                              // bỏ ✓ set 1: set sau không bị hoàn lại
  expect((await sets(app)).slice(1)).toEqual([[42.5, 8, true], [35, 10, false]]);
});

test('BR-36.2 · drop set tính lại theo kg mới', async ({ app }) => {
  await startChest(app, P => { P.bench.dropSet = true; return P; });
  const drops = async () => (await app.state()).active.entries[0].sets.filter(s => s.dr).map(s => s.kg);
  const before = await drops();
  expect(before.length).toBe(3);
  await inp(app, 0, 0, 'kg').fill('50');
  await setBtn(app, 0, 0).click();
  const after = await drops();
  expect(after[0]).toBeGreaterThan(before[0]);
});

test('BR-36.3 · có báo nhẹ; giáo án không đổi cho tới khi kết thúc buổi', async ({ app }) => {
  const P = await startChest(app);
  await inp(app, 0, 0, 'kg').fill('42.5'); await inp(app, 0, 0, 'reps').fill('8');
  await setBtn(app, 0, 0).click();
  await expect(app.toast()).toContainText('Set 2–3 chỉnh theo set 1');
  const bench = (await app.state()).days[0].exercises.find(e => e.id === P.bench.id);
  expect(bench.currentKg).toBe(40);
});

test('BR-36.1 · set cuối của bài (không còn set chưa tập) → không báo gì, không lỗi', async ({ app }) => {
  await startChest(app);
  for (const s of [0, 1, 2]) await setBtn(app, 0, s).click();
  expect(await sets(app)).toEqual([[40, 10, true], [40, 10, true], [40, 10, true]]);
});
