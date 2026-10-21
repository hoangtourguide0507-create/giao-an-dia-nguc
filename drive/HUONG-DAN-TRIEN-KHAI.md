# Hướng dẫn triển khai máy chủ đồng bộ (khoảng 10 phút)

Làm trên laptop, đăng nhập đúng tài khoản Google sẽ giữ dữ liệu của học viên.

## Bước 1 · Tải thư mục dữ liệu lên Google Drive
1. Mở https://drive.google.com
2. Kéo thả cả thư mục **GiaoAnDiaNguc** (trong `1-Tai-len-Google-Drive`) vào **Drive của tôi**.
3. Giữ nguyên tên `GiaoAnDiaNguc`. Không chia sẻ thư mục này cho ai.

## Bước 2 · Tạo dự án Apps Script
1. Mở https://script.google.com → bấm **Dự án mới**.
2. Bấm vào chữ "Dự án không có tiêu đề" → đặt tên **Giáo Án Địa Ngục – Đồng bộ**.
3. Xoá hết code mẫu trong `Code.gs`, mở file **Code.gs** trong thư mục này bằng TextEdit, chép **toàn bộ** rồi dán vào.
4. (Nên làm) Bấm biểu tượng ⚙ **Cài đặt dự án** → tích **Hiển thị tệp kê khai "appsscript.json"** → quay lại trình chỉnh sửa, mở `appsscript.json`, thay toàn bộ bằng nội dung file **appsscript.json** trong thư mục này.
5. Bấm 💾 **Lưu** (hoặc ⌘S).

## Bước 3 · Chạy cài đặt 1 lần
1. Ở thanh trên, ô chọn hàm → chọn **caiDat** → bấm **▷ Chạy**.
2. Google hỏi cấp quyền: **Xem xét quyền** → chọn tài khoản → nếu thấy "Google chưa xác minh ứng dụng này" bấm **Nâng cao** → **Chuyển tới Giáo Án Địa Ngục – Đồng bộ (không an toàn)** → **Cho phép**.
   (Đây là script của chính bạn nên Google cảnh báo như vậy là bình thường.)
3. Xem **Nhật ký thực thi** ở dưới: chép dòng **MÃ HLV** (32 ký tự) và cất kín.

## Bước 4 · Triển khai thành Ứng dụng web
1. Bấm **Triển khai** (góc trên bên phải) → **Tùy chọn triển khai mới**.
2. Bấm ⚙ cạnh "Chọn loại" → **Ứng dụng web**.
3. Điền:
   - Mô tả: `Đồng bộ v1`
   - Thực thi dưới dạng: **Tôi**
   - Người có quyền truy cập: **Bất kỳ ai**
4. Bấm **Triển khai** → chép **URL ứng dụng web** (kết thúc bằng `/exec`).

## Bước 5 · Kiểm tra
Mở URL vừa chép trên trình duyệt. Thấy dòng chữ dạng
`{"ok":true,"ten":"Giáo Án Địa Ngục · máy chủ đồng bộ","v":1,"daCaiDat":true}` là thành công.

## Bước 6 · Nhập vào app
Ở bản app có tính năng đồng bộ Drive: tab **Tôi** → **Đồng bộ Google Drive** → dán **URL** và **MÃ HLV**.
Sau đó thêm từng học viên trong app, app tạo **mã QR liên kết**; học viên quét 1 lần là tự đồng bộ.

---

## Khi cần
- **Sửa code về sau:** dán code mới → Lưu → **Triển khai → Quản lý các bản triển khai** → ✏️ → Phiên bản: **Phiên bản mới** → Triển khai. URL giữ nguyên, không phải nhập lại trên app.
- **Lộ mã HLV:** chọn hàm **doiMaHLV** → Chạy → nhập mã mới vào app máy HLV.
- **Quên mã HLV:** chọn hàm **xemMaHLV** → Chạy → xem Nhật ký thực thi.
- **Học viên nghỉ / mất điện thoại:** trong app HLV thu hồi hoặc cấp lại mã liên kết của người đó.
- **Hạn mức:** tài khoản Google miễn phí đủ cho vài chục học viên đồng bộ hằng ngày. Dữ liệu chiếm dung lượng Drive của bạn (ảnh máy tập là phần nặng nhất).
