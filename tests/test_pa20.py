import subprocess, time
from playwright.sync_api import sync_playwright, Page
def ev(self, code, arg=None): return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
errs=[]
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); (None if c else errs.append(m))
srv = subprocess.Popen(['python3','-m','http.server','8793','-d','site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
    pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e)))
    pg.goto('http://localhost:8793/index.html'); pg.wait_for_timeout(1500)
    pg.ev("""() => { const xs = ['Squat', 'Kéo xô (Lat pulldown)', 'Đẩy vai máy (Machine shoulder press)'].map(newEx); xs.forEach(x => { x.currentKg = 40; });
      const st = clone(state); st.days = [{ id: 'd1', name: 'Toàn thân', exercises: xs.map(e => ({ ...e, alts: [], slot: '', mainSince: ymd() })) }];
      const t = Date.now() - 864e5 * 3; st.sessions = [{ id: 's0', dayId: 'd1', dayName: 'Toàn thân', date: ymd(new Date(t)), startedAt: t, finishedAt: t + 3e6, entries: xs.map(x => ({ exId: x.id, name: x.name, muscle: x.muscle, note: '', each: false, sets: [{ kg: 40, reps: 10 }], drop: null })) }];
      st.pains = [{ id: 'pp', area: 'Vai', level: 1, since: ymd(), note: '', resolvedAt: null }];
      loadState(st); save(); ui.tab = 'today'; render(true); }""")
    pg.wait_for_timeout(900)
    ok(pg.locator('.hero.tix').count() == 1, 'Trang chủ: thẻ buổi tập dạng vé vàng')
    ok(pg.locator('.hero.tix .tstar').count() == 7, 'Sao lấp lánh trên thẻ vé (7 sao)')
    ok(pg.locator('.banner.pain.beam').count() == 1, 'Cảnh báo đau: viền ánh sáng chạy (đỏ)')
    a1 = pg.ev("() => getComputedStyle(document.querySelector('.banner.pain.beam'), '::before').animationName"); ok(a1 == 'beamspin', f'Viền chạy có hoạt ảnh ({a1})')
    pg.screenshot(path='p20-home.png', full_page=False)
    pg.ev("() => { startSession('d1'); ui.tab = 'today'; render(true); }"); pg.wait_for_timeout(700)
    ok(pg.locator('article.ex.focus.beam').count() == 1, 'Bài đang tập: viền ánh sáng chạy (vàng)')
    ok(pg.locator('.sbar .livedot').count() == 1, 'Thanh đang tập: chấm đỏ nhịp')
    ok(pg.locator('#elapsed.shine').count() == 1 and pg.ev("() => getComputedStyle(document.querySelector('#elapsed')).animationName") == 'shine', 'Đồng hồ buổi tập: dải sáng lướt qua chữ số')
    ok(pg.ev("() => getComputedStyle(document.querySelector('.nav button[aria-current=\"page\"]:not(.fab)') || document.querySelector('.nav .fab'), '::before').content") is not None, 'Tab đang mở có vạch sáng')
    pg.screenshot(path='p20-session.png')
    # tắt hiệu ứng: không còn hoạt ảnh, không tạo sao
    pg.ev("() => { state.settings.animOff = true; applySkin(state.settings.skin); discardSession(); ui.tab = 'today'; render(true); }"); pg.wait_for_timeout(500)
    ok(pg.locator('.hero.tix .tstar').count() == 0, 'Tắt hiệu ứng: không có sao')
    ok(pg.ev("() => getComputedStyle(document.querySelector('.banner.pain.beam'), '::before').animationName") == 'none', 'Tắt hiệu ứng: viền đứng yên')
    pg.ev("() => { state.settings.animOff = false; applySkin(state.settings.skin); render(true); }"); pg.wait_for_timeout(500)
    for sk in ['amber', 'gold']:
        pg.ev("(k) => { state.settings.skin = k; applySkin(k); render(true); }", sk); pg.wait_for_timeout(1200)
        pg.locator('.hero.tix').screenshot(path=f'p20-tix-{sk}.png')
    b.close()
srv.terminate()
print('ERRS', errs)
