"""PA-22: bố cục & điều hướng mới, 2 giao diện Hổ Phách / Đen Tuyền."""
import subprocess, time
from playwright.sync_api import sync_playwright, Page
def ev(self, code, arg=None): return self.evaluate("([c, a]) => { const f = window.__ev('(' + c + ')'); return f(a); }", [code, arg])
Page.ev = ev
errs = []
def ok(c, m): print(('PASS ' if c else 'FAIL ') + m); (None if c else errs.append(m))
srv = subprocess.Popen(['python3', '-m', 'http.server', '8797', '-d', 'site'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
SEED = """() => { const xs = ['Kéo xô (Lat pulldown)', 'Chèo cáp ngồi (Seated cable row)', 'Squat', 'Đẩy ngực tạ đòn (Bench press)'].map(newEx); xs.forEach((x, i) => { x.currentKg = 30 + i * 5; });
  const st = clone(state); st.settings.skin = 'hell'; st.settings.skin22 = 0;
  st.days = [{ id: 'd1', name: 'Lưng', exercises: xs.slice(0, 2).map(e => ({ ...e, alts: [], slot: '', mainSince: ymd() })) }, { id: 'd2', name: 'Chân', exercises: [xs[2]].map(e => ({ ...e, alts: [], slot: '', mainSince: ymd() })) }, { id: 'd3', name: 'Ngực', exercises: [xs[3]].map(e => ({ ...e, alts: [], slot: '', mainSince: ymd() })) }];
  const t = Date.now() - 864e5 * 2; st.sessions = [{ id: 's1', dayId: 'd2', dayName: 'Chân', date: ymd(new Date(t)), startedAt: t, finishedAt: t + 3e6, entries: [{ exId: xs[2].id, name: xs[2].name, muscle: xs[2].muscle, note: '', each: false, sets: [{ kg: 40, reps: 10 }, { kg: 40, reps: 10 }], drop: null }] }];
  st.pains = [{ id: 'pp', area: 'Vai', level: 1, since: ymd(), note: '', resolvedAt: null }];
  loadState(st); save(); ui.tab = 'home'; render(true); }"""
def noscroll(pg): return pg.ev("() => document.documentElement.scrollWidth <= innerWidth + 1")
with sync_playwright() as p:
    b = p.chromium.launch()
    for W in [390, 360]:
        pg = b.new_page(viewport={'width': W, 'height': 844}, device_scale_factor=2)
        pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        pg.goto('http://localhost:8797/index.html'); pg.wait_for_timeout(1500)
        pg.ev(SEED); pg.wait_for_timeout(700)
        if W == 390:
            ok(pg.ev("() => [state.settings.skin, document.documentElement.dataset.skin]") == ['amber', 'amber'], 'Giao diện cũ (Lửa Địa Ngục) tự chuyển sang Hổ Phách')
            labels = pg.ev("() => [...document.querySelectorAll('.nav .bar > button .lb')].map(x => x.textContent)")
            ok(labels == ['Trang chủ', 'Lịch tập', 'Tập', 'Tiến độ', 'Tài khoản'], f'Thanh dưới 5 tab mới ({labels})')
            ok(pg.locator('.nav [data-tab="home"][aria-current="page"]').count() == 1, 'Trang chủ đang sáng')
            ok(pg.locator('.hero.tix .tcut').count() == 1 and pg.locator('.hero.tix .tgo[data-act="start-day"]').count() == 1, 'Thẻ vé buổi hôm nay có đường cắt và nút Bắt đầu')
            cut = pg.ev("() => document.querySelector('.hero.tix').style.getPropertyValue('--cut')")
            ok(cut.endswith('%') and 55 < float(cut[:-1]) < 95, f'Khoét hai bên thẻ vé ngang đường cắt ({cut})')
            ok(pg.locator('.daychips .dchip[data-act="pick-day"]').count() == 3 and pg.locator('.daychips .dchip[aria-pressed="true"]').count() == 1, 'Chip chọn buổi: 3 ngày tập, 1 đang chọn')
            pg.locator('.dchip[data-id="d3"]').click(); pg.wait_for_timeout(300)
            ok(pg.locator('.hero.tix .h1').inner_text() == 'Ngực', 'Bấm chip đổi thẻ buổi hôm nay')
            ok(pg.locator('.g2 .mini').count() == 2, 'Hai thẻ nhỏ: tuần này, buổi gần nhất')
            ok(pg.locator('.banner.pain.beam').count() == 1, 'Cảnh báo đau có viền sáng chạy')
            n = pg.ev("() => todoItems().length")
            ok(pg.locator('#todos .tdi').count() == n and n >= 1, f'Việc cần làm gom thành thẻ lật ngang ({n})')
            ok(pg.locator('#bell .bd').inner_text() == str(n + 1), 'Chuông: số việc cần làm (kể cả cảnh báo đau)')
            pg.locator('#bell').click(); pg.wait_for_timeout(400)
            ok(pg.locator('#sheet:not([hidden]) .todo-sheet .banner').count() == n + 1, 'Bấm chuông: xem đủ việc cần làm')
            pg.ev("() => closeSheet()")
            pg.locator('.nav .fab').click(); pg.wait_for_timeout(400)
            ok(pg.locator('#sheet:not([hidden]) [data-act="start-day"]').count() == 3, 'Nút Tập ở giữa: mở bảng chọn buổi')
            pg.locator('#sheet [data-act="start-day"][data-id="d1"]').click(); pg.wait_for_timeout(600)
            ok(pg.ev("() => !!state.active && ui.tab") == 'today' and pg.locator('article.ex.focus').count() == 1, 'Chọn buổi trong bảng: vào buổi tập')
            ok(pg.locator('.nav .fab[aria-current="page"] .lb').inner_text() == 'Đang tập' and pg.locator('#dot-active:not([hidden])').count() == 1, 'Nút giữa thành "Đang tập", có chấm đỏ')
            ok(pg.locator('#bell').is_hidden(), 'Đang tập: ẩn chuông')
            pg.locator('.nav [data-tab="home"]').click(); pg.wait_for_timeout(400)
            ok(pg.locator('.hero.tix').count() == 1 and pg.locator('.nav .fab:not([aria-current])').count() == 1, 'Đang tập vẫn xem được Trang chủ')
            pg.ev("() => { discardSession(); ui.tab = 'home'; render(true); }"); pg.wait_for_timeout(300)
            # Lịch tập
            pg.locator('.nav [data-tab="plan"]').click(); pg.wait_for_timeout(400)
            ok(pg.locator('#view .h1').first.inner_text() == 'Lịch tập' and pg.locator('.wkcard .dots').count() == 1, 'Lịch tập: thẻ tuần với dải 7 ngày')
            # Tiến độ gồm 3 mục
            pg.locator('.nav [data-tab="week"]').click(); pg.wait_for_timeout(400)
            ok(pg.locator('.ptabs button').count() == 3 and pg.locator('.tix.ton').count() == 1, 'Tiến độ: 3 mục + thẻ vé tổng tạ')
            for k in ['body', 'photos']:
                pg.locator(f'.ptabs [data-tab="{k}"]').click(); pg.wait_for_timeout(400)
                ok(pg.locator(f'.ptabs [data-tab="{k}"][aria-pressed="true"]').count() == 1 and pg.locator('.nav [data-tab="week"][aria-current="page"]').count() == 1, f'Tiến độ › {k}: thanh dưới vẫn sáng Tiến độ')
            ok(pg.locator('#bp-in').count() == 1 and pg.locator('#body-chart').count() == 0, 'Mục Ảnh tách riêng khỏi Cơ thể')
            # Tài khoản
            pg.locator('.nav [data-tab="more"]').click(); pg.wait_for_timeout(400)
            ok(pg.locator('.acc-prof .ap-stats > div').count() == 3, 'Tài khoản: thẻ hồ sơ có 3 số liệu')
            rows = pg.ev("() => [...document.querySelectorAll('.grow')].map(x => x.dataset.k)")
            ok(all(k in rows for k in ['drive', 'pack', 'pace', 'form', 'height', 'notif', 'skin', 'wipe']), f'Tài khoản: danh mục đủ các mục cài đặt ({len(rows)})')
            ok(pg.ev("() => document.documentElement.scrollHeight") < 844 * 3, 'Tài khoản gọn (dưới 3 màn hình)')
            pg.locator('.grow[data-k="skin"]').click(); pg.wait_for_timeout(400)
            ok(pg.locator('.subhead .h1').inner_text() == 'Giao diện & hiệu ứng' and pg.locator('.skin').count() == 2, 'Trang con Giao diện: 2 giao diện')
            pg.locator('.skin[data-k="gold"]').click(); pg.wait_for_timeout(300)
            ok(pg.ev("() => [document.documentElement.dataset.skin, getComputedStyle(document.body).backgroundColor]") == ['gold', 'rgb(0, 0, 0)'], 'Chọn Đen Tuyền: nền đen OLED')
            pg.screenshot(path='p22-skin-gold.png')
            pg.locator('.subhead [data-act="more-sec"]').click(); pg.wait_for_timeout(300)
            ok(pg.locator('.grow').count() >= 9, 'Nút quay lại: về danh mục Tài khoản')
            pg.locator('.grow[data-k="skin"]').click(); pg.wait_for_timeout(300)
            pg.locator('.nav [data-tab="more"]').click(); pg.wait_for_timeout(300)
            ok(pg.locator('.grow').count() >= 9, 'Bấm lại tab Tài khoản: về danh mục')
            pg.ev("() => { state.settings.skin = 'amber'; applySkin('amber'); render(true); }")
        # không trượt ngang ở mọi màn
        for t in ['home', 'plan', 'week', 'body', 'photos', 'more']:
            pg.ev("(t) => { closeSheet(); ui.tab = t; render(true); }", t); pg.wait_for_timeout(350)
            ok(noscroll(pg), f'Khổ {W}px · {t}: không tràn ngang')
            pg.screenshot(path=f'p22-{W}-{t}.png')
        pg.ev("() => { startSession('d1'); ui.tab = 'today'; render(true); }"); pg.wait_for_timeout(500)
        ok(noscroll(pg), f'Khổ {W}px · đang tập: không tràn ngang'); pg.screenshot(path=f'p22-{W}-session.png')
        pg.ev("() => { discardSession(); }")
        pg.close()
    b.close()
srv.terminate()
print('ERRS', errs)
