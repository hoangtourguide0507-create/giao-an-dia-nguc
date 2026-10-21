import json, subprocess, time, sys
from playwright.sync_api import sync_playwright
srv = subprocess.Popen(['python3','-m','http.server','8765','-d','site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
errs=[]
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); (None if c else errs.append(m))
from playwright.sync_api import Page
def ev(self, code, arg=None):
    return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
with sync_playwright() as p:
    b = p.chromium.launch()
    C = b.new_context(); S = b.new_context()
    pc = C.new_page(); ps = S.new_page()
    for pg,n in [(pc,'HLV'),(ps,'HV')]:
        pg.on('pageerror', lambda e, n=n: errs.append(f'{n} pageerror: {e}'))
        pg.goto('http://localhost:8765/index.html'); pg.wait_for_timeout(1500)
    # --- máy HLV: bật HLV, tạo học viên Minh với giáo án 2 ngày
    pc.ev("""async () => {
      profiles.coach = { on: true, name: 'Hoàng' }; profiles.list.push({ id: 'pm', name: 'Minh', color: 1 }); saveProfiles();
      const st = freshState();
      const A = ['Đẩy ngực dốc lên (Incline press)'].map(newEx); const sq = newEx('Squat'); sq.sets = 4;
      const ex2 = newEx('Kéo xô (Lat pulldown)'); ex2.alts = [newEx('Chèo tạ đơn')];
      st.days = [{ id: uid(), name: 'Đẩy', exercises: [...A, sq].map(e => ({ ...e, alts: e.alts || [], slot: '', mainSince: ymd() })) },
                 { id: uid(), name: 'Kéo', exercises: [{ ...ex2, slot: '', mainSince: ymd() }] }];
      await LDB.put('kv', stateKey('pm'), st);
    }""")
    pkg = pc.ev("async () => (await syncPack('pm', { full: true })).pkg")
    ok(pkg['role']=='coach' and pkg['link']['pk']=='pm' and len(pkg['plan'])==2, 'HLV đóng gói giáo án cho Minh')
    # --- máy HV nhận
    ps.ev("async (P) => { await syncReceive(P); }", pkg); ps.wait_for_timeout(300)
    ok('Gộp vào hồ sơ' in ps.inner_text('#sheet'), 'HV thấy màn xem trước')
    ps.ev("async () => { await syncApply(); }"); ps.wait_for_timeout(400)
    st = ps.ev("() => ({ days: state.days.map(d => [d.name, d.exercises.map(e => [e.name, e.srcId, e.sets, (e.alts||[]).length])]), link: state.coachLink })")
    ok(st['link']['pk']=='pm' and len(st['days'])==2 and all(e[1] for d in st['days'] for e in d[1]), f'HV có giáo án + liên kết HLV: {st}')
    # --- HV tự tập 1 buổi + tự thêm 1 bài
    ps.ev("""() => {
      const d = state.days[0], e = d.exercises[0];
      const own = newEx('Gập bụng (Crunch)'); own.alts = []; own.slot=''; own.mainSince = ymd(); d.exercises.push(own);
      state.sessions.push({ id: 'sHV1', dayId: d.id, dayName: d.name, date: '2026-10-15', startedAt: Date.parse('2026-10-15T10:00:00'), finishedAt: Date.parse('2026-10-15T11:00:00'),
        entries: [{ exId: e.id, name: e.name, muscle: e.muscle, note:'', each:false, sets: [{kg:40,reps:10},{kg:42.5,reps:8}], drop:null },
                  { exId: own.id, name: own.name, muscle: own.muscle, note:'', each:false, sets: [{kg:0,reps:20}], drop:null }] });
      save();
    }""")
    pk2 = ps.ev("async () => (await syncPack(profiles.active)).pkg")
    ok(len(pk2['sessions'])==1 and pk2['plan'] is not None, 'HV chỉ gửi phần thay đổi (1 buổi + giáo án đã đổi)')
    pc.ev("async (P) => { await syncReceive(P); }", pk2); pc.wait_for_timeout(300)
    txt = pc.inner_text('#sheet'); ok('Minh' in txt and '1 buổi tập mới' in txt.replace('\n',' '), 'HLV xem trước: '+txt.replace('\n',' | ')[:200])
    pc.ev("async () => { await syncApply(); }"); pc.wait_for_timeout(400)
    cm = pc.ev("""async () => { const st = await LDB.get('kv', stateKey('pm')); const me = await LDB.get('kv', 'state');
      const ex = st.days[0].exercises[0];
      return { n: st.sessions.length, mapped: st.sessions[0].entries[0].exId === ex.id, kg: ex.currentKg, extra: st.days[0].exercises.map(e => [e.name, !!e.fromStudent]), meSess: me ? me.sessions.length : 0 }; }""")
    ok(cm['n']==1 and cm['mapped'] and cm['kg']==42.5, f'HLV nhận buổi, đúng bài, mức tạ 42.5: {cm}')
    ok(any(e[0].startswith('Gập bụng') and e[1] for e in cm['extra']), 'Bài HV tự thêm vào giáo án HLV')
    ok(cm['meSess']==0, 'Hồ sơ của HLV không bị đụng')
    # --- HLV hướng dẫn 1 buổi + đổi số set
    pc.ev("""async () => { const st = await LDB.get('kv', stateKey('pm')); const d = st.days[0], e = d.exercises[0]; e.sets = 5;
      st.sessions.push({ id: 'sHLV1', dayId: d.id, dayName: d.name, date: '2026-10-17', startedAt: Date.parse('2026-10-17T18:00:00'), finishedAt: Date.parse('2026-10-17T19:00:00'),
        entries: [{ exId: e.id, name: e.name, muscle: e.muscle, note:'HLV chỉnh form', each:false, sets: [{kg:45,reps:8}], drop:null }] });
      await LDB.put('kv', stateKey('pm'), st); }""")
    pk3 = pc.ev("async () => (await syncPack('pm')).pkg")
    ok(len(pk3['sessions'])==1, f'HLV chỉ gửi buổi mới, đã gửi {len(pk3["sessions"])} buổi')
    ps.ev("async (P) => { await syncReceive(P); }", pk3); ps.wait_for_timeout(300)
    ps.ev("async () => { await syncApply(); }"); ps.wait_for_timeout(400)
    sv = ps.ev("""() => { const e = state.days[0].exercises[0]; return { n: state.sessions.length, sets: e.sets, kg: baseKg(e), hist: exHistory(e.id).length, own: state.days[0].exercises.some(x => x.name.startsWith('Gập bụng')) }; }""")
    ok(sv['n']==2 and sv['sets']==5 and sv['kg']==45 and sv['hist']==2 and sv['own'], f'HV: 2 buổi, giáo án theo HLV (5 set), tạ 45, lịch sử liền mạch, bài tự thêm còn: {sv}')
    # --- trùng buổi
    ps.ev("""() => { const d = state.days[1], e = d.exercises[0]; state.sessions.push({ id: 'dupHV', dayId: d.id, dayName: d.name, date: '2026-10-18', startedAt: Date.parse('2026-10-18T07:00:00'), finishedAt: Date.parse('2026-10-18T08:00:00'), entries: [{ exId: e.id, name: e.name, muscle: e.muscle, note:'', each:false, sets: [{kg:30,reps:10}], drop:null }] }); save(); }""")
    pc.ev("""async () => { const st = await LDB.get('kv', stateKey('pm')); const d = st.days[1], e = d.exercises[0]; st.sessions.push({ id: 'dupHLV', dayId: d.id, dayName: d.name, date: '2026-10-18', startedAt: Date.parse('2026-10-18T07:05:00'), finishedAt: Date.parse('2026-10-18T08:00:00'), entries: [{ exId: e.id, name: e.name, muscle: e.muscle, note:'', each:false, sets: [{kg:30,reps:10},{kg:30,reps:10}], drop:null }] }); await LDB.put('kv', stateKey('pm'), st); }""")
    pk4 = ps.ev("async () => (await syncPack(profiles.active)).pkg")
    pc.ev("async (P) => { await syncReceive(P); }", pk4); pc.wait_for_timeout(300)
    t4 = pc.inner_text('#sheet'); ok('buổi bị trùng' in t4.lower(), 'HLV thấy cảnh báo trùng buổi')
    pc.click('[data-act="sync-pick"][data-v="mine"]'); pc.wait_for_timeout(300)
    pc.ev("async () => { await syncApply(); }"); pc.wait_for_timeout(400)
    c4 = pc.ev("async () => { const st = await LDB.get('kv', stateKey('pm')); return { ids: st.sessions.map(s => s.id), del: Object.keys(st.syncDel.s) }; }")
    ok('dupHV' not in c4['ids'] and 'dupHLV' in c4['ids'] and 'dupHV' in c4['del'], f'Chọn giữ bản máy HLV: {c4}')
    pk5 = pc.ev("async () => (await syncPack('pm')).pkg")
    ps.ev("async (P) => { await syncReceive(P); }", pk5); ps.wait_for_timeout(300); ps.ev("async () => { await syncApply(); }"); ps.wait_for_timeout(400)
    s5 = ps.ev("() => state.sessions.map(s => s.id)")
    ok('dupHV' not in s5 and 'dupHLV' in s5, f'HV xoá bản trùng theo HLV: {s5}')
    # --- xoá buổi trên HV lan sang HLV
    ps.ev("() => { markDelSession('sHV1'); state.sessions = state.sessions.filter(s => s.id !== 'sHV1'); save(); }")
    pk6 = ps.ev("async () => (await syncPack(profiles.active)).pkg")
    pc.ev("async (P) => { await syncReceive(P); }", pk6); pc.wait_for_timeout(300); pc.ev("async () => { await syncApply(); }"); pc.wait_for_timeout(400)
    c6 = pc.ev("async () => (await LDB.get('kv', stateKey('pm'))).sessions.map(s => s.id)")
    ok('sHV1' not in c6, f'Xoá buổi lan sang HLV: {c6}')
    # --- hoàn tác
    pc.ev("async () => { await syncUndo(); }"); pc.wait_for_timeout(300)
    c7 = pc.ev("async () => (await LDB.get('kv', stateKey('pm'))).sessions.map(s => s.id)")
    ok('sHV1' in c7, f'Hoàn tác khôi phục: {c7}')
    # --- ảnh qua file, QR không mang ảnh
    ps.ev("""async () => { const c = document.createElement('canvas'); c.width = c.height = 40; const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0,0,40,40);
      const v = c.toDataURL('image/jpeg', 0.8); const id = uid(); await DB.put('photos', id, v); state.days[0].exercises[1].photos = [id]; save(); }""")
    qr = ps.ev("async () => (await syncPack(profiles.active)).pkg")
    pc.ev("async (P) => { await syncReceive(P); }", qr); pc.wait_for_timeout(300)
    ok('chưa kèm trong gói' in pc.inner_text('#sheet'), 'Gói QR báo thiếu ảnh, nhắc gửi file')
    fl = ps.ev("async () => (await syncPack(profiles.active, { withPhotos: true })).pkg")
    ok(len(fl.get('photos',{}))==1, 'Gói file có kèm ảnh')
    pc.ev("async (P) => { await syncReceive(P); }", fl); pc.wait_for_timeout(300); pc.ev("async () => { await syncApply(); }"); pc.wait_for_timeout(400)
    ph = pc.ev("async () => { const st = await LDB.get('kv', stateKey('pm')); const e = st.days[0].exercises[1]; return [e.name, e.photos.length, !!(await DB.get('photos', e.photos[0]))]; }")
    ok(ph[1]==1 and ph[2], f'HLV nhận ảnh: {ph}')
    # gửi lại lần nữa không nhân đôi ảnh
    pc.ev("async (P) => { await syncReceive(P); }", fl); pc.wait_for_timeout(300)
    ok('không có gì mới' in pc.inner_text('#sheet'), 'Gửi lại cùng gói: không trùng lặp')
    # --- giao diện: các màn hình mở được
    pc.ev("async () => { closeSheet(); await syncSheet('pm'); }"); pc.wait_for_timeout(200)
    ok('Đồng bộ với học viên Minh' in pc.inner_text('#sheet'), 'Màn Đồng bộ trên máy HLV')
    pc.click('[data-act="sync-qr"]'); pc.wait_for_timeout(500)
    ok(pc.ev("() => !!document.querySelector('#qr-c') && document.querySelector('#qr-c').width > 0"), 'Hiện mã QR')
    pc.screenshot(path='qr.png')
    ps.ev("async () => { closeSheet(); await syncSheet(); }"); ps.wait_for_timeout(200)
    ok('Đồng bộ với HLV Hoàng' in ps.inner_text('#sheet'), 'Màn Đồng bộ trên máy HV')
    ps.set_viewport_size({'width':390,'height':844}); ps.screenshot(path='hv-sync.png')
    # sai vai trò
    pc.ev("async (P) => { await syncReceive(P); }", pk3); pc.wait_for_timeout(200)
    ok('Không đồng bộ được' in pc.inner_text('#sheet'), 'Chặn gói HLV mở trên máy HLV')
    b.close()
srv.terminate()
print('\nLỖI:', errs if errs else 'không có')
