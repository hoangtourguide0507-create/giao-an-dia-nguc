import subprocess, time
from playwright.sync_api import sync_playwright, Page
def ev(self, code, arg=None): return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
errs=[]
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); (None if c else errs.append(m))
srv = subprocess.Popen(['python3','-m','http.server','8792','-d','site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)
    c.add_init_script("Object.defineProperty(Notification,'permission',{get:()=>'granted'})"); pg = c.new_page()
    pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e)))
    pg.goto('http://localhost:8792/index.html'); pg.wait_for_timeout(1500)
    pg.ev("() => { const st = clone(state); st.days = [{ id: 'd1', name: 'A', exercises: [{ ...newEx('Squat'), alts: [], slot: '', mainSince: ymd() }] }]; loadState(st); save(); ui.tab = 'settings'; render(true); }"); pg.wait_for_timeout(300)
    def none(act):
        n = 0
        for tab in ['today', 'plan', 'week', 'body', 'settings']:
            pg.ev("(t) => { ui.tab = t; render(true); }", tab); pg.wait_for_timeout(150); n += pg.locator(f'[data-act="{act}"]').count()
        return n == 0
    for act in ['share', 'sync-open', 'sync-qr', 'sync-copy', 'plan-copy', 'plan-img']:
        ok(none(act), f'Đã bỏ nút gửi bằng QR / tin nhắn: {act}')
    pg.ev("() => { ui.tab = 'settings'; render(true); }"); pg.wait_for_timeout(200)
    ok('Phím tắt' not in pg.locator('#view').inner_text(), 'Đã bỏ thẻ Phím tắt iPhone')
    ok(pg.ev("() => alertMethod()") == 'push', 'Hết giờ nghỉ chỉ dùng thông báo của app')
    ok(pg.locator('.ncard #notify-t').count() == 1 and pg.locator('.ncard [data-act="notif-local-test"]').count() == 1, 'Thẻ Thông báo: bật báo hết giờ nghỉ không cần máy chủ')
    pg.locator('.ncard').screenshot(path='p19-notif.png')
    # dữ liệu cũ dùng Phím tắt → chuyển sang thông báo app
    ok(pg.ev("() => { const st = clone(state); st.settings.alertMethod = 'shortcut'; st.settings.notify = true; loadState(st); return [state.settings.alertMethod, state.settings.notify]; }") == ['push', True], 'Người đang dùng Phím tắt: tự chuyển sang thông báo app')
    # mã cũ bị từ chối, mã liên kết Drive vẫn nhận
    pg.ev("() => handleCodeText('GAP2.abcd.1.1.xyz')"); pg.wait_for_timeout(300)
    ok('kiểu gửi cũ' in pg.locator('#toast').inner_text() and pg.locator('.sheet:not([hidden])').count() == 0, 'Dán mã giáo án kiểu cũ: báo không còn dùng')
    code = pg.ev("() => 'GAL1.ab12.1.1.' + b64u(new TextEncoder().encode(JSON.stringify({ u: 'https://script.google.com/macros/s/X/exec', i: 'hv1', m: 'k'.repeat(24), n: 'Lan' })))")
    pg.ev("(c) => handleCodeText(c)", code); pg.wait_for_timeout(300)
    ok('Liên kết Google Drive' in pg.locator('#sheet-body').inner_text(), 'Mã liên kết Drive vẫn nhận bình thường')
    pg.ev("() => closeSheet()")
    # hết giờ nghỉ khi app chạy nền: hiện thông báo của máy
    shown = pg.ev("""async () => { const reg = await navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).catch(() => null); window.__shown = 0;
      const R = { showNotification: () => { window.__shown++; return Promise.resolve(); } }; navigator.serviceWorker.getRegistration = () => Promise.resolve(R);
      Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); state.settings.notify = true; pushSub = null; rest.pushed = false;
      startRest(1, 'Squat'); await new Promise(r => setTimeout(r, 1800)); return window.__shown; }""")
    ok(shown >= 1, f'Hết giờ nghỉ lúc app chạy nền: hiện thông báo (Notification API) ({shown})')
    b.close()
srv.terminate()
print('ERRS', errs)
