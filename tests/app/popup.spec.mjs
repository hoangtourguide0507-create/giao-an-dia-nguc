// BR-27.1–27.4 Popup & chữ hiển thị: nút × đóng, kéo xuống để đóng, nút quay lại của trình duyệt, chọn được chữ.
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, session, addDays, TODAY } from '../helpers/data.mjs';

async function seedPlain(app) {
  const P = basicPlan();
  await app.seed({ state: state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -3), [[P.bench, [[40, 10]]]])], settings: { name: 'Minh Anh' } }) });
}

/* mở popup Đổi người tập (một popup bất kỳ đều dùng chung khung #sheet) */
async function openPopup(app) {
  await app.page.locator('.who').click();
  await expect(app.sheet()).toBeVisible();
}

test('BR-27.1 popup có nút × ở góc; bấm × thì popup đóng và trang nền còn nguyên', async ({ app, page }) => {
  await seedPlain(app);
  await app.tab('plan');
  await openPopup(app);
  await expect(page.locator('#sheet .sheet-x')).toBeVisible();
  await page.locator('#sheet .sheet-x').click();
  await expect(page.locator('#sheet')).toBeHidden();
  expect(await page.evaluate(() => window.__sota.ui.tab)).toBe('plan');
});

test('BR-27.2 kéo vạch đầu popup xuống quá 90px thì đóng; kéo ngắn thì popup còn mở', async ({ app, page }) => {
  await seedPlain(app);
  await openPopup(app);
  const drag = dy => page.evaluate(dy => {
    const g = document.querySelector('#sheet-body .grab');
    const t = y => new Touch({ identifier: 1, target: g, clientX: 150, clientY: y });
    g.dispatchEvent(new TouchEvent('touchstart', { touches: [t(300)], bubbles: true }));
    g.dispatchEvent(new TouchEvent('touchmove', { touches: [t(300 + dy)], bubbles: true }));
    g.dispatchEvent(new TouchEvent('touchend', { changedTouches: [t(300 + dy)], bubbles: true }));
  }, dy);
  await drag(30);
  await expect(page.locator('#sheet')).toBeVisible();
  await drag(140);
  await expect(page.locator('#sheet')).toBeHidden();
});

test('BR-27.3 nút quay lại của trình duyệt: đang mở popup thì đóng popup; không có popup thì về Trang chủ', async ({ app, page }) => {
  await seedPlain(app);
  await app.tab('plan');
  await openPopup(app);
  await page.goBack();
  await expect(page.locator('#sheet')).toBeHidden();
  /* không còn popup: quay lại lần nữa thì về Trang chủ (tab Lịch tập đang mở) */
  await app.tab('plan');
  await page.evaluate(() => history.pushState({}, ''));
  await page.goBack();
  expect(await page.evaluate(() => window.__sota.ui.tab)).toBe('home');
});

test('BR-27.4 chữ không sửa được không chọn được (nhấn đúp vào chữ không chọn được từ); ô nhập vẫn chọn được', async ({ app, page }) => {
  await seedPlain(app);
  await app.tab('more');
  const css = await page.evaluate(() => {
    const pick = s => { const el = document.querySelector(s); return el ? getComputedStyle(el).userSelect : 'missing'; };
    return { body: pick('body'), title: pick('#view h2, #view .h1'), btn: pick('#view .btn'), tab: pick('#nav-bar') };
  });
  expect(css).toEqual({ body: 'none', title: 'none', btn: 'none', tab: 'none' });
  await app.more('form');
  const title = app.view().locator('.subhead h2');
  await title.dblclick();
  expect(await page.evaluate(() => getSelection().toString())).toBe('');
  await app.more('height');
  const input = app.view().locator('input').first();
  await expect(input).toBeVisible();
  expect(await input.evaluate(el => getComputedStyle(el).userSelect)).toBe('text');
});
