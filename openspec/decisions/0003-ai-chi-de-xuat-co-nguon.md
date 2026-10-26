# 0003. AI chỉ tạo đề xuất; mỗi trường gắn nguồn chứng cứ

- **Ngày:** 2026-10-26
- **Trạng thái:** đã chốt
- **Người quyết định:** jamesphan

## Bối cảnh
AI đọc ghi âm và ảnh (phả Hán Nôm, bia mộ) có thể sai. Gia phả sai một chỗ là sai vai vế về sau; hai chi có thể chép khác nhau.

## Các lựa chọn
1. AI ghi thẳng vào cây, người dùng sửa sau — nhanh, nhưng lỗi lặng lẽ lọt vào.
2. AI tạo `proposals` vào hàng chờ duyệt; người có quyền sửa nhận/sửa/bỏ; trường được nhận ghi `source_id`.

## Quyết định
Chọn 2.

## Lý do và hệ quả
- Cần bảng `sources` (ghi âm, ảnh, lời kể; người cung cấp) và `proposals` (loại, payload, trạng thái, trỏ tới đoạn ghi âm/vùng ảnh).
- Hai nguồn mâu thuẫn được hiện cả hai; người duyệt chọn và ghi lý do.
- Thêm một bước thao tác cho người dùng; đo tỷ lệ nhận đề xuất (KR ≥ 70%) để xem bước duyệt có quá nặng không.
