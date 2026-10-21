import subprocess, time, json
from playwright.sync_api import sync_playwright, Page
srv = subprocess.Popen(['python3','-m','http.server','8776','-d','site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
def ev(self, code, arg=None): return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
errs=[]
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); (None if c else errs.append(m))
CAPTURE = "() => { window.__imgs = []; shareImage = async (blob, name) => { window.__imgs.push({ blob, name }); }; window.__files = []; saveFile = async (name, data) => { window.__files.push({ name, data }); }; }"
SHOTS = """async (o) => { /* ảnh chụp màn hình iPhone của từng trang mã QR */ const code = await encodePlan(state.days); const parts = qrChunks('GAP1', code); window.__shots = [];
  for (const [i, t] of parts.entries()) { if (o.skip === i) continue; const q = document.createElement('canvas'); drawQR(q, t); const c = document.createElement('canvas'); c.width = 1170; c.height = 2532; const g = c.getContext('2d'); g.fillStyle = '#151517'; g.fillRect(0, 0, 1170, 2532); g.fillStyle = '#fff'; g.fillRect(85, 700, 1000, 1000); g.drawImage(q, 120, 735, 930, 930);
    window.__shots.push(new File([await new Promise(r => c.toBlob(r, 'image/png'))], `IMG_${i}.PNG`, { type: 'image/png' })); }
  return parts.length; }"""
with sync_playwright() as p:
    b = p.chromium.launch()
    A = b.new_context(viewport={'width':390,'height':844}); B = b.new_context(viewport={'width':390,'height':844})
    pa, pb = A.new_page(), B.new_page()
    for pg,n in [(pa,'A'),(pb,'B')]:
        pg.on('pageerror', lambda e, n=n: errs.append(f'{n}: {e}')); pg.goto('http://localhost:8776/index.html'); pg.wait_for_timeout(1300); pg.ev(CAPTURE)
    pa.ev("""() => { const names = LIB.map(l => l[0]); let n = 0; state.days = Array.from({ length: 5 }, (_, d) => ({ id: uid(), name: 'Ngày ' + (d + 1), exercises: Array.from({ length: 7 }, () => { const e = newEx(names[n++ % names.length]); e.alts = [newEx(names[n++ % names.length])]; e.slot = ''; e.mainSince = ymd(); return e; }) })); save(); ui.tab = 'settings'; render(); }""")
    pa.wait_for_timeout(300)
    card = pa.locator('.set-card', has_text='Gửi & nhận bằng mã QR')
    ok(card.count()==1 and card.locator('[data-act="qr-scan"]').count()==1 and card.locator('[data-act="share"]').count()==1, 'Tab Tôi: chỉ còn Quét mã / Gửi giáo án (QR) / Đồng bộ')
    ok(pa.locator('text=Tạo link chia sẻ').count()==0 and pa.locator('[data-act="native-share"], [data-act="paste-code"], [data-act="plan-file"]').count()==0, 'Không còn link / Zalo / file chia sẻ')
    card.locator('[data-act="share"]').click(); pa.wait_for_timeout(500)
    ok(pa.locator('#sheet #qr-c').count()==1 and pa.locator('#sheet [data-act="plan-img"]').count()==1, 'Gửi giáo án: mã QR + Lưu ảnh mã vào Ảnh')
    pa.screenshot(path='q1-send.png')
    pa.ev("() => { clearInterval(ui.qrT); closeSheet(); }")
    # máy quét có Chọn từ Ảnh (nhiều ảnh)
    pb.ev("() => qrScanSheet()"); pb.wait_for_timeout(400)
    ok(pb.locator('#sheet label[for="img-in"]').count()==1 and pb.locator('#img-in[multiple]').count()==1, 'Quét mã: có nút Chọn từ Ảnh, chọn được nhiều ảnh')
    pb.screenshot(path='q2-scan.png'); pb.ev("() => { qrStop(); closeSheet(); }")
    # chụp màn hình từng trang rồi chọn hết
    n = pa.ev(SHOTS, {'skip': -1})
    shots = pa.ev("async () => Promise.all(window.__shots.map(async f => ({ n: f.name, u: await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); }) })))")
    pb.ev("async (L) => { const fs = []; for (const x of L) { const r = await fetch(x.u); fs.push(new File([await r.blob()], x.n, { type: 'image/png' })); } await receiveQrImage(fs); }", shots); pb.wait_for_timeout(500)
    ok(pb.locator('#sheet [data-act="import-apply"]').count()==1, f'Chọn {n} ảnh chụp màn hình các trang: app tự ghép, hiện giáo án')
    pb.locator('#sheet [data-act="import-apply"]').click(); pb.wait_for_timeout(400)
    ok(pb.ev("() => state.days.length")==5, 'Nhập giáo án từ ảnh chụp màn hình')
    # thiếu 1 trang
    pa.ev(SHOTS, {'skip': 1}); shots2 = pa.ev("async () => Promise.all(window.__shots.map(async f => ({ n: f.name, u: await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); }) })))")
    pb.ev("async (L) => { const fs = []; for (const x of L) { const r = await fetch(x.u); fs.push(new File([await r.blob()], x.n, { type: 'image/png' })); } await receiveQrImage(fs); }", shots2); pb.wait_for_timeout(300)
    ok('thiếu trang 2' in pb.inner_text('#toast').lower(), 'Thiếu ảnh 1 trang: báo đúng trang còn thiếu')
    # ảnh mã đầy đủ (Lưu ảnh mã vào Ảnh)
    pa.ev("async () => { await planImageSend(''); }")
    u = pa.ev("async () => { const b = window.__imgs[0].blob; return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); }")
    pb.ev("() => closeSheet()"); pb.ev("async (u) => { const r = await fetch(u); await receiveQrImage([new File([await r.blob()], 'a.png', { type: 'image/png' })]); }", u); pb.wait_for_timeout(400)
    ok(pb.locator('#sheet [data-act="import-update"]').count()==1, 'Ảnh mã đầy đủ: đọc được, có nút Cập nhật giáo án hiện tại')
    # link cũ vẫn mở được
    code = pa.ev("async () => encodePlan(state.days)"); L = b.new_context().new_page(); L.on('pageerror', lambda e: errs.append('L: '+str(e)))
    L.goto('http://localhost:8776/index.html#nhap=' + code); L.wait_for_timeout(1500)
    ok(L.locator('#sheet [data-act="import-apply"]').count()==1, 'Link cũ người khác gửi trước đây vẫn mở được')
    # đồng bộ: không còn file
    pa.ev("""async () => { closeSheet(); profiles.coach = { on: true, name: 'Hoàng' }; profiles.list.push({ id: 'pm', name: 'Minh', color: 1 }, { id: 'pl', name: 'Lan', color: 2 }); saveProfiles();
      const mk = (n, k) => { const st = freshState(); st.days = [{ id: uid(), name: 'Ngày ' + n, exercises: [newEx('Squat')].map(e => ({ ...e, alts: [], slot: '', mainSince: ymd() })) }];
        for (let i = 0; i < k; i++) st.sessions.push({ id: n + i, dayId: st.days[0].id, dayName: st.days[0].name, date: '2026-10-1' + i, startedAt: Date.parse('2026-10-1' + i + 'T10:00:00'), finishedAt: Date.parse('2026-10-1' + i + 'T11:00:00'), entries: [{ exId: st.days[0].exercises[0].id, name: 'Squat', muscle: 'Đùi trước', note: '', each: false, sets: [{ kg: 50, reps: 8 }], drop: null }] });
        return st; };
      const c = document.createElement('canvas'); c.width = c.height = 20; c.getContext('2d').fillRect(0, 0, 20, 20); const ph = c.toDataURL('image/jpeg', .8); await DB.put('photos', 'phMinh', ph);
      const sm = mk('Minh', 3); sm.days[0].exercises[0].photos = ['phMinh']; await LDB.put('kv', stateKey('pm'), sm); await LDB.put('kv', stateKey('pl'), mk('Lan', 2)); await syncSheet('pm'); }""")
    pa.wait_for_timeout(300)
    ok(pa.locator('#sheet [data-act="sync-file"], #sync-in').count()==0 and pa.locator('#sheet [data-act="sync-img"]').count()==1, 'Đồng bộ: bỏ file, còn QR + Lưu ảnh mã + Chọn từ Ảnh')
    ok(pa.ev("() => { ui.tab = 'coach'; render(); return true; }") and pa.locator('[data-act="coach-share"]').count()==0, 'Phòng HLV: bỏ nút Gửi giáo án riêng')
    # file của 1 người
    pa.ev("() => { closeSheet(); ui.tab = 'settings'; render(); }"); pa.wait_for_timeout(300)
    pa.locator('[data-act="backup"]').click(); pa.wait_for_timeout(300)
    ok(pa.locator('#sheet [data-act="backup-one"]').count()==3, 'Tải file: chọn 1 trong 3 hồ sơ')
    pa.locator('#sheet [data-act="backup-one"][data-id="pm"]').click(); pa.wait_for_timeout(600)
    pa.locator('#sheet [data-act="backup-save"]').click(); pa.wait_for_timeout(400)
    f = pa.ev("() => { const f = window.__files[window.__files.length - 1]; return { name: f.name, data: f.data }; }")
    d = json.loads(f['data'])
    ok(d.get('one') and d['person']['name']=='Minh' and 'states' not in d and len(d['state']['sessions'])==3 and list(d['photos'].keys())==['phMinh'], f"File chỉ có dữ liệu Minh ({f['name']}, {len(f['data'])//1024} KB)")
    ok('Lan' not in f['data'], 'Không lẫn dữ liệu của Lan')
    # máy B nhận file: thêm hồ sơ mới, rồi thay hồ sơ có sẵn
    pb.ev("() => closeSheet()"); pb.ev("(d) => restoreOneSheet(d)", d); pb.wait_for_timeout(300)
    pb.locator('#sheet [data-act="restore-one-new"]').click(); pb.wait_for_timeout(500)
    r1 = pb.ev("async () => { const p = profiles.list.find(x => x.name === 'Minh'); const st = await profState(p.id); return { n: profiles.list.length, s: st.sessions.length, mine: state.days.length, ph: !!(await DB.get('photos', 'phMinh')) }; }")
    ok(r1['n']==2 and r1['s']==3 and r1['mine']==5 and r1['ph'], f'Máy B: thêm hồ sơ Minh, hồ sơ của B giữ nguyên: {r1}')
    pb.ev("(d) => restoreOneSheet(d)", d); pb.wait_for_timeout(300)
    pid = pb.ev("() => profiles.list.find(x => x.name === 'Minh').id")
    pb.locator(f'#sheet [data-act="restore-one-into"][data-id="{pid}"]').click(); pb.wait_for_timeout(300)
    pb.locator('#sheet .btn.danger, #sheet [data-act="confirm-ok"]').first.click(); pb.wait_for_timeout(500)
    r2 = pb.ev("async () => ({ n: profiles.list.length, mine: state.days.length })")
    ok(r2['n']==2 and r2['mine']==5, f'Thay hồ sơ Minh: không tạo trùng, hồ sơ khác nguyên vẹn: {r2}')
    b.close()
srv.terminate()
print('\nLỖI:', errs if errs else 'không có')
