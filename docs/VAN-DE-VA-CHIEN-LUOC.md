# Điểm chưa ổn & chiến lược phát triển tiếp

> Kết quả kiểm kê toàn bộ app ngày 21/10/2026 (đọc toàn bộ mã + chạy 168 test). Mỗi vấn đề có mã `VD-xx` để dẫn chiếu từ epic/test.
> Mức độ: 🔴 **Cao** (sai kết quả tập / mất tính năng chính / mất dữ liệu) · 🟠 **Vừa** (sai lệch, gây hiểu nhầm, rủi ro) · 🟡 **Thấp** (khó chịu nhỏ, kỹ thuật).
> Trạng thái: **Mở** (chưa xử lý) · **Đã xử lý** (ghi PA). Chưa có vấn đề nào được sửa trong PA-15 — PA-15 chỉ thêm tài liệu, test và dọn mã chết.

## 1. Lỗi chức năng

| Mã | Mức | Vấn đề | Bằng chứng | Hướng sửa đề xuất |
|---|---|---|---|---|
| VD-01 | 🔴 | **Quét mã QR giáo án bằng camera không đọc được.** Bộ quét camera tách mã bằng `split('.')`, mà mã giáo án `SOTA2z.<…>` có dấu chấm nên mất phần sau → "Không tìm thấy mã giáo án". Đây là cách nhận giáo án được hướng dẫn đầu tiên ("Người nhận mở app → Quét mã"). Đọc qua ảnh mã hoặc dán mã vẫn được. Mã đồng bộ `GAS2` không bị (thân không có dấu chấm). | `qrScanSheet` → `r.data.split('.')`; test `share.spec.mjs` › *quét mã QR giáo án bằng camera* (`fixme`) | Dùng chung `joinQrParts` (regex lấy phần còn lại) cho camera |
| VD-02 | 🟠 | **Nút "Gửi giáo án" trong Việc cần làm (Phòng HLV) không làm gì.** Thẻ "X chưa tập buổi nào" có `data-act="coach-share"` nhưng không có hàm xử lý. | `viewCoach` todo; `handlers` thiếu `coach-share`; test `profiles.spec.mjs` (`fixme`) | Mở đồng bộ/gửi giáo án cho đúng học viên |
| VD-03 | 🔴 | **Kẹt tuần deload vĩnh viễn → ngừng tăng tạ.** Từ tuần thứ 7 tính từ buổi đầu tiên, nếu tuần đó chưa duyệt kế hoạch tuần thì *mọi* buổi bị coi là deload (`isDeloadCycle` = `tuần > 6`, không bao giờ reset): buổi lưu với `deload: true` → không cập nhật mức "đang tập", không tính vào tiến độ, gợi ý luôn "DELOAD", đầu trang luôn "Tuần deload". Banner "Xong deload, bắt đầu chu kỳ mới" đã bị bỏ khỏi giao diện (hàm không còn được gọi, PA-15 đã xoá phần mã chết này). Chỉ thoát được nếu duyệt kế hoạch tuần *mỗi tuần* với chế độ khác Deload. Ngoài ra trong buổi deload, ô kg vẫn điền mức cũ (40) trong khi chip gợi ý báo ↓35. | Kiểm chứng bằng chạy thật ngày 21/10/2026 (`cycleStart` 60 ngày trước → `active.deload = true`, sau khi lưu `currentKg` giữ nguyên, gợi ý vẫn `deload`, không có nút kết thúc); test `weekplan.spec.mjs` › *đủ 6 tuần…* | Tự sang chu kỳ mới sau 1 tuần deload (`cycleStart` = thứ Hai sau tuần deload), hoặc trả lại nút "Xong deload"; buổi deload điền sẵn mức deload |
| VD-04 | 🟠 | **"Xoá toàn bộ dữ liệu" xoá luôn thư viện hình offline nhưng app vẫn báo "Đã tải N hình".** Kho `photos` bị xoá sạch (cả `exdb:*`), khoá `exdbPack` vẫn còn → không nhắc tải lại, hướng dẫn mất hình khi offline. | Kiểm chứng bằng chạy thật (sau xoá: `photos = []`, `exdbPack = {n:1746}`, thẻ vẫn "Đã tải 1746 hình") | Giữ `exdb:*` khi xoá dữ liệu người dùng, hoặc xoá cả `exdbPack` |
| VD-05 | 🟠 | **Chữ hướng dẫn không khớp hành vi (từ PA-10).** Kế hoạch tuần "Ưu tiên" hứa "+1 set mỗi bài nhóm ưu tiên, nhóm khác −1 set"; "Deload"/banner nói "số set giảm một nửa"; bảng duyệt kế hoạch hiện số set deload giảm nửa — nhưng `setsFor()` luôn trả đúng số set của bài. Bảng quy tắc `rulesHtml` (đã xoá vì không còn hiển thị) còn nói tăng theo %. | `setsFor` (PA-10); `weekPlanSheet`; test `weekplan.spec.mjs` khẳng định số set giữ nguyên | Chọn 1: sửa chữ cho đúng PA-10, hoặc bật lại ±set — cần anh quyết |
| VD-06 | 🟡 | Tab Tôi ghi "Chiều cao… dùng để tính BMI ở tab Cơ thể" nhưng BMI không hiển thị ở đâu (phần tính BMI/khối nạc trong `DERIVED` đã là mã chết, PA-15 xoá). | `viewMore`, `viewBody` | Hiện BMI ở tab Cơ thể hoặc bỏ ô chiều cao/sửa chữ |
| VD-07 | 🟡 | Lời chào mặc định "Chào Tôi" (hồ sơ mặc định tên "Tôi"). | `renderHeader`; test `onboarding.spec.mjs` | Không chào khi tên là "Tôi", hoặc hỏi tên lúc khởi đầu |
| VD-08 | 🟡 | Bảng chẩn đoán thông báo không cập nhật tên phím tắt vừa sửa cho tới khi vẽ lại màn. | `data-bind="setting"` chỉ gọi `renderHeader` | Cập nhật `.diag` khi đổi tên |
| VD-09 | 🟡 | File sao lưu cả máy đếm "thiếu N ảnh" trùng lặp khi nhiều hồ sơ dùng chung mã ảnh. | `backup-all` cộng `Set` theo từng hồ sơ | Đếm trên tập hợp chung |
| VD-10 | 🟡 | Khởi động khi mức tạ bằng đúng 1 nấc máy (ví dụ 10 kg, nấc 10): gợi ý set "Nhẹ nhất" ở chính mức làm việc. | `warmSets`; test `suggest.spec.mjs` | Gợi ý tự trọng / set rỗng tay |
| VD-11 | 🟡 | Xoá hồ sơ / ngày tập / bài không xoá video riêng (`vid:*`) → rác trong IndexedDB (video có thể tới 120 MB). | `photoIdsOf` không gồm `vid` | Gom `vid` vào danh sách dọn |
| VD-16 | 🟡 | Tuần deload + đang đau nhẹ: giảm cộng dồn (90% rồi 80% → ~72%). | test `edge.spec.mjs` (20 → 17,5 → 12,5 kg) | Cần quyết định nghiệp vụ (lấy mức thấp hơn thay vì nhân dồn?) |
| VD-17 | 🟡 | Lịch tập theo thứ đã bỏ (từ khi `sched()` luôn rỗng) nhưng dữ liệu `schedule`, `remindTime`, `remindBefore` còn lưu và danh sách người tập vẫn hiện "x/y buổi" theo lịch cũ. | `profStats`; test `edge.spec.mjs` | Bỏ hẳn hoặc làm lại tính năng lịch |
| VD-18 | 🟠 | Tốc độ "Thận trọng" và chế độ "Tăng theo rep" không còn chỗ chọn trên giao diện (nút đã bỏ), nhưng dữ liệu cũ đã chọn vẫn chạy theo → người dùng không đổi lại được và không biết vì sao gợi ý khác. | `PACE`, `progMode`; handler `pace`/`mode` không có nút (PA-15 xoá) | Hiện lại lựa chọn hoặc chuyển đổi dữ liệu cũ về mặc định |

## 2. Dữ liệu, riêng tư, đồng bộ

| Mã | Mức | Vấn đề | Hướng xử lý |
|---|---|---|---|
| VD-12 | 🟠 | App ghi "Ảnh body chỉ lưu trên máy này" nhưng khi chạy trong claude.ai, **mọi ảnh (gồm ảnh body)** được đẩy lên tài khoản Claude (`DB.put('photos')` → `Cloud`). | Sửa chữ cho đúng, hoặc không đẩy ảnh body |
| VD-13 | 🟠 | Đồng bộ tài khoản Claude theo kiểu "cả khối mới hơn thắng": 2 thiết bị cùng sửa giáo án/cài đặt thì bản cũ hơn mất; khi tài khoản mới hơn, buổi chỉ có trên máy (chưa kịp đẩy) bị mất khi nạp. | Gộp theo bản ghi (như `syncMerge`), đẩy buổi tập lên trước khi nạp |
| VD-14 | 🟡 | Mỗi lần tạo mã đồng bộ, `syncPack` đọc và băm *toàn bộ ảnh máy tập* rồi bỏ đi (mã GAS2 không chứa ảnh) → chậm khi nhiều ảnh. | Bỏ bước băm ảnh khi đóng gói GAS2 |
| VD-25 | 🟡 | Khôi phục file cả máy không làm sạch nội dung (khác khôi phục 1 người có `okPhoto`) — hiện chỉ dựa vào `esc()` khi hiển thị. | Dùng chung bước làm sạch của đồng bộ |
| VD-27 | 🟡 | Dữ liệu chỉ ở IndexedDB của trình duyệt (Safari có thể xoá khi lâu không mở nếu không cài lên màn hình chính); sao lưu phụ thuộc người dùng tự tải file. | Nhắc cài PWA, `storage.persist()` đã gọi; cân nhắc sao lưu tự động (iCloud qua chia sẻ file định kỳ) |

## 3. Trải nghiệm & nền tảng

| Mã | Mức | Vấn đề | Hướng xử lý |
|---|---|---|---|
| VD-15 | 🟠 | Báo hết giờ nghỉ khi app chạy nền chỉ có trên iPhone (Phím tắt) và **mỗi lần bấm ✓ app bị chuyển sang app Phím tắt ~1 giây**; +15s/−15s không đổi được hẹn giờ của Đồng hồ. Android không có cách báo nền. | Web Push qua máy chủ nhỏ (đã từng có `push-server`), hoặc ứng dụng vỏ (Capacitor) có thông báo cục bộ |
| VD-28 | 🟡 | Bảng kế hoạch tuần **tự bật** mỗi đầu tuần khi mở app — có thể gây phiền. | Cho tắt tự bật trong cài đặt |
| VD-19 | 🟡 | Hình minh hoạ tải trực tiếp từ `raw.githubusercontent.com`, font từ Google Fonts: phụ thuộc bên thứ ba, chậm lần đầu, lộ IP. | Tự host font; khuyến khích tải gói offline |
| VD-29 | 🟡 | Chưa kiểm tra khả năng tiếp cận (trình đọc màn hình, tương phản 4 skin, cỡ chữ lớn). | Thêm kiểm tra a11y tự động (axe) vào bộ test |

## 4. Kỹ thuật & bảo trì

| Mã | Mức | Vấn đề | Hướng xử lý |
|---|---|---|---|
| VD-21 | 🔴 | **Một file ~780 KB**: CSS 1.300 dòng, ~3.950 dòng JS trong 1 IIFE, nhiều dòng > 500 ký tự, dữ liệu thư viện bài/hình (~75 KB) nhúng giữa mã. Khó đọc, khó review diff, dễ xung đột khi gộp PA, không có module/kiểu dữ liệu. | Tách module (xem chiến lược Giai đoạn 2) |
| VD-20 | 🟡 | CSS chết còn lại sau khi bỏ hiệu ứng (PA-10) và skin cũ: `.burst`, `.confetti`, `.rpl`, `.skinwipe`, `.medal`, `.sr`, canvas `#fx-*`, khối icon `light`/`neon`. PA-15 mới xoá phần JS chết. | Dọn CSS kèm test chụp màn hình (visual regression) |
| VD-22 | 🟠 | Chưa có CI: bộ test (PA-15) chưa chạy tự động khi đẩy nhánh. | GitHub Actions chạy `npm test` cho mọi nhánh `pa-*` |
| VD-23 | 🟡 | `README.md` gốc nhắc thư mục `push-server/` không còn trong repo. | PA-15 đã sửa README gốc |
| VD-26 | 🟡 | `APP_VERSION` (hiển thị trong app) cập nhật tay, không gắn với `CACHE` của `sw.js`. | Một nguồn phiên bản, kiểm tra trong test |
| VD-30 | 🟡 | `window.__sota` lộ trạng thái và hàm nội bộ ra trang (dùng để gỡ lỗi/kiểm thử). Không nguy hiểm (app không có bí mật) nhưng nên ghi rõ là API kiểm thử. | Giữ, đặt tên/ghi chú rõ ràng |

Mã VD-24 để trống (giữ chỗ). Vấn đề mới đánh số tiếp từ VD-31.

## 5. Chiến lược phát triển tiếp

Nguyên tắc ưu tiên: **(1) đúng kết quả tập & không mất dữ liệu → (2) tính năng chính chạy đúng như hướng dẫn → (3) nền móng để sửa nhanh, an toàn → (4) tính năng mới.** Mọi bước đi theo quy trình BR → BA → anh xác nhận → test → code ([docs/README.md](README.md)).

### Giai đoạn 1 — Sửa lỗi nặng (1–2 tuần, mỗi mục 1 PA nhỏ)
1. **VD-03** kẹt deload: chọn cơ chế tự sang chu kỳ mới / trả nút "Xong deload"; buổi deload điền mức deload. Test: bỏ đánh dấu, thêm test "sau tuần deload, tuần sau tăng tạ lại".
2. **VD-01** quét QR giáo án bằng camera: dùng chung bộ ghép trang. Bỏ `fixme` trong `share.spec.mjs`.
3. **VD-02** nút "Gửi giáo án" ở Phòng HLV. Bỏ `fixme` trong `profiles.spec.mjs`.
4. **VD-04** xoá dữ liệu giữ thư viện hình; **VD-11** dọn video.
5. **VD-05, VD-06, VD-12** sửa chữ cho khớp hành vi (cần anh chọn hướng ở VD-05).
6. **VD-22** CI: GitHub Actions chạy `npm test` trên mọi nhánh `pa-*`, chặn gộp khi đỏ.

### Giai đoạn 2 — Nền móng (2–4 tuần)
1. **Tách `index.html` thành module ES gốc** (không cần build, GitHub Pages vẫn phục vụ thẳng): `src/core/` (thuật toán thuần: gợi ý, lộ trình, hồi phục, khởi động, đồng bộ gộp), `src/data/` (lưu trữ, chuyển đổi dữ liệu), `src/ui/` (từng tab), `data/library.json` (thư viện bài/hình), `styles/` theo skin. Bộ test E2E hiện có là lưới an toàn: tách từng phần, test phải xanh sau mỗi bước.
2. **Unit test cho `src/core/`** (Node test runner, chạy < 1 giây) bên cạnh E2E; giữ ngưỡng coverage hiện tại cho cả hai.
3. **Phiên bản lược đồ dữ liệu** (`v: 4`) + bảng chuyển đổi có test cho mỗi bước; một nguồn phiên bản app (VD-26).
4. Dọn CSS chết (VD-20) kèm test chụp màn hình 4 skin.

### Giai đoạn 3 — Dữ liệu & đồng bộ (song song khi cần)
1. Đồng bộ claude.ai gộp theo bản ghi, không mất buổi tập (VD-13).
2. Tách ảnh body khỏi đồng bộ hoặc ghi rõ quyền riêng tư (VD-12).
3. Nhắc sao lưu thông minh hơn; cân nhắc sao lưu tự động (VD-27).

### Giai đoạn 4 — Tính năng (theo ưu tiên của anh)
- Báo hết giờ nghỉ không rời app / có trên Android (VD-15).
- Quyết định số phận các tính năng "nửa vời": lịch tập theo thứ (VD-17), tốc độ tăng tạ & tăng theo rep (VD-18), báo cáo tháng (PA-14 đang chờ duyệt).
- Tuỳ chọn tắt tự bật kế hoạch tuần (VD-28); kiểm tra khả năng tiếp cận (VD-29).

### Chỉ số theo dõi
- `npm test` xanh trên mọi PA; coverage không giảm dưới ngưỡng (lines/statements/functions ≥ 90%, branches ≥ 80%).
- Số `test.fixme` (lỗi đã biết) giảm dần về 0.
- Kích thước `index.html` và số dòng > 300 ký tự giảm dần trong Giai đoạn 2.
