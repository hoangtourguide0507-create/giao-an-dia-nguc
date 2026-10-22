# Quy trình làm việc với repo này

> Từ 21/10/2026: mọi thay đổi đi theo quy trình **BR → BA → anh xác nhận → test → code** và ghi vào **epic theo ngày** — xem [`docs/README.md`](docs/README.md). `docs/BR.md` và `docs/SA.md` luôn phải phản ánh app trên `main`; PA nào đổi hành vi phải sửa hai file này trong chính PA đó.

## Duyệt theo cây phương án
- `main` là bản chính thức, GitHub Pages dựng app từ `main` / `(root)` (Source: *Deploy from a branch*).
- **Không commit trực tiếp vào `main`.** Mọi thay đổi commit trên nhánh rồi mới `git merge --no-ff` vào `main`. Hook `.git/hooks/pre-commit` chặn commit trên `main` (trừ lúc đang merge); hook `.git/hooks/post-merge` chạy toàn bộ kiểm thử sau mỗi lần gộp vào `main` và cảnh báo nếu đỏ.
- Mỗi yêu cầu thay đổi là một nhánh riêng `pa-<số>-<tên-ngắn>`, rẽ từ `main` (hoặc từ một PA khác khi chủ repo yêu cầu rẽ tiếp).
- Nhánh `pa-<số>-<tên>` chỉ gộp vào `main` khi chủ repo nhắn "Duyệt PA-x". Gộp bằng `git merge --no-ff`.
- Nhánh khác (tài liệu, ADR, sửa lỗi ngoài PA…) gộp vào `main` không cần lệnh duyệt, cũng bằng `git merge --no-ff`.
- Mốc duyệt không dùng nhánh nữa: mỗi lần duyệt, thêm một dòng vào bảng trong [`docs/adr/0001-bo-nhanh-moc.md`](docs/adr/0001-bo-nhanh-moc.md) với SHA của `main` tại thời điểm đó.
- "Duyệt lại vX": tra SHA của `vX` trong bảng ADR, đưa cây file của `main` về đúng cây file của SHA đó bằng một commit mới (không `push --force`, không xoá lịch sử), tăng `CACHE` trong `sw.js`, rồi thêm dòng mốc mới trỏ vào commit đó.
- Bản xem thử của một nhánh: `https://raw.githack.com/hoangtourguide0507-create/giao-an-dia-nguc/<nhánh>/index.html`.

## Khi sửa app
- App là một file `index.html` (toàn bộ JS trong một IIFE), `sw.js` là service worker.
- Mỗi lần đổi `index.html` thì tăng `CACHE` trong `sw.js` để điện thoại nhận bản mới.
- Kiểm tra cú pháp bằng `npm run check` và chạy `npm test` (Playwright, không đo coverage). Coverage (ngưỡng lines/statements/functions 90%, branches 80%) chỉ đo bằng `npm run test:cov`, hook post-merge tự chạy khi gộp vào `main` trước khi commit.
- Giao diện và nội dung viết bằng tiếng Việt.

## Kiểm thử
- `bash tests/chay.sh`: dựng bản thử `tests/site/` (chèn móc `window.__ev`), kiểm cú pháp, chạy các kiểm thử Playwright và kiểm thử 2 máy chủ. Phải xanh trước khi đẩy nhánh và trước khi gộp.
- `npm run test:cov`: Playwright có đo coverage (chậm hơn ~2 lần); chỉ cần khi gộp vào `main` hoặc khi sửa test để giữ ngưỡng.
- Tính năng mới: thêm `tests/test_pa<số>.py` và đưa vào danh sách mặc định trong `tests/chay.sh`.

## Agent của dự án (`.claude/agents/`)
- `trien-khai-pa`: làm một yêu cầu thay đổi thành nhánh PA, kiểm thử, đẩy, trả link xem thử.
- `duyet-pa`: "Duyệt PA-x", "Duyệt lại vX", theo dõi bản dựng GitHub Pages.
- `kiem-thu`: kiểm tra độc lập một nhánh trước khi duyệt, tái hiện lỗi chủ repo báo.
- `kiem-chung-y-khoa`: đối chiếu số liệu tập luyện / dinh dưỡng / chấn thương với nguồn chuyên môn trước khi đưa vào app.
- `may-chu`: máy chủ đồng bộ Apps Script (`drive/`) và máy chủ thông báo Cloudflare (`push-server/`).
- `ux-ui`: giao diện, màu sắc, hiệu ứng; phân tích ảnh/clip mẫu và làm theo.
