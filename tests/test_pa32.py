# PA-32: chia sẻ kết quả buổi tập với PT. Hai trình duyệt: học viên tạo link, PT mở link và nhận vào app.
import os, subprocess, time
from playwright.sync_api import sync_playwright
errs = []
def ok(c, m): print(('PASS ' if c else 'FAIL ') + m); (None if c else errs.append(m))
def run(pg, fn):
    """chạy một hàm JS trong IIFE của app (qua móc window.__ev của bản thử); fn là chuỗi hàm JS, có thể async"""
    return pg.evaluate("c => window.__ev(c)()", fn)
srv = subprocess.Popen(['python3', '-m', 'http.server', '8794', '-d', 'site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
exe = os.environ.get('GADN_CHROMIUM') or None
SEED = """() => {
  const ex = { id: 'e1', name: 'Đẩy ngực tạ đòn (Bench press)', muscle: 'Ngực', type: 'upper', sets: 3, repTarget: 10, repMin: 8, repMax: 12, currentKg: 40, step: 2.5, rest: 0, restV: 2, setup: '', photos: [], alts: [], slot: '', mainSince: '2026-10-01', gid: null, warmup: true, each: false };
  state.days = [{ id: 'd1', name: 'Ngực', exercises: [ex] }];
  state.sessions = [{ id: 's1', dayId: 'd1', dayName: 'Ngực', date: '2026-10-21', startedAt: Date.parse('2026-10-21T18:00:00+07:00'), finishedAt: Date.parse('2026-10-21T18:50:00+07:00'), deload: false, est: 0,
    entries: [{ exId: 'e1', name: ex.name, muscle: 'Ngực', note: 'Vai trái hơi đau', each: false, sets: [{ kg: 42.5, reps: 10 }, { kg: 40, reps: 10, ef: 'm' }], drop: null }] }];
  profiles.list[0].uid = 'u8f3k2m9x1qz'; state.settings.name = 'Hoàng';
}"""
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=exe)
        # ----- học viên -----
        hv = b.new_context(viewport={'width': 390, 'height': 844}); pg = hv.new_page(); pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        pg.goto('http://localhost:8794/index.html'); pg.wait_for_timeout(800)
        run(pg, SEED)
        link = run(pg, "async () => shLink(await shEncode(state.sessions, { uid: curProf().uid, name: state.settings.name }, '2026-10-21'))")
        ok(link.startswith('http://localhost:8794/index.html#cs='), 'Link có dạng #cs=')
        ok(len(link) <= 350, 'Link một ngày điển hình ≤ 350 ký tự (%d)' % len(link))
        # ----- PT: máy trống, mở link -----
        pt = b.new_context(viewport={'width': 390, 'height': 844}); pp = pt.new_page(); pp.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        pp.goto('http://localhost:8794/index.html'); pp.wait_for_timeout(800)
        pp.goto(link); pp.wait_for_timeout(1200)
        shown = run(pp, "() => !document.querySelector('#sheet').hidden && document.querySelector('#sheet-body').textContent.includes('Kết quả của Hoàng')")
        ok(shown, 'PT mở link → xem trước kết quả của Hoàng')
        ok(run(pp, "() => coach() !== null"), 'PT tự bật chế độ HLV')
        run(pp, "async () => { await shareCreate(); }"); pp.wait_for_timeout(800)
        hit = run(pp, "() => profiles.list.find(p => p.name === 'Hoàng') || null")
        ok(bool(hit) and hit.get('uid') == 'u8f3k2m9x1qz', 'Tạo học viên mới với userid của link')
        n = run(pp, "async () => (await profState(profiles.list.find(p => p.name === 'Hoàng').id)).sessions.length")
        ok(n == 1, 'Học viên mới có đúng 1 buổi từ link')
        # ----- link hỏng -----
        pp.goto('http://localhost:8794/index.html#cs=abc'); pp.wait_for_timeout(800)
        ok('Không đọc được' in pp.evaluate("() => document.querySelector('#toast').textContent"), 'Link hỏng báo lỗi, không đổi dữ liệu')
        b.close()
finally:
    srv.terminate()
print('XONG' if not errs else 'CÓ LỖI: ' + '; '.join(errs))
