import subprocess, time
from playwright.sync_api import sync_playwright, Page
srv = subprocess.Popen(['python3','-m','http.server','8767','-d','site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
def ev(self, code, arg=None): return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
errs=[]
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); (None if c else errs.append(m))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
    pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e)))
    pg.goto('http://localhost:8767/index.html'); pg.wait_for_timeout(1500)
    pg.ev("""() => { const sq = newEx('Squat'); sq.cues = 'Gối hướng theo mũi chân'; const bp = newEx('Đẩy ngực dốc lên (Incline press)');
      state.days = [{ id: 'd1', name: 'Chân + Ngực', exercises: [sq, bp].map(e => ({ ...e, alts: [], slot: '', mainSince: ymd() })) }]; save(); startSession('d1'); ui.tab = 'today'; render(); }""")
    pg.wait_for_timeout(500)
    ok(pg.locator('article.ex').first.locator('.fcue').count()==1, 'Thẻ lưu ý đầy đủ ở đầu bài (mặc định)')
    first = pg.locator('article.ex').first
    ok('Gối hướng theo mũi chân' in first.locator('.fcue li.mine').inner_text(), 'Lời nhắc riêng đứng đầu')
    # thứ tự: thẻ lưu ý nằm trước ô mục tiêu và ô ghi set
    order = pg.ev("() => { const a = document.querySelector('article.ex'); const els = [...a.querySelectorAll('.fcue,.target,.sets')]; return els.map(e => e.className.split(' ')[0]); }")
    ok(order[0]=='fcue', f'Thẻ lưu ý đứng trước mục tiêu và set: {order}')
    first.screenshot(path='f1-list-full.png')
    pg.ev("() => { const en = state.active.entries[0]; en.sets[0].reps = en.sets[0].reps || 10; en.sets[0].kg = en.sets[0].kg ?? 40; render(true); }"); pg.wait_for_timeout(200)
    pg.locator('article.ex').first.locator('[data-act="set-done"]').first.click(); pg.wait_for_timeout(300)
    first = pg.locator('article.ex.focus')
    ok(first.locator('.fcue').count()==0 and first.locator('.fcue1').count()==1, 'Xong set đầu: thẻ tự thu gọn 1 dòng')
    first.locator('.fcue1').click(); pg.wait_for_timeout(300)
    ok(pg.locator('article.ex.focus .fcue').count()==1, 'Bấm dòng thu gọn: mở lại')
    # mức Gọn và Tắt
    pg.ev("() => { ui.tab = 'settings'; render(); }"); pg.wait_for_timeout(300)
    card = pg.locator('.set-card', has_text='Lưu ý form khi tập'); ok(card.count()==1, 'Có mục cài đặt Lưu ý form khi tập')
    card.locator('[data-k="compact"]').click(); pg.wait_for_timeout(300)
    card = pg.locator('.set-card', has_text='Lưu ý form khi tập'); card.screenshot(path='f3-setting.png')
    pg.ev("() => { ui.tab = 'today'; render(); }"); pg.wait_for_timeout(300)
    ok(pg.locator('article.ex .fcue').count()==0 and pg.locator('article.ex.focus .fcue1').count()==1, 'Mức Gọn: 1 dòng ở bài đang tập')
    pg.ev("() => { state.settings.formCues = 'off'; render(); }"); pg.wait_for_timeout(300)
    ok(pg.locator('article.ex .fcue, article.ex .fcue1').count()==0, 'Mức Tắt: không hiện')
    ok(pg.locator('[data-act="guide"]').count()>0 and pg.locator('[data-act="pain"]').count()==1, 'Tắt vẫn còn nút Hướng dẫn và Báo đau')
    # theo từng hồ sơ
    pg.ev("""async () => { profiles.list.push({ id: 'p2', name: 'Minh', color: 1 }); saveProfiles(); }""")
    hv = pg.ev("async () => { await LDB.put('kv', stateKey('p2'), freshState()); const st = normState(await LDB.get('kv', stateKey('p2'))); return [state.settings.formCues, st.settings.formCues || 'full']; }")
    ok(hv==['off','full'], f'Mỗi hồ sơ một mức riêng: {hv}')
    # màn hướng dẫn: điểm form lên đầu
    pg.ev("() => guideSheet(state.active.entries[0].exId)"); pg.wait_for_timeout(600)
    o = pg.ev("() => { const s = document.querySelector('#sheet-body'); const f = s.querySelector('.fcue'), g = s.querySelector('#g-demo'); return !!f && !!g && !!(f.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING); }")
    ok(o, 'Màn Hướng dẫn: điểm form nằm trên hình minh hoạ')
    pg.locator('#sheet').screenshot(path='f4-guide.png')
    # giao diện sáng
    pg.ev("() => { closeSheet(); state.settings.formCues = 'full'; document.documentElement.dataset.skin = 'light'; render(); }"); pg.wait_for_timeout(300)
    
    b.close()
srv.terminate()
print('\nLỖI:', errs if errs else 'không có')
