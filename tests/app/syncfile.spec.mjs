// BR-14 Gói đồng bộ (file .json "gadn-sync") nhận qua Khôi phục từ file: gộp buổi tập / giáo án giữa máy HLV và học viên, xung đột, hoàn tác.
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, session, addDays, TODAY, PHOTO } from '../helpers/data.mjs';

const coachProf = () => ({ active: 'p1', list: [{ id: 'p1', name: 'An', color: 0 }, { id: 'p2', name: 'Bình', color: 1 }], coach: { on: true, name: 'Hoàng' } });
const exo = (name, o = {}) => ({ i: [], name, muscle: 'Ngực', type: 'upper', sets: 3, repTarget: 10, repMin: 8, repMax: 12, step: 2.5, ph: [], l: [], ...o });
const sess = (id, date, dayName, sets, extra = {}) => ({ id, date, startedAt: Date.parse(date + 'T10:00:00+07:00'), finishedAt: Date.parse(date + 'T11:00:00+07:00'), dayName, entries: [{ k: [], name: 'Đẩy ngực tạ đòn (Bench press)', muscle: 'Ngực', note: '', each: false, sets, drop: null }], ...extra });
const pkg = (role, o = {}) => ({ app: 'gadn-sync', v: 1, role, link: { pk: '', cn: '' }, name: 'An', at: Date.now(), plan: null, sessions: [], del: { s: {}, e: {} }, photos: {}, ...o });
const file = (page, p, name = 'dong-bo.json') => page.setInputFiles('#restore-file', { name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(p)) });

test('máy HLV nhận gói của học viên: xem trước, chọn hồ sơ, gộp buổi + giáo án + bài học viên tự thêm, hoàn tác', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ profiles: coachProf(), states: { p1: state({ days: P.days }), p2: state({ days: P.days }) } });
  const own = exo('Gập bụng (Crunch)', { muscle: 'Bụng', fs: 1, i: ['ownkey'] });
  const bench = exo(P.bench.name, { i: [], currentKg: 47.5, kgSetAt: Date.now() + 9999 });
  await app.more('backup');
  await file(page, pkg('student', { plan: [{ n: 'Ngực + Tay sau', e: [{ ...bench, o: '', l: [] }, { ...own, o: '', l: [] }] }], sessions: [sess('s1', addDays(TODAY, -2), 'Ngực + Tay sau', [{ kg: 45, reps: 10 }, { kg: 45, reps: 9, ef: 'h' }])] }));
  await expect(app.sheet()).toContainText('Gộp vào hồ sơ nào?');
  await app.sheet().locator('[data-act="sync-to"][data-id="p2"]').click();
  await expect(app.sheet()).toContainText('Dữ liệu từ máy của Bình');
  await expect(app.sheet()).toContainText('1 buổi tập mới');
  await expect(app.sheet()).toContainText('1 bài có mức tạ mới');
  await app.click('sync-apply');
  await expect(app.toast()).toContainText('Đã gộp vào Bình');
  let st = await app.idb('kv', 'state:p2');
  expect(st.sessions).toHaveLength(1);
  expect(st.sessions[0]).toMatchObject({ id: 's1', syncFrom: 'student' });
  expect(st.sessions[0].entries[0].sets[1].ef).toBe('h');
  expect(st.days[0].exercises.map(e => e.name)).toEqual([P.bench.name, P.fly.name, P.push.name, 'Gập bụng (Crunch)']);
  expect(st.days[0].exercises[3].fromStudent).toBe(true);
  /* hồ sơ đang xem (An) không bị đụng */
  expect((await app.state()).sessions).toHaveLength(0);
  await app.toast().locator('[data-act="sync-undo"]').click();
  await expect(app.toast()).toHaveText('Đã hoàn tác lần đồng bộ');
  await app.flushed();
  st = await app.idb('kv', 'state:p2');
  expect(st.sessions).toHaveLength(0);
  /* gói trùng: không có gì mới */
  await file(page, pkg('student'));
  await app.sheet().locator('[data-act="sync-to"][data-id="p2"]').click();
  await expect(app.sheet()).toContainText('Hai máy đã khớp nhau, không có gì mới');
});

test('buổi trùng ngày + tên buổi nhưng khác mã: chọn giữ máy này / máy kia / cả hai', async ({ app, page }) => {
  const P = basicPlan();
  const mine = session(P.chest, addDays(TODAY, -2), [[P.bench, [[40, 10], [40, 10], [40, 10], [40, 9]]]], { id: 'mine1' });
  mine.startedAt = Date.parse(addDays(TODAY, -2) + 'T09:00:00+07:00');
  await app.seed({ profiles: coachProf(), states: { p1: state(), p2: state({ days: P.days, sessions: [mine] }) } });
  const incoming = pkg('student', { sessions: [sess('theirs1', addDays(TODAY, -2), 'Ngực + Tay sau', [{ kg: 42.5, reps: 8 }])] });
  for (const [choice, expectIds] of [['mine', ['mine1']], ['theirs', ['theirs1']], ['both', ['mine1', 'theirs1']]]) {
    await app.seed({ profiles: coachProf(), states: { p1: state(), p2: state({ days: P.days, sessions: [{ ...mine }] }) } });
    await app.more('backup');
    await file(page, incoming);
    await app.sheet().locator('[data-act="sync-to"][data-id="p2"]').click();
    await expect(app.sheet()).toContainText('cả hai máy cùng ghi');
    /* mặc định: giữ bản nhiều set hơn (máy này 4 set) */
    await expect(app.sheet().locator('[data-act="sync-pick"][data-v="mine"]')).toHaveAttribute('aria-pressed', 'true');
    await app.sheet().locator(`[data-act="sync-pick"][data-v="${choice}"]`).click();
    await expect(app.sheet().locator(`[data-act="sync-pick"][data-v="${choice}"]`)).toHaveAttribute('aria-pressed', 'true');
    await app.click('sync-apply');
    await expect(app.toast()).toContainText('Đã gộp vào Bình');
    await app.flushed();
    const ids = (await app.idb('kv', 'state:p2')).sessions.map(s => s.id).sort();
    expect(ids).toEqual(expectIds.sort());
  }
});

test('máy học viên nhận gói của HLV: giáo án dựng lại theo HLV nhưng giữ lịch sử và bài tự thêm; HLV xoá bài thì máy học viên bỏ theo', async ({ app, page }) => {
  const P = basicPlan();
  const mine = ex('Cuốn tạ đòn (Barbell curl)', { muscle: 'Tay trước' });
  const d = day('Ngực + Tay sau', [P.bench, P.fly, mine]);
  await app.seed({ state: state({ days: [d], sessions: [session(d, addDays(TODAY, -3), [[P.bench, [[40, 10]]]])] }) });
  const bench = exo(P.bench.name, { i: ['coach-bench'], currentKg: 50, kgSetAt: Date.now() + 5000, sets: 4 });
  await app.more('backup');
  await file(page, pkg('coach', { name: 'An', link: { pk: 'pcoach', cn: 'Tâm' }, plan: [{ n: 'Ngực + Tay sau', e: [{ ...bench, o: 'Đẩy ngực', ms: '2026-09-01', l: [exo('Đẩy ngực máy (Chest press)', { i: ['coach-alt'] })] }, { ...exo('Ép cáp (Cable fly)', { i: ['coach-fly'] }), o: '', l: [] }] }, { n: 'Chân', e: [{ ...exo('Squat', { muscle: 'Đùi trước', type: 'lower', i: ['coach-sq'] }), o: '', l: [] }] }],
    sessions: [sess('hlv1', addDays(TODAY, -1), 'Ngực + Tay sau', [{ kg: 50, reps: 8 }])], del: { s: {}, e: {} } }));
  await expect(app.sheet()).toContainText('Dữ liệu từ HLV Tâm');
  await expect(app.sheet()).toContainText('Giáo án theo HLV');
  await app.click('sync-apply');
  await expect(app.toast()).toContainText('Đã gộp vào');
  const st = await app.state();
  expect(st.coachLink).toEqual({ pk: 'pcoach', name: 'Tâm' });
  expect(st.days.map(x => x.name)).toEqual(['Ngực + Tay sau', 'Chân']);
  const e0 = st.days[0].exercises[0];
  expect(e0).toMatchObject({ id: P.bench.id, sets: 4, currentKg: 50, slot: 'Đẩy ngực' });
  expect(e0.alts.map(a => a.name)).toEqual(['Đẩy ngực máy (Chest press)']);
  expect(st.days[0].exercises.map(e => e.name)).toContain('Cuốn tạ đòn (Barbell curl)');
  expect(st.sessions.map(s => s.id).sort()).toEqual(['hlv1', st.sessions.find(s => s.id !== 'hlv1').id].sort());
  /* HLV bỏ bài ép cáp khỏi giáo án: máy học viên bỏ theo (bài tự thêm thì giữ) */
  await app.toastGone();
  await app.more('backup');
  await file(page, pkg('coach', { link: { pk: 'pcoach', cn: 'Tâm' }, plan: [{ n: 'Ngực + Tay sau', e: [{ ...bench, o: '', ms: '', l: [] }] }], del: { s: {}, e: {} } }));
  await app.click('sync-apply');
  await expect(app.toast()).toContainText('Đã gộp vào');
  await expect.poll(async () => (await app.state()).days.flatMap(x => x.exercises.map(e => e.name))).not.toContain('Ép cáp (Cable fly)');
  expect((await app.state()).days.flatMap(x => x.exercises.map(e => e.name))).toContain('Cuốn tạ đòn (Barbell curl)');
});

test('gói đồng bộ cùng vai, đang tập dở, hỏng: báo lỗi rõ ràng', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await app.more('backup');
  await file(page, pkg('student'));
  await expect(app.sheet()).toContainText('Cả hai máy đều đang ở vai học viên');
  await app.closeSheet();
  await file(page, { app: 'gadn-sync', role: 'khac' });
  await expect(app.toast()).toHaveText('Gói đồng bộ không đọc được');
  await app.toastGone();
  /* máy nhiều hồ sơ chưa bật HLV: gợi ý bật */
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'A', color: 0 }, { id: 'p2', name: 'B', color: 1 }] }, states: { p1: state(), p2: state() } });
  await app.more('backup');
  await file(page, pkg('student'));
  await expect(app.sheet()).toContainText('Máy này đang có nhiều hồ sơ');
  await expect(app.sheet().locator('[data-act="coach-setup"]')).toBeVisible();
  await app.closeSheet();
  /* HLV nhận gói của HLV */
  await app.seed({ profiles: coachProf(), states: { p1: state(), p2: state() } });
  await app.more('backup');
  await file(page, pkg('coach'));
  await expect(app.sheet()).toContainText('Cả hai máy đều đang bật chế độ HLV');
  await app.closeSheet();
  /* hồ sơ đang tập dở */
  await app.seed({ profiles: coachProf(), states: { p1: state(), p2: state({ days: P.days, active: { id: 'a', dayId: P.chest.id, dayName: 'x', date: TODAY, startedAt: Date.now(), entries: [] } }) } });
  await app.more('backup');
  await file(page, pkg('student'));
  await app.sheet().locator('[data-act="sync-to"][data-id="p2"]').click();
  await expect(app.sheet()).toContainText('Đang tập dở');
});

test('gói có ảnh máy tập: nhận ảnh mới, báo ảnh chưa kèm, không nhân đôi khi nhận lại', async ({ app, page }) => {
  const P = basicPlan(); P.bench.photos = ['loc1'];
  await app.seed({ profiles: coachProf(), states: { p1: state(), p2: state({ days: P.days }) }, photos: { loc1: PHOTO } });
  const withPh = pkg('student', { plan: [{ n: 'Ngực + Tay sau', e: [{ ...exo(P.bench.name, { ph: ['hx1', 'hx2'] }), o: '', l: [] }] }], photos: { hx1: PHOTO.replace('/9j/', '/9j/') } });
  await app.more('backup');
  await file(page, withPh);
  await app.sheet().locator('[data-act="sync-to"][data-id="p2"]').click();
  await expect(app.sheet()).toContainText('1 ảnh máy tập');
  await expect(app.sheet()).toContainText('1 ảnh máy tập chưa kèm trong gói này');
  await app.click('sync-apply');
  await expect(app.toast()).toContainText('1 ảnh');
  expect((await app.idb('kv', 'state:p2')).days[0].exercises[0].photos).toHaveLength(2);
  await file(page, withPh);
  await app.sheet().locator('[data-act="sync-to"][data-id="p2"]').click();
  await expect(app.sheet()).not.toContainText('ảnh máy tập mới');
});
