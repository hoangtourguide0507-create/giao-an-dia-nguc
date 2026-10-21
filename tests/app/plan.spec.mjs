// BR-02 Giáo án: ngày tập, bài tập, bài thay thế, xoay vòng, kho bài, nhóm cơ, tạ đơn.
import { test, expect } from '../helpers/fixtures.mjs';
import { state, basicPlan, ex, day, session, addDays, TODAY, PHOTO } from '../helpers/data.mjs';

test.describe('ngày tập', () => {
  test('thêm, đổi tên, sắp xếp, xoá ngày tập', async ({ app }) => {
    const P = basicPlan();
    await app.seed({ state: state({ days: P.days }) });
    await app.tab('plan');
    await expect(app.view()).toContainText('Giáo án của Tôi');
    await expect(app.view().locator('.pday')).toHaveCount(2);
    /* thêm ngày, bỏ trống tên thì báo lỗi */
    await app.click('add-day');
    await app.click('save-day');
    await expect(app.toast()).toHaveText('Nhập tên ngày tập');
    await app.page.fill('#f-dayname', 'Chân');
    await app.click('save-day');
    expect((await app.state()).days.map(d => d.name)).toEqual(['Ngực + Tay sau', 'Lưng + Tay trước', 'Chân']);
    /* ngày mới đang mở: đổi tên */
    await app.click('rename-day');
    await app.page.fill('#f-dayname', 'Chân + Mông');
    await app.click('save-day');
    /* đưa lên trên */
    await app.view().locator('[data-act="move-day"][data-d="-1"]').first().click();
    expect((await app.state()).days.map(d => d.name)).toEqual(['Ngực + Tay sau', 'Chân + Mông', 'Lưng + Tay trước']);
    /* xoá cần xác nhận, huỷ thì giữ nguyên */
    await app.click('del-day');
    await expect(app.sheet()).toContainText('Xoá ngày “Chân + Mông”?');
    await app.click('confirm-cancel');
    expect((await app.state()).days).toHaveLength(3);
    await app.click('del-day');
    await app.click('confirm-ok');
    expect((await app.state()).days.map(d => d.name)).toEqual(['Ngực + Tay sau', 'Lưng + Tay trước']);
  });

  test('mở/đóng ngày, thẻ ngày hiện số bài, set, nhóm cơ, gợi ý', async ({ app }) => {
    const P = basicPlan();
    await app.seed({ state: state({ days: P.days }) });
    await app.tab('plan');
    const first = app.view().locator('.pday').first();
    await expect(first).toContainText('3 bài · 9 set');
    await expect(first.locator('.pmus')).toContainText('Ngực');
    await expect(app.view().locator('.segbar')).toHaveCount(2);
    await first.locator('[data-act="toggle-day"]').click();
    await expect(first.locator('.exl li')).toHaveCount(3);
    await expect(first).toContainText('Đẩy ngực tạ đòn (Bench press)');
    await first.locator('[data-act="toggle-day"]').click();
    await expect(first.locator('.exl')).toHaveCount(0);
  });

  test('giáo án trống: gợi ý tạo ngày hoặc dùng mẫu', async ({ app }) => {
    await app.goto();
    await app.tab('plan');
    await expect(app.view()).toContainText('Chưa có ngày tập nào');
    await app.view().locator('[data-act="onb-sample"]').click();
    expect((await app.state()).days).toHaveLength(4);
  });
});

test.describe('bài tập', () => {
  test('thêm bài từ thư viện theo vùng cơ: tự điền kiểu bài, vùng cơ, bước tạ; lưu kèm lộ trình', async ({ app, page }) => {
    const d = day('Ngực', []);
    await app.seed({ state: state({ days: [d] }) });
    await app.tab('plan');
    await app.click('toggle-day');
    await app.click('add-ex');
    await expect(app.sheet()).toContainText('Thêm bài tập');
    await app.sheet().locator('[data-act="nbz"][data-v="Ngực trên"]').click();
    await expect(app.sheet()).toContainText('2 · Chọn bài · Ngực trên');
    await app.sheet().locator('[data-act="zlib"]', { hasText: 'Đẩy ngực dốc lên tạ đơn' }).first().click();
    await expect(page.locator('#f-name')).toHaveValue('Đẩy ngực dốc lên tạ đơn (Incline dumbbell press)');
    await expect(page.locator('#f-zone')).toHaveValue('Ngực trên');
    await expect(page.locator('#f-each')).toBeChecked();
    await expect(page.locator('#f-step')).toHaveValue('2');
    /* nhập mức tạ đang tập → hiện lộ trình 8 tuần */
    await page.fill('#f-cur', '16');
    await page.locator('#f-cur').dispatchEvent('input');
    await expect(page.locator('#f-road')).toContainText('Tuần này');
    await page.fill('#f-tgt', '20');
    await page.locator('#f-tgt').dispatchEvent('input');
    await expect(page.locator('#f-road')).toContainText('Dự kiến đạt');
    await app.click('save-ex');
    await expect(app.toast()).toHaveText('Đã lưu bài tập');
    const e = (await app.state()).days[0].exercises[0];
    expect(e).toMatchObject({ name: 'Đẩy ngực dốc lên tạ đơn (Incline dumbbell press)', muscle: 'Ngực', zone: 'Ngực trên', type: 'upper', each: true, step: 2, currentKg: 16, targetKg: 20, sets: 3, repTarget: 10 });
    expect(e.kgSetAt).toBeGreaterThan(0);
    await expect(app.view()).toContainText('MỖI TAY');
  });

  test('ghép tên bài khi không có trong thư viện, chọn kiểu bài và dụng cụ', async ({ app, page }) => {
    await app.seed({ state: state({ days: [day('Vai', [])] }) });
    await app.tab('plan');
    await app.click('toggle-day');
    await app.click('add-ex');
    await app.sheet().locator('[data-act="nbz"][data-v="Vai giữa"]').click();
    await app.page.locator('details.nbmore summary').click();
    await app.sheet().locator('[data-act="nb"][data-k="mv"][data-v="Nâng vai ngang"]').click();
    await app.sheet().locator('[data-act="nb"][data-k="va"][data-v="1 tay"]').click();
    await app.sheet().locator('[data-act="nb"][data-k="eq"][data-v="cáp"]').click();
    await expect(page.locator('#f-name')).toHaveValue('Nâng vai ngang 1 tay cáp');
    await expect(page.locator('#nb-prev')).toHaveText('Nâng vai ngang 1 tay cáp');
    await expect(page.locator('#f-type')).toHaveValue('iso');
    await expect(page.locator('#f-step')).toHaveValue('2,5');
    await expect(page.locator('#f-slot')).toHaveValue('Nâng vai ngang');
    /* bỏ chọn biến thể */
    await app.sheet().locator('[data-act="nb"][data-k="va"][data-v="1 tay"]').click();
    await expect(page.locator('#f-name')).toHaveValue('Nâng vai ngang cáp');
    /* bấm lại vùng cơ đang chọn để bỏ chọn */
    await app.sheet().locator('[data-act="nbz"][data-v="Vai giữa"]').click();
    await expect(app.sheet()).toContainText('Chọn vùng cơ để xem các bài có sẵn');
    await app.click('step-pick', '[data-v="1"]');
    await expect(page.locator('#f-step')).toHaveValue('1');
    await app.click('save-ex');
    expect((await app.state()).days[0].exercises[0]).toMatchObject({ name: 'Nâng vai ngang cáp', muscle: 'Vai', zone: 'Vai giữa', type: 'iso', step: 1, slot: 'Nâng vai ngang' });
  });

  test('gõ tên bài trong thư viện / ngoài thư viện: tự đoán vùng cơ', async ({ app, page }) => {
    await app.seed({ state: state({ days: [day('Chân', [])] }) });
    await app.tab('plan');
    await app.click('toggle-day');
    await app.click('add-ex');
    await page.fill('#f-name', 'Đạp đùi (Leg press)');
    await page.locator('#f-name').dispatchEvent('change');
    await expect(page.locator('#f-type')).toHaveValue('lower');
    await expect(page.locator('#f-zone')).toHaveValue('Đùi trước');
    await page.fill('#f-name', 'Nhón bắp chân trên bậc');
    await page.locator('#f-zone').selectOption('');
    await page.locator('#f-name').dispatchEvent('change');
    await expect(page.locator('#f-zone')).toHaveValue('Bắp chân');
    await page.locator('#f-type').selectOption('iso');
    await page.locator('#f-type').dispatchEvent('change');
    await expect(page.locator('#f-step')).toHaveValue('1');
    await page.fill('#f-name', 'Squat tạ đơn');
    await page.locator('#f-name').dispatchEvent('change');
    await expect(page.locator('#f-each')).toBeChecked();
    await page.locator('#f-each').uncheck();
    await expect(page.locator('.u-kg').first()).toHaveText('kg');
  });

  test('kiểm tra dữ liệu nhập khi lưu bài', async ({ app, page }) => {
    await app.seed({ state: state({ days: [day('Ngực', [])] }) });
    await app.tab('plan');
    await app.click('toggle-day');
    await app.click('add-ex');
    await app.click('save-ex');
    await expect(app.toast()).toHaveText('Nhập tên bài tập');
    await page.fill('#f-name', 'Bài A');
    await page.fill('#f-sets', '11');
    await app.click('save-ex');
    await expect(app.toast()).toHaveText('Số set từ 1 đến 10');
    await page.fill('#f-sets', '3');
    await page.fill('#f-rmin', '12');
    await page.fill('#f-rtgt', '10');
    await app.click('save-ex');
    await expect(app.toast()).toHaveText('Rep mục tiêu phải ≥ rep tối thiểu');
    await page.fill('#f-rmin', '8');
    await page.fill('#f-step', '0');
    await app.click('save-ex');
    await expect(app.toast()).toHaveText('Bước tăng tạ phải lớn hơn 0');
    await page.fill('#f-step', '2,5');
    await page.fill('#f-cur', '-5');
    await app.click('save-ex');
    await expect(app.toast()).toHaveText('Mức tạ không hợp lệ');
    /* huỷ thì không thêm */
    await app.click('cancel-ex');
    expect((await app.state()).days[0].exercises).toHaveLength(0);
  });

  test('sửa bài: đổi mức tạ, nghỉ, drop set, khởi động, cách chỉnh máy; sắp xếp; xoá', async ({ app, page }) => {
    const P = basicPlan();
    await app.seed({ state: state({ days: P.days }) });
    await app.tab('plan');
    await app.click('toggle-day');
    await app.view().locator(`[data-act="edit-ex"][data-id="${P.bench.id}"]`).click();
    await expect(app.sheet()).toContainText('Sửa bài tập');
    await page.fill('#f-cur', '42,5');
    await page.locator('#f-rest').selectOption('150');
    await page.locator('#f-drop').check();
    await page.locator('#f-warm').uncheck();
    await page.fill('#f-setup', 'Ghế nấc 4');
    await app.click('save-ex');
    let b = (await app.state()).days[0].exercises[0];
    expect(b).toMatchObject({ currentKg: 42.5, rest: 150, dropSet: true, warmup: false, setup: 'Ghế nấc 4' });
    await expect(app.view()).toContainText('+ 3 drop');
    await expect(app.view()).toContainText('nghỉ 2:30');
    /* đưa bài 1 xuống dưới */
    await app.view().locator(`[data-act="move-ex"][data-id="${P.bench.id}"][data-d="1"]`).click();
    expect((await app.state()).days[0].exercises.map(e => e.id)).toEqual([P.fly.id, P.bench.id, P.push.id]);
    /* xoá bài */
    await app.view().locator(`[data-act="edit-ex"][data-id="${P.push.id}"]`).click();
    await app.click('del-ex');
    await expect(app.sheet()).toContainText('Lịch sử đã tập vẫn được giữ');
    await app.click('confirm-ok');
    const st = await app.state();
    expect(st.days[0].exercises.map(e => e.id)).toEqual([P.fly.id, P.bench.id]);
    expect(Object.keys(st.syncDel.e).length).toBeGreaterThan(0);
  });

  test('ảnh máy tập: thêm từ thư viện ảnh, xoá phải bấm 2 lần', async ({ app, page }) => {
    const P = basicPlan();
    await app.seed({ state: state({ days: P.days }) });
    await app.tab('plan');
    await app.click('toggle-day');
    await app.view().locator(`[data-act="edit-ex"][data-id="${P.bench.id}"]`).click();
    const jpeg = Buffer.from(PHOTO.split(',')[1], 'base64');
    await page.setInputFiles('#f-photo-lib', [{ name: 'a.jpg', mimeType: 'image/jpeg', buffer: jpeg }, { name: 'b.jpg', mimeType: 'image/jpeg', buffer: jpeg }]);
    await expect(app.sheet().locator('#f-photos .ph')).toHaveCount(2);
    const rm = app.sheet().locator('[data-act="ph-rm"]').first();
    await rm.click();
    await expect(app.toast()).toHaveText('Bấm ✕ lần nữa để xoá ảnh');
    await app.sheet().locator('[data-act="ph-rm"]').first().click();
    await expect(app.sheet().locator('#f-photos .ph')).toHaveCount(1);
    await app.click('save-ex');
    const ph = (await app.state()).days[0].exercises[0].photos;
    expect(ph).toHaveLength(1);
    expect(await app.idb('photos', ph[0])).toMatch(/^data:image\/jpeg;base64,/);
    await expect(app.view().locator(`img.thumb[data-photo="${ph[0]}"]`)).toHaveAttribute('src', /^data:image/);
  });

  test('đổi tạ đơn sang ghi mỗi tay khi đã có lịch sử: hỏi chia đôi số cũ', async ({ app, page }) => {
    const curl = ex('Cuốn tạ đơn (Dumbbell curl)', { muscle: 'Tay trước', type: 'iso', each: false, step: 2, currentKg: 20 });
    const d = day('Tay', [curl]);
    await app.seed({ state: state({ days: [d], sessions: [session(d, addDays(TODAY, -3), [[curl, [[20, 10], [20, 10], [20, 9]]]])] }) });
    await app.tab('plan');
    await app.click('toggle-day');
    await app.click('edit-ex');
    await page.locator('#f-each').check();
    await app.click('save-ex');
    await expect(app.sheet()).toContainText('đổi số kg cũ?');
    await app.sheet().locator('[data-act="each-conv"][data-f="0.5"]').click();
    const st = await app.state();
    expect(st.sessions[0].entries[0].sets.map(s => s.kg)).toEqual([10, 10, 10]);
    expect(st.days[0].exercises[0]).toMatchObject({ each: true, currentKg: 10 });
  });
});

test.describe('bài thay thế & xoay vòng', () => {
  test('thêm bài thay thế, đặt làm bài chính', async ({ app, page }) => {
    const P = basicPlan();
    await app.seed({ state: state({ days: P.days }) });
    await app.tab('plan');
    await app.click('toggle-day');
    await app.view().locator(`[data-act="alts-toggle"][data-id="${P.bench.id}"]`).click();
    await app.click('add-alt');
    await expect(app.sheet()).toContainText('Thêm bài thay thế');
    await page.fill('#f-name', 'Đẩy ngực máy (Chest press)');
    await app.click('save-ex');
    let main = (await app.state()).days[0].exercises[0];
    expect(main.alts.map(a => a.name)).toEqual(['Đẩy ngực máy (Chest press)']);
    await expect(app.view()).toContainText('1 bài thay thế');
    await app.click('make-main');
    await expect(app.toast()).toContainText('Bài chính mới: Đẩy ngực máy');
    main = (await app.state()).days[0].exercises[0];
    expect(main.name).toBe('Đẩy ngực máy (Chest press)');
    expect(main.alts.map(a => a.id)).toEqual([P.bench.id]);
    /* sửa bài thay thế (bài chính mới có mã khác nên danh sách thay thế đóng lại) */
    await app.view().locator(`[data-act="alts-toggle"][data-id="${main.id}"]`).click();
    await app.view().locator(`.alts [data-act="edit-ex"][data-id="${P.bench.id}"]`).click();
    await expect(app.sheet()).toContainText('Sửa bài thay thế');
    await page.fill('#f-cur', '45');
    await app.click('save-ex');
    expect((await app.state()).days[0].exercises[0].alts[0].currentKg).toBe(45);
    /* xoá bài chính có bài thay thế: bài thay thế lên làm chính */
    await app.view().locator(`.exr [data-act="edit-ex"][data-id="${main.id}"]`).click();
    await app.click('del-ex');
    await expect(app.sheet()).toContainText('sẽ lên làm bài chính');
    await app.click('confirm-ok');
    expect((await app.state()).days[0].exercises[0].id).toBe(P.bench.id);
  });

  test('giữ bài chính quá 6 tuần: nhắc đổi, đổi sang bài lâu chưa tập hoặc giữ thêm 2 tuần', async ({ app }) => {
    const alt1 = ex('Đẩy ngực máy (Chest press)'), alt2 = ex('Đẩy ngực tạ đơn (Dumbbell press)', { each: true });
    const bench = ex('Đẩy ngực tạ đòn (Bench press)', { alts: [alt1, alt2], slot: 'Đẩy ngực', mainSince: addDays(TODAY, -50) });
    const d = day('Ngực', [bench]);
    await app.seed({ state: state({ days: [d], sessions: [session(d, addDays(TODAY, -20), [[alt1, [[40, 10]]]])] }) });
    await app.tab('plan');
    await expect(app.view()).toContainText('1 ô bài đã giữ bài chính hơn 6 tuần');
    await app.click('rot-open');
    await expect(app.sheet()).toContainText('NÊN ĐỔI');
    /* bài chưa tập lần nào được ưu tiên */
    await expect(app.sheet().locator('[data-act="rot-swap"]')).toContainText('Đổi sang Đẩy ngực tạ đơn (chưa tập)');
    await app.click('rot-hold');
    await expect(app.toast()).toHaveText('Giữ bài chính thêm 2 tuần');
    expect((await app.state()).days[0].exercises[0].mainSince).toBe(addDays(TODAY, -28));
    await app.click('rot-swap');
    const m = (await app.state()).days[0].exercises[0];
    expect(m).toMatchObject({ id: alt2.id, slot: 'Đẩy ngực', mainSince: TODAY });
    expect(m.alts.map(a => a.id)).toEqual([bench.id, alt1.id]);
  });
});

test.describe('kho bài, nhóm cơ, tạ đơn', () => {
  test('kho bài: tìm theo tên, lọc theo nhóm cơ, chạm để sửa', async ({ app, page }) => {
    const P = basicPlan();
    P.bench.alts = [ex('Đẩy ngực máy (Chest press)')];
    await app.seed({ state: state({ days: P.days }) });
    await app.tab('plan');
    await app.click('lib-open');
    await expect(app.sheet()).toContainText('Kho bài tập · 7');
    await app.sheet().locator('[data-act="lib-m"][data-k="Lưng"]').click();
    await expect(app.sheet().locator('.libr')).toHaveCount(2);
    await app.sheet().locator('[data-act="lib-m"][data-k="Lưng"]').click();
    await page.fill('#lib-q', 'máy');
    await page.locator('#lib-q').dispatchEvent('input');
    await expect(app.sheet().locator('.libr')).toHaveCount(2);
    await expect(app.sheet()).toContainText('thay thế');
    await app.sheet().locator('.libr').first().click();
    await expect(app.sheet()).toContainText('Sửa');
  });

  test('bài để nhóm “Khác”: nhắc gán nhóm cơ, gán xong cập nhật cả lịch sử', async ({ app }) => {
    const odd = ex('Bài lạ XYZ', { muscle: 'Khác', zone: null });
    const d = day('Linh tinh', [odd]);
    await app.seed({ state: state({ days: [d], sessions: [session(d, addDays(TODAY, -2), [[odd, [[10, 10]]]])] }) });
    await expect(app.view()).toContainText('Có bài đang để nhóm cơ “Khác”');
    await app.tab('plan');
    await expect(app.view()).toContainText('1 bài chưa có nhóm cơ');
    await app.click('other-open');
    await app.sheet().locator('[data-act="set-muscle"][data-m="Vai"]').click();
    await expect(app.toast()).toHaveText('Bài lạ XYZ → Vai');
    const st = await app.state();
    expect(st.days[0].exercises[0].muscle).toBe('Vai');
    expect(st.sessions[0].entries[0].muscle).toBe('Vai');
    await expect(app.sheet()).toContainText('Không còn bài nào');
  });

  test('thiết lập tạ đơn: chia đôi lịch sử, ghi mỗi tay, ghi tổng', async ({ app }) => {
    const a = ex('Chèo tạ đơn (Dumbbell row)', { muscle: 'Lưng', each: undefined, step: 2.5, currentKg: 30 });
    const b = ex('Đẩy vai tạ đơn (Dumbbell shoulder press)', { muscle: 'Vai', each: undefined, currentKg: 20 });
    delete a.each; delete b.each;
    const d = day('Tạ đơn', [a, b]);
    await app.seed({ state: state({ days: [d], sessions: [session(d, addDays(TODAY, -2), [[a, [[30, 10]]]])] }) });
    await app.tab('plan');
    await expect(app.view()).toContainText('2 bài tạ đơn: đang ghi tổng hay mỗi tay?');
    await app.click('db-setup');
    await app.sheet().locator(`[data-act="db-set"][data-id="${a.id}"][data-m="half"]`).click();
    await expect(app.toast()).toHaveText('Đã chia đôi lịch sử, giờ ghi kg mỗi tay');
    let st = await app.state();
    expect(st.sessions[0].entries[0].sets[0].kg).toBe(15);
    expect(st.days[0].exercises[0]).toMatchObject({ each: true, step: 2, currentKg: 15 });
    await app.sheet().locator(`[data-act="db-set"][data-id="${b.id}"][data-m="each"]`).click();
    await app.sheet().locator(`[data-act="db-set"][data-id="${a.id}"][data-m="total"]`).click();
    st = await app.state();
    expect(st.days[0].exercises[1].each).toBe(true);
    expect(st.days[0].exercises[0]).toMatchObject({ each: false, currentKg: 30 });
    await app.sheet().locator(`[data-act="db-set"][data-id="${a.id}"][data-m="each"]`).click();
    expect((await app.state()).days[0].exercises[0]).toMatchObject({ each: true, currentKg: 30 });
    await app.sheet().locator(`[data-act="db-set"][data-id="${b.id}"][data-m="total"]`).click();
    expect((await app.state()).days[0].exercises[1]).toMatchObject({ each: false, currentKg: 40 });
  });
});
