// BR-17 Báo cáo tháng: số buổi/set/tấn tạ so với tháng trước, bài lên tạ, kỷ lục, cơ thể, cảm giác các set; ảnh & Excel.
import { test, expect } from '../helpers/fixtures.mjs';
import { readFileSync } from 'node:fs';
import { state, basicPlan, session, addDays, TODAY } from '../helpers/data.mjs';

function month() {
  const P = basicPlan();
  const ss = [
    session(P.chest, '2026-09-20', [[P.bench, [[37.5, 10], [37.5, 10], [37.5, 10]]]]),
    session(P.chest, '2026-10-05', [[P.bench, [[40, 10, 'e'], [40, 10, 'm'], [40, 9, 'h']]], [P.fly, [[30, 10, 'f'], [20, 10, null, 1]]]]),
    session(P.chest, '2026-10-12', [[P.bench, [[42.5, 8, 'h'], [42.5, 8, 'h'], [42.5, 7, 'f']]]], { deload: false }),
    session(P.back, '2026-10-14', [[P.lat, [[45, 10]]]], { deload: true })
  ];
  ss[1].entries[0].note = 'Vai hơi mỏi, "ổn"';
  ss[1].entries[1].drop = { kg: 15, reps: 12 };
  const body = [{ id: 'b1', date: '2026-09-25', weight: 72, bodyFat: 20 }, { id: 'b2', date: '2026-10-15', weight: 71, bodyFat: 18.5, muscle: 33 }];
  return { P, st: state({ days: P.days, sessions: ss, body }) };
}

test('báo cáo tháng này: chỉ số, lên tạ, kỷ lục, cơ thể, cảm giác; chuyển tháng', async ({ app }) => {
  const { st } = month();
  await app.seed({ state: st });
  await app.tab('week');
  await app.click('report');
  await expect(app.sheet().locator('.sh-title')).toHaveText('Báo cáo tháng 10/2026');
  const k = app.sheet().locator('.kpi');
  await expect(k.nth(0)).toContainText('3');
  await expect(k.nth(0).locator('.delta')).toContainText('▲ 2');
  await expect(app.sheet()).toContainText('37,5 → 42,5 kg +5');
  await expect(app.sheet()).toContainText('Kỷ lục mới · 1RM ước tính');
  await expect(app.sheet()).toContainText('Cân nặng');
  await expect(app.sheet()).toContainText('72 → 71 kg −1');
  await expect(app.sheet()).toContainText('Cảm giác các set · 7 set có chấm');
  await expect(app.sheet()).toContainText('Dễ 14% · Vừa 14% · Sát 43% · Hỏng 29%');
  await expect(app.act('rep-m', '[data-d="1"]')).toBeDisabled();
  await app.click('rep-m', '[data-d="-1"]');
  await expect(app.sheet().locator('.sh-title')).toHaveText('Báo cáo tháng 9/2026');
  await expect(app.sheet()).toContainText('Chưa có bài lên tạ trong tháng');
  await app.click('rep-m', '[data-d="1"]');
  await expect(app.sheet().locator('.sh-title')).toHaveText('Báo cáo tháng 10/2026');
});

test('tạo ảnh báo cáo kèm lời nhắn HLV; xuất Excel (.csv) đúng cột, có BOM UTF-8', async ({ app, page }) => {
  const { st } = month();
  await app.seed({ state: st });
  await app.tab('week');
  await app.click('report');
  await page.fill('#rep-note', 'Tháng này lên tạ đều, tháng sau tập trung chân và ngủ đủ 7 tiếng mỗi đêm nhé.');
  await app.click('rep-img');
  await expect(app.sheet().locator('#rep-out img.repimg')).toHaveAttribute('src', /^data:image\/png;base64,/);
  const h = await app.sheet().locator('#rep-out img.repimg').evaluate(img => img.naturalHeight);
  expect(h).toBeGreaterThan(1200);
  const dl = page.waitForEvent('download');
  await app.click('rep-csv');
  const d = await dl;
  expect(d.suggestedFilename()).toBe('bao-cao-Tôi-10-2026.csv');
  const csv = readFileSync(await d.path(), 'utf8');
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  const rows = csv.slice(1).split('\r\n');
  expect(rows[0]).toBe('Ngày,Buổi,Bài tập,Nhóm cơ,Set,Kg,Rep,Loại,Cảm giác,Ghi chú');
  expect(rows[1]).toBe('2026-10-05,Ngực + Tay sau,Đẩy ngực tạ đòn (Bench press),Ngực,1,40,10,Set chính,Dễ,"Vai hơi mỏi, ""ổn"""');
  expect(rows).toContain('2026-10-05,Ngực + Tay sau,Ép ngực máy (Pec deck),Ngực,D1,20,10,Drop set,,');
  expect(rows).toContain('2026-10-05,Ngực + Tay sau,Ép ngực máy (Pec deck),Ngực,D,15,12,Drop set,,');
  expect(rows).toContain('2026-10-14,Lưng + Tay trước,Kéo xô (Lat pulldown),Lưng,1,45,10,Giảm tải,,');
});

test('lời khuyên theo cảm giác: nhiều set hỏng / phần lớn còn dễ', async ({ app }) => {
  const P = basicPlan();
  const mk = efs => state({ days: P.days, sessions: [session(P.chest, '2026-10-05', [[P.bench, efs.map(e => [40, 10, e])]])] });
  await app.seed({ state: mk(['f', 'f', 'm']) });
  await app.tab('week'); await app.click('report');
  await expect(app.sheet()).toContainText('Nhiều set hỏng rep');
  await app.seed({ state: mk(['e', 'e', 'm']) });
  await app.tab('week'); await app.click('report');
  await expect(app.sheet()).toContainText('Hơn nửa số set còn dễ');
  await app.seed({ state: mk(['m', 'h', 'h', 'e']) });
  await app.tab('week'); await app.click('report');
  await expect(app.sheet()).toContainText('Phần lớn set ở mức vừa đến sát giới hạn');
});

test('HLV mở báo cáo của học viên khác từ Phòng HLV', async ({ app }) => {
  const { st } = month();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'An', color: 0 }, { id: 'p2', name: 'Bình', color: 1 }], coach: { on: true, name: 'H' } }, states: { p1: state(), p2: st } });
  await app.tab('more');
  await app.view().locator('.tcard').nth(1).locator('[data-act="report"]').click();
  await expect(app.sheet()).toContainText('Bình · 01/10 – 31/10');
  await expect(app.sheet().locator('.kpi').first()).toContainText('3');
});
