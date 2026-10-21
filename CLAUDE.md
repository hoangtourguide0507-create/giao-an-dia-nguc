# Quy trình làm việc với repo này

> Từ 21/10/2026: mọi thay đổi đi theo quy trình **BR → BA → anh xác nhận → test → code** và ghi vào **epic theo ngày** — xem [`docs/README.md`](docs/README.md). `docs/BR.md` và `docs/SA.md` luôn phải phản ánh app trên `main`; PA nào đổi hành vi phải sửa hai file này trong chính PA đó.

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
- Kiểm tra cú pháp bằng `npm run check` và chạy `npm test` (Playwright + coverage, ngưỡng lines/statements/functions 90%, branches 80%) trước khi commit.
- Giao diện và nội dung viết bằng tiếng Việt.
