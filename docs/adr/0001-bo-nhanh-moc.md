# ADR 0001 — Bỏ nhánh mốc `moc/v<số>`; "Duyệt lại vX" dùng SHA trong bảng này

- **Ngày:** 2026-10-22
- **Trạng thái:** Chấp nhận. Thay thế cách lưu mốc bằng nhánh `moc/v<số>` ghi ở CLAUDE.md (từ 2026-10-18 đến 2026-10-22).

## Bối cảnh

Mỗi lần chủ repo duyệt một PA, mốc được lưu bằng một nhánh `moc/v<số>` trỏ vào `main`. Tag bị chặn qua proxy nên không dùng được. Nhánh mốc làm `git branch -r` dài thêm mỗi lần duyệt và trùng với nhánh PA về mặt ý nghĩa, trong khi việc quay lại một bản chỉ cần một commit cụ thể.

## Quyết định

1. **Không tạo nhánh `moc/*` nữa.** Các nhánh `moc/v1`…`moc/v17` được xoá trên remote sau khi ADR này được gộp; toàn bộ commit của chúng đã nằm trong lịch sử `main` và được liệt kê ở bảng dưới.
2. **Mốc là một SHA trên `main`.** Mỗi lần duyệt, bảng dưới được thêm một dòng `vN | SHA | nội dung duyệt`.
3. **"Duyệt lại vX"**: tra SHA của `vX` trong bảng, đưa cây file của `main` về đúng cây file của SHA đó bằng **một commit mới** (không `push --force`, không xoá lịch sử), tăng `CACHE` trong `sw.js`, rồi thêm dòng `vN+1` trỏ vào commit mới.
4. **Chốt chặn "chỉ gộp khi có 'Duyệt PA-x'" chỉ áp dụng cho nhánh `pa-<số>-<tên>`.** Các nhánh khác (ví dụ nhánh tài liệu/ADR) có thể gộp vào `main` mà không cần lệnh duyệt.

## Hệ quả

- Không còn nhánh mốc trên remote; danh sách nhánh chỉ còn nhánh PA đang làm và `main`.
- Mốc được ghi trong repo (file này) thay vì trên remote, nên đi theo lịch sử `main`.
- Nếu SHA ghi trong bảng bị mất khỏi remote (ví dụ nhánh PA bị xoá trước khi gộp), mốc đó không khôi phục được; vì vậy chỉ ghi SHA nằm trên `main`.

## Bảng mốc lịch sử (`moc/v1`…`moc/v17` → SHA trên `main`)

| Mốc | SHA | Ngày | Nội dung duyệt |
|---|---|---|---|
| v1 | `982a9b2` | 2026-10-13 | Tệp đầu tiên (upload) |
| v2 | `42084a3` | 2026-10-18 | Duyệt PA-2: Lưu ý form lên đầu + nút chọn mức |
| v3 | `566ed71` | 2026-10-18 | Duyệt PA-3: Bỏ Story, một màn tập duy nhất |
| v4 | `c836a7d` | 2026-10-18 | Duyệt PA-5 (gồm PA-4): Chỉ dùng mã QR, sửa quét QR, cập nhật giáo án giữ lịch sử, file 1 người |
| v5 | `0da0b5f` | 2026-10-18 | Duyệt PA-6: Mỗi lần gửi 1 mã QR đứng yên |
| v6 | `db8edca` | 2026-10-19 | Duyệt PA-9 (gồm PA-7, PA-8): hiệu ứng, Đen Vàng, sửa lỗi, drop set 3 set, chỉ Phím tắt |
| v7 | `61965a7` | 2026-10-19 | Duyệt PA-10: nền tĩnh, hiệu ứng mạnh mẽ, 3 set, gợi ý tạ theo nấc máy, thanh bài tập |
| v8 | `8406a6e` | 2026-10-19 | Dựng lại GitHub Pages (lượt trước bị kẹt hàng chờ) |
| v9 | `69b8095` | 2026-10-19 | Quay lại PA-11 (bỏ PA-12: đấu lần trước, giọng HLV, nhật ký đau) |
| v10 | `7ca37b8` | 2026-10-19 | Duyệt PA-13: chấm độ khó sau mỗi set, báo cáo tháng |
| v11 | `51ea220` | 2026-10-21 | Duyệt PA-17 (gồm PA-14, PA-15, PA-16): bỏ báo cáo tháng, đồng bộ Google Drive, thông báo của app, agent + bộ kiểm thử |
| v12 | `6d7c4b5` | 2026-10-21 | Duyệt PA-19 (gồm PA-18): Drive tự động mọi hồ sơ, chỉ đồng bộ qua Drive, bỏ Phím tắt, thông báo bằng Notification API |
| v13 | `9d50fb4` | 2026-10-21 | Duyệt PA-20: agent ux-ui + bộ hiệu ứng theo clip mẫu |
| v14 | `20b68ff` | 2026-10-22 | Duyệt PA-21: tài khoản đăng nhập HLV + học viên |
| v15 | `f197c57` | 2026-10-21 | Duyệt PA-22: thiết kế lại theo clip mẫu (gộp cùng PA-21) |
| v16 | `564486f` | 2026-10-22 | Duyệt PA-23: gắn sẵn máy chủ thông báo |
| v17 | `faddb20` | 2026-10-22 | Duyệt PA-15: tài liệu BR/SA, bộ test, dọn mã chết |
| v18 | `36654ec` | 2026-10-22 | Duyệt PA-32: chia sẻ kết quả buổi tập với PT bằng link và QR (gộp cùng nhánh `claude/share-workout-results-pt-dwu3x9`) |
| v19 | `49252cf` | 2026-10-22 | Duyệt PA-33: máy chủ đồng bộ `/s/*` (push-server; app chưa dùng) |
| v20 | `43d1531` | 2026-10-22 | Duyệt PA-33b: passkey khôi phục trên máy trống; ảnh máy tập `/s/anh/*` có hạn mức (push-server; app chưa dùng) |
| v21 | `c7fcfe2` | 2026-10-23 | Duyệt PA-36: gỡ sao lưu/khôi phục bằng file, chia sẻ với PT, nhắc sao lưu; đồng bộ HLV ⇄ học viên qua máy chủ Cloudflare (PA-34, PA-35 Drive đã gỡ) |
| v22 | `89b23bf` | 2026-10-23 | Duyệt PA-37 (gồm PA-33, PA-33b, PA-34.x, PA-35, PA-36): đồng bộ HLV ⇄ học viên qua máy chủ Cloudflare, gỡ Google Drive và sao lưu/chia sẻ bằng file, dọn dữ liệu rác, hồ sơ HLV (BR-24.20) |
| v23 | `f83fb54` | 2026-10-23 | Duyệt BR-25 (nhánh `ccr-0187bb96-wulwdh`): bỏ chế độ HLV/HV, vai lấy từ mã QR, Phòng HLV ở đầu Trang chủ, mig30. Playwright chưa chạy (chủ repo cho duyệt) |
| v24 | `5031028` | 2026-10-23 | Duyệt PA-39: Tài khoản HLV — thẻ QR học viên (xem, tạo nếu thiếu, chia sẻ ảnh/mã), bỏ "Vai trên máy này" và "Đồng bộ với HLV", khối Đăng nhập bằng QR hoặc dán mã (CACHE gadn-v71). Playwright đã chạy trên nhánh: npm test 195/195, tests/chay.sh xanh |
| v25 | `eea712f` | 2026-10-23 | Duyệt PA-40: popup có nút đóng, kéo xuống và nút quay lại; chữ không sửa được không chọn được; bỏ khôi phục bằng Face ID/máy chủ và ngắt kết nối; gộp giáo án theo từng ngày (chỉ hỏi khi cùng ngày đổi hai bên); lịch tập (dòng tóm tắt, sắp theo sức khoẻ cơ, báo cơ chưa phục hồi 24 giờ); thư viện hình cho học viên chỉ còn trạng thái (CACHE gadn-v73). Playwright đã chạy: npm test 204/204, tests/chay.sh xanh. push-server cần triển khai để báo cơ tới HLV |
