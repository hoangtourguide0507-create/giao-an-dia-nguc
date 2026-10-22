# Epic YYYY-MM-DD — <tên ngắn của việc trong ngày>

> Mỗi ngày 1 epic. Việc thứ hai trong ngày → thêm "Hạng mục 2" bên dưới, không tạo file mới.
> Quy trình: BR → BA → anh xác nhận → test → code ([docs/README.md](../README.md)).

| | |
|---|---|
| Nhánh | `pa-<số>-<tên>` (rẽ từ `main` / từ `pa-…`) |
| Trạng thái | Nháp BR · Chờ xác nhận · Đang làm · Chờ duyệt · Đã duyệt (`moc/v…`) · Bỏ |
| Xem thử | `https://raw.githack.com/hoangtourguide0507-create/giao-an-dia-nguc/<nhánh>/index.html` |

## Hạng mục 1 — <tên>

### Bối cảnh
<Anh yêu cầu gì — nguyên văn hoặc tóm tắt. Vì sao cần.>

### BR (yêu cầu nghiệp vụ)
| Mã | Thay đổi | Nội dung | Tiêu chí chấp nhận |
|---|---|---|---|
| BR-xx.y | Mới / Sửa / Bỏ | … | Khi … thì … (đo được, thấy được) |

Ngoài phạm vi: …

### BA → SA (phân tích & giải pháp)
- Ảnh hưởng tới BR/SA hiện có: …
- Phương án đã cân nhắc: A … / B … → chọn …, vì …
- Thiết kế: hàm/khối sửa trong `index.html`, dữ liệu mới, giao diện.
- Dữ liệu cũ & đồng bộ: chuyển đổi trong `loadState`? gói đồng bộ/mã chia sẻ có đổi định dạng không? máy chưa cập nhật đọc được không?
- Offline: có tài nguyên mới phải đưa vào `SHELL` của `sw.js` không?
- Rủi ro & cách giảm: …

### Kế hoạch test
| Test | File | Trước khi code |
|---|---|---|
| … | `tests/app/<nhóm>.spec.mjs` | Đỏ vì … |

### Xác nhận
- [ ] Anh xác nhận BR + SA + kế hoạch test (ngày …, tin nhắn: "…")

### Kết quả
- `npm test`: … test xanh, coverage lines …% · statements …% · functions …% · branches …%
- Đã cập nhật: `BR.md` (BR-…), `SA.md` (§…), `VAN-DE-VA-CHIEN-LUOC.md` (VD-…)
- `CACHE` trong `sw.js`: `gadn-v…`

### Nhật ký
- YYYY-MM-DD: …
