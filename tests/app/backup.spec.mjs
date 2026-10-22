// BR-15 Sao lưu & khôi phục: file cả máy, file của 1 người, khôi phục thay / thêm hồ sơ, hoàn tác.
import { test, expect } from '../helpers/fixtures.mjs';
import { readFileSync } from 'node:fs';
import { state, basicPlan, session, addDays, TODAY, PHOTO } from '../helpers/data.mjs';

async function download(app, page, act = 'backup-save') {
  const dl = page.waitForEvent('download');
  await app.click(act);
  const d = await dl;
  return { name: d.suggestedFilename(), json: JSON.parse(readFileSync(await d.path(), 'utf8')) };
}
const twoProfiles = () => ({ active: 'p1', list: [{ id: 'p1', name: 'Tôi', color: 0 }, { id: 'p2', name: 'Vợ', color: 1 }] });

test('1 người: tải file sao lưu gồm giáo án, buổi tập, ảnh; ghi nhận lần sao lưu', async ({ app, page }) => {
  const P = basicPlan();
  P.bench.photos = ['ph1'];
  await app.seed({ state: state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -1), [[P.bench, [[40, 10]]]])], bodyPhotos: [{ id: 'bp', date: TODAY, t: 1, pose: 'Trước', photoId: 'ph2' }] }), photos: { ph1: PHOTO, ph2: PHOTO } });
  await app.more('backup');
  await app.click('backup');
  await expect(app.sheet()).toContainText('1 người tập · 1 buổi tập · 2 ảnh');
  const f = await download(app, page);
  expect(f.name).toBe(`giao-an-dia-nguc-sao-luu-${TODAY}.json`);
  expect(f.json).toMatchObject({ app: 'so-ta', v: 3, profiles: { active: 'p1' } });
  expect(Object.keys(f.json.photos).sort()).toEqual(['ph1', 'ph2']);
  expect(f.json.states.p1.sessions).toHaveLength(1);
  const st = await app.state();
  expect(st.settings.lastBackupSess).toBe(1);
  expect(st.settings.lastBackupAt).toBeGreaterThan(0);
});

test('nhiều người: chọn tải file của 1 người hoặc cả máy; file thiếu ảnh thì báo', async ({ app, page }) => {
  const P = basicPlan();
  P.bench.photos = ['mat'];
  const Q = basicPlan();
  await app.seed({ profiles: twoProfiles(), states: { p1: state({ days: P.days }), p2: state({ days: Q.days.slice(0, 1), sessions: [session(Q.chest, TODAY, [[Q.bench, [[30, 10]]]])] }) } });
  await app.more('backup');
  await app.click('backup');
  await expect(app.sheet()).toContainText('Tải file của ai?');
  await app.sheet().locator('[data-act="backup-one"][data-id="p2"]').click();
  await expect(app.sheet()).toContainText('File của Vợ đã sẵn sàng');
  const f = await download(app, page);
  expect(f.name).toBe(`giao-an-dia-nguc-vo-${TODAY}.json`);
  expect(f.json).toMatchObject({ app: 'so-ta', one: true, person: { id: 'p2', name: 'Vợ' } });
  expect(f.json.state.sessions).toHaveLength(1);
  await app.click('backup');
  await app.click('backup-all');
  await expect(app.sheet()).toContainText('thiếu 1 ảnh không còn trên máy');
});

test('khôi phục file cả máy: thay toàn bộ người tập và ảnh', async ({ app, page }) => {
  const P = basicPlan();
  P.bench.photos = ['ph1'];
  const file = { app: 'so-ta', v: 3, exportedAt: '2026-10-01T00:00:00Z', profiles: twoProfiles(), states: { p1: state({ days: P.days }), p2: state({ days: [] }) }, state: state(), photos: { ph1: PHOTO } };
  await app.seed({ state: state({ days: [], bodyPhotos: [{ id: 'b', date: TODAY, t: 1, pose: 'Trước', photoId: 'cu' }] }), photos: { cu: PHOTO } });
  await app.more('backup');
  await page.setInputFiles('#restore-file', { name: 'sl.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  await expect(app.sheet()).toContainText('2 người tập (Tôi, Vợ)');
  await app.click('confirm-ok');
  await expect(app.toast()).toHaveText('Đã khôi phục dữ liệu và 1 ảnh');
  expect((await app.profiles()).list.map(p => p.name)).toEqual(['Tôi', 'Vợ']);
  expect((await app.state()).days).toHaveLength(2);
  expect(await app.idb('photos', 'cu')).toBeUndefined();
});

test('khôi phục file kiểu cũ (1 trạng thái) và file thiếu ảnh', async ({ app, page }) => {
  const P = basicPlan();
  P.bench.photos = ['khong-co'];
  const file = { app: 'so-ta', v: 2, state: state({ days: P.days, sessions: [session(P.chest, TODAY, [[P.bench, [[40, 10]]]])] }), photos: {} };
  await app.goto();
  await app.more('backup');
  await page.setInputFiles('#restore-file', { name: 'cu.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  await expect(app.sheet()).toContainText('2 ngày tập và 1 buổi đã tập');
  await app.click('confirm-ok');
  await expect(app.toast()).toHaveText('Đã khôi phục dữ liệu · 0/1 ảnh (file thiếu 1 ảnh)');
  expect((await app.state()).sessions).toHaveLength(1);
});

test('file của 1 người: thêm thành hồ sơ mới, hoặc thay hồ sơ có sẵn (có hoàn tác)', async ({ app, page }) => {
  const P = basicPlan();
  const one = { app: 'so-ta', v: 3, one: true, exportedAt: '2026-10-10T00:00:00Z', person: { id: 'p2', name: 'Vợ', color: 1 }, state: state({ days: P.days, active: { id: 'x' } }), photos: { ph9: PHOTO, bad: 'javascript:alert(1)' } };
  await app.seed({ profiles: twoProfiles(), states: { p1: state(), p2: state({ days: [] }) } });
  await app.more('backup');
  const buf = Buffer.from(JSON.stringify(one));
  await page.setInputFiles('#restore-file', { name: 'vo.json', mimeType: 'application/json', buffer: buf });
  await expect(app.sheet()).toContainText('File của Vợ');
  await expect(app.sheet().locator('[data-act="restore-one-into"][data-id="p2"]')).toContainText('Trùng tên');
  await app.click('restore-one-new');
  await expect(app.toast()).toContainText('Đã thêm hồ sơ Vợ');
  let pr = await app.profiles();
  expect(pr.list).toHaveLength(3);
  expect(pr.list[2].id).not.toBe('p2');
  expect(await app.idb('photos', 'ph9')).toBe(PHOTO);
  expect(await app.idb('photos', 'bad')).toBeUndefined();
  /* thay hồ sơ đang xem */
  await page.setInputFiles('#restore-file', { name: 'vo.json', mimeType: 'application/json', buffer: buf });
  await app.sheet().locator('[data-act="restore-one-into"][data-id="p1"]').click();
  await expect(app.sheet()).toContainText('Thay dữ liệu của Tôi?');
  await app.click('confirm-ok');
  await expect(app.toast()).toContainText('Đã thay dữ liệu của Tôi');
  expect((await app.state()).days).toHaveLength(2);
  expect((await app.state()).active).toBeNull();
  await app.toast().locator('[data-act="sync-undo"]').click();
  await expect(app.toast()).toHaveText('Đã hoàn tác lần đồng bộ');
  expect((await app.state()).days).toHaveLength(0);
  /* thay hồ sơ khác (không đang xem) */
  await page.setInputFiles('#restore-file', { name: 'vo.json', mimeType: 'application/json', buffer: buf });
  await app.sheet().locator('[data-act="restore-one-into"][data-id="p2"]').click();
  await app.click('confirm-ok');
  await expect(app.toast()).toContainText('Đã thay dữ liệu của Vợ');
  await app.flushed();
  expect((await app.idb('kv', 'state:p2')).days).toHaveLength(2);
  /* hoàn tác khi không còn gì */
  await app.toast().locator('[data-act="sync-undo"]').click();
  await app.toastGone();
  await page.evaluate(() => { const b = document.createElement('button'); b.dataset.act = 'sync-undo'; document.body.appendChild(b); b.click(); });
  await expect(app.toast()).toHaveText('Không còn gì để hoàn tác');
});

test('file không phải sao lưu của app thì báo lỗi', async ({ app, page }) => {
  await app.goto();
  await app.more('backup');
  await page.setInputFiles('#restore-file', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await expect(app.toast()).toHaveText('File không phải bản sao lưu của Giáo Án Địa Ngục');
  await page.setInputFiles('#restore-file', { name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('không phải json') });
  await expect(app.toast()).toHaveText('File không phải bản sao lưu của Giáo Án Địa Ngục');
});

test('lưu file sao lưu qua bảng chia sẻ của điện thoại (Lưu vào Tệp / iCloud)', async ({ app, page }) => {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days }) });
  await page.evaluate(() => { window.__shared = []; navigator.canShare = () => true; navigator.share = async d => { window.__shared.push(d.files.map(f => f.name)); }; });
  await app.more('backup');
  await app.click('backup');
  await app.click('backup-save');
  await expect(app.toast()).toHaveText('Đã lưu file sao lưu');
  expect(await page.evaluate(() => window.__shared)).toEqual([[`giao-an-dia-nguc-sao-luu-${TODAY}.json`]]);
});
