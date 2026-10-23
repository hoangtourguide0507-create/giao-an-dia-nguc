# Tài liệu & quy trình làm việc — Giáo Án Địa Ngục

Áp dụng **từ 21/10/2026** cho mọi thay đổi trong repo. Quy trình duyệt nhánh (cây phương án `pa-<số>-<tên>`, "Duyệt PA-x", mốc `vN` trong [ADR 0001](adr/0001-bo-nhanh-moc.md)) trong [`CLAUDE.md`](../CLAUDE.md) vẫn giữ nguyên; tài liệu này bổ sung phần **yêu cầu → thiết kế → kiểm thử** cho từng thay đổi.

## 1. Bản đồ tài liệu

| Tài liệu | Nội dung | Ai cập nhật, khi nào |
|---|---|---|
| [`BR.md`](BR.md) | **BR tổng**: toàn bộ yêu cầu nghiệp vụ của app *đang chạy trên `main`*, mỗi yêu cầu có mã `BR-xx.y` và tiêu chí chấp nhận | Mỗi PA làm thay đổi hành vi phải sửa BR.md **trong chính PA đó** |
| [`SA.md`](SA.md) | **SA tổng**: kiến trúc, mô hình dữ liệu, thuật toán, định dạng mã/file, đồng bộ, offline, kiểm thử | Mỗi PA làm thay đổi kỹ thuật phải sửa SA.md **trong chính PA đó** |
| [`epics/YYYY-MM-DD.md`](epics/) | **Epic theo ngày**: BR + SA của các thay đổi làm trong ngày đó, kế hoạch test, trạng thái duyệt | Tạo khi bắt đầu việc của ngày, cập nhật suốt ngày |
| [`epics/_mau-epic.md`](epics/_mau-epic.md) | Mẫu epic | Khi cần đổi mẫu |
| [`VAN-DE-VA-CHIEN-LUOC.md`](VAN-DE-VA-CHIEN-LUOC.md) | Danh sách điểm chưa ổn (mã `VD-xx`) và chiến lược phát triển tiếp | Khi phát hiện / xử lý xong một vấn đề |

> **Nguyên tắc vàng:** đọc `BR.md` + `SA.md` là biết app trên `main` đang làm gì và làm thế nào. Tài liệu nào lệch với app là lỗi, phải sửa như sửa code.

## 2. Epic theo ngày

1. **Mọi tính năng mới hoặc thay đổi tính năng cũ đều nằm trong một epic.** Không có thay đổi hành vi nào "ngoài epic".
2. Epic lưu tại `docs/epics/YYYY-MM-DD.md` (ngày bắt đầu làm, giờ Việt Nam). Ví dụ: `docs/epics/2026-10-21.md`.
3. **Mỗi ngày tối đa 1 epic.** Yêu cầu thứ hai, thứ ba trong cùng ngày được **thêm vào epic của ngày** thành mục mới (`Hạng mục 2`, `Hạng mục 3`…), không tạo file mới.
4. Một epic chứa (theo [mẫu](epics/_mau-epic.md)):
   - **Bối cảnh**: anh yêu cầu gì, nguyên văn hoặc tóm tắt.
   - **BR của thay đổi**: mã BR mới / sửa / bỏ (`BR-xx.y`), tiêu chí chấp nhận đo được.
   - **SA của thay đổi**: thiết kế, chỗ sửa trong code, dữ liệu, tương thích dữ liệu cũ, rủi ro.
   - **Kế hoạch test**: test nào thêm/sửa, test nào phải đỏ trước khi code.
   - **Trạng thái**: nhánh PA, đã xác nhận chưa, đã duyệt chưa, mốc `moc/v…`.
5. Epic là **nhật ký**: khi đã duyệt thì không sửa nội dung cũ, chỉ ghi thêm (ví dụ "Duyệt lại v13 ngày …").

## 3. Quy trình cho mỗi yêu cầu: BR → BA → anh xác nhận → test → code

```
 Yêu cầu của anh
      │
 1. BR   ── viết yêu cầu vào epic ngày: mục tiêu, phạm vi, tiêu chí chấp nhận (BR-xx.y)
      │
 2. BA   ── phân tích: ảnh hưởng tới BR/SA hiện có, dữ liệu cũ, đồng bộ, offline,
      │      các phương án + đề xuất; viết phần SA của thay đổi trong epic
      │
 3. ✋ Anh xác nhận ── gửi tóm tắt epic (BR + SA + kế hoạch test). Chưa có "OK"/"Làm đi"
      │                thì KHÔNG viết code.
      │
 4. Test ── viết/sửa test theo tiêu chí chấp nhận; chạy để thấy test mới ĐỎ (đúng lý do)
      │
 5. Code ── sửa app tới khi mọi test XANH; cập nhật BR.md + SA.md
      │      (+ VAN-DE-VA-CHIEN-LUOC.md nếu xử lý xong vấn đề nào)
      │
 6. Nhánh pa-<số>-<tên> ── gửi link xem thử; chờ "Duyệt PA-x" rồi mới gộp vào main
```

- **BA** ở đây là bước *phân tích nghiệp vụ & giải pháp*: kết quả của bước này là phần **SA của thay đổi** trong epic.
- Sửa lỗi nhỏ (typo, chữ hiển thị) vẫn đi đủ các bước nhưng có thể gộp 1–3 thành một tin nhắn ngắn để anh xác nhận.
- Nếu trong lúc code phát hiện BR/SA đã xác nhận không làm được hoặc phải đổi: dừng, cập nhật epic, xin xác nhận lại.

## 4. Quy tắc kiểm thử

### Chạy test

```bash
npm install
npx playwright install chromium
npm test
```

- `npm run test:sw` — test service worker `sw.js` (Node test runner).
- `npm run test:app` — test toàn bộ app trong Chromium (Playwright, giả lập iPhone 13, giờ Việt Nam, ngày cố định **Thứ Tư 21/10/2026 09:00**).
- `npm run check` — kiểm tra cú pháp script chính trong `index.html` và `sw.js` (thay cho `node --check` thủ công).
- `npx playwright test <tên-file>` để chạy một nhóm khi đang viết test.

**Bộ thứ hai — hồi quy theo PA (Python):** `bash tests/chay.sh` (cần `pip install playwright && playwright install chromium`) chạy `tests/test_<pa>.py`, `tests/test_push_server.mjs`, `tests/test_hub_sync.mjs`, `tests/test_hub_pa33b.mjs`. Bộ này giữ các hành vi PA trước đã chốt; chạy một vài file: `bash tests/chay.sh pa22 sync`. Cả hai bộ phải xanh trước khi commit.

### Chất lượng test

Một test chỉ giữ lại khi:

1. Đi theo **đường người dùng thật** (bấm nút, nhập ô, chọn file, kéo, quét) hoặc gọi **hàm tính toán thuần** qua `window.__sota` với dữ liệu nghiệp vụ có nghĩa.
2. Có **khẳng định (expect) về kết quả người dùng thấy hoặc dữ liệu được lưu** — không có test chỉ "chạy cho qua".
3. Không bật nút đang bị khoá, không gọi trực tiếp hàm xử lý mà giao diện không cho tới, chỉ để chạm dòng code.
4. **Không viết test chỉ để phủ dòng code**. Code không có đường nào chạm tới là **mã chết → xoá** (git vẫn giữ lịch sử). Test trùng với test khác (cùng đường, cùng khẳng định) thì xoá một cái.
5. **Lỗi đã biết** viết thành `test.fixme(...)` mô tả hành vi đúng, kèm mã `VD-xx` trong [`VAN-DE-VA-CHIEN-LUOC.md`](VAN-DE-VA-CHIEN-LUOC.md). Khi sửa lỗi thì bỏ `fixme` — test phải xanh.
6. Test của một tính năng nằm trong file `tests/app/<nhóm>.spec.mjs` tương ứng mã BR ở dòng đầu file.

## 5. Khi sửa app (nhắc lại từ CLAUDE.md, bổ sung)

- App là một file `index.html` (toàn bộ JS trong một IIFE), `sw.js` là service worker.
- Mỗi lần đổi `index.html` thì **tăng `CACHE` trong `sw.js`** để điện thoại nhận bản mới.
- Trước khi commit: `npm run check`, `npm test` và `bash tests/chay.sh` phải xanh.
- Giao diện, nội dung, tài liệu và tên test viết bằng **tiếng Việt**.
- Dữ liệu người dùng phải **tương thích ngược**: mọi thay đổi định dạng dữ liệu cần bước chuyển đổi trong `loadState` / `migrateEx` và có test "mở dữ liệu bản cũ".

## 6. Danh sách kiểm tra khi xong một PA (Definition of Done)

- [ ] Epic ngày có đủ BR, SA, kế hoạch test; anh đã xác nhận trước khi code.
- [ ] Test mới đã từng đỏ, giờ xanh; `npm test` và `bash tests/chay.sh` xanh.
- [ ] `BR.md`, `SA.md` phản ánh đúng hành vi mới; `VAN-DE-VA-CHIEN-LUOC.md` cập nhật nếu có.
- [ ] `CACHE` trong `sw.js` đã tăng (nếu đổi `index.html`).
- [ ] Nhánh `pa-<số>-<tên>` đã đẩy, có link xem thử raw.githack; chờ "Duyệt PA-x".
