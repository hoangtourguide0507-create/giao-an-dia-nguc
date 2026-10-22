# Điểm chưa ổn & chiến lược phát triển tiếp

> Kiểm kê ngày 21/10/2026, **cập nhật 22/10/2026** sau khi gộp `main` (PA-14 → PA-22: bỏ báo cáo tháng, Drive, thông báo, tài khoản, giao diện mới). Mỗi vấn đề có mã `VD-xx` để dẫn chiếu từ epic/test. Dòng **✅ Đã xử lý** và **⚪ Hết hiệu lực** được giữ lại để không dùng lại mã.
> Mức độ: 🔴 **Cao** (sai kết quả tập / mất tính năng chính / mất dữ liệu) · 🟠 **Vừa** (sai lệch, gây hiểu nhầm, rủi ro) · 🟡 **Thấp** (khó chịu nhỏ, kỹ thuật).
> Trạng thái: mức độ 🔴🟠🟡 = còn **mở** (đã kiểm lại với app sau PA-22) · ✅ đã xử lý (ghi PA) · ⚪ hết hiệu lực (tính năng đã bỏ). PA-15 không sửa lỗi nào — chỉ thêm tài liệu, test và dọn mã chết.

## 1. Lỗi chức năng

| Mã | Mức | Vấn đề | Bằng chứng | Hướng sửa đề xuất |
|---|---|---|---|---|
| VD-01 | ✅ | **Đã xử lý (PA-19).** Quét mã giáo án bằng camera từng hỏng vì tách `split('.')`; giờ giáo án không còn gửi bằng mã, chỉ còn mã liên kết `GAL1` (thân base64url, không có dấu chấm), và test quét camera đã xanh. | `drive.spec.mjs` › *mã liên kết dán vào máy HLV bị từ chối… quét bằng camera* | — |
| VD-02 | ✅ | **Đã xử lý (PA-27).** Thẻ "X chưa tập buổi nào" trong Việc cần làm (Phòng HLV) nay mở bảng **Mã liên kết Google Drive** của đúng học viên (cùng bảng với nút ☁ Mã liên kết); giáo án đi qua Drive, không gửi bằng QR/tin nhắn. | `profiles.spec.mjs`, `drive.spec.mjs` › *VD-02* | — |
| VD-03 | 🟠 | **Tuần deload kẹt nếu không bấm “Xong deload”.** Đã xử lý một phần: nút *Xong deload, bắt đầu chu kỳ mới* đã trở lại trong thẻ **Việc cần làm** (Trang chủ). Còn lại: từ tuần thứ 7 mà không bấm (và không duyệt kế hoạch tuần khác Deload) thì mọi buổi vẫn là deload — không cập nhật mức “đang tập”, gợi ý luôn “DELOAD”; app không tự sang chu kỳ mới. | `home.spec.mjs` › *tuần deload (đủ 6 tuần)…*; `isDeloadCycle` không có điểm dừng | Tự sang chu kỳ mới sau 1 tuần deload (`cycleStart` = thứ Hai sau tuần deload) |
| VD-04 | 🟠 | **“Xoá toàn bộ dữ liệu” xoá luôn thư viện hình offline** (kho `photos`, cả `exdb:*`) mà khoá `exdbPack` ở kho `kv` có thể còn → thẻ “Đã tải N hình” sai (kiểm bằng chạy thật ngày 21/10; chưa có test riêng sau PA-22, test hiện chỉ khẳng định `photos = []`). | `wipe`; `settings.spec.mjs` › *xoá toàn bộ dữ liệu* | Giữ `exdb:*` khi xoá dữ liệu người dùng, hoặc xoá cả `exdbPack` |
| VD-05 | 🟠 | **Chữ hướng dẫn không khớp hành vi (từ PA-10).** Kế hoạch tuần “Ưu tiên” hứa “+1 set mỗi bài nhóm ưu tiên, nhóm khác −1 set”; “Deload” nói “số set giảm một nửa” (bảng duyệt cũng hiện nửa số set) — nhưng `setsFor()` luôn trả đúng số set của bài. | `setsFor` (PA-10); `weekPlanSheet` (`.wpnote`); test `weekplan.spec.mjs` khẳng định số set giữ nguyên | Chọn 1: sửa chữ cho đúng PA-10, hoặc bật lại ±set — cần anh quyết |
| VD-06 | 🟡 | Trang con *Chỉ số cơ thể* ghi “Chiều cao… dùng để tính BMI ở tab Cơ thể” nhưng BMI không hiển thị ở đâu. | `SEC.height` trong `viewMore`, `viewBody` | Hiện BMI trong Tiến độ → Cơ thể hoặc sửa chữ |
| VD-07 | 🟡 | Lời chào mặc định "Chào Tôi" (hồ sơ mặc định tên "Tôi"). | `renderHeader`; test `onboarding.spec.mjs` | Không chào khi tên là "Tôi", hoặc hỏi tên lúc khởi đầu |
| VD-08 | ⚪ | **Hết hiệu lực (PA-19).** Bảng chẩn đoán thông báo/tên Phím tắt đã gỡ cùng Phím tắt iPhone. | — | — |
| VD-09 | 🟡 | File sao lưu cả máy đếm "thiếu N ảnh" trùng lặp khi nhiều hồ sơ dùng chung mã ảnh. | `backup-all` cộng `Set` theo từng hồ sơ | Đếm trên tập hợp chung |
| VD-10 | 🟡 | Khởi động khi mức tạ bằng đúng 1 nấc máy (ví dụ 10 kg, nấc 10): gợi ý set "Nhẹ nhất" ở chính mức làm việc. | `warmSets`; test `suggest.spec.mjs` | Gợi ý tự trọng / set rỗng tay |
| VD-11 | 🟡 | Xoá hồ sơ / ngày tập / bài không xoá video riêng (`vid:*`) → rác trong IndexedDB (video có thể tới 120 MB). | `photoIdsOf` không gồm `vid` | Gom `vid` vào danh sách dọn |
| VD-16 | 🟡 | Tuần deload + đang đau nhẹ: giảm cộng dồn (90% rồi 80% → ~72%). | test `edge.spec.mjs` (20 → 17,5 → 12,5 kg) | Cần quyết định nghiệp vụ (lấy mức thấp hơn thay vì nhân dồn?) |
| VD-17 | 🟡 | Lịch tập theo thứ đã bỏ nhưng khoá `schedule`, `remindTime`, `remindBefore` còn nằm trong trạng thái (không còn dùng, không còn hiển thị “x/y buổi theo lịch” — PA-15 đã dọn phần đó). | `freshState().settings` | Xoá khoá chết trong bước chuyển đổi dữ liệu (kèm lược đồ v4) |
| VD-18 | 🟠 | Tốc độ “Thận trọng” và chế độ “Tăng theo rep” không còn chỗ chọn trên giao diện (Nhịp nghỉ & nhịp rep chỉ có nhịp rep và nhịp nghỉ), nhưng dữ liệu cũ đã chọn vẫn chạy theo → người dùng không đổi lại được. | `PACE`, `progMode`; không có handler `pace`/`mode` | Hiện lại lựa chọn hoặc chuyển đổi dữ liệu cũ về mặc định |
| VD-31 | 🟠 | **Duyệt kế hoạch tuần *Deload* khi hồ sơ chưa có ngày bắt đầu chu kỳ** làm lỗi JS khi vẽ lại màn hình (`Cannot read properties of null`): kế hoạch không lưu được/giao diện đứng. Gặp ở người mới chưa tập buổi nào mà chọn Deload. | `weekplan.spec.mjs` › `test.fixme` *VD-31* (khẳng định không có `pageerror`) | Chặn `cycleInfo()` null trong đường vẽ thẻ deload; hoặc đặt `cycleStart` khi chọn Deload lần đầu |
| VD-32 | 🟠 | **Người dùng mới chọn Đen Tuyền thì lần mở sau bị trả về Hổ Phách.** Bước chuyển giao diện PA-22 trong `loadState` chạy khi chưa có cờ `skin22` và đặt lại `skin = 'amber'`; cờ chưa kịp lưu nên lựa chọn bị mất. | `settings.spec.mjs` › `test.fixme` *VD-32* | Đặt `skin22` ngay khi áp dụng/khi người dùng chọn giao diện; hoặc chỉ chuyển giao diện cho dữ liệu có skin cũ |
| VD-33 | 🟠 | **Ảnh máy tập không đồng bộ qua Drive thật.** Mã băm ảnh (`strHash` = `<base36>.<độ dài>`) có dấu `.` mà máy chủ `Code.gs` từ chối tên ảnh có dấu chấm → `anh.day` lỗi, học viên không nhận ảnh HLV chụp (kiểm bằng `gas_server.js` chạy đúng `Code.gs`). | `drive.spec.mjs` › `test.fixme` *VD-33* | Đổi định dạng mã băm (bỏ `.`) hoặc cho phép dấu chấm trong `Code.gs`; kèm chuyển đổi mã ảnh đã lưu |

## 2. Dữ liệu, riêng tư, đồng bộ

| Mã | Mức | Vấn đề | Hướng xử lý |
|---|---|---|---|
| VD-12 | 🟠 | App ghi "Ảnh body chỉ lưu trên máy này" nhưng khi chạy trong claude.ai, **mọi ảnh (gồm ảnh body)** được đẩy lên tài khoản Claude (`DB.put('photos')` → `Cloud`). | Sửa chữ cho đúng, hoặc không đẩy ảnh body |
| VD-13 | 🟠 | Đồng bộ tài khoản Claude theo kiểu "cả khối mới hơn thắng": 2 thiết bị cùng sửa giáo án/cài đặt thì bản cũ hơn mất; khi tài khoản mới hơn, buổi chỉ có trên máy (chưa kịp đẩy) bị mất khi nạp. | Gộp theo bản ghi (như `syncMerge`), đẩy buổi tập lên trước khi nạp |
| VD-14 | 🟡 | Mỗi vòng đồng bộ Drive `syncPack`/`drvLocalPhotos` đọc và băm *toàn bộ ảnh máy tập* trước khi biết có gì để gửi → chậm khi nhiều ảnh/nhiều học viên (máy HLV đồng bộ mọi hồ sơ). | Lưu băm cùng ảnh khi chụp; chỉ băm ảnh mới |
| VD-25 | 🟡 | Khôi phục file cả máy không làm sạch nội dung (khác khôi phục 1 người có `okPhoto`) — hiện chỉ dựa vào `esc()` khi hiển thị. | Dùng chung bước làm sạch của đồng bộ |
| VD-34 | 🟠 | **Phụ thuộc hoàn toàn vào Google Apps Script của HLV**: mỗi lượt gọi ~1–3 s, hạn mức của Google, một người tự triển khai và giữ MÃ HLV; mất tài khoản Google = mất dữ liệu đồng bộ (có bản sao đêm giữ 14 ngày). Chưa có kiểm tra tải khi nhiều học viên đồng bộ cùng lúc — chỉ có test chức năng (`drive/Code.gs`). | Đo thời gian đồng bộ với 10–30 học viên; tài liệu hoá sao lưu/khôi phục thư mục Drive |
| VD-27 | 🟡 | Dữ liệu chỉ ở IndexedDB của trình duyệt (Safari có thể xoá khi lâu không mở nếu không cài lên màn hình chính); sao lưu phụ thuộc người dùng tự tải file. | Nhắc cài PWA, `storage.persist()` đã gọi; cân nhắc sao lưu tự động (iCloud qua chia sẻ file định kỳ) |

## 3. Trải nghiệm & nền tảng

| Mã | Mức | Vấn đề | Hướng xử lý |
|---|---|---|---|
| VD-15 | ✅ | **Đã xử lý (PA-16, PA-19).** Báo hết giờ nghỉ khi app chạy nền dùng thông báo của app (Notification API) và Web Push qua `push-server/`; Phím tắt iPhone đã bỏ. Lưu ý còn lại: khoá màn hình chỉ báo đúng giờ khi đã cài máy chủ thông báo (BR-22.2); iPhone phải mở app từ icon màn hình chính. Test: `notify.spec.mjs`. | — |
| VD-28 | 🟡 | Bảng kế hoạch tuần **tự bật** mỗi đầu tuần khi mở app — có thể gây phiền. | Cho tắt tự bật trong cài đặt |
| VD-19 | 🟡 | Hình minh hoạ tải trực tiếp từ `raw.githubusercontent.com`, font từ Google Fonts: phụ thuộc bên thứ ba, chậm lần đầu, lộ IP. | Tự host font; khuyến khích tải gói offline |
| VD-29 | 🟡 | Chưa kiểm tra khả năng tiếp cận (trình đọc màn hình, tương phản 2 giao diện, cỡ chữ lớn, hiệu ứng thẻ vé lấp lánh với người nhạy chuyển động). | Thêm kiểm tra a11y tự động (axe) vào bộ test |

## 4. Kỹ thuật & bảo trì

| Mã | Mức | Vấn đề | Hướng xử lý |
|---|---|---|---|
| VD-21 | 🔴 | **Một file ~5.340 dòng**: CSS lớn, ~4.000 dòng JS trong 1 IIFE, nhiều dòng > 500 ký tự, dữ liệu thư viện bài/hình nhúng giữa mã. PA-16…PA-22 đã thêm ~1.000 dòng (Drive, tài khoản, thông báo, giao diện mới) vào cùng file. Khó đọc, khó review diff, dễ xung đột khi gộp PA, không có module/kiểu dữ liệu. | Tách module (xem chiến lược Giai đoạn 2) |
| VD-20 | 🟡 | CSS chết còn lại sau khi bỏ hiệu ứng (PA-10), skin cũ và giao diện PA-22: `.burst`, `.confetti`, `.rpl`, `.skinwipe`, `.medal`, `.sr`, `.sched`, các khối icon/skin không dùng. PA-15 mới xoá phần JS chết. | Dọn CSS kèm test chụp màn hình (visual regression) |
| VD-22 | 🟠 | Chưa có CI: hai bộ test (`npm test`, `bash tests/chay.sh`) chưa chạy tự động khi đẩy nhánh (không có `.github/`). | GitHub Actions chạy cả hai bộ cho mọi nhánh `pa-*` |
| VD-23 | ✅ | **Đã xử lý.** `README.md` gốc từng nhắc `push-server/` khi thư mục không còn; nay `push-server/` quay lại repo (PA-16) nên README đúng. | — |
| VD-26 | ⚪ | **Hết hiệu lực.** App không còn hiển thị `APP_VERSION` (bảng chẩn đoán đã bỏ); số phiên bản duy nhất là `CACHE` trong `sw.js`. | — |
| VD-30 | 🟡 | `window.__sota` lộ trạng thái và hàm nội bộ ra trang (dùng để gỡ lỗi/kiểm thử). Không nguy hiểm (app không có bí mật) nhưng nên ghi rõ là API kiểm thử. | Giữ, đặt tên/ghi chú rõ ràng |

Mã VD-24 để trống (giữ chỗ). Vấn đề mới đánh số tiếp từ VD-35.

## 5. Chiến lược phát triển tiếp

Nguyên tắc ưu tiên: **(1) đúng kết quả tập & không mất dữ liệu → (2) tính năng chính chạy đúng như hướng dẫn → (3) nền móng để sửa nhanh, an toàn → (4) tính năng mới.** Mọi bước đi theo quy trình BR → BA → anh xác nhận → test → code ([docs/README.md](README.md)).

### Giai đoạn 1 — Sửa lỗi nặng (1–2 tuần, mỗi mục 1 PA nhỏ)
1. **VD-33** ảnh máy tập qua Drive: đổi định dạng mã băm hoặc sửa `Code.gs`. Bỏ `fixme` trong `drive.spec.mjs`. *(Học viên không nhận ảnh HLV chụp — làm trước.)*
2. **VD-31** duyệt Deload khi chưa có `cycleStart` lỗi JS; **VD-32** giao diện Đen Tuyền không nhớ. Bỏ `fixme` trong `weekplan.spec.mjs`, `settings.spec.mjs`.
3. ✅ **VD-02** (PA-27) nút “Gửi giáo án” ở Phòng HLV nay mở “Mã liên kết” Drive của đúng học viên. Đã bỏ `fixme` trong `profiles.spec.mjs`.
4. **VD-03** tuần deload tự sang chu kỳ mới; **VD-04** xoá dữ liệu giữ thư viện hình; **VD-11** dọn video.
5. **VD-05, VD-06, VD-12** sửa chữ cho khớp hành vi (cần anh chọn hướng ở VD-05).
6. **VD-22** CI: GitHub Actions chạy `npm test` và `bash tests/chay.sh` trên mọi nhánh `pa-*`, chặn gộp khi đỏ.

### Giai đoạn 2 — Nền móng (2–4 tuần)
1. **Tách `index.html` thành module ES gốc** (không cần build, GitHub Pages vẫn phục vụ thẳng): `src/core/` (thuật toán thuần: gợi ý, lộ trình, hồi phục, khởi động, đồng bộ gộp), `src/data/` (lưu trữ, chuyển đổi dữ liệu), `src/ui/` (từng tab), `data/library.json` (thư viện bài/hình), `styles/` theo skin. Bộ test E2E hiện có là lưới an toàn: tách từng phần, test phải xanh sau mỗi bước.
2. **Unit test cho `src/core/`** (Node test runner, chạy < 1 giây) bên cạnh E2E; giữ ngưỡng coverage hiện tại cho cả hai.
3. **Phiên bản lược đồ dữ liệu** (`v: 4`) + bảng chuyển đổi có test cho mỗi bước; một nguồn phiên bản app (VD-26).
4. Dọn CSS chết (VD-20) kèm test chụp màn hình 2 giao diện.
5. Gộp hai bộ test (Node + Python) về một công cụ để có một báo cáo coverage duy nhất; hiện bộ Python chỉ là hồi quy theo PA, không đo coverage.

### Giai đoạn 3 — Dữ liệu & đồng bộ (song song khi cần)
1. Đồng bộ claude.ai gộp theo bản ghi, không mất buổi tập (VD-13).
2. Tách ảnh body khỏi đồng bộ hoặc ghi rõ quyền riêng tư (VD-12).
3. Nhắc sao lưu thông minh hơn; cân nhắc sao lưu tự động (VD-27).
4. Đo tải và độ tin cậy của đồng bộ Apps Script với nhiều học viên (VD-34); tối ưu băm ảnh (VD-14).

### Giai đoạn 4 — Tính năng (theo ưu tiên của anh)
- Quyết định số phận các tính năng “nửa vời”: tốc độ tăng tạ & tăng theo rep (VD-18); dữ liệu lịch cũ (VD-17). Báo cáo tháng đã bỏ ở PA-14.
- Tuỳ chọn tắt tự bật kế hoạch tuần (VD-28); kiểm tra khả năng tiếp cận (VD-29).

### Chỉ số theo dõi
- `npm test` xanh trên mọi PA; coverage không giảm dưới ngưỡng (lines/statements/functions ≥ 90%, branches ≥ 80%).
- Số `test.fixme` (lỗi đã biết) giảm dần về 0 (hiện 3: VD-31, VD-32, VD-33).
- Kích thước `index.html` và số dòng > 300 ký tự giảm dần trong Giai đoạn 2.
