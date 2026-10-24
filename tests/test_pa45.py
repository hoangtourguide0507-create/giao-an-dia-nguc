"""PA-45 C: nhãn chất lượng buổi tập (sessQuality, BR-32.1–32.4)."""
import subprocess, time
from playwright.sync_api import sync_playwright, Page
def ev(self, code, arg=None): return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
errs = []
def ok(c, m): print(('PASS ' if c else 'FAIL ') + m); (None if c else errs.append(m))
srv = subprocess.Popen(['python3', '-m', 'http.server', '8799', '-d', 'site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
SEED = """() => { const x = newEx('Ép ngực tạ đòn (Bench press)'); x.sets = 3; x.repTarget = 10;
  const st = clone(state); st.days = [{ id: 'd1', name: 'Ngực', exercises: [{ ...x, alts: [], slot: '', mainSince: ymd() }] }];
  loadState(st); save(); ui.tab = 'home'; render(true); return x.id; }"""
QUALITY = "(a) => sessQuality({ entries: [{ exId: a.id, sets: a.sets }] })"
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 390, 'height': 844})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.goto('http://localhost:8799/index.html'); pg.wait_for_timeout(1500)
    eid = pg.ev(SEED); pg.wait_for_timeout(500)
    good = pg.ev(QUALITY, {'id': eid, 'sets': [{'kg': 40, 'reps': 10, 'ef': 'm'}, {'kg': 40, 'reps': 10}, {'kg': 40, 'reps': 10}]})
    ok(good and good['label'] == 'Tốt' and good['done'] == 3 and good['repOk'] == 3, f'Đủ set, đủ rep → Tốt ({good})')
    short = pg.ev(QUALITY, {'id': eid, 'sets': [{'kg': 40, 'reps': 8}]})
    ok(short and short['label'] == 'Cần xem lại' and short['plan'] == 3, f'Thiếu set, thiếu rep → Cần xem lại ({short})')
    mid = pg.ev(QUALITY, {'id': eid, 'sets': [{'kg': 40, 'reps': 10}, {'kg': 40, 'reps': 10}, {'kg': 40, 'reps': 8}]})
    ok(mid and mid['label'] == 'Cần xem lại', f'Đủ set nhưng 2/3 đủ rep → Cần xem lại ({mid})')
    gone = pg.ev("() => sessQuality({ entries: [{ exId: 'khong-co', sets: [{ kg: 20, reps: 10 }] }] })")
    ok(gone is None, 'Bài không còn trong giáo án → không có nhãn')
    pg.close(); b.close()
srv.terminate()
print('ERRS', errs)
