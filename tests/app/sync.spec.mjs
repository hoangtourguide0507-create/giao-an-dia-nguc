// BR-14 Đồng bộ hai chiều HLV ⇄ học viên bằng mã (Zalo), QR, ảnh mã, file; kèm định dạng cũ GAS1 / GAQ1.
import { test, expect, fakeCamera, sheetImage } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, session, addDays, TODAY, b64u } from '../helpers/data.mjs';

const clip = page => page.evaluate(() => navigator.clipboard.readText());
const setClip = (page, t) => page.evaluate(t => navigator.clipboard.writeText(t), t);
async function pasteInCoach(app) {
  if (await app.page.locator('#sheet').isVisible()) await app.closeSheet();
  await app.view().locator('[data-act="qr-scan"]').click();
  await app.sheet().locator('[data-act="qr-paste"]').click();
}
const coachProf = (name = 'Hoàng') => ({ active: 'p1', list: [{ id: 'p1', name: 'An', color: 0 }, { id: 'p2', name: 'Bình', color: 1 }], coach: { on: true, name } });

function studentWorld() {
  const P = basicPlan();
  const s1 = session(P.chest, addDays(TODAY, -2), [[P.bench, [[40, 10], [40, 10], [40, 9, 'h']]], [P.fly, [[30, 10]]]]);
  return { P, s1, st: state({ days: P.days, sessions: [s1] }) };
}
async function studentCode(app, page, st) {
  await app.seed({ state: st });
  await app.tab('more');
  await app.click('sync-open');
  await expect(app.sheet()).toContainText('Đồng bộ với HLV');
  await expect(app.sheet()).toContainText('Chưa đồng bộ lần nào');
  await app.click('sync-copy');
  await expect(app.toast()).toContainText('Đã sao chép mã');
  return clip(page);
}

test('học viên → HLV: gộp buổi tập và giáo án vào đúng hồ sơ, có hoàn tác; dán lại thì báo đã khớp', async ({ app, page }) => {
  const W = studentWorld();
  const code = await studentCode(app, page, W.st);
  expect(code).toMatch(/^GAS2\.[a-z0-9]+\.1\.1\.z/);
  await app.flushed();
  expect((await app.state()).syncMark.sent[W.s1.id]).toBeGreaterThan(0);
  /* máy HLV */
  await app.seed({ profiles: coachProf(), states: { p1: state(), p2: state() } });
  await setClip(page, code);
  await app.tab('more');
  await app.view().locator('[data-act="qr-scan"]').click();
  await app.sheet().locator('[data-act="qr-paste"]').click();
  await expect(app.sheet()).toContainText('Học viên này chưa liên kết với hồ sơ nào trên máy bạn');
  await app.sheet().locator('[data-act="sync-to"][data-id="p1"]').click();
  await expect(app.sheet()).toContainText('Dữ liệu từ máy của An');
  await expect(app.sheet()).toContainText('1 buổi tập mới');
  await expect(app.sheet()).toContainText('6 bài mới trong giáo án');
  await app.click('sync-apply');
  await expect(app.toast()).toContainText('Đã gộp vào');
  await expect(app.toast()).toContainText('Đã gộp vào An: 1 buổi mới');
  let st = await app.state();
  expect(st.sessions).toHaveLength(1);
  expect(st.sessions[0]).toMatchObject({ id: W.s1.id, syncFrom: 'student' });
  expect(st.sessions[0].entries[0].sets.map(s => s.ef || null)).toEqual([null, null, 'h']);
  expect(st.days.flatMap(d => d.exercises).every(e => e.fromStudent)).toBe(true);
  /* hoàn tác */
  await app.toast().locator('[data-act="sync-undo"]').click();
  await expect(app.toast()).toHaveText('Đã hoàn tác lần đồng bộ');
  st = await app.state();
  expect(st.sessions).toHaveLength(0);
  await app.toastGone();
  await app.tab('more');
  await app.view().locator('.tcard').first().locator('[data-act="sync-open"]').click();
  await app.sheet().locator('[data-act="qr-paste"]').click();
  await app.sheet().locator('[data-act="sync-to"][data-id="p1"]').click();
  await app.click('sync-apply');
  await expect(app.toast()).toContainText('Đã gộp vào');
  await app.toastGone();
  /* dán lại cùng mã: không có gì mới */
  await app.tab('more');
  await app.view().locator('[data-act="qr-scan"]').click();
  await app.sheet().locator('[data-act="qr-paste"]').click();
  await app.sheet().locator('[data-act="sync-to"][data-id="p1"]').click();
  await expect(app.sheet()).toContainText('Hai máy đã khớp nhau, không có gì mới');
});

test('HLV → học viên: giáo án theo HLV, giữ lịch sử của học viên, liên kết HLV; buổi trùng ngày thì chọn giữ bản nào', async ({ app, page }) => {
  const W = studentWorld();
  /* HLV đã có hồ sơ An với cùng giáo án và một buổi HLV ghi cùng ngày với buổi học viên tự ghi */
  const C = basicPlan();
  C.bench.name = W.P.bench.name; C.bench.sets = 4; C.bench.currentKg = 42.5; C.bench.kgSetAt = Date.now();
  const sC = session(C.chest, W.s1.date, [[C.bench, [[42.5, 8], [42.5, 8], [42.5, 8], [42.5, 7]]], [C.fly, [[30, 10]]]]);
  await app.seed({ profiles: coachProf('Tâm'), states: { p1: state({ days: C.days, sessions: [sC] }), p2: state() } });
  await app.tab('more');
  await app.view().locator('.tcard').first().locator('[data-act="sync-open"]').click();
  await expect(app.sheet()).toContainText('Đồng bộ với học viên An');
  await page.locator('#sync-full').check();
  await app.click('sync-copy');
  await expect(app.toast()).toContainText('Đã sao chép mã');
  const code = await clip(page);
  /* máy học viên */
  await app.seed({ state: W.st });
  await setClip(page, code);
  await app.tab('more');
  await app.view().locator('[data-act="qr-paste"]').click();
  await expect(app.sheet()).toContainText('Dữ liệu từ HLV Tâm');
  await expect(app.sheet()).toContainText('Buổi bị trùng');
  /* mặc định giữ bản nhiều set hơn (máy HLV 5 set, máy này 4 set) */
  await expect(app.sheet().locator('[data-act="sync-pick"][data-v="theirs"]')).toHaveAttribute('aria-pressed', 'true');
  await app.sheet().locator('[data-act="sync-pick"][data-v="both"]').click();
  await expect(app.sheet().locator('[data-act="sync-pick"][data-v="both"]')).toHaveAttribute('aria-pressed', 'true');
  await app.sheet().locator('[data-act="sync-pick"][data-v="mine"]').click();
  await expect(app.sheet()).toContainText('Giáo án theo HLV');
  await app.click('sync-apply');
  await expect(app.toast()).toContainText('Đã gộp vào');
  const st = await app.state();
  expect(st.coachLink).toEqual({ pk: 'p1', name: 'Tâm' });
  expect(st.sessions.map(s => s.id)).toEqual([W.s1.id]);
  const bench = st.days[0].exercises[0];
  expect(bench).toMatchObject({ id: W.P.bench.id, sets: 4, currentKg: 42.5 });
  /* lần sau học viên gửi lên: máy HLV tự nhận ra hồ sơ nhờ liên kết */
  await app.tab('more');
  await app.click('sync-open');
  await expect(app.sheet()).toContainText('Đồng bộ với HLV Tâm');
});

test('hai máy cùng vai thì không đồng bộ; đang tập dở thì chặn; gói hỏng thì báo', async ({ app, page }) => {
  const W = studentWorld();
  const code = await studentCode(app, page, W.st);
  await app.seed({ state: state() });
  await setClip(page, code);
  await app.tab('more');
  await app.view().locator('[data-act="qr-paste"]').click();
  await expect(app.sheet()).toContainText('Cả hai máy đều đang ở vai học viên');
  /* máy nhiều hồ sơ chưa bật HLV: gợi ý bật */
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'A', color: 0 }, { id: 'p2', name: 'B', color: 1 }] }, states: { p1: state(), p2: state() } });
  await setClip(page, code);
  await app.tab('more');
  await app.view().locator('[data-act="qr-paste"]').click();
  await expect(app.sheet().locator('[data-act="coach-setup"]')).toBeVisible();
  /* đang tập dở */
  const P = basicPlan();
  await app.seed({ profiles: coachProf(), states: { p1: state({ days: P.days, active: { id: 'a', dayId: P.chest.id, dayName: 'x', date: TODAY, startedAt: Date.now(), entries: [] } }), p2: state() } });
  await setClip(page, code);
  await app.page.evaluate(() => document.querySelector('[data-act="qr-paste"]') || null);
  await app.tab('plan'); await app.tab('more');
  await app.view().locator('[data-act="tab"][data-tab="settings"]').click();
  await app.view().locator('[data-act="qr-paste"]').click();
  await app.sheet().locator('[data-act="sync-to"][data-id="p1"]').click();
  await expect(app.sheet()).toContainText('Đang tập dở');
  /* gói JSON hỏng */
  await app.closeSheet();
  await setClip(page, '{"app":"gadn-sync","role":"x"}');
  await app.view().locator('[data-act="qr-paste"]').click();
  await expect(app.toast()).toHaveText('Gói đồng bộ không đọc được');
  /* HLV dán mã của HLV khác */
  await app.toastGone();
  await app.view().locator('[data-act="tab"][data-tab="more"]').click();
  await app.view().locator('.tcard').first().locator('[data-act="sync-open"]').click();
  await app.click('sync-copy');
  await expect(app.toast()).toContainText('Đã sao chép mã');
  await app.toastGone();
  await app.sheet().locator('[data-act="qr-paste"]').click();
  await expect(app.sheet()).toContainText('Cả hai máy đều đang bật chế độ HLV');
});

test('đồng bộ bằng mã QR đứng yên (đánh dấu đã gửi), ảnh mã và quét camera', async ({ app, page }) => {
  const W = studentWorld();
  await app.seed({ state: W.st });
  await app.tab('more');
  await app.click('sync-open');
  await app.click('sync-qr');
  await expect(app.sheet()).toContainText('Mã đồng bộ');
  await expect(app.sheet()).toContainText('1 buổi tập · kèm giáo án');
  await page.locator('#qr-next').click();
  await expect(app.toast()).toHaveText('Đã đánh dấu đã gửi');
  /* gửi lại: không còn buổi mới */
  await app.click('sync-open');
  await expect(app.sheet()).toContainText('Lần gửi gần nhất: hôm nay');
  await app.click('sync-qr');
  await expect(app.sheet()).toContainText('Không có buổi tập mới');
  await app.click('qr-close');
  /* ảnh mã */
  await app.click('sync-open');
  await page.locator('#sync-full').check();
  await app.click('sync-img');
  await expect(app.sheet()).toContainText('Ảnh mã');
  const png = await sheetImage(page);
  /* đọc mã bằng camera ở máy HLV */
  await app.seed({ profiles: coachProf(), states: { p1: state(), p2: state() } });
  await app.tab('more');
  await app.view().locator('.tcard').first().locator('[data-act="sync-open"]').click();
  await page.setInputFiles('#img-in', { name: 'dongbo.png', mimeType: 'image/png', buffer: png });
  await expect(app.sheet()).toContainText('Học viên này chưa liên kết');
  await app.closeSheet();
  const W2 = studentWorld();
  const code = await studentCode(app, page, W2.st);
  await app.seed({ profiles: coachProf(), states: { p1: state(), p2: state() } });
  await fakeCamera(page, code);
  await app.tab('more');
  await app.view().locator('.tcard').first().locator('[data-act="sync-open"]').click();
  await app.click('sync-scan');
  await expect(app.sheet()).toContainText('Học viên này chưa liên kết', { timeout: 8000 });
});

test('giáo án dài: lượt đồng bộ đầu chỉ gửi giáo án, chia nhiều mã, bấm tiếp từng mã', async ({ app, page }) => {
  const days = Array.from({ length: 6 }, (_, i) => day('Ngày ' + i, Array.from({ length: 8 }, (_, k) => ex(`Bài riêng ${i}-${k} ${Math.random().toString(36)}`, { setup: 'x'.repeat(30) + Math.random() }))));
  const s = session(days[0], addDays(TODAY, -1), [[days[0].exercises[0], [[10, 10]]]]);
  await app.seed({ state: state({ days, sessions: [s] }) });
  await app.tab('more');
  await app.click('sync-open');
  await app.click('sync-qr');
  await expect(app.sheet()).toContainText('Lượt này gửi giáo án');
  await expect(app.sheet()).toContainText('còn 1 buổi gửi ở mã sau');
  const n = +(await page.locator('#qr-pg').textContent()).match(/\/(\d+)/)[1];
  for (let i = 1; i < n; i++) await page.locator('#qr-next').click();
  await expect(page.locator('#qr-next')).toContainText('Máy kia đã nhận xong · gửi tiếp');
  await page.locator('#qr-next').click();
  await expect(app.toast()).toContainText('Còn 1 buổi');
  await expect(app.sheet()).toContainText('1 buổi tập');
});

test('định dạng cũ: mã kết quả GAQ1, gói GAS1, file .json gadn-sync', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ profiles: coachProf(), states: { p1: state({ days: P.days }), p2: state() } });
  const gaq = k => 'GAQ1.ab12.1.1.p' + b64u(JSON.stringify({ v: 1, k, n: 'An', s: [['q1', addDays(TODAY, -1), Date.now() - 864e5, Date.now() - 860e5, 0, 'Ngực + Tay sau', [['', P.bench.name, 'Ngực', 0, [[40, 10], [40, 9]], 0], ['', 'Bài mới lạ', 'Khác', 1, [[5, 12]], [3, 10]]]]] }));
  await setClip(page, gaq(''));
  await app.tab('more');
  await pasteInCoach(app);
  await expect(app.sheet()).toContainText('Kết quả của An');
  await app.sheet().locator('[data-act="qr-to"][data-id="p1"]').click();
  await expect(app.toast()).toHaveText('Đã nhận 1 buổi tập của An');
  let st = await app.state();
  expect(st.sessions[0]).toMatchObject({ id: 'q1', fromQR: true });
  expect(st.sessions[0].entries[0].exId).toBe(P.bench.id);
  expect(st.sessions[0].entries[1]).toMatchObject({ exId: 'qr:Bài mới lạ', each: true, drop: { kg: 3, reps: 10 } });
  /* mã có mã hồ sơ: nhận thẳng, buổi đã có thì báo */
  await app.toastGone();
  await setClip(page, gaq('p1'));
  await pasteInCoach(app);
  await expect(app.toast()).toHaveText('Các buổi này đã có sẵn, không có gì mới');
  /* nhận vào hồ sơ không đang xem */
  await app.toastGone();
  await setClip(page, gaq('p2'));
  await pasteInCoach(app);
  await expect(app.toast()).toHaveText('Đã nhận 1 buổi tập của Bình');
  /* GAQ1 hỏng */
  await app.toastGone();
  await setClip(page, 'GAQ1.ab12.1.1.pAAAA');
  await pasteInCoach(app);
  await expect(app.toast()).toHaveText('Mã QR không đọc được, thử quét lại');
  /* gói GAS1 (JSON nén) và GAS1 hỏng */
  const pkg = { app: 'gadn-sync', v: 1, role: 'student', link: { pk: '', cn: '' }, name: 'Học viên X', at: Date.now(), plan: null,
    sessions: [{ id: 'g1', date: addDays(TODAY, -3), startedAt: Date.now() - 3 * 864e5, dayName: 'Ngực + Tay sau', entries: [{ k: [], name: P.fly.name, muscle: 'Ngực', sets: [{ kg: 30, reps: 10, ef: 'e' }, { kg: 20, reps: 10, dr: 1 }] }] }], del: { s: {}, e: {} } };
  await app.toastGone();
  await setClip(page, 'GAS1.cd34.1.1.p' + b64u(JSON.stringify(pkg)));
  await pasteInCoach(app);
  await expect(app.sheet()).toContainText('Dữ liệu của Học viên X');
  await app.sheet().locator('[data-act="sync-to"][data-id="p1"]').click();
  await app.click('sync-apply');
  await expect(app.toast()).toContainText('Đã gộp vào');
  st = await app.state();
  expect(st.sessions.find(s => s.id === 'g1').entries[0]).toMatchObject({ exId: P.fly.id, sets: [{ kg: 30, reps: 10, ef: 'e' }, { kg: 20, reps: 10, dr: 1 }] });
  await app.toastGone();
  await setClip(page, 'GAS1.cd34.1.1.pAAAA');
  await pasteInCoach(app);
  await expect(app.toast()).toHaveText('Mã QR không đọc được, thử quét lại');
  /* file .json đồng bộ chọn ở “Khôi phục từ file” */
  await app.toastGone();
  await app.closeSheet();
  await app.view().locator('[data-act="tab"][data-tab="settings"]').click();
  await page.setInputFiles('#restore-file', { name: 'dong-bo.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...pkg, sessions: [{ ...pkg.sessions[0], id: 'g2' }] })) });
  await expect(app.sheet()).toContainText('Dữ liệu của Học viên X');
  /* dán thẳng JSON */
  await app.closeSheet();
  await setClip(page, JSON.stringify({ ...pkg, sessions: [{ ...pkg.sessions[0], id: 'g3' }] }));
  await app.view().locator('[data-act="qr-paste"]').click();
  await expect(app.sheet()).toContainText('Dữ liệu của Học viên X');
});

test('xoá có ghi dấu: buổi học viên xoá thì máy HLV xoá theo; bài HLV bỏ thì máy học viên bỏ theo', async ({ app, page }) => {
  const W = studentWorld();
  const s2 = session(W.P.back, addDays(TODAY, -1), [[W.P.lat, [[45, 10]]]]);
  /* HLV có sẵn cả 2 buổi, học viên đã xoá s2 */
  const C = basicPlan();
  await app.seed({ state: { ...W.st, sessions: [W.s1], syncDel: { s: { [s2.id]: Date.now() }, e: {} } } });
  await app.tab('more'); await app.click('sync-open'); await page.locator('#sync-full').check(); await app.click('sync-copy');
  await expect(app.toast()).toContainText('Đã sao chép mã');
  const code = await clip(page);
  await app.seed({ profiles: coachProf(), states: { p1: state({ days: C.days, sessions: [W.s1, s2] }), p2: state() } });
  await setClip(page, code);
  await app.tab('more');
  await app.view().locator('[data-act="qr-scan"]').click();
  await app.sheet().locator('[data-act="qr-paste"]').click();
  await app.sheet().locator('[data-act="sync-to"][data-id="p1"]').click();
  await expect(app.sheet()).toContainText('1 buổi bị xoá theo máy kia');
  await app.click('sync-apply');
  await expect(app.toast()).toContainText('Đã gộp vào');
  expect((await app.state()).sessions.map(s => s.id)).toEqual([W.s1.id]);
});
