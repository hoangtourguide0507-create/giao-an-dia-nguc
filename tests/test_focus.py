import subprocess, time
from playwright.sync_api import sync_playwright, Page
srv = subprocess.Popen(['python3','-m','http.server','8768','-d','site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
def ev(self, code, arg=None): return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
errs=[]
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); (None if c else errs.append(m))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
    pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e)))
    pg.goto('http://localhost:8768/index.html'); pg.wait_for_timeout(1500)
    pg.ev("""() => { const xs = ['Squat', 'Đẩy ngực dốc lên (Incline press)', 'Kéo xô (Lat pulldown)'].map(newEx); xs.forEach(x => { x.currentKg = 40; x.sets = 2; });
      state.days = [{ id: 'd1', name: 'Toàn thân', exercises: xs.map(e => ({ ...e, alts: [], slot: '', mainSince: ymd() })) }]; save(); startSession('d1'); ui.tab = 'today'; render(); }""")
    pg.wait_for_timeout(600)
    ok(pg.locator('[data-act="story"], .storybtn, #story').count()==0, 'Không còn nút/màn Story')
    ok(pg.locator('article.ex.focus').count()==1 and pg.locator('article.ex.next').count()==2, 'Bài 1 mở to, 2 bài sau thu nhỏ')
    ok(pg.locator('article.ex.focus .ex-hero').count()==1, 'Bài đang tập có ảnh lớn (hình minh hoạ)')
    ok(pg.locator('article.ex.focus .fcue').count()==1, 'Thẻ lưu ý form vẫn ở đầu bài đang tập')
    pg.screenshot(path='p1-start.png', full_page=False)
    # bấm xong 2 set của bài 1 → tự chuyển sang bài 2
    for k in range(2):
        pg.locator('article.ex.focus .sets [data-act="set-done"]').nth(k).click(); pg.wait_for_timeout(150)
    pg.ev("() => stopRest && stopRest()") if False else None
    pg.wait_for_timeout(600); pg.locator('article.ex.focus .nextex').click(); pg.wait_for_timeout(500)
    st = pg.ev("() => [...document.querySelectorAll('article.ex')].map(a => a.className.replace('ex ','').trim())")
    ok(st[0].startswith('done') and st[1].startswith('focus') and st[2].startswith('next'), f'Xong bài 1, bấm Sang bài 2: thu gọn bài 1, mở bài 2: {st}')
    ok('40×10 · 40×10' in pg.locator('article.ex.done .ms').inner_text(), 'Bài xong hiện tóm tắt: '+pg.locator('article.ex.done .ms').inner_text())
    pg.screenshot(path='p2-next.png')
    # bấm bài đã xong để sửa
    pg.locator('article.ex.done .ex-mini').click(); pg.wait_for_timeout(400)
    ok(pg.locator('article.ex').first.get_attribute('class').startswith('ex focus'), 'Bấm bài đã xong: mở lại để sửa')
    # nhảy tới bài 3
    pg.locator('article.ex').nth(2).locator('.ex-mini').click(); pg.wait_for_timeout(400)
    ok('focus' in pg.locator('article.ex').nth(2).get_attribute('class'), 'Bấm bài chưa tới: mở bài đó')
    # ảnh máy tự chụp hiện to, nhiều ảnh lướt được
    pg.ev("""async () => { const mk = c => { const v = document.createElement('canvas'); v.width = 300; v.height = 400; const g = v.getContext('2d'); g.fillStyle = c; g.fillRect(0,0,300,400); return v.toDataURL('image/jpeg', .8); };
      const ex = findEx(state.active.entries[2].exId); for (const c of ['#7a3', '#37a']) { const id = uid(); await DB.put('photos', id, mk(c)); photoCache.set(id, mk(c)); ex.photos.push(id); } save(); render(true); }""")
    pg.wait_for_timeout(500)
    ok(pg.locator('article.ex.focus .ex-hero .hdots i').count()==2, 'Ảnh máy tự chụp hiện to, có chấm chuyển ảnh')
    pg.locator('article.ex.focus [data-act="hero-ph"][data-d="1"]').click(); pg.wait_for_timeout(300)
    ok(pg.ev("() => ui.heroPh")==1, 'Chuyển sang ảnh 2')
    pg.screenshot(path='p3-photo.png')
    # khởi động, ghi chú, thêm set vẫn ở bài đang tập
    ok(pg.locator('article.ex.focus [data-act="add-set"]').count()==1 and pg.locator('article.ex.focus textarea.note').count()==1, 'Thêm set, ghi chú vẫn có ở bài đang tập')
    # kết thúc buổi: trạng thái reset
    pg.ev("() => { for (const en of state.active.entries) en.sets.forEach(x => { x.done = true; x.reps = x.reps || 10; x.kg = x.kg ?? 40; }); saveSession(); }"); pg.wait_for_timeout(400)
    ok(pg.ev("() => state.active === null && ui.focusEx === null"), 'Kết thúc buổi: xoá trạng thái bài đang mở')
    b.close()
srv.terminate()
print('\nLỖI:', errs if errs else 'không có')
