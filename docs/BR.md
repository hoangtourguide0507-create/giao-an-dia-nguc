# BR tổng — Yêu cầu nghiệp vụ của Giáo Án Địa Ngục

> Phản ánh hành vi của app trên nhánh `main` sau **PA-22** (bản `gadn-v51`) cộng các thay đổi của **PA-15** (tài liệu, test, dọn mã chết — không đổi hành vi). Cập nhật 22/10/2026 theo các PA đã duyệt từ PA-14 đến PA-22: bỏ báo cáo tháng (PA-14), đồng bộ Google Drive (PA-15/18), thông báo của app + máy chủ Cloudflare (PA-16), chỉ đồng bộ qua Drive và bỏ Phím tắt iPhone (PA-19), tài khoản đăng nhập (PA-21), thiết kế lại giao diện và điều hướng (PA-22).
> Mỗi yêu cầu có mã `BR-xx.y`. Cột **Test** chỉ file kiểm chứng trong `tests/`. Điểm chưa ổn đã biết: xem [VAN-DE-VA-CHIEN-LUOC.md](VAN-DE-VA-CHIEN-LUOC.md) (mã `VD-xx`). Nhóm đã bỏ vẫn giữ mã (BR-13, BR-17) để dẫn chiếu lịch sử, không đánh số lại.

## 0. Sản phẩm

**Giáo Án Địa Ngục** là sổ tay tập tạ trên điện thoại (PWA, chạy offline, giao diện tiếng Việt) cho người tập gym và huấn luyện viên (HLV) cá nhân. App ghi mức tạ từng set, **tự gợi ý tuần này nên tập bao nhiêu kg** cho từng bài, gợi ý **buổi nào nên tập hôm nay** theo độ hồi phục nhóm cơ, theo dõi số đo cơ thể và ảnh trước/sau; một máy dùng được cho nhiều người (chế độ HLV) và đồng bộ giữa máy HLV và máy học viên **tự động qua Google Drive của HLV** (máy chủ Apps Script do HLV tự triển khai, học viên đăng nhập bằng tài khoản HLV cấp). Thông báo hết giờ nghỉ dùng thông báo của app (tuỳ chọn máy chủ Cloudflare để báo cả khi khoá màn hình).

| Vai trò | Nhu cầu chính |
|---|---|
| Người tự tập | Biết hôm nay tập gì, tạ bao nhiêu, ghi set nhanh, thấy tiến bộ |
| Học viên có HLV | Đăng nhập một lần; nhận giáo án HLV soạn, tự tập, buổi tập tự về máy HLV |
| Huấn luyện viên | Quản lý nhiều học viên trên 1 máy, theo dõi ai lỡ buổi / cần lên tạ / đang đau, duyệt kế hoạch tuần, cấp/khoá tài khoản học viên |

Nguyên tắc chung:
- **BR-00.1** Dữ liệu nằm trên máy người dùng (IndexedDB). App không có máy chủ riêng của nhà phát triển; đồng bộ HLV ⇄ học viên đi qua **máy chủ Cloudflare của chính HLV** (BR-24, BR-27.6), thông báo đẩy qua máy chủ Cloudflare của HLV (BR-22). Trong claude.ai (Artifact) app chỉ lưu trên máy này: không còn đồng bộ tài khoản Claude (BR-18 đã bỏ, PA-41).
- **BR-00.2** Mọi chữ hiển thị bằng tiếng Việt; số dùng định dạng Việt (`42,5`).
- **BR-00.3** App chỉ đưa ra gợi ý dựa trên số liệu người dùng ghi, không thay thế HLV hay bác sĩ (ghi rõ ở cuối trang Tài khoản).
- **BR-00.4** Thanh điều hướng 5 mục: **Trang chủ · Lịch tập · Tập (nút tròn giữa) · Tiến độ · Tài khoản** (mục cuối luôn là **Tài khoản**; HLV thấy **Phòng HLV** ở đầu Trang chủ, BR-25.4). Nút Tập: chưa tập → bảng chọn buổi (BR-06.3); đang có buổi dở → quay lại màn tập (hiện "Đang tập" và chấm báo); chưa có giáo án → về Trang chủ.
- **BR-00.5** Đầu trang hiện lời chào/tên người tập (bấm để đổi người tập hoặc mở Phòng HLV), thứ ngày hôm nay, chip chu kỳ "Tuần x/6" hoặc "Tuần deload", và **chuông** báo số việc cần làm (ẩn khi không có việc; bấm mở danh sách đủ).
- **BR-00.6** Hai giao diện: **Hổ Phách** (mặc định, tối ấm nhấn cam) và **Đen Tuyền** (đen OLED nhấn vàng) — BR-11.1.

---

## BR-01 Khởi đầu
Test: `tests/app/onboarding.spec.mjs`

- **BR-01.1** Lần đầu mở (chưa có ngày tập): màn chào mừng với 3 lựa chọn: *Tạo ngày tập đầu tiên*, *Dùng giáo án mẫu 4 ngày*, *Quét mã liên kết HLV gửi* (BR-14.2).
- **BR-01.2** Giáo án mẫu gồm 4 ngày (Lưng · Ngực + Tay sau · Chân · Vai + Tay trước), mỗi ngày 5 bài trong thư viện, mỗi bài 3×10, có khởi động; bài tạ đơn tự ghi **kg mỗi tay**, nấc 2 kg.
- **BR-01.3** Hồ sơ mặc định tên "Tôi" (hoặc lấy tên cũ trong cài đặt nếu có).

## BR-02 Giáo án (ngày tập, bài tập, bài thay thế)
Test: `tests/app/plan.spec.mjs`, `tests/app/misc.spec.mjs`, `tests/app/edge.spec.mjs`

- **BR-02.1 Ngày tập**: thêm (tên bắt buộc, gợi ý nhanh: Lưng, Ngực, Chân, Vai, Tay, Push/Pull/Legs, Toàn thân…), đổi tên, đưa lên/xuống, xoá (có xác nhận; lịch sử buổi đã tập vẫn giữ).
- **BR-02.2 Thẻ ngày**: số thứ tự, tên, số bài · số set (tính cả 3 set drop) · thời gian dự kiến, các nhóm cơ, trạng thái hồi phục, số bài "▲ lên tạ", lần tập cuối, nhãn "Gợi ý" cho ngày được gợi ý. Thẻ đóng hiện dải màu trạng thái gợi ý từng bài.
- **BR-02.3 Bài tập** có: tên, ô bài (kiểu động tác), vùng cơ (nhóm lớn tự suy ra), mức tạ đang tập, mục tiêu, nấc tạ của máy, số set (1–10), rep mục tiêu / tối thiểu (/ tối đa khi chế độ tăng theo rep), nghỉ giữa set (Tự động theo nhịp nghỉ hoặc chọn 30 giây–4 phút), kiểu bài (bài lớn chân/hông · bài lớn thân trên · bài cô lập), drop set, gợi ý khởi động, tạ đơn ghi kg mỗi tay, ảnh máy tập, cách chỉnh máy.
- **BR-02.4 Thêm bài**: chọn **theo vùng cơ** từ thư viện có sẵn (có hình); hoặc **ghép tên** (động tác + biến thể + dụng cụ) — app tự điền kiểu bài, nấc tạ theo dụng cụ (tạ đơn 2 kg, cáp/máy/tạ đòn 2,5 kg, tự trọng 1 kg), ô bài; hoặc gõ tên (gợi ý từ thư viện, tự đoán vùng cơ).
- **BR-02.5 Kiểm tra khi lưu**: tên bắt buộc; số set 1–10; rep mục tiêu ≥ rep tối thiểu và ≤ 50; nấc tạ > 0; mức tạ không âm.
- **BR-02.6 Lộ trình** hiện ngay trong form: 8 tuần tới theo mức tạ đang tập; có mục tiêu thì báo dự kiến tuần đạt (hoặc "hơn 3 năm").
- **BR-02.7 Sửa mức tạ đang tập** bằng tay được ưu tiên hơn buổi tập gần nhất (đánh dấu thời điểm sửa). Sau mỗi buổi (không deload) mức "đang tập" tự cập nhật bằng kg cao nhất của buổi.
- **BR-02.8 Ảnh máy tập**: chụp hoặc chọn nhiều ảnh (tối đa 6 mỗi lần), nén ≤ ~230 KB; xoá ảnh phải bấm ✕ hai lần.
- **BR-02.9 Sắp xếp bài** trong ngày (lên/xuống). Nếu đang có buổi tập của ngày đó thì thứ tự buổi đổi theo, bài mới thêm vào ngày xuất hiện trong buổi, bài bị xoá (chưa tập) rời khỏi buổi.
- **BR-02.10 Xoá bài**: có xác nhận; nếu bài có bài thay thế thì bài thay thế đầu tiên lên làm bài chính; lịch sử giữ nguyên; ghi dấu xoá để đồng bộ.
- **BR-02.11 Bài thay thế** (cùng ô bài): thêm/sửa, "Làm chính" (bài cũ thành bài thay thế), mỗi bài có mức tạ và lịch sử riêng.
- **BR-02.12 Xoay vòng**: giữ bài chính ≥ 6 tuần (42 ngày) thì nhắc "Đến lúc đổi bài"; gợi ý bài thay thế **lâu chưa tập nhất** (chưa tập lần nào được ưu tiên); có thể "Giữ thêm 2 tuần".
- **BR-02.13 Kho bài**: danh sách mọi bài chính + thay thế, tìm theo tên/ô bài, lọc theo nhóm cơ, chạm để sửa.
- **BR-02.14 Nhóm "Khác"**: nhắc gán nhóm cơ (có gợi ý theo tên); gán xong cập nhật cả lịch sử và buổi đang tập.
- **BR-02.15 Tạ đơn**: thiết lập cho từng bài ghi tổng hay mỗi tay; "Chia đôi" đổi toàn bộ lịch sử sang mỗi tay; đổi kiểu ghi khi đã có lịch sử thì hỏi có quy đổi số cũ không. Tổng khối lượng tạ đơn luôn nhân 2.

## BR-03 Buổi tập
Test: `tests/app/session.spec.mjs`, `tests/app/misc.spec.mjs`, `tests/app/edge.spec.mjs`

- **BR-03.1 Bắt đầu** buổi theo ngày tập (hoặc **Tự chọn bài** từ nhiều ngày, tên buổi "Tự chọn · nhóm cơ…"). Mỗi bài tạo đủ số set, kg = mức tạ cơ sở (lịch sử/đang tập), rep = mục tiêu; bài có drop set thêm 3 set drop (trừ tuần deload). Bài đang đau mức vừa trở lên bị bỏ (BR-08).
- **BR-03.2 Màn tập**: tên buổi, đồng hồ thời gian tập, thanh tiến độ set, "còn ~x phút · xong khoảng HH:MM", thanh số bài (✓ bài xong, nền vàng bài đang mở; chạm để nhảy).
- **BR-03.3 Bài đang mở**: ảnh lớn (ảnh máy đã chụp, lật được; hoặc hình minh hoạ 2 tư thế; hoặc nút chụp), tên, nhóm cơ, set×rep, thời gian nghỉ, nút "Hướng dẫn & nhóm cơ", lưu ý form (BR-11.4), "Lần trước" (kg × rep, cảm giác), chip gợi ý (↑/↓ Gợi ý x kg kèm lý do: tuần giảm tải, đang đau, vừa hết đau, lần trước có set hỏng), cách chỉnh máy.
- **BR-03.4 Set**: nút −/+ theo nấc tạ (kg) hoặc 1 (rep), ô nhập; bấm ✓ để xong set — **phải có rep > 0**; bỏ ✓ được. Xong set → bắt đầu nghỉ (BR-04), rung, âm thanh.
- **BR-03.5 Chấm độ khó** (bật mặc định): sau mỗi set chính hiện Dễ (dư ≥4 rep) · Vừa (2–3) · Sát (0–1) · Hỏng; bấm lại để bỏ; chọn "Hỏng" báo buổi sau giữ tạ.
- **BR-03.6 Khởi động** (bài bật khởi động): bài **đầu tiên của nhóm cơ trong buổi** khởi động đủ bậc — bài lớn ≥ 40 kg: 50%×10, 70%×5, 85%×2; bài lớn < 40 kg: 50%×10, 75%×5; bài cô lập: 50%×12, 70%×6; các bài sau cùng nhóm cơ: 1 set "làm quen máy" 60%×8. Làm tròn theo nấc; nếu tạ quá nhẹ thì 1 set ở nấc thấp hơn hoặc "Nhẹ nhất". Bài tự trọng: hướng dẫn 1 set chậm ×10–12. Set khởi động không tính vào khối lượng; tính lại khi đổi kg.
- **BR-03.7 Drop set**: "+ Drop set (3 set)" thêm 3 set 80% · 65% · 50% mức tạ chính × 10 rep (mỗi set nhẹ hơn set trước ít nhất 1 nấc); làm liền không nghỉ; đổi kg set chính thì set drop chưa tập và chưa tự sửa tính lại; đã tập set drop thì không bỏ được.
- **BR-03.8** Thêm / bớt set chính (xoá set đã tập phải xác nhận). Ghi chú cho từng bài.
- **BR-03.9 Đổi bài** (khi chưa tập set nào): chọn bài cùng ô hoặc bài khác cùng nhóm cơ (không trùng bài đã có trong buổi), có thể "Đặt làm bài chính của ô từ nay". Bài mới dùng mức tạ và lịch sử riêng.
- **BR-03.10** Thêm bài vào buổi từ giáo án; bỏ bài khỏi buổi (có xác nhận, giáo án không đổi).
- **BR-03.11 Xong bài**: dấu "XONG", tóm tắt set, nút "Sang bài n: …" hoặc "Xong hết · Kết thúc buổi tập". (Không tự chuyển bài.)
- **BR-03.12 Kết thúc**: nếu chưa có set nào xong → đề nghị huỷ buổi. Nếu còn set chưa ✓ → cảnh báo số set/bài chưa tập, chọn "Tập tiếp" hoặc "Vẫn lưu". Tổng kết: thời gian, số set, tấn tạ, dự kiến vs thực tế, thời gian trung bình mỗi set, số bài đạt set×rep mục tiêu, so tổng tạ với lần trước cùng buổi, **kỷ lục mới** (1RM ước tính Epley `kg × (1 + rep/30)` vượt lịch sử) kèm dải "KỶ LỤC MỚI".
- **BR-03.13 Lưu**: chỉ giữ set đã ✓ có rep > 0 (giữ chấm độ khó, đánh dấu drop); bỏ bài không có set; cập nhật mức "đang tập" (trừ buổi deload); buổi đầu tiên đặt ngày bắt đầu chu kỳ. Toast "Đã lưu buổi tập" có nút **Hoàn tác** (= mở lại).
- **BR-03.14 Mở lại** buổi (trong ngày hoặc trong 6 giờ sau khi kết thúc): set đã lưu thành set đã ✓, thêm set còn thiếu, tính tiếp drop set, thêm lại các bài của ngày chưa tập; thời gian nghỉ giữa hai lần không tính vào thời lượng. Đang có buổi dở thì không mở lại buổi khác.
- **BR-03.15 Huỷ buổi** (xác nhận): không lưu gì.
- **BR-03.16** Giữ màn hình sáng khi đang tập (Wake Lock, nếu trình duyệt hỗ trợ).
- **BR-03.17** Bài đã bị xoá khỏi giáo án nhưng còn trong buổi đang/đã tập vẫn hiển thị bằng bản lưu tạm (không có nút hướng dẫn, không gợi ý).

## BR-04 Đồng hồ nghỉ & báo hết giờ
Test: `tests/app/rest.spec.mjs`, `tests/app/profiles.spec.mjs`

- **BR-04.1** Thời gian nghỉ = nghỉ riêng của bài, hoặc theo **nhịp nghỉ** chung: Nhanh (chân 90s · thân trên 60s · cô lập 45s), **Chuẩn** (120 · 90 · 60 — mặc định), Nặng (180 · 150 · 90).
- **BR-04.2** Thanh nghỉ: thời gian còn lại, −15s, +15s, Bỏ qua. −15s khi còn ≤ 15s = bỏ qua. 10 giây cuối sáng viền; 3 giây cuối đếm tick + rung.
- **BR-04.3** Hết giờ: rung, chuông, hộp "Hết giờ nghỉ · <tên người tập nếu nhiều người>" — "Vào set tiếp: <bài>"; nút "Vào set tiếp" tắt hộp. Nếu app đang chạy nền lúc hết giờ, mở lại app thì hiện hộp kèm "Đã hết giờ từ … trước".
- **BR-04.4 Báo hết giờ bằng thông báo của app** (bật ở Tài khoản → Thông báo, BR-22): khi app ở nền lúc hết giờ thì hiện thông báo hệ thống "Hết giờ nghỉ" (qua service worker hoặc `Notification` trực tiếp). Nếu có máy chủ thông báo thì giờ nghỉ được hẹn ngay lúc bắt đầu nghỉ để báo **đúng giờ cả khi khoá màn hình**; +15s/−15s/Bỏ qua cập nhật lại hoặc huỷ hẹn. *(Phím tắt iPhone `shortcuts://` đã bỏ từ PA-19; dữ liệu cũ tự chuyển sang thông báo của app — BR-20.1.)*
- **BR-04.5** Không bấm ✓ trước set drop: không nghỉ giữa các set drop ("Vào drop set ngay").

## BR-05 Gợi ý mức tạ
Test: `tests/app/suggest.spec.mjs`, `tests/app/session.spec.mjs`, `tests/app/edge.spec.mjs`

Lịch sử dùng để gợi ý = các buổi **không deload** của bài. "Mức W" = kg cao nhất buổi gần nhất. Mỗi lần tăng **đúng 1 nấc tạ của bài** (PA-10).

- **BR-05.1 Chưa có lịch sử**: có mức đang tập → "BẮT ĐẦU" ở mức đó; chưa có → "BUỔI ĐẦU" (chọn mức làm được 10 rep còn dư 2–3). Mức tự sửa mới hơn buổi gần nhất cũng dùng "BẮT ĐẦU".
- **BR-05.2 Tăng theo tuần (mặc định)** — "đạt" = đủ số set ở ≥ W với rep ≥ mục tiêu:
  1. Đạt nhưng có set chấm **Hỏng** → **GIỮ** thêm 1 buổi.
  2. Đạt (tốc độ Chuẩn; hoặc Thận trọng mà mọi set chấm Dễ hoặc buổi trước cũng đạt ở W): nếu đã qua **6 ngày** kể từ buổi đầu tiên tập ở W → **TĂNG TẠ** W + 1 nấc, rep mục tiêu giảm 2 (không dưới tối thiểu); chưa đủ 6 ngày → **ĐÃ ĐẠT**, hẹn ngày tăng.
  3. Đạt nhưng tốc độ Thận trọng cần thêm 1 tuần → **SẮP TĂNG**.
  4. 3 buổi liền ở W không đạt và không tiến bộ rep → **GIẢM** ~10%.
  5. 2 buổi liền ở W có set dưới rep tối thiểu → **GIẢM** 1 nấc.
  6. Còn lại → **GIỮ** W, mục tiêu mỗi set +1 rep (tối đa rep mục tiêu).
- **BR-05.3 Tăng theo rep (double progression)** (chỉ còn với dữ liệu cũ đã chọn chế độ này): đạt rep tối đa mọi set 2 buổi liền → tăng 1 nấc (rep về tối thiểu); 1 buổi → SẮP TĂNG; 3 buổi không tăng rep → giảm ~10%; 2 buổi dưới tối thiểu → giảm 1 nấc; còn lại giữ, +1 rep/set.
- **BR-05.4 Tuần deload** → **DELOAD** ~90% W (làm tròn theo nấc). Tuần deload là tuần thứ 7 của chu kỳ; hết 1 tuần mà chưa bấm "Xong deload" thì app **tự sang chu kỳ mới** (ngày bắt đầu mới = thứ Hai đầu tiên sau tuần deload) (PA-28).
- **BR-05.5 Đau** (BR-08): đau nhẹ → giảm ~20% (làm tròn xuống theo nấc); đau vừa/nặng → **NÊN BỎ**; mới hết đau (≤ 21 ngày, chưa tập lại bài đó) → **QUAY LẠI** ~80%.
- **BR-05.3 Tăng theo rep (double progression)** (mã vẫn còn nhưng giao diện không có chỗ chọn; dữ liệu cũ đã chọn chế độ này được chuyển về "Tăng theo tuần" một lần — BR-20.1, PA-29): đạt rep tối đa mọi set 2 buổi liền → tăng 1 nấc (rep về tối thiểu); 1 buổi → SẮP TĂNG; 3 buổi không tăng rep → giảm ~10%; 2 buổi dưới tối thiểu → giảm 1 nấc; còn lại giữ, +1 rep/set.
- **BR-05.4 Tuần deload** → **DELOAD** ~90% W (làm tròn theo nấc), giữ nguyên số set.
- **BR-05.5 Đau** (BR-08): đau nhẹ → giảm ~20% (làm tròn xuống theo nấc); gặp tuần deload thì lấy mức giảm **thấp hơn** (80% của mức gốc W, nhỏ hơn 90%), không nhân dồn (PA-29, VD-16); đau vừa/nặng → **NÊN BỎ**; mới hết đau (≤ 21 ngày, chưa tập lại bài đó) → **QUAY LẠI** ~80%.
- **BR-05.6 Kế hoạch tuần đã duyệt** (BR-07) ghi đè mức tạ: nhãn "ĐÃ DUYỆT" / "TĂNG TẠ", ghi rõ "bạn chọn giữ mức cũ" hoặc "bạn tự chỉnh".
- **BR-05.7** Bài tạ đơn ghi "kg/tay" trong lời gợi ý.
- **BR-05.8 Lộ trình**: giả định tuần nào cũng đạt; tăng mỗi `need` tuần (Chuẩn 1, Thận trọng 2) 1 nấc; mỗi 6 tuần có 1 tuần deload (90%), tuần sau quay lại; dự kiến tuần đạt mục tiêu (tối đa 156 tuần).

## BR-06 Trang chủ: gợi ý buổi & nhắc việc
Test: `tests/app/home.spec.mjs`, `tests/app/edge.spec.mjs`

- **BR-06.1 Độ hồi phục nhóm cơ**: một nhóm cơ "đã tập" khi buổi có ≥ 2 set cho nhóm đó; cần **72 giờ** cho nhóm lớn (Ngực, Lưng, Đùi trước, Đùi sau, Mông) và **48 giờ** cho nhóm nhỏ. Trạng thái: Sẵn sàng (≥ 95%) · Gần đủ (≥ 66%) · Đang hồi phục, kèm giờ còn lại. Nhóm "Khác" không tính.
- **BR-06.2 Thẻ vé buổi gợi ý** (đầu Trang chủ): điểm = hồi phục (60%) + set còn thiếu so với mục tiêu tuần (25%) + lâu chưa tập (15%) − 0,5 nếu hồi phục < 66% − 0,6 × tỉ lệ set đang đau nặng. Thẻ ghi nhãn "Gợi ý hôm nay / Gợi ý buổi tiếp theo / Bạn chọn / Bạn chọn · đúng gợi ý", tên buổi, số bài · set · thời gian dự kiến · lần cuối, 4 bài đầu kèm mức tạ (▲ nếu lên tạ, ⚠ nếu đau, "Bỏ · đau"), dòng "vì sao gợi ý" (nhóm nào đã/chưa phục hồi) và nút **Bắt đầu** (khoá nếu ngày không có bài).
- **BR-06.3 Chọn buổi khác**: dải chip các ngày tập (chấm màu hồi phục, nhãn "Gợi ý") + chip "Tự chọn bài"; chọn chip thì thẻ vé đổi theo. Nếu buổi chọn chưa hồi phục mà có buổi hồi phục tốt hơn thì cảnh báo và nút "Đổi sang …". Nút **Tập** giữa thanh dưới mở bảng "Bắt đầu buổi tập" (gợi ý xếp đầu + Tự chọn bài) hoặc quay lại buổi đang dở.
- **BR-06.4** Hôm nay đã tập: thẻ "Hôm nay đã tập …" với "Tập tiếp" (mở lại) và "Xem lại"; thẻ vé chuyển sang "Gợi ý buổi tiếp theo".
- **BR-06.5 Hai thẻ nhỏ**: *Tuần này* (số buổi / mục tiêu = max(số ngày tập, 3), số set, thanh tiến độ → mở Tiến độ) và *Buổi gần nhất* (tên, số set, thời lượng → mở buổi; chưa có buổi nào thì mời xem giáo án).
- **BR-06.6 Việc cần làm**: gom các nhắc thành thẻ lật ngang có chấm trang (đủ cả trong chuông), theo thứ tự: kế hoạch tuần chưa duyệt · **tuần deload** ("Xong deload, bắt đầu chu kỳ mới" đặt lại ngày bắt đầu chu kỳ) · đang đau · cơ thể chưa hồi phục (nhịp tim nghỉ ≥ trung bình + 5 bpm hoặc HRV ≤ 85% trung bình, cần ≥ 4 lần đo trong 14 ngày, đo trong 1 ngày gần nhất) · chụp ảnh body (≥ 28 ngày) → mở Tiến độ/Ảnh · sao lưu định kỳ (≥ 5 buổi, chưa sao lưu hoặc ≥ 14 ngày và ≥ 5 buổi mới; "Để sau" 7 ngày; ẩn khi đồng bộ tài khoản) · tải thư viện hình ("Để sau" 7 ngày) · có bài nhóm "Khác". Không có việc nào thì không hiện thẻ và ẩn chấm chuông. Khi kế hoạch tuần đã duyệt: thẻ "Tuần … · đã duyệt · n bài lên tạ" có "Xem / sửa kế hoạch".
- **BR-06.7 Thẻ Độ hồi phục** (thu gọn được; liệt kê nhóm cơ đang hồi phục kèm giờ còn lại) + liên kết "Báo đau".
- **BR-06.8** Thời gian dự kiến = Σ bài [số set × (rep × giây/rep + 5) + (số set − 1) × nghỉ + drop (3 × (10 rep + 10s)) + khởi động (170s bài lớn, 60s bài cô lập) + 60s chuyển bài].
- **BR-06.9** Giáo án mẫu/ngày tập chưa có: Trang chủ hiện màn khởi đầu (BR-01) cùng các việc cần làm.

## BR-07 Kế hoạch tuần
Test: `tests/app/weekplan.spec.mjs`, `tests/app/profiles.spec.mjs`, `tests/app/edge.spec.mjs` (VD-31 đã sửa ở PA-26: duyệt Deload khi chưa có ngày bắt đầu chu kỳ không còn lỗi)

- **BR-07.1** Tuần tính từ Thứ Hai. Đầu tuần (đã có giáo án và ≥ 1 buổi, chưa duyệt, chưa "Để sau") app **tự mở** bảng kế hoạch tuần.
- **BR-07.2 Bước 1 · Tuần trước**: số buổi, set, tấn tạ; số bài đã lên tạ; bài đang chững; nhóm cơ còn thiếu set (< mục tiêu 10 set/tuần).
- **BR-07.3 Bước 2 · Trọng tâm**: **Cân bằng** · **Ưu tiên** 1 nhóm (Ngực/Lưng/Vai/Chân/Tay có trong giáo án) · **Deload**. Đủ 6 tuần thì gợi ý Deload (mặc định chọn Deload).
  - Ưu tiên: trong buổi có bài nhóm ưu tiên, các bài nhóm ưu tiên **lên đầu buổi**; ngày có 1–2 bài nhóm ưu tiên thì **thêm 1 bài** cùng nhóm lâu chưa tập (từ bài thay thế hoặc ngày khác). Số set của mọi bài luôn giữ nguyên như giáo án (PA-10); chữ hướng dẫn nói đúng như vậy (PA-29, VD-05).
- **BR-07.4 Bước 3 · Duyệt mức tạ**: liệt kê bài có mức tạ thay đổi (theo gợi ý BR-05) theo ngày; mỗi bài: "✓ Theo" · "Giữ <mức cũ>" · tự chỉnh −/+ theo nấc. Danh sách bài giữ nguyên thu gọn.
- **BR-07.5 Duyệt**: lưu kế hoạch của tuần (giữ tối đa 12 tuần gần nhất); buổi tập trong tuần dùng mức tạ đã duyệt; thẻ trên Trang chủ "Tuần … · đã duyệt · n bài lên tạ" có "Xem / sửa kế hoạch". "Để sau" hoặc đóng bảng: không tự mở lại trong tuần, banner vẫn mở được.

## BR-08 Đau & chấn thương
Test: `tests/app/pain.spec.mjs`, `tests/app/suggest.spec.mjs`

- **BR-08.1** Báo đau theo 9 vùng (Vai, Khuỷu tay, Cổ tay, Lưng dưới, Gối, Hông, Cổ, Ngực, Cổ chân) và 3 mức: **Nhẹ** 1–3/10 · **Vừa** 4–6/10 · **Nặng** 7–10/10, kèm ghi chú (≤ 80 ký tự). Hiện số bài trong giáo án bị ảnh hưởng (theo nhóm cơ và từ khoá tên bài) và cảnh báo dấu hiệu cần đi khám.
- **BR-08.2** Báo lại cùng vùng → cập nhật mức/ghi chú, không tạo bản ghi mới. Bản ghi đã khỏi > 60 ngày được dọn khi ghi đau mới.
- **BR-08.3 Ảnh hưởng**: đau nhẹ → bài liên quan giảm ~20%; vừa/nặng → bỏ bài khi bắt đầu buổi (toast số bài bỏ, vẫn thêm lại được); nếu mọi bài của ngày đều bị bỏ thì không cho bắt đầu.
- **BR-08.4** Banner "Đang đau: …"; đau nặng hoặc kéo dài ≥ 14 ngày → khuyên đi khám. "Đã hết đau" → quay lại ~80% ở buổi đầu (BR-05.5).

## BR-09 Tiến độ — Sức mạnh
Test: `tests/app/progress.spec.mjs`

- **BR-09.0** Mục **Tiến độ** có 3 tab con: *Sức mạnh* (nội dung nhóm này) · *Cơ thể* (BR-10.1–10.5) · *Ảnh* (BR-10.6). Thẻ đầu tab Sức mạnh là thẻ "vé" tóm tắt kỳ đang xem; nút "Bảng HLV" (chỉ máy HLV) mở bảng cả nhóm.
- **BR-09.1** Xem **theo tuần** (chấm 7 ngày) hoặc **theo tháng** (lịch tháng, ngày có buổi tô màu theo ngày tập và viết tắt tên; bấm mở buổi); lùi/tiến kỳ (không vượt kỳ hiện tại).
- **BR-09.2** 4 chỉ số: buổi · set · tấn tạ (Σ kg × rep, tạ đơn ×2, drop tính) · bài lên tạ; mũi tên so với kỳ trước.
- **BR-09.3 Nhóm cơ**: set mỗi nhóm (tháng: trung bình mỗi tuần), vùng mục tiêu 10–20 set/tuần, trạng thái Thiếu/Đạt/Cao.
- **BR-09.4 Vùng cơ 4 tuần**: số set 28 ngày theo vùng cơ chi tiết (ngực trên/giữa/dưới, 3 đầu vai…), vùng chính chưa tập, cặp lệch (ngực trên < 40% ngực giữa, vai sau < 40% vai trước, đùi sau < 40% đùi trước, lưng giữa < 40% xô).
- **BR-09.5 Từng bài**: "Tiến bộ nhiều nhất" (3 bài), "Đang chững" (giảm/đau, 4 bài); "Tất cả bài" theo nhóm cơ có tìm kiếm. Chi tiết bài: nhãn gợi ý, lộ trình 8 tuần, biểu đồ Mức tạ / 1RM ước tính / Khối lượng (rê để xem giá trị), bảng 40 buổi gần nhất (set, cảm giác, ghi chú, drop, deload), nút sửa.
- **BR-09.6** Danh sách buổi trong kỳ: thời lượng, số set, tấn tạ, so lần trước. Xem buổi: chỉ số, so lần trước, bảng set; **Mở lại** (BR-03.14); **Xoá** (xác nhận, ghi dấu xoá để đồng bộ).

## BR-10 Cơ thể & ảnh (Tiến độ → Cơ thể / Ảnh)
Test: `tests/app/body.spec.mjs`, `tests/app/home.spec.mjs`

- **BR-10.1** Chọn giới tính (để so mức chuẩn), đổi được.
- **BR-10.2 Nhập số đo** theo ngày (không chọn ngày tương lai): cân nặng, % mỡ, khối cơ xương, vòng eo, mỡ nội tạng — ít nhất 1 chỉ số. Mỗi ngày tối đa 1 lần đo (trùng ngày thì gộp). Sửa, xoá (bấm 2 lần).
- **BR-10.3 Lần đo gần nhất**: 4 ô chỉ số + so với lần đo cuối của tháng trước (hoặc lần đầu), đánh giá mức chuẩn: mỡ nam 10–20% / nữ 18–28%; eo nam < 90 / nữ < 80 cm (chuẩn châu Á); mỡ nội tạng < 10. Dòng **BMI** = cân nặng gần nhất ÷ chiều cao² (chiều cao ở Tài khoản → Chỉ số cơ thể), phân loại theo ngưỡng châu Á: < 18,5 thiếu cân · 18,5–22,9 bình thường · 23–24,9 tiền thừa cân · ≥ 25 thừa cân; chưa có chiều cao hoặc cân nặng thì hiện lời nhắc nhập (PA-29, VD-06).
- **BR-10.4 Đánh giá thành phần cơ thể** giữa 2 mốc (cần cân nặng + % mỡ): dùng khối cơ xương nếu có, không thì khối nạc; chênh < 0,3 kg coi như không đổi. 9 kết luận: Tăng cơ giảm mỡ · Tăng cơ mỡ giữ · Tăng cả hai (mỡ nhanh hơn / có kiểm soát) · Giảm mỡ giữ cơ · Giảm mỡ mất cơ · Đang mất cơ · Đang tăng mỡ · Ổn định — kèm lời khuyên.
- **BR-10.5 Biểu đồ**: Cơ & mỡ (2 đường, cần ≥ 2 lần đo có mỡ) · Cân nặng · % mỡ · Vòng eo. Danh sách lần đo (5 gần nhất, "Xem tất cả").
- **BR-10.6 Ảnh trước/sau**: 3 tư thế (Trước · Nghiêng · Sau); thêm nhiều ảnh (tối đa 24), **tự đọc ngày chụp EXIF** (hoặc ngày sửa file), sửa ngày/tư thế từng ảnh, đặt cùng ngày cho tất cả. Lưới theo tháng × tư thế, ô trống bấm để thêm đúng tháng. So sánh 2 ảnh cùng tư thế bằng thanh kéo, chọn ảnh Trước/Sau, kèm số đo gần ngày chụp (±21 ngày). Xem ảnh: đặt làm Trước/Sau, đổi ngày/tư thế, xoá (bấm 2 lần). ≥ 28 ngày chưa chụp → nhắc. Ghi chú trên màn hình nói rõ: ảnh body lưu trên máy; khi chạy trong claude.ai mọi ảnh (gồm ảnh body) được đẩy lên tài khoản Claude (PA-29, VD-12).

## BR-11 Tài khoản & cài đặt cá nhân
Test: `tests/app/settings.spec.mjs`, `tests/app/misc.spec.mjs`, `tests/app/backup.spec.mjs`

- **BR-11.0 Trang Tài khoản** (mục cuối thanh dưới): thẻ hồ sơ (tên, số buổi đã tập, số tuần liên tục, tấn tạ 4 tuần), rồi theo vai của máy (BR-26): chưa có vai → khối **Đăng nhập** (BR-26.5); HLV → khối máy chủ đồng bộ và mục **Học viên** với thẻ QR từng người (BR-26.1); HV → trạng thái nối với HLV; rồi danh mục các nhóm; bấm một dòng mở **trang con**, nút ‹ quay lại danh mục (đổi mục dưới thanh rồi quay lại luôn về danh mục).
  - *Đồng bộ & dữ liệu*: Thư viện hình hướng dẫn (BR-16.4). Không còn thẻ tài khoản Claude (BR-18 đã bỏ, PA-41). Mục *Đồng bộ với HLV* đã bỏ (BR-26.4).
  - *Tập luyện*: Nhịp nghỉ & nhịp rep (BR-11.3) · Lưu ý form khi tập (BR-11.4) · Chỉ số cơ thể (BR-11.5) · Thông báo (BR-22).
  - *Giao diện*: Giao diện & hiệu ứng (BR-11.1/11.2) · Cài lên màn hình (BR-19.1; ẩn khi đã chạy toàn màn hình).
  - *Khác*: Xoá dữ liệu (BR-11.7).
- **BR-11.1 Giao diện**: 2 giao diện — **Hổ Phách** (mặc định) · **Đen Tuyền** (OLED); đổi màu thanh trạng thái; nhớ qua lần mở sau. Dữ liệu cũ có giao diện cũ (Đen Vàng, Lửa Địa Ngục, Băng Ngục, Huyết Nguyệt, Trắng Tinh, Neon) tự chuyển về Hổ Phách một lần. Người mới (hồ sơ chưa có giáo án/buổi tập) chọn Đen Tuyền thì lần mở sau vẫn giữ Đen Tuyền (VD-32, PA-26); chỉ dữ liệu cũ có sẵn mới bị chuyển về Hổ Phách một lần.
- **BR-11.2 Hiệu ứng** Bật/Tắt (dập ✓, dấu XONG, KỶ LỤC MỚI, chớp viền); tôn trọng "Giảm chuyển động" của hệ điều hành. Âm thanh hiệu ứng, rung phản hồi, chấm độ khó — bật/tắt riêng.
- **BR-11.3 Nhịp tập**: thời gian mỗi rep Nhanh 2s / **Chuẩn 3s** / Chậm 4s; nhịp nghỉ Nhanh / **Chuẩn** / Nặng (BR-04.1). Ảnh hưởng thời gian dự kiến.
- **BR-11.4 Lưu ý form** theo từng hồ sơ: **Đầy đủ** (thẻ 3 điểm form đầu bài, thu gọn sau set đầu, mở lại được) · Gọn (1 dòng, bấm mở hướng dẫn) · Tắt.
- **BR-11.5** Chiều cao (cm) theo hồ sơ, dùng tính BMI ở Tiến độ → Cơ thể (BR-10.3; PA-29, VD-06).
- **BR-11.6** ~~Thẻ trạng thái lưu trữ khi chạy trong claude.ai (BR-18.4)~~ — đã bỏ (PA-41).
- **BR-11.7 Xoá toàn bộ dữ liệu** (xác nhận): xoá mọi hồ sơ, giáo án, lịch sử, số đo, ảnh, video của tôi; giữ cài đặt dùng chung (giao diện, âm thanh…) và **thư viện hình offline đã tải** (thẻ "Đã tải N hình" vẫn đúng), về màn chào mừng. Xoá hồ sơ / ngày tập / bài cũng xoá video riêng của chúng (PA-28).

## BR-12 Nhiều người tập & Phòng HLV
Test: `tests/app/profiles.spec.mjs`, `tests/app/vai.spec.mjs`

- **BR-12.1** Tối đa **8** người trên một máy (kể cả máy HLV), mỗi người dữ liệu riêng; cài đặt giao diện/âm thanh/thông báo/sao lưu dùng chung.
- **BR-12.2 Danh sách người tập**: màu đại diện, buổi tuần này (/ buổi theo lịch cũ nếu còn), set, cân nặng + thay đổi so với ~1 tháng trước, lần tập cuối, "Đang tập". Thêm học viên (chỉ máy HLV, BR-25.1; tên + gợi ý nhanh; có thể sao chép giáo án + ảnh máy của người khác, không chép mức tạ/lịch sử/số đo) rồi chuyển sang người đó; đổi tên; sao chép giáo án từ người khác (thêm vào / thay toàn bộ); xoá hồ sơ (xác nhận, xoá ảnh).
- **BR-12.3 Chuyển người**: lưu người hiện tại, nạp người mới; nếu người đó đang tập dở thì vào thẳng màn tập.
- **BR-12.4 (ĐÃ BỎ, PA-38)**: chế độ HLV (nút bật/tắt, tên HLV, lựa chọn *Tôi vẫn tự tập* / *Chỉ làm HLV*) đã bỏ. Vai của máy lấy từ mã QR, xem [BR-25](#br-25-vai-của-máy-hlv--hv--pa-38).
- **BR-12.5 Phòng HLV** (chỉ máy HLV, ở đầu Trang chủ — BR-25.4): tổng quan cả đội (buổi/tấn tạ 7 ngày, bài đã lên tạ 4 tuần, số người đã duyệt kế hoạch tuần, người cần để ý), lưới hoạt động 14 ngày; **Việc cần làm**: học viên đang tập · chưa tập buổi nào (bấm vào mở **Thẻ QR** của học viên đó — BR-24.19) · ≥ 4 ngày chưa tập · đang đau · ô bài nên đổi · chưa duyệt kế hoạch tuần (mở thẳng kế hoạch); **Bảng xếp hạng** (từ 4 học viên: tấn tạ 7 ngày / lên tạ 4 tuần / buổi 7 ngày); **thẻ học viên** (vòng mục tiêu buổi/7 ngày — đổi 3→6, biểu đồ tấn tạ 8 tuần, chỉ số, lần cuối, **Mở hồ sơ**, **Thẻ QR** — BR-24.2). Hồ sơ HLV (tự tập) không nằm trong Phòng HLV (BR-25.2).
- **BR-12.6 Máy chưa có vai** có một hồ sơ; nếu còn nhiều hồ sơ từ bản cũ thì báo quét mã QR HLV, hồ sơ cũ vẫn được giữ (BR-25.6).

## BR-13 Gửi & nhận giáo án bằng mã — **ĐÃ BỎ (PA-19)**
Test: `tests/app/drive.spec.mjs` (mã kiểu cũ bị từ chối), `tests/app/edge.spec.mjs`

- **BR-13.1** Giáo án đi từ HLV sang học viên **chỉ qua đồng bộ Google Drive** (BR-14). Đã bỏ: gửi giáo án bằng mã QR / tin nhắn Zalo / ảnh mã, nhập giáo án từ mã, nút "Gửi giáo án".
- **BR-13.2** Dán hoặc quét mã kiểu cũ (`SOTA1/SOTA2/SOTA2z`, `GAP2`, `GAS1/GAS2`, `GAQ1`, JSON `gadn-sync` dán vào ô) → báo "Mã này là kiểu gửi cũ, không còn dùng… chỉ cần mã liên kết HLV gửi". Chỉ nhận **mã liên kết Drive `GAL1`** (BR-14.2). Riêng **file** `gadn-sync` chọn qua *Khôi phục từ file* vẫn được nhận (BR-15.4).
- **BR-13.3** Link cũ `#nhap=<mã>` không còn nhập giáo án.

## BR-14 Đồng bộ HLV ⇄ học viên qua Google Drive
> **ĐÃ BỎ (PA-35, 23/10/2026)**: đồng bộ Google Drive và mã liên kết `GAL1` đã gỡ khỏi app và khỏi repo (`drive/` đã xoá). Thay bằng [BR-24](#br-24-máy-chủ-đồng-bộ-mới-pa-34).

## BR-15 Sao lưu & khôi phục
> **ĐÃ BỎ (PA-36, 23/10/2026)**: sao lưu ra file, khôi phục từ file (cả máy và một người), banner và bộ đếm nhắc sao lưu đã gỡ. Dữ liệu đã nằm trên máy chủ đồng bộ (BR-24) và trên các máy đã nối.

## BR-16 Hướng dẫn bài tập & thư viện hình
Test: `tests/app/guide.spec.mjs`

- **BR-16.1** Bảng hướng dẫn: vùng cơ, hình minh hoạ 2 tư thế (Free Exercise DB, tự tìm theo tên bài — thư viện ~870 bài), lực (đẩy/kéo/giữ) và dụng cụ, **hình người trước/sau tô nhóm cơ chính/phụ**, điểm form (lời nhắc riêng của người dùng lên đầu + lời nhắc theo kiểu động tác), link tìm video YouTube, **video của tôi** (quay/chọn ≤ 120 MB, lưu trên máy, xoá), link video riêng, cảnh báo an toàn.
- **BR-16.2** Đổi hình minh hoạ: gợi ý theo tên, tìm bằng tiếng Anh, chọn, hoặc không dùng hình.
- **BR-16.3** Hình đã xem được lưu lại để dùng offline.
- **BR-16.4 Thư viện hình offline**: tải 1 lần 2 gói (~20 MB, 873 bài × 2 tư thế), báo tiến độ MB/số hình, ghi nhớ đã tải, tải lại được; lỗi mạng hoặc tải được một phần thì báo rõ.

## BR-17 Báo cáo tháng — **ĐÃ BỎ (PA-14)**
- **BR-17.1** Báo cáo tháng (ảnh PNG, lời nhắn HLV, xuất Excel .csv) bị gỡ vì trùng với Tiến độ; các nút "Báo cáo" ở Tiến độ và thẻ học viên không còn. Test và mã liên quan đã xoá.

## BR-18 Chạy trong claude.ai (Artifact) — ĐÃ BỎ (PA-41, 23/10/2026)
> Đồng bộ tài khoản Claude, thẻ trạng thái lưu trữ, tải file qua claude.ai và việc đẩy ảnh lên tài khoản đã gỡ khỏi app. Trong claude.ai app chỉ lưu trên máy này, như mọi nơi khác. Test: `tests/app/cloud.spec.mjs` (kiểm tra đã gỡ).

## BR-19 Chạy offline (PWA)
Test: `tests/sw/sw.test.mjs`

- **BR-19.1** Cài được lên màn hình chính (manifest, icon, chạy toàn màn hình).
- **BR-19.2** Service worker lưu vỏ app khi cài; mở trang: có mạng lấy bản mới nhất và cập nhật cache, mất mạng dùng bản đã lưu; tài nguyên cùng nguồn ưu tiên cache; font Google dùng bản đã lưu và làm mới ngầm; gói hình `.bin` không đi qua cache của service worker (đã lưu trong IndexedDB).
- **BR-19.3** Mỗi phiên bản app một tên cache; kích hoạt bản mới thì xoá cache cũ.
- **BR-19.4** Bấm thông báo mở lại cửa sổ app (hoặc đúng trang trong thông báo); nhận thông báo đẩy từ máy chủ thông báo (BR-22), mặc định nội dung "Hết giờ nghỉ".

## BR-20 Tương thích dữ liệu cũ
Test: `tests/app/misc.spec.mjs`, `tests/app/backup.spec.mjs`, `tests/app/syncfile.spec.mjs`

- **BR-20.1** Mở dữ liệu bản cũ không mất dữ liệu: bổ sung trường thiếu của bài (rep tối thiểu/tối đa/mục tiêu, ảnh, khởi động, mức tạ), chuyển nghỉ mặc định cũ sang "Tự động", đưa mọi bài về 3 set (một lần, PA-10), bật khởi động mọi bài (một lần, PA-11), cách báo cũ (Phím tắt iPhone) → thông báo của app, giao diện cũ → Hổ Phách (một lần, PA-22), tốc độ "Thận trọng" / chế độ "Tăng theo rep" → mặc định (một lần, cờ `mig29`, PA-29), sửa trường hỏng (ảnh body, kế hoạch tuần, lịch), suy ra vùng cơ / nhóm cơ / hình minh hoạ từ tên bài, ngày bắt đầu giữ bài chính từ buổi đầu tiên.
- **BR-20.2** Đọc được mọi định dạng file sao lưu cũ (BR-15.2); mọi định dạng mã gửi cũ được nhận diện và báo rõ là không còn dùng (BR-13.2).

## BR-21 Tài khoản đăng nhập (HLV và học viên)
> **ĐÃ BỎ (PA-35, 23/10/2026)**: tài khoản đăng nhập bằng tên và mật khẩu (qua Apps Script) đã gỡ. Thay bằng mã HLV `GAH1` và thẻ học viên `GAV1` ở [BR-24](#br-24-máy-chủ-đồng-bộ-mới-pa-34).

## BR-22 Thông báo
Test: `tests/app/notify.spec.mjs`, `tests/app/rest.spec.mjs`, `tests/test_push_server.mjs`

- **BR-22.1 Thông báo của app** (Tài khoản → Thông báo): dùng `Notification` của điện thoại. Trạng thái: trình duyệt không hỗ trợ (trên iPhone nhắc mở bằng icon màn hình chính, iOS ≥ 16.4) · đã chặn (hướng dẫn bật lại) · chưa hỏi (nút *Cho phép thông báo*) · đã cho phép. Khi đã cho phép: bật/tắt *Báo hết giờ nghỉ giữa set*, nút *Thử thông báo*. Người dùng từ chối khi được xin quyền thì báo rõ. Không hiện trong claude.ai.
- **BR-22.2 Máy chủ thông báo**: app có **sẵn địa chỉ máy chủ thông báo dùng chung** (PA-23, hằng `PUSH_SERVER`); máy đã cho phép thông báo thì **tự nối** khi mở app và ngay sau khi bấm *Cho phép thông báo*, không phải dán gì. Ai muốn dùng máy chủ riêng thì triển khai Cloudflare Workers miễn phí (`push-server/`, hướng dẫn `push-server/HUONG-DAN.md`) rồi dán địa chỉ vào ô → *Kết nối máy chủ* (kiểm tra địa chỉ, xin quyền, đăng ký đẩy) → *Gửi thử*. Có máy chủ thì báo hết giờ nghỉ **đúng giờ kể cả khi khoá màn hình**; lỗi kết nối/gửi thử thì báo rõ; máy đã đăng ký từ trước tự đăng ký lại khi mở app. Địa chỉ dán tay (nếu có) được ưu tiên hơn địa chỉ dựng sẵn.
- **BR-22.3 Nhắc theo lịch** (cần máy chủ): *Nhắc lịch tập* chọn thứ trong tuần + giờ nhắc (mặc định 17:30); *Tối Chủ nhật nhắc nhập số đo & sao lưu* (bỏ phần sao lưu khi đã đồng bộ Drive).
- **BR-22.4 Báo dữ liệu mới qua Drive** (cần máy chủ): HLV nhận khi học viên tập xong; học viên nhận khi HLV cập nhật giáo án; mỗi loại bật/tắt riêng.
- **BR-22.5** Khi hết giờ nghỉ mà app đã mở: chuông + hộp báo trong app (BR-04.3), không gửi thêm thông báo hệ thống.

## BR-23 Chia sẻ kết quả buổi tập với PT
> **ĐÃ BỎ (PA-36, 23/10/2026)**: chia sẻ kết quả buổi tập với PT bằng link và QR đã gỡ. Dữ liệu đã đi tự động qua máy chủ đồng bộ (BR-24.6).

## BR-24 Máy chủ đồng bộ mới (PA-34, đang làm theo bước)
> Trạng thái: **bước 1 (PA-34.1)** HLV đăng ký và thêm học viên; **bước 2 (PA-34.2)** học viên nối máy bằng thẻ và buổi tập tự gửi; **bước 3 (PA-34.3)** máy HLV kéo buổi tập về đúng hồ sơ học viên (thông báo đẩy để bước 3b); **bước 4 (PA-34.4)** khôi phục khi máy trống bằng Face ID hoặc thẻ học viên; **bước 5 (PA-34.5)** chuyển học viên có sẵn và giáo án HLV → học viên; **PA-34.6** thông báo đẩy, xoá buổi, khôi phục thủ công có hoàn tác (BR-24.5), trạng thái gửi (BR-24.15). Các bước còn lại ghi trong [epics/2026-10-22.md](epics/2026-10-22.md), hạng mục 4.
- **BR-24.1** HLV đăng ký bằng mã QR HLV (`GAH1`): quét bằng camera, dán mã hoặc chọn ảnh. Mã sai hoặc máy chủ không nhận thì báo "Mã HLV không đúng" và không lưu khoá. Khoá chỉ nằm trên máy này. *Test:* `tests/app/hub.spec.mjs`.
- **BR-24.19 Mọi học viên luôn có thẻ**: mỗi hồ sơ học viên trên máy HLV (mọi hồ sơ trừ hồ sơ tên “Tôi”, là hồ sơ tự tập của HLV) tự được cấp thẻ QR khi HLV đăng ký, khi có hồ sơ mới, và khi mở app; mất mạng thì thử lại. Nút “Thẻ QR” trong Phòng HLV mở đúng thẻ. *Test:* `tests/app/hub.spec.mjs`.
- **BR-24.20 Hồ sơ HLV**: trong Tài khoản, nút *Hồ sơ HLV* liệt kê các hồ sơ trên máy (có dữ liệu hay trống, có thẻ học viên hay không). HLV chọn một hồ sơ làm hồ sơ tự tập của mình: hồ sơ đó không còn thẻ học viên (thẻ bị thu hồi trên máy chủ, dữ liệu trên máy chủ của học viên đó bị xoá, dữ liệu trên máy này giữ nguyên). Hồ sơ HLV cũ thành học viên và được cấp thẻ. Nếu hồ sơ HLV hiện tại hoặc hồ sơ được chọn có dữ liệu thì phải quét đúng mã QR HLV mới đổi được; mã khác khoá của máy này thì không đổi. Mặc định hồ sơ HLV là hồ sơ “Tôi” và mang id `sl:tu-tap` (BR-28.9, BR-28.10). *Test:* `tests/app/hub.spec.mjs`. **Đã đổi (PA-44):** hồ sơ HLV cũ trống thì xoá khỏi máy (BR-28.5); hồ sơ HLV cũ có dữ liệu thì thành học viên và buổi tập của nó chuyển lên học viên mới (BR-28.4).
- **BR-24.2** HLV thêm học viên: nhập tên → hiện thẻ QR (`GAV1`) có mã học viên và khoá riêng, cùng ô mã để sao chép. Thẻ dùng được lâu dài; hai học viên trùng tên có hai mã khác nhau. *Test:* `tests/app/hub.spec.mjs`.
- **BR-24.3** Học viên nối máy: quét thẻ `GAV1` của HLV (camera, dán mã, hoặc ảnh) → máy chủ cấp khoá riêng cho máy này, app ghi nhận và báo "Đã nối với HLV · <tên>". Tối đa 5 máy mỗi học viên (máy thứ 6 đẩy máy cũ nhất). *Test:* `tests/app/hub.spec.mjs`.
- **BR-24.6** Buổi đã tập tự gửi lên máy chủ sau khoảng 1,5 giây kể từ lúc lưu, và gửi lại khi mở app hoặc có mạng. Buổi đã gửi không gửi lại; buổi đang tập dở không gửi. *Test:* `tests/app/hub.spec.mjs`.
- **BR-24.4** Máy HLV thêm học viên thì có sẵn một hồ sơ cho học viên đó. Buổi học viên đã gửi được kéo về khi mở app, khi quay lại app, khi có mạng, và mỗi 20 giây khi app đang hiện. Buổi chỉ ghi đè bản cũ hơn, và được ghi đúng vào hồ sơ của học viên. *Test:* `tests/app/hub.spec.mjs`.
- ~~**BR-24.4 (khôi phục khi máy trống)** Học viên bật *Khôi phục bằng Face ID* trên máy đã nối. Máy trống (vừa xoá dữ liệu) chọn *Khôi phục bằng Face ID* → máy chủ kiểm chữ ký passkey và cấp khoá máy mới → app kéo lại toàn bộ buổi đã gửi. Không có Face ID thì quét lại thẻ học viên cho kết quả giống hệt. Face ID không dùng được hoặc chưa bật thì báo lỗi, không nối máy. *Test:* `tests/app/hub.spec.mjs`.~~ **ĐÃ BỎ (PA-40, BR-27.5)**
- **BR-24.9** (PA-40: gộp theo từng ngày, chỉ hỏi khi một ngày bị đổi cả hai bên — BR-27.6) Giáo án HLV → học viên: máy HLV gửi giáo án của mỗi học viên khi giáo án đổi; máy học viên nhận trong vòng 20 giây (kéo định kỳ) và gộp bằng cùng động cơ với Drive (`syncMerge`). Không còn nút *Hoàn tác giáo án* (BR-24.22, PA-41). *Test:* `tests/app/hub.spec.mjs`.
- **BR-24.17 (chuyển học viên có sẵn)** ~~HLV chọn các hồ sơ học viên đang có…~~ — **đã bỏ (PA-41)**: học viên có sẵn tự có thẻ QR theo BR-24.19. *Test:* `tests/app/hub.spec.mjs`.
- **BR-24.18 Xung đột giữa máy này và máy chủ** (PA-35): tự gộp khi có thể; hỏi người dùng khi không thể.

| Dữ liệu | Khi xung đột | Cách xử lý |
|---|---|---|
| Buổi tập có cùng mã | Hai bên có bản khác nhau | Bản có thời điểm mới hơn thắng (tự động) |
| Hai buổi khác mã, cùng ngày và tên buổi | Trùng buổi | Giữ cả hai, không xoá (tự động) |
| Mức tạ của cùng một bài | Hai bên đều có | Mức có thời điểm mới hơn thắng (tự động) |
| Giáo án | Chỉ HLV đổi | Áp dụng bản của HLV (tự động) |
| Giáo án | Cả máy này và HLV đều đổi so với lần đồng bộ trước | **Hỏi người dùng**: bảng so sánh (số ngày, số bài, ngày chỉ có ở một bên, bài khác số lượng) và hai lựa chọn: *Dùng giáo án HLV* (có hoàn tác) hoặc *Giữ giáo án máy này* |
| Giáo án khi nối máy lần đầu, máy đã có giáo án riêng | Khác nhau, chưa có bản đã thống nhất | **Hỏi người dùng** như trên |

So sánh giáo án bỏ qua mức tạ hiện tại (đổi mỗi buổi tập, không phải thay đổi giáo án). *Test:* `tests/app/hub.spec.mjs`.
- **Xoá buổi** (PA-34.6): học viên xoá buổi thì máy HLV cũng xoá, trừ khi buổi đã được sửa sau lần xoá (so thời điểm: xoá sau thời điểm sửa thì xoá). *Test:* `tests/app/hub.spec.mjs`. Lưu ý: so sánh theo đồng hồ của hai máy, lệch giờ lớn có thể sai thứ tự.
- ~~**BR-24.5 Khôi phục thủ công**: *Khôi phục từ máy chủ* thay buổi trên máy bằng bản đã gửi (có xác nhận, nói rõ buổi chưa gửi sẽ mất). *Hoàn tác khôi phục* trả lại như cũ. *Test:* `tests/app/hub.spec.mjs`.~~ **ĐÃ BỎ (PA-40, BR-27.5)**
- **BR-24.15 Trạng thái gửi**: máy học viên hiện *Đã gửi xong · lần cuối lúc …*, *Chờ gửi N buổi*, hoặc *Chưa gửi được: không liên lạc được máy chủ*. *Test:* `tests/app/hub.spec.mjs`.
- **BR-24.7 Thông báo đẩy** (PA-34.6): học viên tập xong → HLV nhận "<tên> vừa tập xong · <buổi> · n bài · m set"; giáo án đổi → học viên nhận "HLV vừa cập nhật giáo án". Buổi trước khi nối máy (lịch sử) không báo. Tắt công tắc *Học viên tập xong / HLV cập nhật giáo án* thì máy đó không nhận nữa. Máy chủ gửi qua Web Push; kiểm trong bộ test máy chủ (`tests/test_hub_sync.mjs`). **Chưa kiểm trên iPhone thật.**
- **BR-24.22 Bỏ thao tác đồng bộ tay** (PA-41): không còn *Chuyển học viên có sẵn* (BR-24.17), *Hoàn tác giáo án* (BR-24.9), và nút tay nào khác đẩy hay kéo dữ liệu. Đồng bộ chỉ tự động theo BR-27.6. *Test:* `tests/app/hub.spec.mjs`.
- **BR-24.24 Máy HLV trống tự có học viên** (PA-42): HLV đăng nhập bằng QR HLV trên máy chưa có hồ sơ học viên thì app tự lấy danh sách học viên trên máy chủ, tạo hồ sơ cho từng người (gắn thẻ có sẵn, không tạo thẻ mới), nhận giáo án HLV đã gửi và kéo lại toàn bộ buổi tập. Học viên thêm từ máy HLV khác cũng được nhận như vậy khi app tự đồng bộ. Hồ sơ đã có ngày tập không bị giáo án máy chủ đè lên. Máy chủ trả nhiều trang thì kéo hết các trang. *Test:* `tests/app/hub.spec.mjs`.
- **BR-24.25 Báo lỗi khi máy chủ không còn công nhận máy** (PA-43): khi máy chủ trả 401/403 (thẻ bị thu hồi hoặc khoá, máy chủ được làm mới), khác với mất mạng, thẻ *Máy chủ đồng bộ mới* báo đỏ bằng tiếng Việt: máy chủ không còn công nhận máy này, dữ liệu trên máy vẫn còn nguyên, đừng đăng xuất; học viên: nhắn HLV nhận thẻ QR mới và chạm *Nối lại bằng thẻ QR*; HLV: *Quét lại mã HLV*. Toast một lần khi lỗi mới xuất hiện, không còn dòng "sẽ thử lại tự động". Nối lại thành công thì báo lỗi mất, dữ liệu trên máy giữ nguyên và mọi buổi đã tập được gửi lại cho máy chủ. Chỉ báo ở thẻ đồng bộ (không có dải cảnh báo đầu app).
- Ngắt đăng ký trên máy này chỉ xoá khoá trên máy, không xoá dữ liệu trên máy chủ.

## BR-25 Vai của máy (HLV / HV) — PA-38
Test: `tests/app/vai.spec.mjs`, `tests/app/profiles.spec.mjs`, `tests/app/hub.spec.mjs`

Trước đây có hai thứ chồng nhau: *chế độ HLV* (công tắc tự bật, không cần QR) và *vai đồng bộ* (quét QR HLV hoặc thẻ học viên). Từ PA-38 chỉ còn **vai**, lấy từ mã QR.

- **BR-25.1 Vai của máy**: đúng một trong ba: **HLV** (đã quét QR HLV `GAH1`, có khoá HLV), **HV** (đã nối bằng thẻ `GAV1`), hoặc **chưa có vai**. Mọi mục HLV (Phòng HLV, Bảng HLV, Thêm học viên, thẻ QR, Hồ sơ HLV) chỉ hiện khi là HLV. Máy chưa có vai có một hồ sơ, không thêm được người tập, không có nút bật chế độ HLV. *Test:* `vai.spec.mjs` (3 test đầu).
- **BR-25.2 HLV vừa quản lý vừa tập**: hồ sơ HLV (BR-24.20, mặc định "Tôi") là hồ sơ tự tập của HLV như một HV. Hồ sơ này không có thẻ học viên, không nằm trong danh sách học viên và không gửi lên máy chủ. *Test:* `vai.spec.mjs` ("hồ sơ Tôi… không nằm trong danh sách").
- **BR-25.3 HV chỉ có tính năng HV**: máy HV không thấy Phòng HLV, Bảng HLV, nút Bật chế độ HLV. Tài khoản ghi "HV · máy này nối với HLV …". *Test:* `vai.spec.mjs` (HV).
- **BR-25.4 HLV thấy cùng lúc cả hai bộ tính năng**: Trang chủ của HLV có khối **Phòng HLV** (tổng quan đội, việc cần làm, bảng xếp hạng, thẻ học viên) ở đầu, rồi Trang chủ của hồ sơ đang xem. Thanh dưới luôn 5 mục: Trang chủ · Lịch tập · Tập · Tiến độ · Tài khoản. Tiến độ có nút Bảng HLV. Không còn công tắc chuyển đổi. *Test:* `vai.spec.mjs` ("cùng lúc"), `profiles.spec.mjs`.
- **BR-25.5 Giới hạn 8 người** áp dụng cho máy HLV như trước (BR-12.1). *Test:* `vai.spec.mjs`.
- **BR-25.6 Dữ liệu cũ** (mig30): máy đang có trường chế độ HLV (`profiles.coach`) nhưng chưa có khoá HLV: trường đó được bỏ một lần khi mở app, **mọi hồ sơ được giữ**. Nếu còn nhiều hồ sơ, Trang chủ báo "Quét mã QR HLV để làm HLV…". *Test:* `vai.spec.mjs` ("dữ liệu cũ").

## BR-26 Tài khoản HLV: thẻ QR học viên, đăng nhập bằng QR hoặc mã — PA-39
Test: `tests/app/taikhoan.spec.mjs`, `tests/app/hub.spec.mjs`, `tests/app/vai.spec.mjs`, `tests/app/profiles.spec.mjs`

- **BR-26.1 Thẻ QR học viên**: mục *Học viên* trong Tài khoản (chỉ máy HLV) liệt kê mọi học viên trên máy (BR-25.5). Chạm một học viên → sheet *Thẻ QR của học viên*: ảnh QR của mã `GAV1` và mã chữ. Học viên chưa có thẻ thì chạm để tạo thẻ mới trên máy chủ; thẻ là thông tin lưu lâu dài, dùng để nhận dạng học viên. *Test:* `taikhoan.spec.mjs`.
- **BR-26.2 Chia sẻ**: sheet thẻ có *Chia sẻ ảnh QR* (file PNG qua bảng chia sẻ của máy), *Chia sẻ mã* (chữ `GAV1`, qua bảng chia sẻ) và *Sao chép mã*. Máy không có bảng chia sẻ file thì tải ảnh về; không có bảng chia sẻ chữ thì chép mã vào bộ nhớ tạm. *Test:* `taikhoan.spec.mjs`.
- **BR-26.3 Bỏ "Vai trên máy này"**: thẻ này không còn ở Tài khoản; vai hiện qua khối đăng nhập (chưa có vai), khối máy chủ (HLV, HV). *Test:* `taikhoan.spec.mjs`.
- **BR-26.4 Bỏ "Đồng bộ với HLV"**: dòng này và trang con *Đồng bộ với HLV* đã gỡ; nút *Đồng bộ với HLV* trong banner đổi thành *Quét mã QR* (mở quét mã). *Test:* `taikhoan.spec.mjs`.
- **BR-26.5 Đăng nhập** (máy chưa có vai): khối đầu Tài khoản có *Quét mã QR* (camera, chọn ảnh, dán từ bộ nhớ tạm; nhận `GAH1` hoặc `GAV1`) và *Hoặc dán mã* (PA-40: bỏ *Khôi phục bằng Face ID*, BR-27.5) (ô chữ nhận `GAH1.…` hoặc `GAV1.…`). Mã sai báo "Không tìm thấy mã liên kết" hoặc "Mã HLV không đúng" và không lưu gì. *Test:* `taikhoan.spec.mjs`.
- **BR-26.6** Máy đã có vai không thấy khối Đăng nhập. Không có nút đăng xuất trong khối này. *Test:* `taikhoan.spec.mjs`.

## BR-27 Popup, chữ, đồng bộ tự động, lịch tập và báo cơ chưa phục hồi — PA-40 (23/10/2026)
Test: `tests/app/popup.spec.mjs`, `tests/app/pa40.spec.mjs`, `tests/app/hub.spec.mjs` (BR-27.6), `tests/test_hub_sync.mjs` (dau@hv)

- **BR-27.1 Nút đóng popup**: mọi popup (bảng, trình xem ảnh, báo hết giờ) có nút × ở góc trên phải; bấm × thì đóng, trang nền giữ nguyên. *Test:* `popup.spec.mjs`.
- **BR-27.2 Kéo xuống để đóng**: kéo vạch đầu popup (hoặc thanh trên của trình xem ảnh) xuống quá 90 px thì đóng; kéo ngắn hơn thì popup trở lại chỗ cũ. Không kích hoạt khi kéo trong ô nhập hay ảnh so sánh. *Test:* `popup.spec.mjs`.
- **BR-27.3 Nút quay lại (trình duyệt / vuốt trái)**: đang có popup thì đóng popup; không có popup mà đang ở tab khác thì về Trang chủ. *Test:* `popup.spec.mjs`.
- **BR-27.4 Chữ không chọn được**: mọi chữ không sửa được (nhãn, nút, tab, tiêu đề, mô tả, nội dung thẻ) không chọn được, kể cả bằng nhấn đúp hay kéo; ô nhập và ô soạn thảo vẫn chọn và sửa bình thường. *Test:* `popup.spec.mjs`.
- **BR-27.5 Bỏ hẳn khôi phục và ngắt kết nối**: không còn *Bật khôi phục bằng Face ID*, *Khôi phục bằng Face ID* (khối đăng nhập), *Khôi phục từ máy chủ*, *Hoàn tác khôi phục*, *Ngắt kết nối trên máy này* / *Ngắt đăng ký trên máy này*. Dữ liệu đã lưu giữ nguyên. Khi nối máy, buổi đã gửi vẫn tự kéo về như trước. *Test:* `pa40.spec.mjs`.
- **BR-27.6 Đồng bộ tự động, hỏi khi cần**: app tự gửi và kéo dữ liệu khi mở app, có mạng, quay lại app và mỗi 20 giây (như trước). Giáo án gộp **theo từng ngày** so với bản đã thống nhất: ngày chỉ một bên đổi thì tự gộp; chỉ khi **cùng một ngày** bị đổi cả hai bên mới hỏi, từng ngày một (*Dùng bản HLV* / *Giữ bản máy này*). Ngày còn lại không bị chặn. Mất mạng thì báo ở thẻ máy chủ và tự thử lại. *Test:* `hub.spec.mjs` (BR-27.6, BR-24.9).
- **BR-27.7 Thư viện hình cho học viên**: không có tab hay nút tải/xoá; chỉ một dòng trạng thái *Đã đồng bộ · N hình* hoặc *Chưa đồng bộ* trong Tài khoản. HLV giữ nguyên quản lý. *Test:* `pa40.spec.mjs`.
- **BR-27.8 Thẻ "Lưu trên máy này"**: chỉ còn tiêu đề. Khi dữ liệu đã được gửi lên máy chủ Cloudflare (`lastOk` hoặc giáo án đã gửi), tiêu đề đổi màu thành *Đã đồng bộ với server*. *Test:* `pa40.spec.mjs`.
- **BR-27.9 Dòng tóm tắt lịch tập**: "x bài · x set · thời gian" nằm một hàng ngay dưới tiêu đề ngày, không xuống dòng. *Test:* `pa40.spec.mjs`.
- **BR-27.10 Sắp lịch tập theo sức khoẻ cơ**: ngày có nhóm cơ chính hồi phục nhiều hơn xếp trước (theo bộ đếm hồi phục có sẵn, BR-02.2). Số thứ tự theo vị trí hiển thị. *Test:* `pa40.spec.mjs`.
- **BR-27.11 Báo cơ chưa phục hồi**: trong ngày đang mở ở Lịch tập có hàng *Cơ chưa hồi phục?* với một nút cho mỗi nhóm cơ của ngày. Chạm để báo (nhãn *chưa phục hồi · từ X giờ*); chạm lại để bỏ. Đây là thông tin cho HLV, **không** đổi bộ đếm hồi phục hay gợi ý tạ. Báo đau tổn thương (*Báo đau* ở Hôm nay, `state.pains`) vẫn tách riêng. Báo được gửi lên máy chủ (`dau@hv`) để HLV thấy nhãn ở hồ sơ học viên. *Test:* `pa40.spec.mjs`, `test_hub_sync.mjs`.
- **BR-27.12 Tự hết sau 24 giờ**: mục báo cơ quá 24 giờ không còn hiển thị ở máy học viên và máy HLV; máy chủ bỏ bản cũ khi có bản mới. *Test:* `pa40.spec.mjs`, `test_hub_sync.mjs`.

Ngoài phạm vi PA-40: đổi công thức hồi phục, đổi cảnh báo đau có sẵn, đổi giao diện các mục khác. Máy chủ `push-server/` cần triển khai bản có `dau@hv` trước khi báo cơ đau tới được HLV (app cũ vẫn chạy; báo chỉ bị bỏ qua).
## BR-28 Hồ sơ tập của HLV đồng bộ giữa các máy (PA-44)
> Trạng thái: **đã làm** (23/10/2026). Ảnh máy tập của hồ sơ HLV chưa đồng bộ, xem ghi chú cuối mục. Chi tiết và quyết định: [epics/2026-10-23.md](epics/2026-10-23.md), hạng mục 7.

- **BR-28.1 Hồ sơ tập duy nhất trên máy chủ**: **id cố định `sl:tu-tap`**: hồ sơ HLV luôn ứng với đúng id này trên máy chủ và trên máy (BR-28.9); đổi hồ sơ HLV (BR-24.20) thì hồ sơ mới thừa kế `sl:tu-tap`. hồ sơ tập của HLV (hồ sơ được chọn ở *Hồ sơ HLV*, BR-24.20) có một bản trên máy chủ, dùng chung cho mọi máy đã đăng ký bằng cùng mã HLV. Buổi tập đã tập và giáo án của hồ sơ này tự gửi lên và kéo về các máy HLV khác trong khoảng 20 giây (như BR-24.6, 24.9). Máy HLV trống đăng ký bằng QR HLV thì có ngay buổi tập và giáo án của hồ sơ này. Hồ sơ tập của HLV không có thẻ học viên và không tạo học viên. *Test:* `hub.spec.mjs` (BR-28.1).
- **BR-28.2 Hai máy đều có dữ liệu**: buổi tập của hai máy được gộp theo mã (cùng mã thì bản mới hơn thắng, khác mã thì giữ cả hai); giáo án gộp theo từng ngày như BR-27.6. *Test:* `hub.spec.mjs` (BR-28.1, hai máy).
- **BR-28.4 Đổi hồ sơ HLV có dữ liệu**: hồ sơ HLV cũ thành học viên có thẻ QR mới và buổi tập của nó được đẩy lên học viên mới. Học viên được chọn mất thẻ và dữ liệu trên máy chủ (BR-24.20, Q3 đã chốt); dữ liệu trên máy vẫn giữ. Hồ sơ được chọn thành hồ sơ tập của HLV và được mở ngay. Đổi hồ sơ cần xác nhận bằng mã QR HLV nếu một trong hai hồ sơ có dữ liệu (BR-24.20). *Test:* `hub.spec.mjs` (BR-28.4).
- **BR-28.5 Hồ sơ HLV cũ trống bị xoá**: khi đổi hồ sơ HLV, nếu hồ sơ cũ không có dữ liệu thì xoá hẳn khỏi máy, không tạo thẻ học viên. *Test:* `hub.spec.mjs` (BR-28.5, Hồ sơ HLV · hồ sơ trống).
- **BR-28.6 Ghi chú**: giáo án của hồ sơ HLV từ máy khác khi hồ sơ đó không đang mở được giữ lại và nhận khi mở hồ sơ. Ảnh máy tập của hồ sơ HLV và của học viên chưa đồng bộ qua máy chủ (chờ xác nhận cách gắn ảnh vào bài tập, xem epic 23/10).
- **BR-28.7 Máy HLV trống không đè giáo án**: máy HLV vừa nối (hồ sơ tập hoặc học viên còn trống, chưa đồng bộ lần nào) **không bao giờ gửi giáo án trống lên máy chủ**; giáo án đang có trên máy chủ được giữ và về máy. *Test:* `hub.spec.mjs` (BR-24.24, BR-28.1 máy thứ hai).
- **BR-28.9 Hồ sơ HLV mang id `sl:tu-tap`**: máy HLV luôn có tối đa một hồ sơ cục bộ id `sl:tu-tap`, là hồ sơ tập của HLV (không còn `settings.sync.self`). Học viên không bao giờ có id này. Đổi hồ sơ HLV (BR-24.20) thì hồ sơ được chọn đổi id thành `sl:tu-tap`, hồ sơ HLV cũ có dữ liệu đổi sang id thường và thành học viên (BR-28.4). Đang tập dở thì chưa đổi được. *Test:* `hub.spec.mjs` (BR-28.4, BR-28.5, Hồ sơ HLV).
- **BR-28.10 Cài lại app: `sl:tu-tap` thay hồ sơ mặc định**: máy HLV chưa có hồ sơ `sl:tu-tap` (vừa cài lại, quét QR HLV) không tạo hồ sơ HLV thêm. Hồ sơ “Tôi” (hoặc `p1` còn trống, chưa có thẻ học viên) **đổi id thành `sl:tu-tap`** rồi nhận tên, buổi tập, giáo án từ máy chủ; “Tôi” không còn là hồ sơ riêng. Chỉ khi máy không có hồ sơ nào phù hợp (ví dụ `p1` đã có dữ liệu mà không tên “Tôi”, vẫn là học viên) mới tạo hồ sơ mới id `sl:tu-tap`. Máy chủ chưa có `sl:tu-tap` thì tạo với id này (BR-28.1). *Test:* `hub.spec.mjs` (BR-28.10).
- **BR-28.11 Tên hồ sơ HLV đồng bộ**: tên có trên máy chủ thì máy lấy tên đó; HLV đổi tên thì cập nhật lên máy chủ và các máy HLV khác nhận theo (~20 giây). Máy chủ chưa có tên thì giữ tên trên máy (tên mặc định “Tôi” không gửi). Máy chủ chưa cập nhật bản ghi `ten@hlv` thì tên chỉ giữ trên máy. *Test:* `hub.spec.mjs` (BR-28.11), `test_hub_sync.mjs`.
- **BR-28.12 Máy HLV cũ**: khi mở app, hồ sơ HLV theo `sync.self` (hoặc “Tôi”) đổi id thành `sl:tu-tap`, dữ liệu và học viên giữ nguyên, bỏ `sync.self`. *Test:* `hub.spec.mjs` (BR-28.12).

## Giáo án HLV (PA-45 · A)
- **BR-30.1 Khoá mức tạ**: HLV khoá một bài (`hold`): app không tự lên tạ bài đó, gợi ý là GIỮ ở mức hiện tại. Bỏ khoá thì gợi ý trở lại bình thường. Chỉ HLV đặt; học viên thấy chip "HLV khoá" trong Lịch tập. *Test:* `giaoan-hlv.spec.mjs` (BR-30.1).
- **BR-30.2 Ghi chú HLV cho bài**: HLV viết ghi chú (tối đa 300 ký tự, `hlvNote`) cho bài; học viên thấy trong Lịch tập và thẻ bài đang tập. Máy không phải HLV chỉ đọc. *Test:* `giaoan-hlv.spec.mjs` (BR-30.2).
- **BR-30.3 Trạng thái gửi giáo án**: trên Lịch tập của HLV đang xem học viên có thẻ: "Gửi giáo án lần cuối lúc hh:mm" hoặc "Chưa gửi lần nào"; học viên chưa có thẻ QR thì báo "Học viên chưa có thẻ QR". *Test:* `giaoan-hlv.spec.mjs` (BR-30.3).
