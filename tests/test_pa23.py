# PA-23: máy chủ thông báo gắn sẵn trong app, học viên không cần dán địa chỉ
import subprocess, time
from playwright.sync_api import sync_playwright, Page
def ev(self, code, arg=None): return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
errs = []
def ok(c, m): print(('PASS ' if c else 'FAIL ') + m); (None if c else errs.append(m))
SV = 'https://gadn-push.hoangtourguide0507.workers.dev'
srv = subprocess.Popen(['python3', '-m', 'http.server', '8793', '-d', 'site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        c = b.new_context(viewport={'width': 390, 'height': 844}, permissions=['notifications']); hits = []
        def proute(r): hits.append(r.request.url); r.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body='{"ok":true,"publicKey":"BAAA"}')
        c.route(SV + '/**', proute)
        pg = c.new_page(); pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        pg.goto('http://localhost:8793/index.html'); pg.wait_for_timeout(1500)
        ok(pg.ev("() => PUSH_SERVER") == SV, 'Có sẵn địa chỉ máy chủ thông báo')
        ok(pg.ev("() => pushBase()") == SV, 'Không dán gì vẫn dùng máy chủ mặc định')
        ok(pg.ev("() => (state.settings.pushServer = 'https://khac.example', pushBase())") == 'https://khac.example', 'Vẫn đổi được sang máy chủ khác nếu muốn')
        pg.ev("() => { state.settings.pushServer = ''; }")
        pg.ev("() => { ui.tab = 'more'; render(true); }"); pg.wait_for_timeout(200)
        h = pg.evaluate("() => { Object.defineProperty(Notification, 'permission', { get: () => 'granted' }); return window.__ev('(() => notifCardHtml(state.settings))')(); }") or ''; ok(SV in h, 'Ô máy chủ gợi ý đúng địa chỉ mặc định')
        b.close()
finally:
    srv.terminate()
print('XONG' if not errs else 'CÓ LỖI: ' + '; '.join(errs))
