import subprocess, time, json
from playwright.sync_api import sync_playwright, Page
srv = subprocess.Popen(['python3','-m','http.server','8779','-d','site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
def ev(self, code, arg=None): return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
errs=[]
def ok(c,m): print(('PASS ' if c else 'FAIL ')+m); (None if c else errs.append(m))
PLAN = """(o) => { const names = LIB.map(l => l[0]); let n = 0; return Array.from({ length: o.D }, (_, d) => ({ id: uid(), name: 'Ngày ' + (d + 1), exercises: Array.from({ length: o.K }, () => { const e = newEx(names[n++ % names.length]); e.sets = 4; e.repMin = 6; e.repMax = 10; e.repTarget = 8; if (o.setup) e.setup = 'Ghế nấc 3, chốt tạ lỗ 5'; e.currentKg = 40; e.alts = o.alt ? [newEx(names[n++ % names.length])] : []; e.slot = ''; e.mainSince = ymd(); return e; }) })); }"""
SESS = """(o) => { const st = o.st; for (let k = 0; k < o.n; k++) { const d = st.days[k % st.days.length], t = Date.parse('2026-09-01T10:00:00') + k * 864e5 * 2; st.sessions.push({ id: uid(), dayId: d.id, dayName: d.name, date: ymd(new Date(t)), startedAt: t, finishedAt: t + 3600e3,
  entries: d.exercises.map(e => ({ exId: e.id, name: e.name, muscle: e.muscle, note: '', each: false, sets: [{ kg: 40, reps: 8 }, { kg: 40, reps: 8 }, { kg: 42.5, reps: 7 }, { kg: 42.5, reps: 6 }], drop: null })) }); } return st; }"""
with sync_playwright() as p:
    b = p.chromium.launch()
    C = b.new_context(viewport={'width':390,'height':844}); S = b.new_context(viewport={'width':390,'height':844})
    pc, ps = C.new_page(), S.new_page()
    for pg,n in [(pc,'HLV'),(ps,'HV')]:
        pg.on('pageerror', lambda e, n=n: errs.append(f'{n}: {e}')); pg.goto('http://localhost:8779/index.html'); pg.wait_for_timeout(1300)
    # --- kích thước mã giáo án
    sizes = pc.ev("async (P) => { const mk = eval(P); const out = {}; for (const [D, K, alt, setup] of [[3, 6, 0, 0], [5, 7, 0, 0], [5, 7, 1, 0], [5, 7, 1, 1], [6, 8, 1, 1]]) { const days = mk({ D, K, alt, setup }); out[`${D}×${K}${alt ? '+thay' : ''}${setup ? '+ghi chú' : ''}`] = [(await encodePlan(days)).length, ('GAP2.abcd.1.1.' + await encodePlan2(days)).length]; } return out; }", PLAN)
    for k,v in sizes.items(): print(f'   giáo án {k}: cũ {v[0]} → mới {v[1]} ký tự')
    ok(all(v[1] <= 900 for v in sizes.values()), 'Mọi cỡ giáo án đều vừa 1 mã')
    # --- giáo án gọn giải mã đúng
    rt = pc.ev("""async (P) => { const days = eval(P)({ D: 5, K: 7, alt: 1, setup: 1 }); days[0].exercises[0].name = 'Bài tự tạo của tôi'; days[0].exercises[0].muscle = 'Vai'; days[0].exercises[1].dropSet = true; days[0].exercises[1].each = true;
      const back = await decodePlan(await encodePlan2(days)); const a = days[0].exercises, z = back[0].exercises;
      return { days: back.length, n: z.length, alts: z[2].alts.length, custom: [z[0].name, z[0].muscle], drop: z[1].dropSet, each: z[1].each, sets: z[3].sets, rep: [z[3].repMin, z[3].repMax, z[3].repTarget], setup: z[3].setup, sameNames: a.every((x, i) => x.name === z[i].name) }; }""", PLAN)
    ok(rt['days']==5 and rt['n']==7 and rt['alts']==1 and rt['custom']==['Bài tự tạo của tôi','Vai'] and rt['drop'] and rt['each'] and rt['sets']==4 and rt['rep']==[6,10,8] and rt['setup']=='Ghế nấc 3, chốt tạ lỗ 5' and rt['sameNames'], f'Giáo án gọn giải mã đủ thông tin: {rt}')
    # --- đồng bộ: HLV có Minh (5×7 + bài thay, 30 buổi lịch sử)
    pc.ev("async (o) => { profiles.coach = { on: true, name: 'Hoàng' }; profiles.list.push({ id: 'pm', name: 'Minh', color: 1 }); saveProfiles(); const st = freshState(); st.days = eval(o.P)({ D: 5, K: 7, alt: 1, setup: 1 }); eval(o.S)({ st, n: 30 }); await LDB.put('kv', stateKey('pm'), st); }", {'P':PLAN,'S':SESS})
    rounds = []; total_recv = 0
    for r in range(10):
        q = pc.ev("async () => { const Q = await syncPackQR('pm'); window.__Q = Q; return { codes: Q.parts.length, len: Math.max(...Q.parts.map(x => x.length)), sent: Q.sent, left: Q.left, plan: !!Q.pkg.plan }; }")
        rounds.append(q)
        ps.ev("async (parts) => { closeSheet(); const J = joinQrParts(parts); await syncQrReceive2(J.body); }", pc.ev("() => window.__Q.parts")); ps.wait_for_timeout(300)
        if ps.locator('#sheet [data-act="sync-apply"]').count(): ps.ev("async () => { await syncApply(); }"); ps.wait_for_timeout(300)
        pc.ev("async () => { await syncMarkSent('pm', window.__Q.mark); }")
        if q['left'] == 0: break
    print('   các lượt:', rounds)
    ok(all(x['len'] <= 900 for x in rounds) and all(x['codes']==1 for x in rounds[1:]), f'Mỗi mã ≤ 900 ký tự; chỉ lượt gửi giáo án đầu tiên cần {rounds[0]["codes"]} mã, các lượt sau đúng 1 mã ({len(rounds)} lượt cho 30 buổi)')
    hv = ps.ev("() => ({ n: state.sessions.length, days: state.days.length, ex: state.days.reduce((a, d) => a + d.exercises.length, 0), link: (state.coachLink || {}).pk, hist: exHistory(state.days[0].exercises[0].id).length, kg: baseKg(state.days[0].exercises[0]), setup: state.days[0].exercises[0].setup, alts: state.days[0].exercises[0].alts.length })")
    ok(hv['n']==30 and hv['days']==5 and hv['ex']==35 and hv['link']=='pm' and hv['hist']==6 and hv['kg']==42.5 and hv['alts']==1, f'HV nhận đủ 30 buổi + giáo án, lịch sử gắn đúng bài: {hv}')
    # --- lượt bình thường sau buổi tập: 1 mã nhỏ
    ps.ev("""() => { const d = state.days[1]; const t = Date.parse('2026-10-18T09:00:00'); state.sessions.push({ id: 'hv-new', dayId: d.id, dayName: d.name, date: '2026-10-18', startedAt: t, finishedAt: t + 3600e3, entries: d.exercises.slice(0, 5).map(e => ({ exId: e.id, name: e.name, muscle: e.muscle, note: '', each: false, sets: [{ kg: 45, reps: 8 }, { kg: 45, reps: 8 }, { kg: 45, reps: 7 }], drop: null })) }); save(); }""")
    q = ps.ev("async () => { const Q = await syncPackQR(profiles.active); window.__Q = Q; return { codes: Q.parts.length, len: Q.parts[0].length, sent: Q.sent, left: Q.left }; }")
    print('   lượt thường (HV → HLV):', q)
    ok(q['codes']==1 and q['sent']>=1 and q['left']==0 and q['len'] < 900, 'Sau 1 buổi tự tập: 1 mã, đủ dữ liệu')
    pc.ev("async (parts) => { closeSheet(); await syncQrReceive2(joinQrParts(parts).body); }", ps.ev("() => window.__Q.parts")); pc.wait_for_timeout(300); pc.ev("async () => { await syncApply(); }"); pc.wait_for_timeout(300)
    cm = pc.ev("async () => { const st = await LDB.get('kv', stateKey('pm')); const s = st.sessions.find(x => x.id === 'hv-new'); const d = st.days[1]; return { has: !!s, mapped: s && s.entries.every(en => d.exercises.some(e => e.id === en.exId)), n: st.sessions.length, ex: st.days.reduce((a, x) => a + x.exercises.length, 0) }; }")
    ok(cm['has'] and cm['mapped'] and cm['n']==31 and cm['ex']==35, f'HLV nhận buổi mới, gắn đúng bài, không sinh bài trùng: {cm}')
    # --- màn hình: 1 mã đứng yên
    pc.ev("async () => { await syncSheet('pm'); }"); pc.locator('[data-act="sync-qr"]').click(); pc.wait_for_timeout(600)
    one = pc.ev("() => { const a = $('#qr-c').toDataURL(); return new Promise(r => setTimeout(() => r([a === $('#qr-c').toDataURL(), $('#qr-pg').textContent]), 2000)); }")
    ok(one[0] and one[1]=='', f'Màn mã đồng bộ: 1 mã đứng yên, không lật trang {one}')
    pc.screenshot(path='m1-sync.png'); pc.ev("() => { clearInterval(ui.qrT); closeSheet(); }")
    ps.ev("() => { closeSheet(); planQrSheet(); }"); ps.wait_for_timeout(600)
    one = ps.ev("() => { const a = $('#qr-c').toDataURL(); return new Promise(r => setTimeout(() => r([a === $('#qr-c').toDataURL(), $('#qr-pg').textContent]), 2000)); }")
    ok(one[0] and one[1]=='', 'Màn gửi giáo án: 1 mã đứng yên')
    ps.screenshot(path='m2-plan.png')
    # --- quét được bằng camera (mô phỏng) ở mức đưa gần
    sc = ps.ev("""async () => { const t = 'GAP2.abcd.1.1.' + await encodePlan2(state.days); const q = document.createElement('canvas'); drawQR(q, t); const res = [];
      for (const frac of [0.4, 0.5, 0.65, 0.8]) { const f = document.createElement('canvas'); f.width = 1920; f.height = 1080; const g = f.getContext('2d'); g.fillStyle = '#222'; g.fillRect(0,0,1920,1080); g.filter = 'blur(1.5px)'; const s = 1080 * frac; g.drawImage(q, (1920 - s) / 2, (1080 - s) / 2, s, s);
        const side = 918, c = document.createElement('canvas'); let okk = false; for (const W of [918, 480]) { c.width = c.height = W; c.getContext('2d').drawImage(f, 501, 81, side, side, 0, 0, W, W); const r = jsQR(c.getContext('2d').getImageData(0,0,W,W).data, W, W, { inversionAttempts: 'dontInvert' }); if (r && r.data === t) okk = true; } res.push(okk); }
      return { len: t.length, res }; }""")
    ok(all(sc['res'][1:]), f"Mã giáo án {sc['len']} ký tự quét được khi chiếm 50–80% khung: {sc['res']}")
    # --- mã cũ (nhiều trang, GAS1/GAP1) vẫn đọc được
    old = pc.ev("async () => { const { pkg } = await syncPack('pm', {}); const bytes = new TextEncoder().encode(JSON.stringify(pkg)); return 'z' + b64u(await pipeBytes(bytes, new CompressionStream('deflate-raw'))); }")
    ps.ev("async (b) => { closeSheet(); await syncQrReceive(b); }", old); ps.wait_for_timeout(300)
    ok(ps.locator('#sheet').is_visible() and 'Dữ liệu từ HLV' in ps.inner_text('#sheet'), 'Mã đồng bộ kiểu cũ vẫn đọc được')
    b.close()
srv.terminate()
print('\nLỖI:', errs if errs else 'không có')
