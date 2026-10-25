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
| v26 | `59007dc` | 2026-10-23 | Duyệt PA-41: gỡ tính năng Artifact (đồng bộ tài khoản Claude), bỏ Hoàn tác giáo án và Chuyển học viên có sẵn, giữ đồng bộ tự động và thẻ trạng thái máy chủ (BR-27.8). Playwright: 194/194, chay.sh xanh |
| v27 | `05b7c29` | 2026-10-23 | Duyệt PA-43: báo lỗi hỗ trợ khi máy chủ không còn công nhận máy, nối lại không mất dữ liệu (CACHE gadn-v76). npm test 196/196 xanh (rest.spec chập chờn, chạy riêng xanh); Playwright chưa chạy bộ Python tests/chay.sh lúc duyệt, sau đó chạy lại bash tests/chay.sh xanh trên main |
| v28 | `311641f` | 2026-10-23 | Duyệt PA-44: đồng bộ hồ sơ tập của HLV giữa các máy (BR-28), đổi hồ sơ HLV chuyển buổi tập của hồ sơ cũ sang học viên mới và xoá hồ sơ cũ trống; sửa lỗi máy HLV trống gửi giáo án trống đè giáo án trên máy chủ (BR-28.7) (CACHE gadn-v78). hub.spec 27/27 (15 lần liên tiếp xanh), npm test: rest.spec và session.spec chập chờn, chạy riêng xanh; bash tests/chay.sh xanh. Ảnh máy tập tách sang PA-45 (nháp BR/BA, chưa làm) |
| v29 | `d1dbfb1` | 2026-10-24 | Duyệt PA-45: giáo án HLV chỉnh cho học viên (khoá mức tạ, ghi chú bài, trạng thái gửi giáo án, BR-30); HLV xem học viên đã tập theo tuần và kế hoạch cạnh thực tế (BR-31); chất lượng buổi tập Tốt/Ổn/Cần xem lại (BR-32) (CACHE gadn-v83). npm test 214 đạt, 3 đỏ ở hub.spec (BR-28.4/28.5/28.11) chập chờn khi chạy cả bộ, chạy riêng 31/31 xanh. Chưa chạy bash tests/chay.sh trên main; nhãn chất lượng chờ đối chiếu chuyên môn |
| v30 | `d02e873` | 2026-10-24 | Duyệt PA-46 (hạng mục 2 của epic 2026-10-24): HLV xem lịch sử học viên đúng bài và đúng ngày giáo án, không ghi lịch sử (BR-33); học viên thấy giáo án HLV vừa chỉnh (CACHE gadn-v84). lichsu-hlv.spec 5/5 xanh; các bộ liên quan xanh (session chập chờn khi chạy song song). Chưa chạy toàn bộ Playwright |
| v31 | `0e51780` | 2026-10-24 | Duyệt PA-47 (hạng mục 3 của epic 2026-10-24): hướng dữ liệu giáo án HLV→HV và lịch sử HV→HLV (BR-35): HLV bấm Tập thì về hồ sơ HLV, học viên không sửa giáo án, giáo án HLV thay hẳn (bỏ xung đột), gỡ plan@hv, tạo giáo án từ lịch sử; tự chỉnh set sau mỗi set (BR-36) (CACHE gadn-v86). npm run test:app 235 đạt, tests/chay.sh xanh. Chưa thử trên điện thoại thật |
| v32 | `1f8fdc7` | 2026-10-24 | Duyệt PA-48 (hạng mục 4 của epic 2026-10-24): số đo, ảnh body, chiều cao, giới tính từ học viên lên máy chủ, HLV chỉ nhận và không sửa, thông báo cho HLV, học viên máy mới tải lại và gộp theo thời điểm sửa (BR-37) (CACHE gadn-v87). co-the-hlv.spec 7/7 xanh, các file giao diện liên quan xanh, tests/chay.sh xanh trên main. Chưa chạy cả bộ test:app, chưa thử trên điện thoại thật; Worker Cloudflare cần triển khai lại bản mới |
| v33 | `330493c` | 2026-10-24 | Duyệt PA-49 (hạng mục 5 của epic 2026-10-24): tiến độ so tuần/tháng theo ngày (cùng khoảng ngày), tổng tạ chỉ so bài có ở cả hai kỳ, bài lặp lại lấy trung bình theo buổi (BR-38) (CACHE gadn-v88). progress.spec 13 xanh, tests/chay.sh xanh trên main. Chưa chạy cả bộ test:app, chưa thử trên điện thoại thật |
| v34 | `981b98b` | 2026-10-24 | Duyệt PA-46 phần máy chủ: endpoint admin đọc giáo án/buổi tập và gán lại nhóm cơ Khác, dedupe giáo án trùng; không đổi app (CACHE vẫn gadn-v88). tests/chay.sh xanh trên main. Playwright chưa chạy; Worker Cloudflare cần triển khai lại bản mới |
| v35 | `9a5a736` | 2026-10-25 | Duyệt PA-50 (epic 2026-10-25): cân vùng cơ trong ngày tập (set quy đổi, trần 11/nhóm/buổi), cảnh báo dồn vùng / gần trùng / vượt trần + sửa một chạm, góc tập là thuộc tính của bài (đẩy ngực, ép ngực, ép cáp, chèo), vùng còn thiếu theo cả tuần, biến thể → thêm vào ngày / bài thay thế (BR-39) (CACHE gadn-v89). tests/chay.sh xanh trên main (gồm test_can_vung_co). Playwright chưa chạy (phiên cloud); Q1–Q4 dùng phương án đề xuất, ngưỡng chưa qua kiem-chung-y-khoa |
| v36 | `c55f980` | 2026-10-25 | Duyệt PA-51 (hạng mục 2 của epic 2026-10-25): trần set mỗi nhóm cơ mỗi buổi chọn được 11 · 14 (mặc định) · 16 · tắt ở Tài khoản → Cân vùng cơ, cảnh báo ghi đúng nguồn (Remmert 2025, bản thảo) và link tới cài đặt, sửa thẻ cảnh báo dồn vùng bị xếp dọc (BR-39.11) (CACHE gadn-v90). tests/chay.sh xanh trên main. Playwright chưa chạy (phiên cloud) |
| v37 | `168ce56` | 2026-10-25 | Duyệt PA-52 (hạng mục 3 của epic 2026-10-25): thẻ Kiểm tra giáo án tuần — set/tuần theo giáo án × số buổi 4 tuần qua, vùng bị bỏ quên / ít (< 4 set, Pelland 2024) / lệch cặp (quy ước app), gợi ý ngày + bài thêm một chạm, vùng có trong giáo án nhưng 4 tuần chưa tập, bỏ qua vùng (BR-40) (CACHE gadn-v91). tests/chay.sh xanh trên main. Playwright chưa chạy (phiên cloud) |
| v38 | `98f5d6a` | 2026-10-25 | Duyệt PA-53 (hạng mục 4 của epic 2026-10-25): kcal vận động của buổi tập = (MET − 1) × cân nặng × thời gian, MET theo 2024 Adult Compendium chỉnh theo bài chân / độ khó / mật độ, ô nhập kcal đồng hồ, hiện ở màn kết thúc buổi, chi tiết buổi, tổng ở Tiến độ (BR-41) (CACHE gadn-v92). tests/chay.sh xanh trên main. Playwright chưa chạy (phiên cloud) |
| v39 | `bbf6948` | 2026-10-25 | Duyệt PA-54 (hạng mục 5 của epic 2026-10-25): màn chúc mừng sau khi lưu buổi tập — kcal vận động số lớn đếm lên, ngọn lửa, tổng kg tạ, set/bài/phút, kỷ lục mới; bảng Kết thúc ghi kg tạ (BR-42) (CACHE gadn-v93). tests/chay.sh xanh trên main. Playwright chưa chạy (phiên cloud; nên chạy session.spec, edge.spec) |
