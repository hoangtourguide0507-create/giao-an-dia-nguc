# BR tổng — Yêu cầu nghiệp vụ của Giáo Án Địa Ngục

> Phản ánh hành vi của app trên nhánh `main` (bản 2026.10.19 · bản 29, PA-13 đã duyệt) cộng các thay đổi của **PA-15** (dọn mã chết, không đổi hành vi).
> PA-14 "Bỏ báo cáo tháng" **chưa duyệt** nên báo cáo tháng (BR-17) vẫn còn.
> Mỗi yêu cầu có mã `BR-xx.y`. Cột **Test** chỉ file kiểm chứng trong `tests/`. Điểm chưa ổn đã biết: xem [VAN-DE-VA-CHIEN-LUOC.md](VAN-DE-VA-CHIEN-LUOC.md) (mã `VD-xx`).

## 0. Sản phẩm

**Giáo Án Địa Ngục** là sổ tay tập tạ trên điện thoại (PWA, chạy offline, giao diện tiếng Việt) cho người tập gym và huấn luyện viên (HLV) cá nhân. App ghi mức tạ từng set, **tự gợi ý tuần này nên tập bao nhiêu kg** cho từng bài, gợi ý **buổi nào nên tập hôm nay** theo độ hồi phục nhóm cơ, theo dõi số đo cơ thể và ảnh trước/sau; một máy dùng được cho nhiều người (chế độ HLV) và đồng bộ giữa máy HLV và máy học viên **không cần máy chủ** (qua mã chữ gửi Zalo, mã QR, ảnh mã).

| Vai trò | Nhu cầu chính |
|---|---|
| Người tự tập | Biết hôm nay tập gì, tạ bao nhiêu, ghi set nhanh, thấy tiến bộ |
| Học viên có HLV | Nhận giáo án từ HLV, tự tập và gửi kết quả lại |
| Huấn luyện viên | Quản lý nhiều học viên trên 1 máy, theo dõi ai lỡ buổi / cần lên tạ / đang đau, duyệt kế hoạch tuần, gửi báo cáo tháng |

Nguyên tắc chung:
- **BR-00.1** Dữ liệu nằm trên máy người dùng (IndexedDB). Không có máy chủ riêng. Khi mở trong claude.ai (Artifact) thì đồng bộ với tài khoản Claude (BR-18).
- **BR-00.2** Mọi chữ hiển thị bằng tiếng Việt; số dùng định dạng Việt (`42,5`).
- **BR-00.3** App chỉ đưa ra gợi ý dựa trên số liệu người dùng ghi, không thay thế HLV hay bác sĩ (ghi rõ ở cuối tab Tôi).
- **BR-00.4** Thanh điều hướng 5 tab: **Giáo án · Tiến độ · Tập (nút giữa) · Cơ thể · Tôi** (khi bật HLV, tab Tôi thành **HLV** = Phòng HLV). Khi đang có buổi tập dở, nút Tập hiện "Đang tập" và có chấm báo.
- **BR-00.5** Đầu trang hiện lời chào/tên người tập (bấm để đổi người tập hoặc mở Phòng HLV), thứ ngày hôm nay, và chip chu kỳ "Tuần x/6" hoặc "Tuần deload".

---

## BR-01 Khởi đầu
Test: `tests/app/onboarding.spec.mjs`

- **BR-01.1** Lần đầu mở (chưa có ngày tập): màn chào mừng với 3 lựa chọn: *Tạo ngày tập đầu tiên*, *Dùng giáo án mẫu 4 ngày*, *Quét mã giáo án người khác gửi*.
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
- **BR-04.4 Báo qua Phím tắt iPhone** (tuỳ chọn, chỉ bản cài từ GitHub Pages): mỗi lần bắt đầu nghỉ, app mở `shortcuts://run-shortcut?name=<tên phím tắt>&input=text&text=<số giây>` để hẹn giờ trong app Đồng hồ (kêu cả khi khoá máy/im lặng). Có hướng dẫn tạo phím tắt 5 bước, đổi tên phím tắt, sao chép tên, "Chạy thử 10 giây" (chỉ bật khi đã bật báo). +15s/−15s/Bỏ qua chỉ đổi trong app. Trong claude.ai không bật được.
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
- **BR-05.4 Tuần deload** → **DELOAD** ~90% W (làm tròn theo nấc).
- **BR-05.5 Đau** (BR-08): đau nhẹ → giảm ~20% (làm tròn xuống theo nấc); đau vừa/nặng → **NÊN BỎ**; mới hết đau (≤ 21 ngày, chưa tập lại bài đó) → **QUAY LẠI** ~80%.
- **BR-05.6 Kế hoạch tuần đã duyệt** (BR-07) ghi đè mức tạ: nhãn "ĐÃ DUYỆT" / "TĂNG TẠ", ghi rõ "bạn chọn giữ mức cũ" hoặc "bạn tự chỉnh".
- **BR-05.7** Bài tạ đơn ghi "kg/tay" trong lời gợi ý.
- **BR-05.8 Lộ trình**: giả định tuần nào cũng đạt; tăng mỗi `need` tuần (Chuẩn 1, Thận trọng 2) 1 nấc; mỗi 6 tuần có 1 tuần deload (90%), tuần sau quay lại; dự kiến tuần đạt mục tiêu (tối đa 156 tuần).

## BR-06 Màn Tập: gợi ý buổi & nhắc việc
Test: `tests/app/today.spec.mjs`, `tests/app/edge.spec.mjs`

- **BR-06.1 Độ hồi phục nhóm cơ**: một nhóm cơ "đã tập" khi buổi có ≥ 2 set cho nhóm đó; cần **72 giờ** cho nhóm lớn (Ngực, Lưng, Đùi trước, Đùi sau, Mông) và **48 giờ** cho nhóm nhỏ. Trạng thái: Sẵn sàng (≥ 95%) · Gần đủ (≥ 66%) · Đang hồi phục, kèm giờ còn lại. Nhóm "Khác" không tính.
- **BR-06.2 Buổi gợi ý**: điểm = hồi phục (60%) + set còn thiếu so với mục tiêu tuần (25%) + lâu chưa tập (15%) − 0,5 nếu hồi phục < 66% − 0,6 × tỉ lệ set đang đau nặng. Thẻ chính: nhãn "Gợi ý hôm nay / Gợi ý buổi tiếp theo / Bạn chọn / Bạn chọn · đúng gợi ý", tên, số bài · set · thời gian dự kiến · lần cuối, lý do (nhóm nào đã/chưa phục hồi), 4 bài đầu kèm mức tạ (▲ nếu lên tạ, ⚠ nếu đau, "Bỏ · đau"), nút Bắt đầu.
- **BR-06.3** Chọn buổi khác (thẻ cuộn ngang) — nếu buổi chọn chưa hồi phục mà có buổi hồi phục tốt hơn thì cảnh báo và nút "Đổi sang …". Thẻ "Tự chọn bài".
- **BR-06.4** Hôm nay đã tập: thẻ "Hôm nay đã tập …" với "Tập tiếp" (mở lại) và "Xem lại"; nếu đã liên kết HLV thì có "⇄ Đồng bộ HLV".
- **BR-06.5 Thẻ Độ hồi phục** (thu gọn được) + liên kết "Báo đau".
- **BR-06.6 Banner nhắc việc** (theo thứ tự): gợi ý bật chế độ HLV khi có nhiều người tập (ẩn được) · kế hoạch tuần chưa duyệt / đã duyệt · đang đau · cơ thể chưa hồi phục (nhịp tim nghỉ ≥ trung bình + 5 bpm hoặc HRV ≤ 85% trung bình, cần ≥ 4 lần đo trong 14 ngày, đo trong 1 ngày gần nhất) · chụp ảnh body (≥ 28 ngày) · sao lưu định kỳ (≥ 5 buổi, chưa sao lưu hoặc ≥ 14 ngày và ≥ 5 buổi mới; "Để sau" 7 ngày; ẩn khi đồng bộ tài khoản) · tải thư viện hình ("Để sau" 7 ngày) · có bài nhóm "Khác".
- **BR-06.7** Thời gian dự kiến = Σ bài [số set × (rep × giây/rep + 5) + (số set − 1) × nghỉ + drop (3 × (10 rep + 10s)) + khởi động (170s bài lớn, 60s bài cô lập) + 60s chuyển bài].

## BR-07 Kế hoạch tuần
Test: `tests/app/weekplan.spec.mjs`, `tests/app/profiles.spec.mjs`, `tests/app/edge.spec.mjs`

- **BR-07.1** Tuần tính từ Thứ Hai. Đầu tuần (đã có giáo án và ≥ 1 buổi, chưa duyệt, chưa "Để sau") app **tự mở** bảng kế hoạch tuần.
- **BR-07.2 Bước 1 · Tuần trước**: số buổi, set, tấn tạ; số bài đã lên tạ; bài đang chững; nhóm cơ còn thiếu set (< mục tiêu 10 set/tuần).
- **BR-07.3 Bước 2 · Trọng tâm**: **Cân bằng** · **Ưu tiên** 1 nhóm (Ngực/Lưng/Vai/Chân/Tay có trong giáo án) · **Deload**. Đủ 6 tuần thì gợi ý Deload (mặc định chọn Deload).
  - Ưu tiên: trong buổi có bài nhóm ưu tiên, các bài nhóm ưu tiên **lên đầu buổi**; ngày có 1–2 bài nhóm ưu tiên thì **thêm 1 bài** cùng nhóm lâu chưa tập (từ bài thay thế hoặc ngày khác). *(Chữ hướng dẫn còn hứa ±1 set — xem VD-05.)*
- **BR-07.4 Bước 3 · Duyệt mức tạ**: liệt kê bài có mức tạ thay đổi (theo gợi ý BR-05) theo ngày; mỗi bài: "✓ Theo" · "Giữ <mức cũ>" · tự chỉnh −/+ theo nấc. Danh sách bài giữ nguyên thu gọn.
- **BR-07.5 Duyệt**: lưu kế hoạch của tuần (giữ tối đa 12 tuần gần nhất); buổi tập trong tuần dùng mức tạ đã duyệt; thẻ trên màn Tập "Tuần … · đã duyệt · n bài lên tạ" có "Xem / sửa kế hoạch". "Để sau" hoặc đóng bảng: không tự mở lại trong tuần, banner vẫn mở được.

## BR-08 Đau & chấn thương
Test: `tests/app/pain.spec.mjs`, `tests/app/suggest.spec.mjs`

- **BR-08.1** Báo đau theo 9 vùng (Vai, Khuỷu tay, Cổ tay, Lưng dưới, Gối, Hông, Cổ, Ngực, Cổ chân) và 3 mức: **Nhẹ** 1–3/10 · **Vừa** 4–6/10 · **Nặng** 7–10/10, kèm ghi chú (≤ 80 ký tự). Hiện số bài trong giáo án bị ảnh hưởng (theo nhóm cơ và từ khoá tên bài) và cảnh báo dấu hiệu cần đi khám.
- **BR-08.2** Báo lại cùng vùng → cập nhật mức/ghi chú, không tạo bản ghi mới. Bản ghi đã khỏi > 60 ngày được dọn khi ghi đau mới.
- **BR-08.3 Ảnh hưởng**: đau nhẹ → bài liên quan giảm ~20%; vừa/nặng → bỏ bài khi bắt đầu buổi (toast số bài bỏ, vẫn thêm lại được); nếu mọi bài của ngày đều bị bỏ thì không cho bắt đầu.
- **BR-08.4** Banner "Đang đau: …"; đau nặng hoặc kéo dài ≥ 14 ngày → khuyên đi khám. "Đã hết đau" → quay lại ~80% ở buổi đầu (BR-05.5).

## BR-09 Tiến độ
Test: `tests/app/progress.spec.mjs`

- **BR-09.1** Xem **theo tuần** (chấm 7 ngày) hoặc **theo tháng** (lịch tháng, ngày có buổi tô màu theo ngày tập và viết tắt tên; bấm mở buổi); lùi/tiến kỳ (không vượt kỳ hiện tại).
- **BR-09.2** 4 chỉ số: buổi · set · tấn tạ (Σ kg × rep, tạ đơn ×2, drop tính) · bài lên tạ; mũi tên so với kỳ trước.
- **BR-09.3 Nhóm cơ**: set mỗi nhóm (tháng: trung bình mỗi tuần), vùng mục tiêu 10–20 set/tuần, trạng thái Thiếu/Đạt/Cao.
- **BR-09.4 Vùng cơ 4 tuần**: số set 28 ngày theo vùng cơ chi tiết (ngực trên/giữa/dưới, 3 đầu vai…), vùng chính chưa tập, cặp lệch (ngực trên < 40% ngực giữa, vai sau < 40% vai trước, đùi sau < 40% đùi trước, lưng giữa < 40% xô).
- **BR-09.5 Từng bài**: "Tiến bộ nhiều nhất" (3 bài), "Đang chững" (giảm/đau, 4 bài); "Tất cả bài" theo nhóm cơ có tìm kiếm. Chi tiết bài: nhãn gợi ý, lộ trình 8 tuần, biểu đồ Mức tạ / 1RM ước tính / Khối lượng (rê để xem giá trị), bảng 40 buổi gần nhất (set, cảm giác, ghi chú, drop, deload), nút sửa.
- **BR-09.6** Danh sách buổi trong kỳ: thời lượng, số set, tấn tạ, so lần trước. Xem buổi: chỉ số, so lần trước, bảng set; **Mở lại** (BR-03.14); **Xoá** (xác nhận, ghi dấu xoá để đồng bộ).

## BR-10 Cơ thể
Test: `tests/app/body.spec.mjs`, `tests/app/today.spec.mjs`

- **BR-10.1** Chọn giới tính (để so mức chuẩn), đổi được.
- **BR-10.2 Nhập số đo** theo ngày (không chọn ngày tương lai): cân nặng, % mỡ, khối cơ xương, vòng eo, mỡ nội tạng — ít nhất 1 chỉ số. Mỗi ngày tối đa 1 lần đo (trùng ngày thì gộp). Sửa, xoá (bấm 2 lần).
- **BR-10.3 Lần đo gần nhất**: 4 ô chỉ số + so với lần đo cuối của tháng trước (hoặc lần đầu), đánh giá mức chuẩn: mỡ nam 10–20% / nữ 18–28%; eo nam < 90 / nữ < 80 cm (chuẩn châu Á); mỡ nội tạng < 10.
- **BR-10.4 Đánh giá thành phần cơ thể** giữa 2 mốc (cần cân nặng + % mỡ): dùng khối cơ xương nếu có, không thì khối nạc; chênh < 0,3 kg coi như không đổi. 9 kết luận: Tăng cơ giảm mỡ · Tăng cơ mỡ giữ · Tăng cả hai (mỡ nhanh hơn / có kiểm soát) · Giảm mỡ giữ cơ · Giảm mỡ mất cơ · Đang mất cơ · Đang tăng mỡ · Ổn định — kèm lời khuyên.
- **BR-10.5 Biểu đồ**: Cơ & mỡ (2 đường, cần ≥ 2 lần đo có mỡ) · Cân nặng · % mỡ · Vòng eo. Danh sách lần đo (5 gần nhất, "Xem tất cả").
- **BR-10.6 Ảnh trước/sau**: 3 tư thế (Trước · Nghiêng · Sau); thêm nhiều ảnh (tối đa 24), **tự đọc ngày chụp EXIF** (hoặc ngày sửa file), sửa ngày/tư thế từng ảnh, đặt cùng ngày cho tất cả. Lưới theo tháng × tư thế, ô trống bấm để thêm đúng tháng. So sánh 2 ảnh cùng tư thế bằng thanh kéo, chọn ảnh Trước/Sau, kèm số đo gần ngày chụp (±21 ngày). Xem ảnh: đặt làm Trước/Sau, đổi ngày/tư thế, xoá (bấm 2 lần). ≥ 28 ngày chưa chụp → nhắc.

## BR-11 Cài đặt cá nhân (tab Tôi)
Test: `tests/app/settings.spec.mjs`, `tests/app/misc.spec.mjs`

- **BR-11.1 Giao diện**: 4 skin — Đen Vàng (mặc định) · Lửa Địa Ngục · Băng Ngục · Huyết Nguyệt (OLED); đổi màu thanh trạng thái; nhớ qua lần mở sau. Skin cũ (Trắng Tinh, Neon) tự chuyển về Đen Vàng.
- **BR-11.2 Hiệu ứng** Bật/Tắt (dập ✓, dấu XONG, KỶ LỤC MỚI, chớp viền); tôn trọng "Giảm chuyển động" của hệ điều hành. Âm thanh hiệu ứng, rung phản hồi, chấm độ khó — bật/tắt riêng.
- **BR-11.3 Nhịp tập**: thời gian mỗi rep Nhanh 2s / **Chuẩn 3s** / Chậm 4s; nhịp nghỉ Nhanh / **Chuẩn** / Nặng (BR-04.1). Ảnh hưởng thời gian dự kiến.
- **BR-11.4 Lưu ý form** theo từng hồ sơ: **Đầy đủ** (thẻ 3 điểm form đầu bài, thu gọn sau set đầu, mở lại được) · Gọn (1 dòng, bấm mở hướng dẫn) · Tắt.
- **BR-11.5** Chiều cao (cm) theo hồ sơ. *(Ghi chú nói dùng tính BMI nhưng BMI không hiển thị — VD-06.)*
- **BR-11.6** Thẻ trạng thái lưu trữ/đồng bộ (BR-18), thẻ thư viện hình (BR-16), cài app lên màn hình (hướng dẫn iPhone/Android; nút "Cài ứng dụng" khi trình duyệt cho phép), chẩn đoán thông báo + phiên bản app.
- **BR-11.7 Xoá toàn bộ dữ liệu** (xác nhận): xoá mọi hồ sơ, giáo án, lịch sử, số đo, ảnh; giữ cài đặt dùng chung (giao diện, âm thanh…), về màn chào mừng.

## BR-12 Nhiều người tập & chế độ HLV
Test: `tests/app/profiles.spec.mjs`, `tests/app/edge.spec.mjs`

- **BR-12.1** Tối đa **8** người trên một máy, mỗi người dữ liệu riêng; cài đặt giao diện/âm thanh/thông báo/sao lưu dùng chung.
- **BR-12.2 Danh sách người tập**: màu đại diện, buổi tuần này (/ buổi theo lịch cũ nếu còn), set, cân nặng + thay đổi so với ~1 tháng trước, lần tập cuối, "Đang tập". Thêm người (tên + gợi ý nhanh; có thể sao chép giáo án + ảnh máy của người khác, không chép mức tạ/lịch sử/số đo) rồi chuyển sang người đó; đổi tên; sao chép giáo án từ người khác (thêm vào / thay toàn bộ); xoá hồ sơ (xác nhận, xoá ảnh).
- **BR-12.3 Chuyển người**: lưu người hiện tại, nạp người mới; nếu người đó đang tập dở thì vào thẳng màn tập.
- **BR-12.4 Bật chế độ HLV**: tên HLV; nếu có hồ sơ "Tôi": *Tôi vẫn tự tập* (đổi tên thành tên HLV) hoặc *Chỉ làm HLV* (bỏ hồ sơ nếu trống, nếu có dữ liệu thì giữ và đổi tên "(dữ liệu cũ)"). Tắt được.
- **BR-12.5 Phòng HLV**: tổng quan cả đội (buổi/tấn tạ 7 ngày, bài đã lên tạ 4 tuần, số người đã duyệt kế hoạch tuần, người cần để ý), lưới hoạt động 14 ngày; **Việc cần làm**: học viên đang tập · chưa tập buổi nào (gửi giáo án — *VD-02*) · ≥ 4 ngày chưa tập · đang đau · ô bài nên đổi · chưa duyệt kế hoạch tuần (mở thẳng kế hoạch); **Bảng xếp hạng** (từ 4 học viên: tấn tạ 7 ngày / lên tạ 4 tuần / buổi 7 ngày); **thẻ học viên** (vòng mục tiêu buổi/7 ngày — đổi 3→6, biểu đồ tấn tạ 8 tuần, chỉ số, lần cuối, Mở hồ sơ, ⇄ Đồng bộ, 📄 Báo cáo).
- **BR-12.6** Khi có nhiều người mà chưa bật HLV: bảng "Tổng quan cả nhóm" từ tab Tiến độ / danh sách người tập.

## BR-13 Gửi & nhận giáo án
Test: `tests/app/share.spec.mjs`, `tests/app/misc.spec.mjs`

- **BR-13.1 Gửi**: chỉ gửi cấu trúc giáo án (ngày, bài, ô bài, bài thay thế, thông số, cách chỉnh máy) — **không** gửi mức tạ, lịch sử, ảnh. Hiện **mã QR** (giáo án dài chia nhiều mã, bấm "mã tiếp theo"), **Sao chép mã gửi qua Zalo** (một tin nhắn; mở bảng chia sẻ nếu có), **Lưu ảnh mã vào Ảnh** (một ảnh chứa các mã QR xếp dọc).
- **BR-13.2 Nhận**: quét camera *(mã giáo án đang lỗi — VD-01)*, chọn ảnh mã (nhiều ảnh, tự ghép trang, báo trang thiếu), dán mã từ bộ nhớ tạm hoặc ô chữ, link cũ `#nhap=<mã>`. Đọc được mã mới `SOTA2/SOTA2z` và mã cũ `SOTA1/SOTA1z` (kèm mức tạ HLV đặt sẵn và liên kết HLV).
- **BR-13.3 Xem trước** rồi chọn: chưa có giáo án → "Nhập giáo án"; đã có → **Cập nhật giáo án hiện tại** (khớp bài theo mã gốc hoặc tên, giữ mã bài nên lịch sử và mức tạ không mất, có Hoàn tác) hoặc **Thêm thành các ngày mới**.
- **BR-13.4** Dữ liệu nhận được bị giới hạn/làm sạch (≤ 14 ngày, ≤ 30 bài/ngày, ≤ 20 thay thế, số trong khoảng hợp lệ, nhóm cơ lạ → "Khác"). Mã hỏng/trống/không có mã → thông báo rõ.

## BR-14 Đồng bộ HLV ⇄ học viên
Test: `tests/app/sync.spec.mjs`, `tests/app/edge.spec.mjs`

- **BR-14.1** Cần **một máy HLV** (đã bật chế độ HLV) và **một máy học viên**; hai máy cùng vai thì báo cách xử lý. Chỉ đúng một hồ sơ được cập nhật.
- **BR-14.2 Cách gửi**: sao chép mã gửi Zalo (nhanh nhất), hiện mã QR đứng yên (đánh dấu "đã gửi" khi máy kia nhận xong), ảnh mã, quét mã máy kia, chọn ảnh mã. Mặc định chỉ gửi **phần thay đổi** từ lần trước; "Gửi lại toàn bộ" khi cần. Mỗi lượt vừa **1 mã QR**; giáo án quá dài thì lượt đầu chỉ gửi giáo án (nhiều mã, bấm tiếp), buổi tập gửi ở lượt sau.
- **BR-14.3 Học viên → HLV**: máy HLV giữ cấu trúc giáo án của HLV; nhận buổi tập, mức tạ mới hơn, bài học viên tự thêm; học viên xoá bài tự thêm thì HLV xoá theo. Học viên chưa liên kết → hỏi gộp vào hồ sơ nào.
- **BR-14.4 HLV → học viên**: giáo án dựng lại theo HLV nhưng **giữ mã bài cũ** (lịch sử không mất); bài HLV bỏ thì bỏ; bài học viên tự thêm giữ lại; lưu liên kết HLV (lần sau tự nhận đúng hồ sơ).
- **BR-14.5 Buổi tập** gộp theo mã (bản sửa sau thắng); buổi **trùng** (cùng ngày + tên buổi, khác mã) → chọn Giữ máy này / máy kia / cả hai (mặc định bản nhiều set hơn). Xoá có ghi dấu (giữ 180 ngày) để máy kia xoá theo. Mức tạ theo buổi mới nhất (bỏ deload) trừ khi có mức tự nhập mới hơn.
- **BR-14.6** Xem trước kết quả (buổi mới/cập nhật/xoá, mức tạ, bài mới/chỉnh/bỏ, ảnh) trước khi "Gộp dữ liệu"; **Hoàn tác** lần gộp gần nhất. Đang tập dở thì không gộp. Không có gì mới → "Hai máy đã khớp nhau".
- **BR-14.7 Tương thích**: nhận mã đồng bộ cũ `GAS1`, mã kết quả cũ `GAQ1` (chọn hồ sơ lưu), gói JSON `gadn-sync` (dán hoặc chọn file, kể cả ảnh máy tập kèm theo).

## BR-15 Sao lưu & khôi phục
Test: `tests/app/backup.spec.mjs`, `tests/app/misc.spec.mjs`

- **BR-15.1 Sao lưu**: 1 người → file cả máy; nhiều người → chọn **file của 1 người** (chỉ dữ liệu người đó) hoặc cả máy. File JSON gồm giáo án, buổi tập, số đo, ảnh máy, ảnh body; báo số buổi, số ảnh, dung lượng, ảnh thiếu. Lưu qua bảng chia sẻ (iPhone: Lưu vào Tệp/iCloud) hoặc tải file. Ghi nhận lần sao lưu (cho banner nhắc).
- **BR-15.2 Khôi phục file cả máy** (xác nhận): thay toàn bộ người tập + ảnh; giữ cài đặt dùng chung; báo số ảnh khôi phục/thiếu. File kiểu cũ (1 trạng thái) thay dữ liệu người đang xem.
- **BR-15.3 Khôi phục file 1 người**: thêm thành hồ sơ mới, hoặc thay một hồ sơ có sẵn (gợi ý trùng tên, xác nhận, **Hoàn tác**); hồ sơ khác không bị ảnh hưởng; ảnh không hợp lệ bị bỏ.
- **BR-15.4** File không phải của app → báo lỗi. File `gadn-sync` → chuyển sang luồng đồng bộ (BR-14).

## BR-16 Hướng dẫn bài tập & thư viện hình
Test: `tests/app/guide.spec.mjs`

- **BR-16.1** Bảng hướng dẫn: vùng cơ, hình minh hoạ 2 tư thế (Free Exercise DB, tự tìm theo tên bài — thư viện ~870 bài), lực (đẩy/kéo/giữ) và dụng cụ, **hình người trước/sau tô nhóm cơ chính/phụ**, điểm form (lời nhắc riêng của người dùng lên đầu + lời nhắc theo kiểu động tác), link tìm video YouTube, **video của tôi** (quay/chọn ≤ 120 MB, lưu trên máy, xoá), link video riêng, cảnh báo an toàn.
- **BR-16.2** Đổi hình minh hoạ: gợi ý theo tên, tìm bằng tiếng Anh, chọn, hoặc không dùng hình.
- **BR-16.3** Hình đã xem được lưu lại để dùng offline.
- **BR-16.4 Thư viện hình offline**: tải 1 lần 2 gói (~20 MB, 873 bài × 2 tư thế), báo tiến độ MB/số hình, ghi nhớ đã tải, tải lại được; lỗi mạng hoặc tải được một phần thì báo rõ.

## BR-17 Báo cáo tháng
Test: `tests/app/report.spec.mjs`, `tests/app/misc.spec.mjs`, `tests/app/edge.spec.mjs`

- **BR-17.1** Mở từ tab Tiến độ (tháng đang xem) hoặc thẻ học viên trong Phòng HLV; chuyển tháng (không vượt tháng này).
- **BR-17.2** Nội dung: buổi · set · tấn tạ (so tháng trước) · bài lên tạ; số tuần có tập; danh sách lên tạ (mức đầu → cuối tháng); kỷ lục 1RM ước tính; cơ thể (cân nặng, % mỡ, cơ xương: đầu → cuối); tỉ lệ cảm giác các set + lời khuyên (Hỏng ≥ 20% → quá nặng; Dễ ≥ 50% → lên nhanh hơn; Vừa+Sát ≥ 60% → đúng vùng).
- **BR-17.3** Lời nhắn HLV (≤ 300 ký tự) in lên **ảnh báo cáo PNG** (rộng 1080 px, màu theo skin); chia sẻ ảnh hoặc nhấn giữ để lưu.
- **BR-17.4 Xuất Excel (.csv, UTF-8 có BOM)**: mỗi set một dòng — Ngày, Buổi, Bài tập, Nhóm cơ, Set (số hoặc D1–D3/D), Kg, Rep, Loại (Set chính / Drop set / Giảm tải), Cảm giác, Ghi chú (dòng đầu của bài).

## BR-18 Chạy trong claude.ai (Artifact) — đồng bộ tài khoản Claude
Test: `tests/app/cloud.spec.mjs`

- **BR-18.1** Khi mở trong claude.ai và có quyền ghi: dữ liệu mỗi hồ sơ lưu riêng trong tài khoản Claude của người dùng; người khác mở link không thấy.
- **BR-18.2 Lần đầu kết nối**: tài khoản mới hơn → nạp từ tài khoản; máy mới hơn → giữ máy, nhận thêm buổi chỉ có trên tài khoản, đẩy lên (kể cả ảnh) và báo "Đã đưa dữ liệu lên tài khoản Claude". Hồ sơ có trên tài khoản được thêm vào máy.
- **BR-18.3** Mọi thay đổi tự lưu lên tài khoản sau ~1,2 giây (chỉ phần thay đổi); ảnh lưu riêng; ảnh thiếu trên máy lấy từ tài khoản.
- **BR-18.4 Trạng thái** hiển thị ở tab Tôi: Lưu trên máy này · Đang kết nối · Đang lưu · Đã đồng bộ · Chưa lưu được (thử lại khi mở lại app) · Bộ nhớ đồng bộ đã đầy · Chỉ lưu trên máy này (không có quyền).
- **BR-18.5** Kéo xuống để làm mới / mở lại app: lấy bản mới hơn từ tài khoản (khi không đang tập).
- **BR-18.6** Trong claude.ai: không nhắc sao lưu, không hướng dẫn cài app, không bật được Phím tắt; tải file dùng chức năng tải của claude.ai (từ chối thì im lặng; loại file bị chặn thì báo).

## BR-19 Chạy offline (PWA)
Test: `tests/sw/sw.test.mjs`

- **BR-19.1** Cài được lên màn hình chính (manifest, icon, chạy toàn màn hình).
- **BR-19.2** Service worker lưu vỏ app khi cài; mở trang: có mạng lấy bản mới nhất và cập nhật cache, mất mạng dùng bản đã lưu; tài nguyên cùng nguồn ưu tiên cache; font Google dùng bản đã lưu và làm mới ngầm; gói hình `.bin` không đi qua cache của service worker (đã lưu trong IndexedDB).
- **BR-19.3** Mỗi phiên bản app một tên cache; kích hoạt bản mới thì xoá cache cũ.
- **BR-19.4** Bấm thông báo mở lại cửa sổ app; nhận thông báo đẩy (giữ cho tương thích, mặc định "Hết giờ nghỉ").

## BR-20 Tương thích dữ liệu cũ
Test: `tests/app/misc.spec.mjs`, `tests/app/share.spec.mjs`, `tests/app/sync.spec.mjs`

- **BR-20.1** Mở dữ liệu bản cũ không mất dữ liệu: bổ sung trường thiếu của bài (rep tối thiểu/tối đa/mục tiêu, ảnh, khởi động, mức tạ), chuyển nghỉ mặc định cũ sang "Tự động", đưa mọi bài về 3 set (một lần, PA-10), bật khởi động mọi bài (một lần, PA-11), cách báo cũ → Phím tắt (tắt báo), skin cũ → Đen Vàng, sửa trường hỏng (ảnh body, kế hoạch tuần, lịch), suy ra vùng cơ / nhóm cơ / hình minh hoạ từ tên bài, ngày bắt đầu giữ bài chính từ buổi đầu tiên.
- **BR-20.2** Đọc được mọi định dạng mã/file cũ đã liệt kê ở BR-13.2, BR-14.7, BR-15.2.
