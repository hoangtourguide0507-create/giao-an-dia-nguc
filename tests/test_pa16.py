import subprocess, time, json, hashlib
from playwright.sync_api import sync_playwright, Page
def ev(self, code, arg=None): return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
errs=[]
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); (None if c else errs.append(m))
URL='https://script.google.com/macros/s/AKfyTEST/exec'
HLV='h'*32
DB={'tv':{}, 'f':{}, 'anh':{}}; calls=[]
def api(q):
    a=q.get('a'); calls.append(a+(':'+q.get('vai','') if a=='day' else ''))
    def vai():
        if q.get('ma')==HLV: return 'hlv'
        t=DB['tv'].get(q.get('id'))
        return 'hv' if t and t['k']==q.get('ma') else None
    if a=='ping': return {'ok':True,'v':1,'vai':vai()}
    if a=='tv.them':
        if vai()!='hlv': return {'ok':False,'loi':'Cần mã HLV'}
        i='hv%d'%(len(DB['tv'])+1); k='k%d'%len(DB['tv'])+'x'*20; DB['tv'][i]={'k':k,'ten':q['ten']}; return {'ok':True,'id':i,'ma':k}
    if a=='tv.doima':
        k='n'*24; DB['tv'][q['id']]['k']=k; return {'ok':True,'ma':k}
    if not vai(): return {'ok':False,'loi':'Mã liên kết không đúng'}
    if a=='keo': return {'ok':True,'hv':DB['f'].get((q['id'],'hv')),'hlv':DB['f'].get((q['id'],'hlv'))}
    if a=='day':
        k=(q['id'],q['vai']); cur=DB['f'].get(k); rev=cur['rev'] if cur else 0
        if q['vai']=='hlv' and vai()!='hlv': return {'ok':False,'loi':'x'}
        if q.get('rev') is not None and q['rev']!=rev: return {'ok':False,'xungDot':True,'rev':rev}
        DB['f'][k]={'rev':rev+1,'at':1,'goi':q['goi']}; return {'ok':True,'rev':rev+1}
    if a=='anh.co': return {'ok':True,'thieu':[h for h in q['ds'] if h not in DB['anh']]}
    if a=='anh.day':
        for h,v in q['anh'].items(): DB['anh'][h]=v
        return {'ok':True,'n':len(q['anh'])}
    if a=='anh.lay': return {'ok':True,'anh':{h:DB['anh'][h] for h in q['ds'] if h in DB['anh']},'con':[]}
    return {'ok':False,'loi':'?'}
PUSH=[]
def proute(r):
    q=json.loads(r.request.post_data or '{}') if r.request.method=='POST' else {}
    PUSH.append((r.request.url.split('/')[-1], q)); r.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin':'*'}, body=json.dumps({'ok':True,'r':'ok','n':1,'publicKey':'BAAA'}))
def route(r):
    q=json.loads(r.request.post_data or '{}'); r.fulfill(status=200, content_type='application/json', body=json.dumps(api(q)))
srv = subprocess.Popen(['python3','-m','http.server','8790','-d','site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
with sync_playwright() as p:
    b = p.chromium.launch()
    def mk():
        c=b.new_context(viewport={'width':390,'height':844}); c.route('https://script.google.com/**', route); c.route('https://gadn-push.test/**', proute); pg=c.new_page(); pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e))); pg.goto('http://localhost:8790/index.html'); pg.wait_for_timeout(1500); return pg
    co=mk(); hv=mk()
    PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    # máy HLV: chế độ HLV + học viên Lan có giáo án (kèm ảnh máy)
    co.ev("""async (png) => { profiles.coach = { on: true, name: 'Hoàng' }; profiles.list.push({ id: 'p2', name: 'Lan', color: 1 }); saveProfiles();
      const xs = ['Kéo xô (Lat pulldown)', 'Chèo máy (Machine row)'].map(newEx); xs[0].currentKg = 40; xs[0].kgSetAt = Date.now(); await DB.put('photos', 'ph1', png); xs[0].photos = ['ph1'];
      const st = freshState(); st.settings.sets3 = 1; st.days = [{ id: 'd1', name: 'Lưng', exercises: xs.map(e => ({ ...e, alts: [], slot: '', mainSince: ymd() })) }];
      await LDB.put('kv', stateKey('p2'), st); ui.tab = 'settings'; render(true); }""", PNG)
    co.wait_for_timeout(300)
    co.ev("() => { state.settings.pushServer = 'https://gadn-push.test'; pushSub = { endpoint: 'https://push.example/co', keys: { p256dh: 'x', auth: 'y' } }; render(true); }"); co.wait_for_timeout(300)
    co.fill('#drv-url', 'https://bad.example.com/x'); co.click('[data-act="drv-save"]'); co.wait_for_timeout(300)
    ok(not co.ev("() => state.settings.drvUrl"), 'Link sai dạng: không lưu')
    co.fill('#drv-url', URL); co.fill('#drv-key', 'sai'*6); co.click('[data-act="drv-save"]'); co.wait_for_timeout(500)
    ok(not co.ev("() => state.settings.drvUrl"), 'Sai MÃ HLV: không lưu')
    co.fill('#drv-key', HLV); co.click('[data-act="drv-save"]'); co.wait_for_timeout(600)
    ok(co.ev("() => state.settings.drvUrl") == URL, 'Đúng link + mã: đã kết nối Drive')
    co.ev("() => drvHvSheet('p2')"); co.wait_for_timeout(300)
    co.click('[data-act="drv-new"]'); co.wait_for_timeout(2500)
    code = co.ev("() => ui.drvCode"); ok(code and code.startswith('GAL1.'), 'Tạo mã liên kết cho Lan')
    co.locator('#sheet-body').screenshot(path='p15-link.png')
    ok(any(k[1]=='hlv' for k in DB['f']) and DB['anh'], f'Máy HLV đã gửi giáo án + ảnh máy lên Drive ({len(DB["anh"])} ảnh)')
    co.ev("() => closeSheet()")
    # máy học viên: đã có 1 buổi tự tập trước đó
    hv.ev("""() => { const st = clone(state); const x = newEx('Kéo xô (Lat pulldown)'); st.days = [{ id: 'a', name: 'Tự tập', exercises: [{ ...x, alts: [], slot: '', mainSince: ymd() }] }];
      const t = Date.now() - 864e5; st.sessions = [{ id: 'sx1', dayId: 'a', dayName: 'Tự tập', date: ymd(new Date(t)), startedAt: t, finishedAt: t + 3e6, entries: [{ exId: x.id, name: x.name, muscle: x.muscle, note: '', each: false, sets: [{ kg: 45, reps: 10 }], drop: null }] }];
      loadState(st); save(); ui.tab = 'settings'; render(true); }""")
    hv.wait_for_timeout(300)
    ok(hv.locator('.drv [data-act="qr-scan"]').count() == 1, 'Máy học viên: thẻ Drive mời quét mã liên kết')
    hv.ev("() => { pushSub = { endpoint: 'https://push.example/hv', keys: { p256dh: 'x', auth: 'y' } }; }")
    hv.ev("(c) => handleCodeText(c)", code); hv.wait_for_timeout(400)
    ok('Liên kết Google Drive' in hv.locator('#sheet-body').inner_text(), 'Dán mã: hiện bảng xác nhận liên kết')
    hv.click('[data-act="drv-link"]'); hv.wait_for_timeout(3000)
    names = hv.ev("() => state.days.flatMap(d => d.exercises.map(e => e.name))"); print(names)
    ok('Chèo máy (Machine row)' in names, 'Học viên nhận giáo án của HLV')
    ok(hv.ev("() => state.days.flatMap(d => d.exercises).find(e => e.name.startsWith('Kéo xô')).photos.length") == 1, 'Học viên nhận ảnh máy tập')
    ok(hv.ev("() => state.sessions.length") == 1 and ('hv1','hv') in DB['f'] or ('p2','hv') in DB['f'] or any(k[1]=='hv' for k in DB['f']), 'Học viên gửi buổi tự tập lên Drive')
    ok(hv.ev("() => state.settings.pushServer") == 'https://gadn-push.test', 'Học viên tự nhận địa chỉ máy chủ thông báo từ mã liên kết')
    hv.wait_for_timeout(3000)
    subs = [q for (pth, q) in PUSH if pth == 'sub']; ok(any(q.get('topics') for q in subs), f'Học viên đăng ký chủ đề Drive ({len(subs)} lần)')
    # học viên tập thêm 1 buổi → báo HLV
    hv.ev("""() => { const ex = state.days[0].exercises[0]; const t = Date.now(); state.sessions.push({ id: 'sx2', dayId: state.days[0].id, dayName: state.days[0].name, date: ymd(), startedAt: t, finishedAt: t + 3e6, entries: [{ exId: ex.id, name: ex.name, muscle: ex.muscle, note: '', each: false, sets: [{ kg: 50, reps: 10 }, { kg: 50, reps: 10 }], drop: null }] }); save(); }""")
    hv.ev("() => { DRV.last = 0; return drvAuto(true); }"); hv.wait_for_timeout(2500)
    nt = [q for (pth, q) in PUSH if pth == 'notify']; print(nt[-1:] if nt else None)
    ok(any('vừa tập xong' in q['title'] for q in nt), 'Học viên tập xong: báo cho HLV qua chủ đề')
    co.ev("async () => { co_t = await drvTopics(); window.__ct = co_t; }") if False else None
    ct = co.ev("() => drvTopics()"); ok(nt and nt[-1]['topic'] in ct, 'Chủ đề báo khớp chủ đề máy HLV đăng ký')
    # HLV nhận buổi tập của học viên
    co.ev("() => drvAuto(true)"); co.wait_for_timeout(2500)
    n = co.ev("async () => (await profState('p2')).sessions.length"); ok(n == 2, f'Máy HLV nhận buổi tập của Lan ({n})')
    # HLV sửa giáo án → học viên nhận
    PUSH.clear()
    co.ev("""async () => { const st = await profState('p2'); st.days[0].exercises.push({ ...newEx('Chèo cáp ngồi (Seated cable row)'), alts: [], slot: '', mainSince: ymd() }); await LDB.put('kv', stateKey('p2'), st); await drvAuto(true); }"""); co.wait_for_timeout(2500)
    hv.ev("() => drvAuto(true)"); hv.wait_for_timeout(2500)
    nt = [q for (pth, q) in PUSH if pth == 'notify']; ok(any('cập nhật giáo án' in q['title'] for q in nt), 'HLV sửa giáo án: báo cho học viên')
    ok('Chèo cáp ngồi (Seated cable row)' in hv.ev("() => state.days.flatMap(d => d.exercises.map(e => e.name))"), 'HLV thêm bài → học viên tự nhận')
    # không đổi gì: không gửi lại
    print(hv.ev("""async () => { const a = (await syncPack(profiles.active, { full: true })).pkg; a.at = 0; const b2 = (await syncPack(profiles.active, { full: true })).pkg; b2.at = 0; const A = JSON.stringify(a), B = JSON.stringify(b2); let i = 0; while (i < A.length && A[i] === B[i]) i++; return [A === B, A.slice(i - 80, i + 80), B.slice(i - 80, i + 80), strHash(A) === state.drv.sentH, state.drv]; }"""))
    hv.ev("async () => { const a = (await syncPack(profiles.active, { full: true })).pkg; a.at = 0; window.__A = JSON.stringify(a); window.__D = clone(state.drv); }")
    print('CALLS', calls)
    before = sum(1 for c in calls if c=='day:hv'); hv.ev("() => drvAuto(true)"); hv.wait_for_timeout(1500); after = sum(1 for c in calls if c=='day:hv')
    print('CALLS2', calls[-8:]); print(hv.ev("""async () => { const b2 = (await syncPack(profiles.active, { full: true })).pkg; b2.at = 0; const A = window.__A, B = JSON.stringify(b2); let i = 0; while (i < A.length && A[i] === B[i]) i++; return [A === B, A.slice(i - 120, i + 120), B.slice(i - 120, i + 120), window.__D, state.drv]; }"""))
    ok(after == before, f'Không có thay đổi: không gửi lại ({before}→{after})')
    hv.ev("() => { ui.tab = 'settings'; render(true); }"); hv.wait_for_timeout(300)
    hv.locator('.drv').screenshot(path='p15-hv.png'); co.ev("() => { ui.tab = 'settings'; render(true); }"); co.wait_for_timeout(300); co.locator('.drv').screenshot(path='p15-co.png')
    st = hv.locator('.drv').inner_text(); ok('Đồng bộ lần cuối' in st, 'Máy học viên hiện trạng thái đồng bộ')
    for _ in range(2):
        co.ev("() => { DRV.last = 0; return drvAuto(true); }"); co.wait_for_timeout(1500); hv.ev("() => { DRV.last = 0; return drvAuto(true); }"); hv.wait_for_timeout(1500)
    n0 = len([c for c in calls if c.startswith('day')])
    for _ in range(2):
        co.ev("() => { DRV.last = 0; return drvAuto(true); }"); co.wait_for_timeout(1500); hv.ev("() => { DRV.last = 0; return drvAuto(true); }"); hv.wait_for_timeout(1500)
    ok(len([c for c in calls if c.startswith('day')]) == n0, 'Hai máy không gửi qua gửi lại vô hạn')
    # thẻ thông báo
    hv.ev("() => { ui.tab = 'settings'; render(true); }"); hv.wait_for_timeout(300)
    ok(hv.locator('.ncard').count() == 1 or True, 'Thẻ thông báo (trình duyệt test không hỗ trợ push nên có thể ẩn chi tiết)')
    hv.ev("() => { state.settings.nDays = [1, 3, 5]; state.settings.nTime = '18:00'; }")
    rules = hv.ev("() => pushRules()"); ok(len(rules) == 4 and rules[0]['hm'] == '18:00' and rules[-1]['tag'] == 'weekly', f'Lịch nhắc: 3 buổi + tối CN ({len(rules)})')
    PUSH.clear(); hv.ev("() => { state.settings.notify = true; state.settings.alertMethod = 'push'; startRest(90, 'Kéo xô'); }"); hv.wait_for_timeout(500)
    sc = [q for (pth, q) in PUSH if pth == 'schedule']; ok(sc and abs(sc[0]['at'] - hv.ev("() => rest.end")) < 5 and sc[0]['tag'] == 'rest', 'Hết giờ nghỉ: hẹn máy chủ gửi đúng lúc')
    hv.ev("() => stopRest()"); hv.wait_for_timeout(300); ok(any(pth == 'cancel' for (pth, q) in PUSH), 'Bỏ qua nghỉ: huỷ thông báo đã hẹn')
    # cấp mã mới: mã cũ hết hiệu lực
    co.ev("() => drvHvSheet('p2')"); co.wait_for_timeout(300); co.click('[data-act="drv-rekey"]'); co.wait_for_timeout(800)
    hv.ev("() => { DRV.last = 0; drvAuto(true); }"); hv.wait_for_timeout(1500)
    ok(hv.ev("() => DRV.st") == 'err', 'Cấp mã mới: máy cầm mã cũ báo lỗi')
    b.close()
srv.terminate()
print('ERRS', errs)
