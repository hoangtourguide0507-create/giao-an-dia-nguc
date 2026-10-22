// VD-11: xoá hồ sơ / ngày tập / bài thì dọn cả video riêng (khoá vid:* ở kho photos).
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day } from '../helpers/data.mjs';

const prof = (l, a = 'p1') => ({ active: a, list: l.map(([id, name], i) => ({ id, name, color: i })) });

test('xoá ngày tập dọn video riêng của các bài trong ngày', async ({ app }) => {
  const P = basicPlan();
  P.bench.vid = 'vid:b1';
  await app.seed({ state: state({ days: P.days }), photos: { 'vid:b1': 'x', 'vid:giu': 'y' } });
  await app.tab('plan');
  await app.view().locator('[data-act="toggle-day"]').first().click();
  await app.click('del-day'); await app.click('confirm-ok');
  await expect.poll(async () => (await app.idb('photos')).sort()).toEqual(['vid:giu']);
});

test('xoá hồ sơ dọn video riêng của hồ sơ đó', async ({ app, page }) => {
  const P = basicPlan();
  P.bench.vid = 'vid:p2';
  await app.seed({ profiles: prof([['p1', 'Tôi'], ['p2', 'Em']], 'p2'), states: { p1: state({ days: [] }), p2: state({ days: P.days }) }, photos: { 'vid:p2': 'x', 'vid:khac': 'y' } });
  await page.locator('.who').click();
  await app.click('prof-del'); await app.click('confirm-ok');
  await expect.poll(async () => (await app.idb('photos')).sort()).toEqual(['vid:khac']);
});

test('chép giáo án: bản chép có video riêng (khoá mới), xoá bản chép không mất video của bản gốc', async ({ app, page }) => {
  const P = basicPlan();
  P.bench.vid = 'vid:goc';
  /* p2 đã có giáo án thì mới hiện nút "Thay toàn bộ" (chép thay thế) */
  await app.seed({ profiles: prof([['p1', 'Tôi'], ['p2', 'Em', 1]], 'p2'), states: { p1: state({ days: P.days }), p2: state({ days: [day('Cũ', [ex('Squat', { muscle: 'Đùi trước' })])] }) }, photos: { 'vid:goc': 'x' } });
  await page.locator('.who').click();
  await app.click('prof-copy');
  await page.locator('#f-cfrom').selectOption('p1');
  await app.sheet().locator('[data-act="prof-copy-go"][data-m="replace"]').click();
  await expect.poll(async () => (await app.state()).days.length).toBe(2);
  const copyVid = (await app.state()).days[0].exercises.find(e => e.name === P.bench.name).vid;
  expect(copyVid).toMatch(/^vid:/); expect(copyVid).not.toBe('vid:goc');
  await expect.poll(async () => (await app.idb('photos')).sort()).toEqual(['vid:goc', copyVid].sort());
  /* sau khi chép, ngày đầu (có bài bench) đang mở sẵn */
  await app.click('del-day'); await app.click('confirm-ok');
  await expect.poll(async () => (await app.idb('photos')).sort()).toEqual(['vid:goc']);
});
