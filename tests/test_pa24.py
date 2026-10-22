"""PA-24: hồ sơ trùng do Drive còn chỗ lưu cũ cùng tên → gộp làm một, học viên dùng mã cũ vẫn đồng bộ đúng hồ sơ."""
import subprocess, time, json, urllib.request, atexit
from playwright.sync_api import sync_playwright, Page
def ev(self, code, arg=None): return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
errs=[]
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); (None if c else errs.append(m))
URL='https://script.google.com/macros/s/AKfyPA24/exec'
gas = subprocess.Popen(['node','gas_server.js','8899'], stdout=subprocess.PIPE, text=True); HLV = gas.stdout.readline().strip()
srv = subprocess.Popen(['python3','-m','http.server','8893','-d','site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
atexit.register(lambda: (srv.terminate(), gas.terminate()))
def route(r):
    body = (r.request.post_data or '').encode()
    with urllib.request.urlopen(urllib.request.Request('http://localhost:8899/', data=body, method='POST')) as x: out = x.read()
    r.fulfill(status=200, content_type='application/json', body=out)
def gas_post(q):
    with urllib.request.urlopen(urllib.request.Request('http://localhost:8899/', data=json.dumps(q).encode(), method='POST')) as x: return json.loads(x.read())
SESS = """([id, d, kg]) => { const ex = state.days[0].exercises[0]; const t = Date.now() - d * 864e5; state.sessions.push({ id, dayId: state.days[0].id, dayName: state.days[0].name, date: ymd(new Date(t)), startedAt: t, finishedAt: t + 3e6, entries: [{ exId: ex.id, name: ex.name, muscle: ex.muscle, note: '', each: false, sets: [{ kg, reps: 10 }], drop: null }] }); save(); }"""
with sync_playwright() as p:
    b = p.chromium.launch()
    def mk():
        c = b.new_context(viewport={'width':390,'height':844}); c.route('https://script.google.com/**', route); pg = c.new_page()
        pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e))); pg.goto('http://localhost:8893/index.html'); pg.wait_for_timeout(1500); return pg
    sync = lambda pg, w=2500: (pg.ev("() => { DRV.last = 0; return drvAuto(true); }"), pg.wait_for_timeout(w))
    names = lambda pg: pg.ev("() => profiles.list.map(p => p.name)")
    # ===== Drive còn chỗ lưu cũ "A Trung" (học viên đang dùng mã cũ) =====
    o1 = gas_post({'a':'tv.them','ma':HLV,'ten':'A Trung'})
    hv = mk()
    hv.ev("(a) => { curProf().name = 'A Trung'; saveProfiles(); state.drv = { u: a[0], id: a[1], m: a[2], n: 'A Trung', hlvSeen: 0, hvRev: 0, sentH: '' }; save(); }", [URL, o1['id'], o1['ma']])
    hv.ev("""() => { const x = newEx('Leg press'); state.days = [{ id: 'q1', name: 'Chân', exercises: [{ ...x, currentKg: 100, kgSetAt: 1, alts: [], slot: '', mainSince: ymd() }] }]; save(); }""")
    hv.ev(SESS, ['hom-qua', 1, 110]); sync(hv)
    ok(gas_post({'a':'keo','ma':HLV,'id':o1['id']})['hv']['rev'] >= 1, 'Học viên dùng mã cũ đã gửi buổi tập hôm qua lên Drive')
    # ===== máy HLV đã nối Drive từ trước: A Trung, Vợ lu, Hoàng =====
    co = mk()
    co.ev("""async (a) => { profiles.coach = { on: true, name: 'Hoàng' }; curProf().name = 'A Trung'; profiles.list.push({ id: 'p2', name: 'Vợ lu', color: 1 }, { id: 'p3', name: 'Hoàng', color: 2 }); saveProfiles();
      for (const [pid, nm] of [['p2','Vợ lu'],['p3','Hoàng']]) { const s = freshState(); s.settings.name = nm; await LDB.put('kv', stateKey(pid), s); }
      const x = newEx('Leg press'); const st = clone(state); st.days = [{ id: 'd1', name: 'Chân', exercises: [{ ...x, currentKg: 100, kgSetAt: 2, alts: [], slot: '', mainSince: ymd() }] }]; loadState(st); save();
      state.settings.drvUrl = a[0]; state.settings.drvKey = a[1]; save(); }""", [URL, HLV])
    co.ev(SESS, ['cu-3ngay', 3, 100]); sync(co, 3000)
    ok(len(gas_post({'a':'tv.ds','ma':HLV})['ds']) == 4, 'Drive có 4 chỗ lưu (A Trung bị 2 chỗ)')
    # ===== tạo tài khoản HLV: không được sinh hồ sơ trùng =====
    co.ev("() => { ui.tab = 'settings'; ui.moreSec = 'drive'; render(true); }"); co.wait_for_timeout(300)
    co.ev("(a) => drvCall(a[0], { a: 'hlv.tao', ma: a[1], u: 'hoang', mk: 'matkhau1', ten: 'Hoàng' }).then(r => accApply(a[0], r))", [URL, HLV]); co.wait_for_timeout(4000)
    ok(sorted(names(co)) == ['A Trung', 'Hoàng', 'Vợ lu'], f'Đăng nhập HLV: không tạo hồ sơ trùng {names(co)}')
    sync(co)
    S = co.ev("async () => { const st = await profState(profiles.list.find(p => p.name === 'A Trung').id); return [st.sessions.map(s => s.id).sort(), Object.keys(st.drv.ax || {})]; }")
    ok(S[0] == ['cu-3ngay', 'hom-qua'] and o1['id'] in S[1], f'Buổi tập hôm qua của học viên (mã cũ) về đúng hồ sơ A Trung {S}')
    # HLV sửa giáo án → học viên dùng mã cũ vẫn nhận
    co.ev("async () => { const id = profiles.list.find(p => p.name === 'A Trung').id; if (id !== profiles.active) await switchProfile(id); state.days[0].exercises.push({ ...newEx('Đá đùi (Leg extension)'), alts: [], slot: '', mainSince: ymd() }); save(); }")
    sync(co); sync(hv)
    ok('Đá đùi (Leg extension)' in hv.ev("() => state.days.flatMap(d => d.exercises.map(e => e.name))"), 'Học viên dùng mã cũ nhận giáo án HLV vừa sửa')
    hv.ev(SESS, ['hom-nay', 0, 112]); sync(hv); sync(co)
    ok('hom-nay' in co.ev("async () => (await profState(profiles.list.find(p => p.name === 'A Trung').id)).sessions.map(s => s.id)"), 'Buổi tập mới của học viên tiếp tục về máy HLV')
    # ===== máy đã lỡ bị trùng (như trên điện thoại chủ repo): tự gộp, không mất buổi nào =====
    o3 = gas_post({'a':'tv.them','ma':HLV,'ten':'Vợ lu'})
    co.ev("""async (oid) => { const s = freshState(); s.settings.name = 'Vợ lu'; s.drv = { id: oid, hvSeen: 0, hlvRev: 0, sentH: '' };
      const x = newEx('Leg press'); s.days = [{ id: 'z1', name: 'Chân', exercises: [{ ...x, currentKg: 40, kgSetAt: 3, alts: [], slot: '', mainSince: ymd() }] }];
      const t = Date.now() - 9 * 864e5; s.sessions = [{ id: 'vl-9ngay', dayId: 'z1', dayName: 'Chân', date: ymd(new Date(t)), startedAt: t, finishedAt: t + 3e6, entries: [{ exId: s.days[0].exercises[0].id, name: 'Leg press', muscle: 'Chân', note: '', each: false, sets: [{ kg: 40, reps: 10 }], drop: null }] }];
      await LDB.put('kv', stateKey('pdup'), s); profiles.list.push({ id: 'pdup', name: 'Vợ lu', color: 4 }); saveProfiles(); }""", o3['id'])
    ok(names(co).count('Vợ lu') == 2, 'Dựng lại tình huống: 2 hồ sơ Vợ lu')
    sync(co, 3500)
    ok(names(co).count('Vợ lu') == 1 and len(names(co)) == 3, f'Tự gộp hồ sơ trùng {names(co)}')
    V = co.ev("async () => { const st = await profState(profiles.list.find(p => p.name === 'Vợ lu').id); return [st.sessions.map(s => s.id), Object.keys(st.drv.ax || {}).length]; }")
    ok('vl-9ngay' in V[0] and V[1] >= 1, f'Gộp xong vẫn giữ buổi tập của hồ sơ trùng {V}')
    n = len(gas_post({'a':'tv.ds','ma':HLV})['ds']); sync(co); sync(co)
    ok(len(gas_post({'a':'tv.ds','ma':HLV})['ds']) == n and len(names(co)) == 3, 'Đồng bộ tiếp không sinh thêm hồ sơ / chỗ lưu')
    co.ev("() => { ui.tab = 'settings'; ui.moreSec = 'drive'; render(true); }"); co.wait_for_timeout(200); co.screenshot(path='p24-hlv.png')
    b.close()
srv.terminate(); gas.terminate()
print('ERRS', errs)
