# Quy trình làm việc với repo này

## Duyệt theo cây phương án
- `main` là bản chính thức, GitHub Pages dựng app từ `main` / `(root)` (Source: *Deploy from a branch*).
- Mỗi yêu cầu thay đổi là một nhánh riêng `pa-<số>-<tên-ngắn>`, rẽ từ `main` (hoặc từ một PA khác khi chủ repo yêu cầu rẽ tiếp).
- Chỉ gộp vào `main` khi chủ repo nhắn "Duyệt PA-x". Gộp bằng `git merge --no-ff`.
- Sau mỗi lần duyệt, lưu mốc bằng nhánh `moc/v<số>` trỏ vào `main` (thẻ tag bị chặn qua proxy nên dùng nhánh).
- "Duyệt lại vX": đưa `main` về đúng nội dung `moc/vX` bằng một commit mới, không xoá lịch sử.
- Bản xem thử của một nhánh: `https://raw.githack.com/hoangtourguide0507-create/giao-an-dia-nguc/<nhánh>/index.html`.

## Khi sửa app
- App là một file `index.html` (toàn bộ JS trong một IIFE), `sw.js` là service worker.
- Mỗi lần đổi `index.html` thì tăng `CACHE` trong `sw.js` để điện thoại nhận bản mới.
- Kiểm tra cú pháp script chính bằng `node --check` trước khi commit; chạy thử trên trình duyệt headless khi có thể.
- Giao diện và nội dung viết bằng tiếng Việt.

## Kiểm thử
- `bash tests/chay.sh`: dựng bản thử `tests/site/` (chèn móc `window.__ev`), kiểm cú pháp, chạy các kiểm thử Playwright và kiểm thử 2 máy chủ. Phải xanh trước khi đẩy nhánh và trước khi gộp.
- Tính năng mới: thêm `tests/test_pa<số>.py` và đưa vào danh sách mặc định trong `tests/chay.sh`.

## Agent của dự án (`.claude/agents/`)
- `trien-khai-pa`: làm một yêu cầu thay đổi thành nhánh PA, kiểm thử, đẩy, trả link xem thử.
- `duyet-pa`: "Duyệt PA-x", "Duyệt lại vX", theo dõi bản dựng GitHub Pages.
- `kiem-thu`: kiểm tra độc lập một nhánh trước khi duyệt, tái hiện lỗi chủ repo báo.
- `kiem-chung-y-khoa`: đối chiếu số liệu tập luyện / dinh dưỡng / chấn thương với nguồn chuyên môn trước khi đưa vào app.
- `may-chu`: máy chủ đồng bộ Apps Script (`drive/`) và máy chủ thông báo Cloudflare (`push-server/`).
- `ux-ui`: giao diện, màu sắc, hiệu ứng; phân tích ảnh/clip mẫu và làm theo.
