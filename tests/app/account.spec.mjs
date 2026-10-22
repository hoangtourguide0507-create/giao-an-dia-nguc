// BR-21 Tài khoản đăng nhập (HLV + học viên) và BR-22 Đồng bộ Google Drive — chạy với drive/Code.gs thật (tests/gas_server.js).
import { test, expect, GAS_URL_TEST } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, session, addDays, TODAY } from '../helpers/data.mjs';

async function hlvCreate(app, gas, { u = 'hoang', p = 'matkhau1', ten = 'Hoàng' } = {}) {
  await app.more('drive');
  await app.click('acc-hlv-new');
  await app.page.fill('#hn-sv', gas.url); await app.page.fill('#hn-key', gas.ma); await app.page.fill('#hn-ten', ten);
  await app.page.fill('#hn-u', u); await app.page.fill('#hn-p', p); await app.page.fill('#hn-p2', p);
  await app.click('acc-hlv-go');
}
async function login(app, gas, u, p) {
  await app.more('drive');
  await app.page.fill('#acc-u', u); await app.page.fill('#acc-p', p);
  const sv = app.page.locator('#acc-sv');
  if (await sv.count()) { if (!(await sv.isVisible())) await app.page.locator('.acc-sv summary').click(); await sv.fill(gas.url); }
  await app.click('acc-login');
}
const driveNow = async app => { await app.more('drive'); await app.click('drv-now'); };

test('HLV tạo tài khoản lần đầu: kiểm tra nhập liệu, đăng nhập, mọi hồ sơ trên máy lên Drive', async ({ app, gas }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] },
    states: { p1: state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -1), [[P.bench, [[40, 10]]]])] }), p2: state({ days: [day('Lưng', [ex('Kéo xô (Lat pulldown)', { muscle: 'Lưng' })])] }) } });
  await app.more('drive');
  await expect(app.view().locator('.acc')).toContainText('Đăng nhập');
  await app.click('acc-hlv-new');
  const f = (id, v) => app.page.fill(id, v);
  await app.click('acc-hlv-go');
  await expect(app.toast()).toHaveText('Link phải dạng https://script.google.com/macros/s/…/exec');
  await f('#hn-sv', gas.url); await app.click('acc-hlv-go');
  await expect(app.toast()).toHaveText('MÃ HLV chưa đúng');
  await f('#hn-key', gas.ma); await f('#hn-ten', ''); await app.click('acc-hlv-go');
  await expect(app.toast()).toHaveText('Nhập tên HLV');
  await f('#hn-ten', 'Hoàng'); await f('#hn-p', '123'); await app.click('acc-hlv-go');
  await expect(app.toast()).toHaveText('Mật khẩu cần ít nhất 6 ký tự');
  await f('#hn-p', 'matkhau1'); await f('#hn-p2', 'matkhau2'); await app.click('acc-hlv-go');
  await expect(app.toast()).toHaveText('Hai lần nhập mật khẩu chưa khớp');
  await f('#hn-p2', 'matkhau1'); await f('#hn-u', 'hoang'); await app.click('acc-hlv-go');
  await expect.poll(async () => (await app.state()).settings.acc).toMatchObject({ vai: 'hlv', u: 'hoang' });
  const st = await app.state();
  expect(st.settings.drvKey).toHaveLength(40); expect(st.settings.drvUrl).toBe(gas.url);
  expect((await app.profiles()).coach).toMatchObject({ on: true, name: 'Hoàng' });
  await expect.poll(async () => (await gas.post({ a: 'tv.ds', ma: gas.ma })).ds.map(t => t.ten).sort()).toEqual(['Hoàng', 'Lan']);
  await app.more('drive');
  await expect(app.view().locator('.acc')).toContainText('Tài khoản HLV');
  await expect(app.view().locator('.acc')).toContainText('Đang đăng nhập hoang');
});

test('HLV quản lý học viên: thêm, cấp tài khoản, đặt lại mật khẩu, khoá/mở khoá', async ({ app, gas }) => {
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] }, states: { p1: state(), p2: state() } });
  await hlvCreate(app, gas);
  await expect.poll(async () => (await app.state()).settings.acc?.u).toBe('hoang');
  await app.more('drive');
  await app.click('acc-tv');
  await expect(app.sheet()).toContainText('Quản lý học viên');
  await expect(app.sheet().locator('.acc-tv')).toHaveCount(2);
  await expect(app.sheet().locator('.acc-tv').first()).toContainText('(bạn)');
  const lan = (await gas.post({ a: 'tv.ds', ma: gas.ma })).ds.find(t => t.ten === 'Lan').id;
  await app.sheet().locator(`[data-act="acc-tv-set"][data-id="${lan}"]`).click();
  await expect(app.page.locator('#tv-u')).toHaveValue('lan');
  expect((await app.page.locator('#tv-p').inputValue())).toHaveLength(8);
  await app.page.fill('#tv-p', '123'); await app.click('acc-tv-set-go');
  await expect(app.toast()).toHaveText('Mật khẩu cần ít nhất 6 ký tự');
  await app.page.fill('#tv-p', 'lan12345'); await app.click('acc-tv-set-go');
  await expect(app.sheet()).toContainText('Tài khoản của Lan');
  await expect(app.sheet().locator('.acc-cred')).toContainText('lan12345');
  expect((await app.ui()).accCred).toContain('Tên đăng nhập: lan');
  expect((await gas.post({ a: 'dn', u: 'lan', mk: 'lan12345' })).ok).toBe(true);
  await app.click('acc-copy');
  await expect(app.toast()).toContainText('Đã sao chép mã');
  await app.sheet().locator('[data-act="acc-tv"]').click();
  /* thêm học viên mới: tên đăng nhập tự bỏ dấu */
  await app.click('acc-tv-add');
  await app.page.fill('#tv-ten', ''); await app.page.fill('#tv-p', 'minh1234'); await app.click('acc-tv-add-go');
  await expect(app.toast()).toHaveText('Nhập tên học viên');
  await app.page.fill('#tv-ten', 'Minh Đức');
  await expect(app.page.locator('#tv-u')).toHaveValue('minh.duc');
  await app.page.fill('#tv-p', '12'); await app.click('acc-tv-add-go');
  await expect(app.toast()).toHaveText('Mật khẩu cần ít nhất 6 ký tự');
  await app.page.fill('#tv-p', 'minh1234'); await app.click('acc-tv-add-go');
  await expect(app.sheet()).toContainText('Tài khoản của Minh Đức');
  expect((await app.profiles()).list.map(p => p.name)).toEqual(['Hoàng', 'Lan', 'Minh Đức']);
  await app.sheet().locator('[data-act="acc-tv"]').click();
  /* khoá rồi mở khoá */
  const lockBtn = app.sheet().locator(`[data-act="acc-tv-lock"][data-id="${lan}"]`);
  await lockBtn.click();
  await expect(app.sheet()).toContainText('Khoá tài khoản Lan?');
  await app.click('confirm-ok');
  await expect(app.toast()).toHaveText('Đã khoá Lan');
  expect((await gas.post({ a: 'dn', u: 'lan', mk: 'lan12345' })).ok).toBe(false);
  await app.sheet().locator(`[data-act="acc-tv-lock"][data-id="${lan}"]`).click();
  await expect(app.toast()).toHaveText('Đã mở khoá Lan');
  expect((await gas.post({ a: 'dn', u: 'lan', mk: 'lan12345' })).ok).toBe(true);
  /* đặt lại mật khẩu */
  await app.sheet().locator(`[data-act="acc-tv-set"][data-id="${lan}"]`).click();
  await expect(app.sheet()).toContainText('Đặt lại mật khẩu · Lan');
  await app.page.fill('#tv-p', 'datlai12'); await app.click('acc-tv-set-go');
  expect((await gas.post({ a: 'dn', u: 'lan', mk: 'datlai12' })).ok).toBe(true);
});

test('học viên đăng nhập: sai mật khẩu bị từ chối, đúng thì nhận giáo án HLV soạn; tập xong HLV tự nhận buổi', async ({ app, device, gas }) => {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] },
    states: { p1: state(), p2: state({ days: [day('Lưng', [ex('Kéo xô (Lat pulldown)', { muscle: 'Lưng', currentKg: 30 })])] }) } });
  await hlvCreate(app, gas);
  await expect.poll(async () => (await gas.post({ a: 'tv.ds', ma: gas.ma })).ds.length).toBe(2);
  const lan = (await gas.post({ a: 'tv.ds', ma: gas.ma })).ds.find(t => t.ten === 'Lan');
  await gas.post({ a: 'tv.tk', ma: gas.ma, id: lan.id, u: 'lan', mk: 'lan12345' });
  const hv = await device();
  await hv.goto();
  await login(hv, gas, 'lan', 'sai');
  await expect(hv.toast()).toContainText('Sai tên đăng nhập');
  expect((await hv.state()).settings.acc).toBeFalsy();
  await hv.page.fill('#acc-p', 'lan12345'); await hv.click('acc-login');
  await expect.poll(async () => (await hv.state()).settings.acc?.vai, { timeout: 15000 }).toBe('hv');
  await expect.poll(async () => (await hv.state()).days.map(d => d.name), { timeout: 15000 }).toEqual(['Lưng']);
  await hv.more('drive');
  await expect(hv.view().locator('.acc')).toContainText('Đang đăng nhập lan');
  await expect(hv.view().locator('.acc')).toContainText('HLV Hoàng');
  /* học viên tập 1 buổi rồi đồng bộ → máy HLV có buổi đó */
  await hv.tab('home');
  await hv.view().locator('.hero .tgo').click();
  await hv.view().locator('[data-act="set-done"][data-e="0"][data-s="0"]').click();
  await hv.view().locator('.sess-actions [data-act="finish"]').click(); await hv.click('save-session');
  await driveNow(hv);
  await driveNow(app);
  await expect.poll(async () => (await app.idb('kv', 'state:p2'))?.sessions?.length, { timeout: 15000 }).toBe(1);
  /* học viên tự đổi mật khẩu */
  await hv.more('drive');
  await hv.click('acc-pw');
  await hv.page.fill('#pw-cu', 'lan12345'); await hv.page.fill('#pw-moi', '12'); await hv.page.fill('#pw-moi2', '12'); await hv.click('acc-pw-go');
  await expect(hv.toast()).toHaveText('Mật khẩu mới cần ít nhất 6 ký tự');
  await hv.page.fill('#pw-moi', 'lanmoi99'); await hv.page.fill('#pw-moi2', 'khac'); await hv.click('acc-pw-go');
  await expect(hv.toast()).toHaveText('Hai lần nhập mật khẩu mới chưa khớp');
  await hv.page.fill('#pw-moi2', 'lanmoi99'); await hv.click('acc-pw-go');
  await expect(hv.toast()).toHaveText('Đã đổi mật khẩu');
  expect((await gas.post({ a: 'dn', u: 'lan', mk: 'lanmoi99' })).ok).toBe(true);
});

async function setupTeam(app, device, gas) {
  const P = basicPlan();
  await app.seed({ profiles: { active: 'p1', list: [{ id: 'p1', name: 'Hoàng', color: 0 }, { id: 'p2', name: 'Lan', color: 1 }] },
    states: { p1: state({ days: P.days, sessions: [session(P.chest, addDays(TODAY, -1), [[P.bench, [[40, 10]]]], { id: 'hs1' })] }), p2: state({ days: [day('Lưng', [ex('Kéo xô (Lat pulldown)', { muscle: 'Lưng', currentKg: 30 })])] }) } });
  await hlvCreate(app, gas);
  await expect.poll(async () => (await gas.post({ a: 'tv.ds', ma: gas.ma })).ds.length, { timeout: 15000 }).toBe(2);
  const lan = (await gas.post({ a: 'tv.ds', ma: gas.ma })).ds.find(t => t.ten === 'Lan');
  await gas.post({ a: 'tv.tk', ma: gas.ma, id: lan.id, u: 'lan', mk: 'lan12345' });
  return lan;
}

test('HLV đổi điện thoại: đăng nhập trên máy mới tự bật chế độ HLV, lấy lại mọi hồ sơ, bỏ hồ sơ trống mặc định', async ({ app, device, gas }) => {
  await setupTeam(app, device, gas);
  await app.flushed();
  await driveNow(app);
  await expect.poll(async () => (await gas.post({ a: 'keo', ma: gas.ma, id: (await gas.post({ a: 'tv.ds', ma: gas.ma })).ds.find(t => t.ten === 'Hoàng').id, biet: { hv: 0, hlv: 0 } })).hlv?.goi?.sessions?.length, { timeout: 15000 }).toBe(1);
  const m2 = await device();
  await m2.goto();
  await login(m2, gas, 'hoang', 'matkhau1');
  await expect.poll(async () => (await m2.profiles()).coach?.name, { timeout: 15000 }).toBe('Hoàng');
  await expect.poll(async () => (await m2.profiles()).list.map(p => p.name).sort(), { timeout: 15000 }).toEqual(['Hoàng', 'Lan']);
  await expect.poll(async () => (await m2.state()).sessions.map(s => s.id), { timeout: 20000 }).toEqual(['hs1']);
  const pr = await m2.profiles();
  expect(pr.list.find(p => p.id === pr.active).name).toBe('Hoàng');
  expect((await gas.post({ a: 'tv.ds', ma: gas.ma })).ds).toHaveLength(2);
});

test('phiên hết hạn khi HLV đặt lại mật khẩu: báo đăng nhập lại, giữ dữ liệu; khoá tài khoản thì ngừng đồng bộ; đăng xuất', async ({ app, device, gas }) => {
  const lan = await setupTeam(app, device, gas);
  const hv = await device();
  await hv.goto();
  await login(hv, gas, 'lan', 'lan12345');
  await expect.poll(async () => (await hv.state()).drv?.id, { timeout: 15000 }).toBe(lan.id);
  const n = (await hv.state()).sessions.length;
  await gas.post({ a: 'tv.tk', ma: gas.ma, id: lan.id, u: 'lan', mk: 'datlai12' });
  await driveNow(hv);
  await expect(hv.view().locator('.acc-warn')).toContainText('Phiên đăng nhập đã hết hạn');
  await hv.click('acc-relogin');
  await expect(hv.page.locator('#acc-u')).toHaveValue('lan');
  await hv.page.fill('#acc-p', 'datlai12'); await hv.click('acc-login');
  await expect.poll(async () => (await hv.state()).drv?.m?.length, { timeout: 15000 }).toBeGreaterThan(10);
  expect((await hv.state()).sessions).toHaveLength(n);
  expect((await hv.profiles()).list).toHaveLength(1);
  /* HLV khoá tài khoản */
  await gas.post({ a: 'tv.tat', ma: gas.ma, id: lan.id });
  await driveNow(hv);
  await expect(hv.view().locator('.acc .acc-warn, .acc .st.err')).toBeVisible({ timeout: 10000 });
  await gas.post({ a: 'tv.bat', ma: gas.ma, id: lan.id });
  /* đăng xuất: dữ liệu giữ nguyên, ngừng đồng bộ */
  await hv.more('drive');
  await hv.click('acc-out');
  await expect(hv.sheet()).toContainText('Đăng xuất?');
  await hv.click('confirm-ok');
  await expect(hv.toast()).toHaveText('Đã đăng xuất');
  const st = await hv.state();
  expect(st.drv).toBeUndefined(); expect(st.sessions).toHaveLength(n); expect(st.settings.acc).toEqual({ u: 'lan' });
});

test('máy đang bật chế độ HLV không đăng nhập nhầm tài khoản học viên; đang tập dở thì không đăng nhập', async ({ app, device, gas }) => {
  await setupTeam(app, device, gas);
  await app.more('drive');
  await app.click('acc-out');
  await app.click('confirm-ok');
  await expect(app.toast()).toHaveText('Đã đăng xuất');
  await app.toastGone();
  await login(app, gas, 'lan', 'lan12345');
  await expect(app.toast()).toContainText('Máy này đang bật chế độ HLV');
  expect((await app.state()).settings.acc?.vai).not.toBe('hv');
  /* học viên đang tập dở */
  const hv = await device();
  const P = basicPlan();
  await hv.seed({ state: state({ days: P.days, active: { id: 'a', dayId: P.chest.id, dayName: 'x', date: TODAY, startedAt: Date.now(), entries: [] } }) });
  await login(hv, gas, 'lan', 'lan12345');
  await expect(hv.toast()).toContainText('Kết thúc buổi tập đang dở rồi đăng nhập');
});

test('đăng nhập: thiếu tên/mật khẩu, link máy chủ sai; học viên đã có hồ sơ khác thì tạo hồ sơ mới cho tài khoản', async ({ app, device, gas }) => {
  const lan = await setupTeam(app, device, gas);
  const hv = await device();
  const P = basicPlan();
  await hv.seed({ state: state({ days: P.days, drv: { id: 'khac', m: 'm'.repeat(30), u: gas.url } }) });
  await hv.more('drive');
  await hv.click('acc-login');
  await expect(hv.toast()).toHaveText('Nhập tên đăng nhập và mật khẩu');
  await hv.page.fill('#acc-u', 'lan'); await hv.page.fill('#acc-p', 'lan12345');
  if (!(await hv.page.locator('#acc-sv').isVisible())) await hv.page.locator('.acc-sv summary').click();
  await hv.page.fill('#acc-sv', 'http://sai');
  await hv.click('acc-login');
  await expect(hv.toast()).toHaveText('Link máy chủ phải dạng https://script.google.com/macros/s/…/exec');
});
