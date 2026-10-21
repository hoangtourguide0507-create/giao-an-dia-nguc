import subprocess, time
from playwright.sync_api import sync_playwright, Page
def ev(self, code, arg=None): return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
errs=[]
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); (None if c else errs.append(m))
srv = subprocess.Popen(['python3','-m','http.server','8786','-d','site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
    pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e)))
    pg.goto('http://localhost:8786/index.html'); pg.wait_for_timeout(1500)
    # 1. nền tĩnh, hiệu ứng lấp lánh tắt
    for sk in ['gold','hell','ice','oled']:
        pg.ev("(k) => { state.settings.skin = k; applySkin(k); render(true); }", sk); pg.wait_for_timeout(300)
        ok(pg.ev("() => [FX.on, getComputedStyle($('#fx-back')).display]") == [False, 'none'], f'Giao diện {sk}: nền tĩnh')
    pg.ev("() => { state.settings.skin = 'gold'; applySkin('gold'); }")
    ok(pg.ev("() => Object.keys(FX_LV).join(',')") == 'full,off', 'Cài đặt hiệu ứng: Bật / Tắt')
    # 2. 3 set cho tất cả (kể cả bài cũ 4–5 set) và hồ sơ khác
    pg.ev("""() => { const a = newEx('Squat'); a.sets = 5; const b2 = newEx('Kéo xô (Lat pulldown)'); b2.sets = 4; b2.alts = [Object.assign(newEx('Chèo tạ đơn'), { sets: 2 })];
      const st = clone(state); st.settings.sets3 = 0; st.days = [{ id: 'd1', name: 'A', exercises: [a, b2].map(e => ({ ...e, alts: e.alts || [], slot: '', mainSince: ymd() })) }]; loadState(st); save(); }""")
    ok(pg.ev("() => state.days[0].exercises.flatMap(e => [e.sets, ...e.alts.map(x => x.sets)])") == [3,3,3], 'Bài cũ 5/4/2 set → đều 3 set')
    ok(pg.ev("() => normState({ days: [{ name: 'x', exercises: [{ ...newEx('Squat'), sets: 6, alts: [] }] }], settings: {} }).days[0].exercises[0].sets") == 3, 'Hồ sơ học viên khác cũng về 3 set')
    pg.ev("() => { state.weekPlans = state.weekPlans || {}; }")
    ok(pg.ev("() => { state.settings.cycleStart = null; return makeEntry(state.days[0].exercises[0]).sets.length; }") == 3, 'Buổi tập tạo ra đúng 3 set')
    # 3. tăng tạ theo nấc máy, không tự điền
    pg.ev("""() => { closeSheet(); const ex = newEx('Đạp đùi (Leg press)'); ex.step = 10; ex.sets = 3; ex.repTarget = 10; ex.repMin = 8; ex.repMax = 12; state.settings.sets3 = 1;
      state.days = [{ id: 'd2', name: 'Chân', exercises: [{ ...ex, alts: [], slot: '', mainSince: ymd() }] }];
      const t = Date.parse('2026-10-12T10:00:00'); state.sessions = [{ id: 'p1', dayId: 'd2', dayName: 'Chân', date: '2026-10-12', startedAt: t, finishedAt: t + 3600e3, entries: [{ exId: ex.id, name: ex.name, muscle: ex.muscle, note: '', each: false, sets: [{ kg: 80, reps: 10 }, { kg: 80, reps: 10 }, { kg: 80, reps: 10 }], drop: null }] }];
      save(); startSession('d2'); ui.tab = 'today'; render(); }""")
    pg.wait_for_timeout(500)
    sg = pg.ev("() => suggest(state.days[0].exercises[0])")
    ok(sg['kind'] == 'up' and sg['kg'] == 90, f"Máy nấc 10 kg, đạt đủ 3×10 ở 80: gợi ý đúng 1 nấc → {sg['kg']} kg")
    ok(pg.ev("() => state.active.entries[0].sets.map(s => s.kg)") == [80,80,80], 'Set được điền mức tạ lần trước (80), không tự điền mức tăng')
    chip = pg.locator('article.ex.focus .sugchip').inner_text()
    ok('90' in chip and '+10' in chip, f'Gợi ý hiện 1 dòng nhỏ: "{chip}"')
    ok(pg.locator('article.ex.focus .sug, article.ex.focus .badge').count() == 0, 'Bỏ đoạn giải thích dài và nhãn huy hiệu')
    pg.locator('article.ex.focus .target').screenshot(path='p10-target.png')
    for step, base, want in [(5, 40, 45), (2.5, 40, 42.5), (2, 12, 14)]:
        g = pg.ev("(o) => { const ex = { ...state.days[0].exercises[0], step: o.step }; return incFor(ex, o.base); }", {'step':step,'base':base})
        ok(g == step, f'Nấc {step} kg: mỗi lần tăng đúng {step} kg')
    # 4. thanh bài tập + không tự nhảy bài
    pg.ev("""() => { closeSheet(); state.active = null; const xs = ['Squat', 'Kéo xô (Lat pulldown)', 'Đẩy ngực dốc lên (Incline press)'].map(newEx); xs.forEach(x => { x.currentKg = 40; x.sets = 3; });
      state.days = [{ id: 'd3', name: 'Toàn thân', exercises: xs.map(e => ({ ...e, alts: [], slot: '', mainSince: ymd() })) }]; save(); startSession('d3'); ui.tab = 'today'; render(); }""")
    pg.wait_for_timeout(400)
    ok(pg.locator('#exnav button').count() == 3 and 'cur' in pg.locator('#exnav button').first.get_attribute('class'), 'Thanh số bài ở đầu: 3 bài, bài 1 đang mở')
    for k in range(3): pg.locator(f'article.ex.focus [data-act="set-done"][data-s="{k}"]').click(); pg.wait_for_timeout(150)
    pg.wait_for_timeout(1500)
    st = pg.ev("() => [...document.querySelectorAll('article.ex')].map(a => a.className)")
    ok('focus' in st[0], f'Xong bài 1: KHÔNG tự nhảy bài, bài 1 vẫn mở {st}')
    ok(pg.locator('article.ex.focus .stamp').count() == 1 and 'XONG' in pg.locator('article.ex.focus .donebar').inner_text(), 'Đóng dấu XONG + kết quả từng set')
    nb = pg.locator('article.ex.focus .nextex'); ok(nb.count() == 1 and 'Sang bài 2' in nb.inner_text(), f'Nút "{nb.inner_text()}"')
    ok(pg.ev("() => [...document.querySelectorAll('#exnav button')].map(b => b.textContent)") == ['✓1','2','3'], 'Thanh số bài: bài 1 có dấu ✓')
    pg.screenshot(path='p10-done.png')
    nb.click(); pg.wait_for_timeout(500)
    st = pg.ev("() => [...document.querySelectorAll('article.ex')].map(a => a.className)")
    ok('done' in st[0] and 'focus' in st[1], 'Bấm nút: sang bài 2')
    ms = pg.locator('article.ex.done .ms').first.inner_text()
    ok('40×10 · 40×10 · 40×10' in ms, f'Bài đã xong hiện rõ từng set: "{ms}"')
    pg.locator('#exnav button').nth(0).click(); pg.wait_for_timeout(400)
    ok('focus' in pg.locator('article.ex').nth(0).get_attribute('class'), 'Chạm số 1 trên thanh: quay lại bài 1')
    pg.ev("() => window.scrollTo(0, 0)"); pg.wait_for_timeout(200); pg.screenshot(path='p10-nav.png')
    # 5. hiệu ứng mạnh: dải KỶ LỤC, chớp viền
    pg.ev("() => prSlam([{ name: 'Squat', best: 100 }])"); pg.wait_for_timeout(350)
    ok(pg.locator('.slam').count() == 1 and pg.ev("() => document.body.classList.contains('quake')"), 'Phá kỷ lục: dải KỶ LỤC MỚI + rung màn hình')
    pg.screenshot(path='p10-slam.png'); pg.wait_for_timeout(2300)
    pg.ev("() => { startRest(1, 'x'); }"); pg.wait_for_timeout(1500)
    ok(pg.ev("() => document.body.classList.contains('restflash')"), 'Hết giờ nghỉ: viền màn hình chớp')
    ok(pg.ev("() => [typeof confetti, document.querySelectorAll('.burst,.medal,.confetti').length]") == ['function', 0], 'Không còn pháo giấy, hạt bung, huy chương')
    b.close()
srv.terminate()
print('\nLỖI:', errs if errs else 'không có')
