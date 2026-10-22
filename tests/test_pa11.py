import subprocess, time
from playwright.sync_api import sync_playwright, Page
def ev(self, code, arg=None): return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
errs=[]
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); (None if c else errs.append(m))
srv = subprocess.Popen(['python3','-m','http.server','8787','-d','site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
    pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e)))
    pg.goto('http://localhost:8787/index.html'); pg.wait_for_timeout(1500)
    # dữ liệu cũ: bài cô lập lưu warmup:false (đúng như máy anh Hoàng)
    pg.ev("""() => { const names = ['Kéo xô tay thẳng (Straight-arm pulldown)','Kéo xô (Lat pulldown)','Chèo cáp ngồi (Seated cable row)','Chèo máy (Machine row)','Đẩy cáp tay sau (Triceps pushdown)','Cuốn tạ đơn (Dumbbell curl)'];
      const xs = names.map(newEx); xs.forEach(x => { x.warmup = x.type !== 'iso'; x.step = 5; x.currentKg = 55; });
      const st = clone(state); st.settings.warmAll = 0; st.settings.sets3 = 1; st.active = null;
      st.days = [{ id: 'dl', name: 'Lưng', exercises: xs.map(e => ({ ...e, alts: [], slot: '', mainSince: ymd() })) }]; loadState(st); save(); }""")
    ok(pg.ev("() => state.days[0].exercises.every(e => e.warmup)"), 'Dữ liệu cũ: mọi bài được bật khởi động (kể cả bài cô lập)')
    ok(pg.ev("() => newEx('Đá đùi (Leg extension)').warmup") == True, 'Bài cô lập thêm mới: mặc định có khởi động')
    pg.ev("() => { startSession('dl'); ui.tab = 'today'; render(); }"); pg.wait_for_timeout(500)
    kinds = pg.ev("() => state.active.entries.map((en, i) => warmKind(en, i))")
    print(kinds, pg.ev("() => state.active.entries.map(e => e.muscle)"))
    ok(kinds[0] == 'full', 'Bài 1 (Straight-arm, cô lập, đầu buổi): có set khởi động đủ bậc')
    h = pg.locator('article.ex.focus .warm').inner_text(); print(repr(h))
    ok('Set khởi động' in h and '30' in h or '25' in h, 'Hiện số kg theo nấc 5 kg')
    ws = pg.ev("() => warmSets(state.days[0].exercises[0], 55, 'full')"); print(ws)
    ok(all(w['kg'] % 5 == 0 for w in ws) and len(ws) == 2, 'Bài cô lập: 2 set khởi động, đúng nấc 5 kg')
    ok(all(k for k in kinds), f'Tất cả 6 bài đều có gợi ý: {kinds}')
    pg.locator('#exnav button').nth(1).click(); pg.wait_for_timeout(400)
    h2 = pg.locator('article.ex.focus .warm').inner_text(); print(repr(h2))
    ok('làm quen máy' in h2 and '35' in h2, 'Bài 2 cùng nhóm cơ: 1 set làm quen máy 35×8')
    pg.locator('article.ex.focus .warm').screenshot(path='p11-feel.png')
    pg.locator('#exnav button').nth(0).click(); pg.wait_for_timeout(400)
    pg.locator('article.ex.focus .warm').screenshot(path='p11-full.png')
    # tắt cho 1 bài → không hiện
    pg.ev("() => { state.days[0].exercises[2].warmup = false; state.active = null; startSession('dl'); render(); }"); pg.wait_for_timeout(300)
    ok(pg.ev("() => warmKind(state.active.entries[2], 2)") is None, 'Tắt khởi động ở 1 bài → bài đó không hiện')
    b.close()
srv.terminate()
print('ERRS', errs)
