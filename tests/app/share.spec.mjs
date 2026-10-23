// BR-23 Chia sẻ kết quả buổi tập với PT: link/QR nhị phân, userid, PT nhận và khớp học viên, ghi đè theo ngày, mức tạ.
import { test, expect, fakeCamera } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, session, addDays, TODAY } from '../helpers/data.mjs';

const PREV = addDays(TODAY, -1);
const LAT = 'Kéo xô tay thẳng (Straight-arm pulldown)';

/* lịch sử của Hoàng: buổi ngực hôm nay (bench 42,5 × 10 + 40 × 10 có ghi chú; ép máy; kéo xô tay thẳng ngoài giáo án; push chưa tập), buổi lưng hôm qua */
function hoangState(P) {
  const straight = ex(LAT, { muscle: 'Lưng', type: 'iso' });
  const today = session(P.chest, TODAY, [
    [P.bench, [[42.5, 10], [40, 10, 'm']], { note: 'Vai trái hơi đau' }],
    [P.fly, [[30, 12, 'e']]],
    [straight, [[35, 10]]],
    [P.push, []],
  ]);
  const old = session(P.back, PREV, [[P.lat, [[45, 8]]]]);
  return { straight, today, old, st: state({ days: P.days, sessions: [today, old] }) };
}

/* mở bảng chia sẻ của một ngày đúng đường người dùng: Tiến độ → lịch tháng → chạm ngày → Chia sẻ cả ngày này với PT */
async function openShare(app, date) {
  await app.tab('week');
  await app.view().locator('.pmode [data-k="month"]').click();
  await app.view().locator('.mcal button.on').filter({ hasText: new RegExp(`^${Number(date.slice(8))}(?!\\d)`) }).first().click();
  await app.click('share-open', `[data-d="${date}"]`);
  await expect(app.sheet()).toContainText('Chia sẻ');
}
/* lấy link chia sẻ bằng cách bấm “Gửi link” (máy này không có bảng chia sẻ → sao chép vào bộ nhớ tạm) */
async function copyLink(app, date) {
  await openShare(app, date);
  await app.click('share-link');
  return app.page.evaluate(() => navigator.clipboard.readText());
}
const hashOf = link => link.slice(link.indexOf('#'));
/* mở link trên một tài liệu mới (như khi bấm link từ Zalo): đổi sang trang khác trước để không chỉ đổi phần #  */
async function openLink(app, link) {
  await app.page.goto('/manifest.webmanifest');
  await app.goto(hashOf(link));
}
/* ghi một set rồi kết thúc và lưu buổi (một ngày đã chọn trong tab Tập) */
async function quickSave(app, dayId) {
  await app.view().locator(`[data-act="pick-day"][data-id="${dayId}"]`).click();
  await app.view().locator('.hero [data-act="start-day"]').click();
  await app.view().locator('[data-act="set-done"][data-e="0"][data-s="0"]').click();
  await app.click('finish');
  await app.click('save-session');
}

/* ===== BR-23.4 userid ===== */
test('userid: hồ sơ học viên dùng mã hồ sơ; p1 nhận mã ngẫu nhiên; giữ ổn định khi tải lại', async ({ app }) => {
  const P = basicPlan();
  await app.seed({
    profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }, { id: 'p3', name: 'Minh', color: 2 }] },
    states: { p1: state({ days: P.days, sessions: [session(P.chest, TODAY, [[P.bench, [[40, 10]]]])] }), p2: state({ days: P.days }), p3: state({ days: P.days }) },
  });
  await copyLink(app, TODAY);
  const u1 = (await app.profiles()).list.map(p => p.uid);
  expect(u1[0]).toBeTruthy();
  expect(u1[0]).not.toBe('p1');
  expect(u1[1]).toBe('p2');
  expect(u1[2]).toBe('p3');
  await app.reload();
  await copyLink(app, TODAY);
  expect((await app.profiles()).list.map(p => p.uid)).toEqual(u1);
});

/* ===== BR-23.1, 23.3, 23.8 nội dung & độ dài ===== */
test('gói chia sẻ: chỉ bài đã tập (kể cả bài ngoài giáo án), có kg/set/rep/ghi chú; độ dài ≤ 350 ký tự', async ({ app }) => {
  const P = basicPlan();
  const { st } = hoangState(P);
  await app.seed({ state: st, profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0, uid: 'u8f3k2m9x1qz' }] } });
  const link = await copyLink(app, TODAY);
  expect(link).toMatch(/#cs=[A-Za-z0-9_-]+$/);
  expect(link.length).toBeLessThanOrEqual(350);
  const d = await app.page.evaluate(h => window.__sota.share.decode(h.slice(h.indexOf('#') + 4)), link);
  expect(d).toMatchObject({ uid: 'u8f3k2m9x1qz', name: 'Hoàng', date: TODAY });
  expect(d.sessions).toHaveLength(1);
  const names = d.sessions[0].entries.map(e => e.name);
  expect(names).toEqual([P.bench.name, P.fly.name, LAT]);          /* push chưa tập không có; LAT không có trong giáo án vẫn gửi */
  expect(d.sessions[0].entries[2].lib).toBe(true);
  expect(d.sessions[0].entries[0]).toMatchObject({ note: 'Vai trái hơi đau', sets: [{ kg: 42.5, reps: 10 }, { kg: 40, reps: 10, ef: 'm' }] });
  expect(d.sessions[0].entries[1].sets).toEqual([{ kg: 30, reps: 12, ef: 'e' }]);
  /* không có các dữ liệu không được chia sẻ */
  expect(JSON.stringify(d)).not.toMatch(/Đẩy cáp tay sau|currentKg|bodyFat|photo/);
});

test('gói chia sẻ ngày nặng (10 bài × 5 set, 6 ghi chú) vẫn ≤ 700 ký tự', async ({ app }) => {
  const many = Array.from({ length: 10 }, (_, i) => ex(['Kéo xô (Lat pulldown)', 'Chèo cáp ngồi (Seated cable row)', 'Đẩy ngực tạ đòn (Bench press)', 'Ép ngực máy (Pec deck)', 'Đẩy cáp tay sau (Triceps pushdown)', 'Đạp đùi (Leg press)', 'Đá đùi (Leg extension)', 'Cuốn tạ đơn (Dumbbell curl)', 'Nhón bắp chân đứng (Standing calf raise)', 'Hít đất (Push-up)'][i], { muscle: 'Lưng' }));
  const d1 = day('Ngày nặng', many);
  const s = session(d1, TODAY, many.map((x, i) => [x, Array.from({ length: 5 }, (_, k) => [52.5 + i, 8 + k, 'h']), { note: 'Ghi chú dài để thử độ dài link của buổi nặng ' + i }]));
  await app.seed({ state: state({ days: [d1], sessions: [s] }), profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0, uid: 'u8f3k2m9x1qz' }] } });
  const link = await copyLink(app, TODAY);
  expect(link.length).toBeLessThanOrEqual(700);
});

/* ===== BR-23.2 cách gửi ===== */
test('bảng chia sẻ nêu rõ gửi gì / không gửi gì; có QR, nút gửi ảnh QR và lưu ảnh', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: hoangState(P).st, profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }] } });
  await openShare(app, TODAY);
  await expect(app.sheet()).toContainText('Không gửi');
  await expect(app.sheet()).toContainText('ảnh');
  expect(await page.locator('#share-qr').evaluate(c => c.width)).toBeGreaterThan(100);
  await expect(app.act('share-qr-save')).toHaveCount(1);
  await expect(app.act('share-img')).toHaveCount(1);
});

/* ===== BR-23.11 gợi ý sau buổi tập (học viên) ===== */
test('lưu buổi tập: không còn nút Hoàn tác; hiện “Chia sẻ với PT”; “Đừng hỏi lại” tắt gợi ý', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }), profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }] } });
  await quickSave(app, P.chest.id);
  await expect(app.toast()).toContainText('Đã lưu buổi tập');
  await expect(app.toast().locator('[data-act="reopen-session"]')).toHaveCount(0);
  await expect(app.sheet()).toContainText('Chia sẻ với PT');
  await page.locator('#share-noask').check();
  await app.closeSheet();
  expect((await app.state()).settings.shareNoAsk).toBe(true);
  /* buổi sau không hiện gợi ý nữa */
  await quickSave(app, P.back.id);
  await expect(app.toast()).toContainText('Đã lưu buổi tập');
  await expect(app.sheet()).toBeHidden();
});

/* ===== BR-23.10 chọn ngày trong lịch ===== */
test('Tiến độ → lịch tháng: chạm ngày có buổi tập → bảng ngày có “Chia sẻ cả ngày này với PT”, link mang đúng ngày', async ({ app }) => {
  const P = basicPlan();
  await app.seed({ state: hoangState(P).st, profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }] } });
  await app.tab('week');
  await app.view().locator('.pmode [data-k="month"]').click();
  await app.view().locator('.mcal button.on').first().click();
  await expect(app.sheet()).toContainText('Chia sẻ cả ngày này với PT');
  await app.click('share-open', `[data-d="${PREV}"]`);
  await app.click('share-link');
  const link = await app.page.evaluate(() => navigator.clipboard.readText());
  const d = await app.page.evaluate(h => window.__sota.share.decode(h.slice(h.indexOf('#') + 4)), link);
  expect(d.date).toBe(PREV);
});

/* ===== BR-23.5 PT nhận: tự bật HLV, xem trước, tạo học viên mới, ghi đè đúng ngày ===== */
test('PT mở link: tự bật chế độ HLV, xem trước, tạo học viên mới với userid của link', async ({ app, page }) => {
  const P = basicPlan();
  const { st } = hoangState(P);
  await app.seed({ state: st, profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0, uid: 'u8f3k2m9x1qz' }] } });
  const hoang = await copyLink(app, TODAY);
  /* máy PT: trống */
  await app.seed({ state: state(), profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] } });
  await openLink(app, hoang);
  await expect(app.sheet()).toContainText('Kết quả của Hoàng ngày 21/10');
  await expect(app.sheet()).toContainText('3 bài');
  expect((await app.profiles()).coach?.on).toBe(true);
  await app.click('share-new');
  await expect(app.toast()).toContainText('Đã nhận');
  const profs = (await app.profiles()).list;
  const hv = profs.find(p => p.name === 'Hoàng');
  expect(hv.uid).toBe('u8f3k2m9x1qz');
  const s = await app.idb('kv', 'state:' + hv.id);
  expect(s.sessions).toHaveLength(1);
  expect(s.sessions[0].date).toBe(TODAY);
  expect(s.sessions[0].entries.map(e => e.name)).toEqual([P.bench.name, P.fly.name, LAT]);
  /* bài trong kho bài được tự thêm vào giáo án (BR-23.8), bài ngoài kho thì không */
  const names = s.days.flatMap(d => d.exercises.map(e => e.name));
  expect(names).toEqual(expect.arrayContaining([P.bench.name, P.fly.name, LAT]));
});

test('PT đã có học viên cùng userid: tự khớp, ghi đè đúng ngày, ngày khác giữ nguyên, Hoàn tác khôi phục', async ({ app }) => {
  const P = basicPlan();
  const { st } = hoangState(P);
  await app.seed({ state: st, profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0, uid: 'u8f3k2m9x1qz' }] } });
  const hoang = await copyLink(app, TODAY);
  /* máy PT: học viên “Hoàng” đã có buổi hôm qua và một buổi cũ hôm nay (sẽ bị thay) */
  const oldToday = session(P.chest, TODAY, [[P.bench, [[30, 5]]]]);
  const oldPrev = session(P.back, PREV, [[P.lat, [[20, 12]]]]);
  await app.seed({
    profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Hoàng', color: 1, uid: 'u8f3k2m9x1qz' }] },
    states: { p1: state(), p2: state({ days: P.days, sessions: [oldToday, oldPrev] }) },
  });
  await openLink(app, hoang);
  await expect(app.sheet()).toContainText('Cập nhật vào Hoàng');
  await app.click('share-apply');
  await expect(app.toast()).toContainText('Đã nhận');
  const s = await app.idb('kv', 'state:p2');
  expect(s.sessions.map(x => x.date).sort()).toEqual([PREV, TODAY]);
  expect(s.sessions.find(x => x.date === PREV).id).toBe(oldPrev.id);
  expect(s.sessions.find(x => x.date === TODAY).id).not.toBe(oldToday.id);
  expect(s.syncDel.s[oldToday.id]).toBeTruthy();
  /* Hoàn tác (chỉ ở máy PT) */
  await app.toast().locator('[data-act="share-undo"]').click();
  const u = await app.idb('kv', 'state:p2');
  expect(u.sessions.map(x => x.id).sort()).toEqual([oldPrev.id, oldToday.id].sort());
});

test('PT: buổi nhận là buổi mới nhất của bài → cập nhật mức tạ của bài trong giáo án', async ({ app }) => {
  const P = basicPlan();
  const { st } = hoangState(P);
  await app.seed({ state: st, profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0, uid: 'u8f3k2m9x1qz' }] } });
  const hoang = await copyLink(app, TODAY);
  await app.seed({
    profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Hoàng', color: 1, uid: 'u8f3k2m9x1qz' }] },
    states: { p1: state({ days: P.days }), p2: state({ days: P.days }) },
  });
  await openLink(app, hoang);
  await app.click('share-apply');
  await expect(app.toast()).toContainText('Đã nhận');
  const s = await app.idb('kv', 'state:p2');
  expect(s.days[0].exercises.find(e => e.name === P.bench.name).currentKg).toBe(42.5);
});

test('PT: đã có buổi mới hơn của bài ở học viên → nhận buổi cũ không làm lùi mức tạ', async ({ app }) => {
  const P = basicPlan();
  const older = session(P.chest, PREV, [[P.bench, [[42.5, 10]]]]);
  await app.seed({ state: state({ days: P.days, sessions: [older] }), profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0, uid: 'u8f3k2m9x1qz' }] } });
  const hoangOlder = await copyLink(app, PREV);
  const P2 = basicPlan();
  P2.bench.currentKg = 45;
  const newer = session(P2.chest, TODAY, [[P2.bench, [[45, 5]]]]);
  await app.seed({
    profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Hoàng', color: 1, uid: 'u8f3k2m9x1qz' }] },
    states: { p1: state(), p2: state({ days: P2.days, sessions: [newer] }) },
  });
  await openLink(app, hoangOlder);
  await app.click('share-apply');
  await expect(app.toast()).toContainText('Đã nhận');
  const s = await app.idb('kv', 'state:p2');
  expect(s.days[0].exercises.find(e => e.name === P.bench.name).currentKg).toBe(45);
  expect(s.sessions.map(x => x.date).sort()).toEqual([PREV, TODAY]);
});

test('PT đang có buổi tập dở ở hồ sơ đó: từ chối, không ghi gì', async ({ app }) => {
  const P = basicPlan();
  const { st } = hoangState(P);
  await app.seed({ state: st, profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0, uid: 'u8f3k2m9x1qz' }] } });
  const hoang = await copyLink(app, TODAY);
  const busy = state({ days: P.days, active: session(P.chest, TODAY, []) });
  await app.seed({
    profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Hoàng', color: 1, uid: 'u8f3k2m9x1qz' }] },
    states: { p1: state(), p2: busy },
  });
  await openLink(app, hoang);
  await app.click('share-apply');
  await expect(app.toast()).toContainText('Đang tập');
  expect((await app.idb('kv', 'state:p2')).sessions).toHaveLength(0);
});

/* ===== BR-23.5 quét QR và tải ảnh có QR ===== */
test('PT quét QR bằng camera trong app → mở xem trước', async ({ app, page }) => {
  const P = basicPlan();
  const { st } = hoangState(P);
  await app.seed({ state: st, profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0, uid: 'u8f3k2m9x1qz' }] } });
  const hoang = await copyLink(app, TODAY);
  await app.seed({ state: state(), profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] } });
  await fakeCamera(page, hoang);
  await app.click('qr-scan');
  await expect(app.sheet()).toContainText('Kết quả của Hoàng', { timeout: 15000 });
});

test('PT tải ảnh có QR (ảnh chụp màn hình) → mở xem trước', async ({ app, page }) => {
  const P = basicPlan();
  const { st } = hoangState(P);
  await app.seed({ state: st, profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0, uid: 'u8f3k2m9x1qz' }] } });
  await openShare(app, TODAY);
  const png = Buffer.from((await page.locator('#share-qr').evaluate(c => c.toDataURL('image/png'))).split(',')[1], 'base64');
  await app.seed({ state: state(), profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] } });
  await app.click('qr-scan');
  await page.setInputFiles('#img-in', { name: 'ket-qua.png', mimeType: 'image/png', buffer: png });
  await expect(app.sheet()).toContainText('Kết quả của Hoàng', { timeout: 15000 });
});

test('link hỏng hoặc không phải của app → báo “Không đọc được”, dữ liệu không đổi', async ({ app }) => {
  await app.seed({ state: state(), profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] } });
  await openLink(app, 'https://x.test/index.html#cs=abc');
  await expect(app.toast()).toContainText('Không đọc được');
  expect((await app.profiles()).coach).toBeFalsy();
});

/* ===== BR-23.6 khớp học viên không trùng uid: gộp vào học viên có sẵn ===== */
test('PT chưa có userid: gộp vào học viên có sẵn (hồ sơ đó nhận userid của link)', async ({ app }) => {
  const P = basicPlan();
  const { st } = hoangState(P);
  await app.seed({ state: st, profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0, uid: 'u8f3k2m9x1qz' }] } });
  const hoang = await copyLink(app, TODAY);
  await app.seed({
    profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Hoàng (Zalo)', color: 1 }] },
    states: { p1: state(), p2: state({ days: P.days }) },
  });
  await openLink(app, hoang);
  await app.click('share-into', '[data-id="p2"]');
  await app.click('share-apply');
  await expect(app.toast()).toContainText('Đã nhận');
  expect((await app.profiles()).list.find(p => p.id === 'p2').uid).toBe('u8f3k2m9x1qz');
  expect((await app.idb('kv', 'state:p2')).sessions).toHaveLength(1);
});

test('app đang mở sẵn: bấm link (đổi phần #) vẫn mở xem trước', async ({ app }) => {
  const P = basicPlan();
  await app.seed({ state: hoangState(P).st, profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0, uid: 'u8f3k2m9x1qz' }] } });
  const hoang = await copyLink(app, TODAY);
  await app.seed({ state: state(), profiles: { active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }] } });
  await app.page.evaluate(h => { location.hash = h; }, hashOf(hoang));
  await expect(app.sheet()).toContainText('Kết quả của Hoàng ngày 21/10');
  expect(await app.page.evaluate(() => location.hash)).toBe('');
});
