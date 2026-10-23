# Giáo Án Địa Ngục

Ứng dụng ghi mức tạ, lộ trình tăng tạ theo tuần, gợi ý nhóm cơ theo độ hồi phục, nhiều người tập trên một máy (chế độ huấn luyện viên), đồng bộ HLV ⇄ học viên bằng mã QR / tin nhắn, chạy offline trên điện thoại.

- Thư mục gốc: app (GitHub Pages dựng từ `main`). Toàn bộ app nằm trong `index.html`, `sw.js` là service worker.
- Dữ liệu tập luyện lưu trên điện thoại của người dùng, không lưu trong repo này.
- Tài liệu: [`docs/`](docs/README.md) — quy trình làm việc, yêu cầu nghiệp vụ ([BR](docs/BR.md)), kiến trúc giải pháp ([SA](docs/SA.md)), epic theo ngày, [điểm chưa ổn & chiến lược](docs/VAN-DE-VA-CHIEN-LUOC.md).

## Chạy test

```bash
npm install
npx playwright install chromium
npm test
```

Bộ thứ hai (hồi quy theo PA, gồm máy chủ đồng bộ và thông báo `push-server/`): `bash tests/chay.sh` — cần `pip install playwright`. Chi tiết: [docs/README.md](docs/README.md).
