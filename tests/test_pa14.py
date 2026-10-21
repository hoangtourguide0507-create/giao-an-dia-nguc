import subprocess, time, base64
from playwright.sync_api import sync_playwright, Page
def ev(self, code, arg=None): return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
errs=[]
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); (None if c else errs.append(m))
srv = subprocess.Popen(['python3','-m','http.server','8789','-d','site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
    pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e)))
    pg.goto('http://localhost:8789/index.html'); pg.wait_for_timeout(1500)
    pg.ev("""() => { const xs = ['Kéo xô (Lat pulldown)', 'Chèo máy (Machine row)', 'Đạp đùi (Leg press)'].map(newEx); xs.forEach(x => { x.step = 5; });
      const st = clone(state); st.settings.sets3 = 1; st.settings.warmAll = 1; st.active = null; st.settings.pace = 'std';
      st.days = [{ id: 'dl', name: 'A', exercises: xs.map(e => ({ ...e, alts: [], slot: '', mainSince: ymd() })) }];
      const mk = (id, date, kgs) => { const t = Date.parse(date + 'T10:00:00'); return { id, dayId: 'dl', dayName: 'A', date, startedAt: t, finishedAt: t + 3600e3, entries: xs.map((x, k) => ({ exId: x.id, name: x.name, muscle: x.muscle, note: k === 0 ? 'vai hơi mỏi' : '', each: false, sets: [0,1,2].map(() => ({ kg: kgs[k], reps: 10 })), drop: null })) }; };
      const today = ymd(), d = parseYmd(today), m0 = ymd(new Date(d.getFullYear(), d.getMonth(), 1)), pm = ymd(new Date(d.getFullYear(), d.getMonth() - 1, 20));
      st.sessions = [mk('s1', pm, [50, 40, 100]), mk('s2', m0, [55, 40, 110]), mk('s3', addDays(m0, 3), [60, 45, 110])];
      st.body = [{ id: 'b1', date: pm, weight: 72.4, bodyFat: 18 }, { id: 'b2', date: addDays(m0, 2), weight: 71.2, bodyFat: 17.2 }];
      loadState(st); save(); startSession('dl'); ui.tab = 'today'; render(); }""")
    pg.wait_for_timeout(500)
    ok(pg.locator('article.ex.focus .eff').count() == 0, 'Chưa bấm ✓: chưa hiện chip cảm giác')
    pg.locator('article.ex.focus [data-act="set-done"][data-s="0"]').click(); pg.wait_for_timeout(200)
    chips = pg.locator('#row-0-0 .eff button').all_inner_texts(); ok(chips == ['Dễ','Vừa','Sát','Hỏng'], f'Bấm ✓: hiện 4 chip {chips}')
    pg.locator('#row-0-0 .eff [data-v="m"]').click(); pg.wait_for_timeout(100)
    for k, v in [(1,'h'),(2,'f')]:
        pg.locator(f'article.ex.focus [data-act="set-done"][data-s="{k}"]').click(); pg.wait_for_timeout(150); pg.locator(f'#row-0-{k} .eff [data-v="{v}"]').click(); pg.wait_for_timeout(100)
    ok(pg.ev("() => state.active.entries[0].sets.map(s => s.ef)") == ['m','h','f'], 'Lưu cảm giác từng set')
    pg.locator('article.ex[data-i="0"]').screenshot(path='p13-eff.png')
    pg.locator('#row-0-2 .eff [data-v="f"]').click(); pg.wait_for_timeout(100)
    ok(pg.ev("() => state.active.entries[0].sets[2].ef") is None, 'Bấm lại chip đang chọn: bỏ chọn')
    pg.locator('#row-0-2 .eff [data-v="f"]').click(); pg.wait_for_timeout(100)
    pg.locator('article.ex[data-i="0"] [data-act="set-done"][data-s="1"]').click(); pg.wait_for_timeout(100)
    ok(pg.locator('#row-0-1 .eff').count() == 0 and pg.ev("() => state.active.entries[0].sets[1].ef") is None, 'Bỏ ✓: chip ẩn, xoá cảm giác')
    pg.locator('article.ex[data-i="0"] [data-act="set-done"][data-s="1"]').click(); pg.wait_for_timeout(100); pg.locator('#row-0-1 .eff [data-v="h"]').click()
    # bài 2: đủ rep, toàn dễ
    pg.ev("() => { ui.focusEx = state.active.entries[1].exId; render(true); }")
    for k in range(3): pg.locator(f'article.ex.focus [data-act="set-done"][data-s="{k}"]').click(); pg.wait_for_timeout(120); pg.locator(f'#row-1-{k} .eff [data-v="e"]').click()
    pg.ev("() => saveSession()"); pg.wait_for_timeout(300)
    last = pg.ev("() => state.sessions[state.sessions.length - 1].entries[0].sets.map(s => s.ef)"); ok(last == ['m','h','f'], f'Buổi đã lưu giữ cảm giác {last}')
    sg0 = pg.ev("() => { const ex = state.days[0].exercises[0]; const g = suggestLinear(ex, workHistory(ex), 60); return [g.kind, g.failHold]; }")
    ok(sg0 == ['hold', True], f'Đủ 3×10 nhưng có set hỏng → giữ mức: {sg0}')
    pg.ev("() => { state.settings.pace = 'slow'; }")
    sg1 = pg.ev("() => { const ex = state.days[0].exercises[1]; return suggestLinear(ex, workHistory(ex), 45).kind; }")
    sg2 = pg.ev("() => { const ex = state.days[0].exercises[2]; return suggestLinear(ex, workHistory(ex), 110).kind; }")
    ok(sg1 in ('up','almost') and sg1 != sg2 or sg1 == 'up', f'Tốc độ Thận trọng: toàn set dễ → không phải chờ buổi 2 ({sg1}) vs không chấm ({sg2})')
    sl = pg.ev("""() => { const ex = state.days[0].exercises[1]; const mk = (d, ef) => ({ date: d, t: Date.parse(d), sets: [0,1,2].map(() => ({ kg: 50, reps: 10, ...(ef ? { ef } : {}) })) }); const old = { date: '2026-09-01', t: 1, sets: [{ kg: 45, reps: 10 }] };
      return [suggestLinear(ex, [mk('2026-10-01', 'e'), old], 50).kind, suggestLinear(ex, [mk('2026-10-01', null), old], 50).kind]; }""")
    ok(sl == ['up', 'almost'], f'Thận trọng: set đều dễ → lên ngay; không chấm → chờ thêm 1 buổi {sl}')
    pg.ev("() => { state.settings.pace = 'std'; startSession('dl'); render(true); }"); pg.wait_for_timeout(300)
    tl = pg.locator('article.ex.focus .target').inner_text(); print(repr(tl))
    ok('Vừa·Sát·Hỏng' in tl and 'hỏng rep' in tl, 'Lần trước hiện cảm giác + chip "Giữ … có set hỏng rep"')
    pg.ev("() => discardSession()")
    # sync QR giữ cảm giác
    rt = pg.ev("""() => { const s0 = state.sessions[state.sessions.length - 1]; const pkg = { role: 'student', link: { pk: '', cn: '' }, name: 'x', at: Date.now(), plan: null, del: { s: {}, e: {} } };
      const ss = serSession(state, s0); const c = syncCompact(pkg, [ss]); const P = cleanPkg(syncExpand(JSON.parse(JSON.stringify(c)))); return P.sessions[0].entries[0].sets.map(z => z.ef || null); }""")
    ok(rt == ['m','h','f'], f'QR mang theo cảm giác: {rt}')
    pg.ev("() => { ui.tab = 'week'; ui.pmode = 'month'; render(true); }"); pg.wait_for_timeout(300)
    ok(pg.locator('[data-act="report"]').count() == 0, 'Đã bỏ nút báo cáo tháng')
    pg.ev("() => { ui.tab = 'week'; ui.pmode = 'week'; render(true); }")
    b.close()
srv.terminate()
print('ERRS', errs)
