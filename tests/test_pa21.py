"""PA-21: tài khoản HLV + học viên (đăng nhập tên + mật khẩu), chạy đầu-cuối với drive/Code.gs thật."""
import subprocess, time, json, urllib.request, atexit
from playwright.sync_api import sync_playwright, Page
def ev(self, code, arg=None): return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
errs=[]
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); (None if c else errs.append(m))
URL='https://script.google.com/macros/s/AKfyPA21/exec'
gas = subprocess.Popen(['node','gas_server.js','8799'], stdout=subprocess.PIPE, text=True); HLV = gas.stdout.readline().strip()
srv = subprocess.Popen(['python3','-m','http.server','8793','-d','site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
atexit.register(lambda: (srv.terminate(), gas.terminate()))
def route(r):
    body = (r.request.post_data or '').encode()
    with urllib.request.urlopen(urllib.request.Request('http://localhost:8799/', data=body, method='POST')) as x: out = x.read()
    r.fulfill(status=200, content_type='application/json', body=out)
def gas_post(q):
    with urllib.request.urlopen(urllib.request.Request('http://localhost:8799/', data=json.dumps(q).encode(), method='POST')) as x: return json.loads(x.read())
with sync_playwright() as p:
    b = p.chromium.launch()
    def mk():
        c = b.new_context(viewport={'width':390,'height':844}); c.route('https://script.google.com/**', route); pg = c.new_page()
        pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e))); pg.goto('http://localhost:8793/index.html'); pg.wait_for_timeout(1500)
        pg.ev("() => { ui.tab = 'settings'; ui.moreSec = 'drive'; render(true); }"); pg.wait_for_timeout(200); return pg
    def toast(pg): return pg.locator('#toast').inner_text()
    co = mk()
    # ===== máy HLV đang dùng: hồ sơ Hoàng (có giáo án + 1 buổi) và Lan =====
    co.ev("""async () => { profiles.coach = { on: true, name: 'Hoàng' }; curProf().name = 'Hoàng'; profiles.list.push({ id: 'p2', name: 'Lan', color: 1 }); saveProfiles();
      const x = newEx('Squat'); const st = clone(state); st.days = [{ id: 'd1', name: 'Chân', exercises: [{ ...x, currentKg: 80, kgSetAt: Date.now(), alts: [], slot: '', mainSince: ymd() }] }];
      const t = Date.now() - 864e5; st.sessions = [{ id: 'hs1', dayId: 'd1', dayName: 'Chân', date: ymd(new Date(t)), startedAt: t, finishedAt: t + 3e6, entries: [{ exId: x.id, name: x.name, muscle: x.muscle, note: '', each: false, sets: [{ kg: 80, reps: 8 }], drop: null }] }];
      loadState(st); save();
      const y = newEx('Kéo xô (Lat pulldown)'); const s2 = freshState(); s2.settings.name = 'Lan'; s2.days = [{ id: 'l1', name: 'Lưng', exercises: [{ ...y, currentKg: 30, kgSetAt: Date.now(), alts: [], slot: '', mainSince: ymd() }] }];
      await LDB.put('kv', stateKey('p2'), s2); ui.tab = 'settings'; ui.moreSec = 'drive'; render(true); }"""); co.wait_for_timeout(300)
    ok(co.locator('.acc [data-act="acc-login"]').count() == 1 and co.locator('.acc [data-act="acc-hlv-new"]').count() == 1, 'Thẻ Đăng nhập + nút Tạo tài khoản HLV')
    co.locator('.acc').screenshot(path='p21-login.png')
    co.click('[data-act="acc-hlv-new"]'); co.wait_for_timeout(200)
    co.fill('#hn-sv', URL); co.fill('#hn-key', HLV); co.fill('#hn-u', 'hoang'); co.fill('#hn-p', 'matkhau1'); co.fill('#hn-p2', 'matkhau2'); co.click('[data-act="acc-hlv-go"]'); co.wait_for_timeout(200)
    ok('chưa khớp' in toast(co), 'Mật khẩu nhập lại không khớp: báo lỗi')
    co.fill('#hn-p2', 'matkhau1'); co.click('[data-act="acc-hlv-go"]'); co.wait_for_timeout(4000)
    A = co.ev("() => [state.settings.acc, state.settings.drvKey.length, state.settings.drvUrl]")
    ok(A[0]['vai'] == 'hlv' and A[0]['u'] == 'hoang' and A[1] == 40 and A[2] == URL, 'Tạo TK HLV: máy HLV đăng nhập bằng phiên (không cần lưu MÃ HLV)')
    ds = gas_post({'a':'tv.ds','ma':HLV})['ds']
    ok(sorted(t['ten'] for t in ds) == ['Hoàng', 'Lan'] and all(t['hlv'] for t in ds), 'Mọi hồ sơ (kể cả của HLV) đã lên Drive')
    co.ev("() => { ui.tab = 'settings'; ui.moreSec = 'drive'; render(true); }"); co.wait_for_timeout(200)
    ok('Tài khoản HLV' in co.locator('.acc').inner_text() and co.locator('[data-act="acc-tv"]').count() == 1, 'Thẻ Tài khoản HLV: có Quản lý học viên')
    co.locator('.acc').screenshot(path='p21-hlv.png')
    # ===== quản lý học viên =====
    co.click('[data-act="acc-tv"]'); co.wait_for_timeout(1200)
    txt = co.locator('#sheet-body').inner_text(); ok('Lan' in txt and '(bạn)' in txt and 'Chưa có tài khoản' in txt, 'Danh sách học viên: đánh dấu hồ sơ của HLV, chưa có tài khoản')
    co.locator('#sheet-body').screenshot(path='p21-ds.png')
    lan = [t for t in ds if t['ten']=='Lan'][0]['id']
    co.click(f'[data-act="acc-tv-set"][data-id="{lan}"]'); co.wait_for_timeout(200)
    ok(co.input_value('#tv-u') == 'lan' and len(co.input_value('#tv-p')) == 8, 'Cấp tài khoản: gợi ý tên đăng nhập + mật khẩu ngẫu nhiên')
    co.fill('#tv-p', 'lan12345'); co.click('[data-act="acc-tv-set-go"]'); co.wait_for_timeout(800)
    txt = co.locator('#sheet-body').inner_text(); ok('lan' in txt and 'lan12345' in txt, 'Hiện tài khoản để gửi cho học viên')
    co.locator('#sheet-body').screenshot(path='p21-cred.png')
    cred = co.ev("() => ui.accCred"); ok('Tên đăng nhập: lan' in cred and 'Link máy chủ' in cred, 'Nội dung gửi học viên có link máy chủ')
    co.click('#sheet-body [data-act="acc-tv"]'); co.wait_for_timeout(1000); co.click('[data-act="acc-tv-add"]'); co.wait_for_timeout(200)
    co.fill('#tv-ten', 'Minh Đức'); ok(co.input_value('#tv-u') == 'minh.duc', 'Thêm học viên: tên đăng nhập tự bỏ dấu')
    co.fill('#tv-p', 'minh1234'); co.click('[data-act="acc-tv-add-go"]'); co.wait_for_timeout(1500)
    ok(co.ev("() => profiles.list.map(p => p.name)") == ['Hoàng', 'Lan', 'Minh Đức'], 'Thêm học viên: có hồ sơ trên máy HLV')
    ok(len(gas_post({'a':'tv.ds','ma':HLV})['ds']) == 3, 'Không tạo trùng học viên trên Drive')
    co.ev("() => closeSheet()")
    # ===== máy học viên Lan =====
    hv = mk()
    ok(hv.locator('.acc [data-act="acc-login"]').count() == 1 and hv.locator('.acc details[open]').count() == 1, 'Máy học viên mới: thẻ Đăng nhập, mở sẵn ô link máy chủ')
    hv.fill('#acc-u', 'lan'); hv.fill('#acc-p', 'sai'); hv.fill('#acc-sv', URL); hv.click('[data-act="acc-login"]'); hv.wait_for_timeout(800)
    ok('Sai tên đăng nhập' in toast(hv) and not hv.ev("() => state.settings.acc"), 'Sai mật khẩu: không đăng nhập')
    hv.fill('#acc-p', 'lan12345'); hv.click('[data-act="acc-login"]'); hv.wait_for_timeout(4000)
    ok(hv.ev("() => [state.settings.acc.vai, state.drv.id]") == ['hv', lan], 'Học viên đăng nhập: gắn đúng hồ sơ Lan')
    ok('Kéo xô (Lat pulldown)' in hv.ev("() => state.days.flatMap(d => d.exercises.map(e => e.name))"), 'Học viên nhận giáo án HLV soạn')
    hv.ev("() => { ui.tab = 'settings'; ui.moreSec = 'drive'; render(true); }"); hv.wait_for_timeout(200)
    ok('Đang đăng nhập lan' in hv.locator('.acc').inner_text() and 'HLV Hoàng' in hv.locator('.acc').inner_text(), 'Thẻ tài khoản học viên: tên đăng nhập + tên HLV')
    hv.locator('.acc').screenshot(path='p21-hv.png')
    hv.ev("""() => { const ex = state.days[0].exercises[0]; const t = Date.now(); state.sessions.push({ id: 'ls1', dayId: state.days[0].id, dayName: state.days[0].name, date: ymd(), startedAt: t, finishedAt: t + 3e6, entries: [{ exId: ex.id, name: ex.name, muscle: ex.muscle, note: '', each: false, sets: [{ kg: 32.5, reps: 10 }], drop: null }] }); save(); DRV.last = 0; return drvAuto(true); }"""); hv.wait_for_timeout(2500)
    co.ev("() => { DRV.last = 0; return drvAuto(true); }"); co.wait_for_timeout(2500)
    ok(co.ev("async () => (await profState('p2')).sessions.some(s => s.id === 'ls1')"), 'Học viên tập → máy HLV tự có buổi tập')
    # học viên tự đổi mật khẩu
    hv.click('[data-act="acc-pw"]'); hv.wait_for_timeout(200); hv.fill('#pw-cu', 'lan12345'); hv.fill('#pw-moi', 'lanmoi99'); hv.fill('#pw-moi2', 'lanmoi99'); hv.click('[data-act="acc-pw-go"]'); hv.wait_for_timeout(800)
    ok('Đã đổi mật khẩu' in toast(hv) and gas_post({'a':'dn','u':'lan','mk':'lanmoi99'})['ok'], 'Học viên tự đổi mật khẩu')
    hv.ev("() => { DRV.last = 0; return drvAuto(true); }"); hv.wait_for_timeout(1500); ok(hv.ev("() => DRV.st") == 'ok', 'Đổi mật khẩu xong máy này vẫn đồng bộ được')
    # ===== HLV đổi điện thoại: đăng nhập máy mới, lấy lại toàn bộ =====
    c2 = mk()
    c2.fill('#acc-u', 'hoang'); c2.fill('#acc-p', 'matkhau1'); c2.fill('#acc-sv', URL); c2.click('[data-act="acc-login"]'); c2.wait_for_timeout(6000)
    ok(c2.ev("() => !!coach() && coach().name") == 'Hoàng', 'Máy mới: đăng nhập HLV tự bật chế độ HLV')
    ok(sorted(c2.ev("() => profiles.list.map(p => p.name)")) == ['Hoàng', 'Lan', 'Minh Đức'], 'Máy mới: có đủ hồ sơ, bỏ hồ sơ trống mặc định')
    ok(c2.ev("() => curProf().name") == 'Hoàng', 'Máy mới: mở sẵn hồ sơ của HLV')
    c2.ev("() => { DRV.last = 0; return drvAuto(true); }"); c2.wait_for_timeout(2500)
    r = c2.ev("() => [state.days.flatMap(d => d.exercises.map(e => e.name)), state.sessions.map(s => s.id), state.days[0] && state.days[0].exercises[0].currentKg]")
    ok('Squat' in r[0] and 'hs1' in r[1] and r[2] == 80, f'Máy mới: lấy lại giáo án, buổi tập, mức tạ của HLV {r}')
    pl = c2.ev("async () => { const id = profiles.list.find(p => p.name === 'Lan').id, st = await profState(id); return [st.days.flatMap(d => d.exercises.map(e => e.name)), st.sessions.map(s => s.id)]; }")
    ok('Kéo xô (Lat pulldown)' in pl[0] and 'ls1' in pl[1], f'Máy mới: lấy lại giáo án + buổi tập của học viên {pl}')
    ok(len(gas_post({'a':'tv.ds','ma':HLV})['ds']) == 3, 'Máy mới không tạo trùng học viên trên Drive')
    n0 = gas_post({'a':'keo','ma':HLV,'id':lan})['hlv']['rev']
    for _ in range(2):
        c2.ev("() => { DRV.last = 0; return drvAuto(true); }"); c2.wait_for_timeout(1500); co.ev("() => { DRV.last = 0; return drvAuto(true); }"); co.wait_for_timeout(1500)
    n1 = gas_post({'a':'keo','ma':HLV,'id':lan})['hlv']['rev']
    for _ in range(2):
        c2.ev("() => { DRV.last = 0; return drvAuto(true); }"); c2.wait_for_timeout(1500); co.ev("() => { DRV.last = 0; return drvAuto(true); }"); co.wait_for_timeout(1500)
    n2 = gas_post({'a':'keo','ma':HLV,'id':lan})['hlv']['rev']
    ok(n2 == n1, f'Hai máy HLV không gửi qua gửi lại vô hạn ({n0}→{n1}→{n2})')
    c2.ev("""async () => { const id = profiles.list.find(p => p.name === 'Lan').id, st = await profState(id); st.days[0].exercises.push({ ...newEx('Chèo cáp ngồi (Seated cable row)'), alts: [], slot: '', mainSince: ymd() }); await LDB.put('kv', stateKey(id), st); DRV.last = 0; await drvAuto(true); }"""); c2.wait_for_timeout(2500)
    co.ev("() => { DRV.last = 0; return drvAuto(true); }"); co.wait_for_timeout(2500)
    ok('Chèo cáp ngồi (Seated cable row)' in co.ev("async () => (await profState('p2')).days.flatMap(d => d.exercises.map(e => e.name))"), 'HLV sửa giáo án trên máy mới → máy HLV cũ cũng nhận')
    hv.ev("() => { DRV.last = 0; return drvAuto(true); }"); hv.wait_for_timeout(2500)
    ok('Chèo cáp ngồi (Seated cable row)' in hv.ev("() => state.days.flatMap(d => d.exercises.map(e => e.name))"), 'Học viên nhận giáo án sửa từ máy HLV mới')
    # ===== HLV đặt lại mật khẩu cho Lan → máy Lan phải đăng nhập lại =====
    gas_post({'a':'tv.tk','ma':HLV,'id':lan,'u':'lan','mk':'datlai12'})
    hv.ev("() => { DRV.last = 0; return drvAuto(true); }"); hv.wait_for_timeout(1500); hv.ev("() => { ui.tab = 'settings'; ui.moreSec = 'drive'; render(true); }"); hv.wait_for_timeout(200)
    ok('hết hạn' in hv.locator('.acc').inner_text() and hv.locator('[data-act="acc-relogin"]').count() == 1, 'Mật khẩu bị đặt lại: báo phiên hết hạn')
    hv.locator('.acc').screenshot(path='p21-het.png')
    hv.click('[data-act="acc-relogin"]'); hv.wait_for_timeout(300)
    ok(hv.input_value('#acc-u') == 'lan', 'Đăng nhập lại: giữ sẵn tên đăng nhập')
    nS = hv.ev("() => state.sessions.length")
    hv.fill('#acc-p', 'datlai12'); hv.click('[data-act="acc-login"]'); hv.wait_for_timeout(3500)
    ok(hv.ev("() => [state.drv.id, state.sessions.length, DRV.st, profiles.list.length]") == [lan, nS, 'ok', 1], 'Đăng nhập lại: cùng hồ sơ, không mất dữ liệu, không tạo hồ sơ mới')
    # khoá
    gas_post({'a':'tv.tat','ma':HLV,'id':lan}); hv.ev("() => { DRV.last = 0; return drvAuto(true); }"); hv.wait_for_timeout(1200)
    ok(hv.ev("() => DRV.st") == 'err', 'HLV khoá học viên: máy học viên ngừng đồng bộ'); gas_post({'a':'tv.bat','ma':HLV,'id':lan})
    # đăng xuất
    hv.ev("() => { ui.tab = 'settings'; ui.moreSec = 'drive'; render(true); }"); hv.wait_for_timeout(200)
    hv.click('.acc [data-act="acc-out"]'); hv.wait_for_timeout(200); hv.click('#sheet-body .btn.danger, #sheet-body [data-act="confirm-ok"]'); hv.wait_for_timeout(1200)
    ok(hv.ev("() => [!!state.drv, state.sessions.length, (state.settings.acc || {}).vai || '']") == [False, nS, ''], 'Đăng xuất: ngừng đồng bộ, dữ liệu giữ nguyên')
    # máy HLV bật chế độ HLV không đăng nhập được tài khoản học viên
    co.ev("() => { ui.tab = 'settings'; ui.moreSec = 'drive'; render(true); }")
    co.ev(f"async () => accApply('{URL}', {{ vai: 'hv', id: 'x', ma: 'y'.repeat(40), ten: 'Lan', u: 'lan' }})"); co.wait_for_timeout(300)
    ok('chế độ HLV' in toast(co) and co.ev("() => state.settings.acc.vai") == 'hlv', 'Máy HLV: không cho đăng nhập nhầm tài khoản học viên')
    b.close()
srv.terminate(); gas.terminate()
print('ERRS', errs)
