# Quy trình làm việc với repo này

> Từ 21/10/2026: mọi thay đổi đi theo quy trình **BR → BA → anh xác nhận → test → code** và ghi vào **epic theo ngày** — xem [`docs/README.md`](docs/README.md). `docs/BR.md` và `docs/SA.md` luôn phải phản ánh app trên `main`; PA nào đổi hành vi phải sửa hai file này trong chính PA đó.

## Duyệt theo cây phương án
- `main` là bản chính thức, GitHub Pages dựng app từ `main` / `(root)` (Source: *Deploy from a branch*).
- **Không commit trực tiếp vào `main`.** Mọi thay đổi commit trên nhánh rồi mới `git merge --no-ff` vào `main`. Hook `.git/hooks/pre-commit` chặn commit trên `main` (trừ lúc đang merge). Không dùng hook `post-merge`.
- **Sau mỗi lần `git merge` vào `main`, agent tự chạy `bash tests/chay.sh`** (bộ nhẹ, vài giây) ngay trong cùng lượt, không chờ nhắc. Đỏ thì báo cáo ngay, chưa đẩy `main` lên GitHub, sửa nguyên nhân (không làm yếu test) bằng commit trên nhánh rồi gộp lại. Không tự chạy cả bộ Playwright sau khi gộp.
- Mỗi yêu cầu thay đổi là một nhánh riêng `pa-<số>-<tên-ngắn>`, rẽ từ `main` (hoặc từ một PA khác khi chủ repo yêu cầu rẽ tiếp).
- Nhánh `pa-<số>-<tên>` chỉ gộp vào `main` khi chủ repo nhắn "Duyệt PA-x". Gộp bằng `git merge --no-ff`.
- Nhánh khác (tài liệu, ADR, sửa lỗi ngoài PA…) gộp vào `main` không cần lệnh duyệt, cũng bằng `git merge --no-ff`.
- Mốc duyệt không dùng nhánh nữa: mỗi lần duyệt, thêm một dòng vào bảng trong [`docs/adr/0001-bo-nhanh-moc.md`](docs/adr/0001-bo-nhanh-moc.md) với SHA của `main` tại thời điểm đó.
- "Duyệt lại vX": tra SHA của `vX` trong bảng ADR, đưa cây file của `main` về đúng cây file của SHA đó bằng một commit mới (không `push --force`, không xoá lịch sử), tăng `CACHE` trong `sw.js`, rồi thêm dòng mốc mới trỏ vào commit đó.
- Bản xem thử của một nhánh: `https://raw.githack.com/hoangtourguide0507-create/giao-an-dia-nguc/<nhánh>/index.html`.

## Khi sửa app
- App là một file `index.html` (toàn bộ JS trong một IIFE), `sw.js` là service worker.
- Mỗi lần đổi `index.html` thì tăng `CACHE` trong `sw.js` để điện thoại nhận bản mới.
- Kiểm tra cú pháp bằng `npm run check` và chạy `bash tests/chay.sh` (nhẹ, vài giây). Test giao diện Playwright chạy riêng, theo file liên quan (xem mục Kiểm thử). Không đo coverage.
- Giao diện và nội dung viết bằng tiếng Việt.

## Kiểm thử
- `bash tests/chay.sh`: bộ nhẹ, không dùng trình duyệt — kiểm cú pháp, service worker, 3 kiểm thử máy chủ (push-server, hub-sync, passkey/ảnh) và tìm hình minh hoạ. Phải xanh trước khi đẩy nhánh và trước khi gộp.
- Từ 24/10/2026 Playwright **không còn nằm trong cổng bắt buộc** (bộ Python `tests/test_pa*.py` và `chuan_bi.py` đã xoá). `npm run test:app` là bộ giao diện duy nhất, chạy trên Chromium với khung nhìn iPhone 13 (không cần iPhone thật hay WebKit); khi PA đụng giao diện thì chạy file liên quan: `npx playwright test <tên-file>`; cả bộ chỉ chạy khi chủ repo yêu cầu.
- **Playwright chỉ viết hoặc chạy trên local hoặc remote** (phiên trên máy chủ, tương tác qua điện thoại được). **Trong môi trường cloud (container tạm của claude.ai/code) không viết và không chạy Playwright**, dù yêu cầu có nói gì — `tests/app/*.spec.mjs`, `npm run test:app`. Khi đó báo cáo ghi rõ phần Playwright chưa làm, để chủ repo chạy trên local hoặc remote. Các kiểm tra nhẹ (`npm run check`, `npm run test:sw`) vẫn chạy được trên cloud. Chi tiết: [README](README.md#quy-tắc-cho-ai-test-playwright).
- **PA gỡ hoặc đổi tính năng phải dọn test trong chính PA đó**: xoá test, helper và dữ liệu giả của tính năng đã bỏ (đừng giữ test chỉ khẳng định "không còn X"; việc dọn dữ liệu cũ thì giữ test migration). Điều kiện xong: `grep -rni <tên tính năng> tests/` không còn dòng nào ngoài test migration, và `docs/SA.md` §12 khớp.
- Tính năng mới: thêm hoặc sửa `tests/app/<nhóm>.spec.mjs` (khi làm trên local hoặc remote; trên cloud thì chỉ ghi nhận việc này là còn lại). Ưu tiên test logic thuần bằng Node thay vì dựng cả trình duyệt khi có thể.

## Agent của dự án (`.claude/agents/`)
- `trien-khai-pa`: làm một yêu cầu thay đổi thành nhánh PA, kiểm thử, đẩy, trả link xem thử.
- `duyet-pa`: "Duyệt PA-x", "Duyệt lại vX", theo dõi bản dựng GitHub Pages.
- `kiem-thu`: kiểm tra độc lập một nhánh trước khi duyệt, tái hiện lỗi chủ repo báo.
- `kiem-chung-y-khoa`: đối chiếu số liệu tập luyện / dinh dưỡng / chấn thương với nguồn chuyên môn trước khi đưa vào app.
- `may-chu`: máy chủ đồng bộ và thông báo trên Cloudflare Worker (`push-server/`).
- `ux-ui`: giao diện, màu sắc, hiệu ứng; phân tích ảnh/clip mẫu và làm theo.
