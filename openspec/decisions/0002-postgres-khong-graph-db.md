# 0002. Lưu cây gia phả bằng Postgres (Supabase), không dùng graph DB

- **Ngày:** 2026-10-26
- **Trạng thái:** đã chốt
- **Người quyết định:** jamesphan

## Bối cảnh
Cây gia phả là đồ thị. Đã cân nhắc FalkorDB.

## Các lựa chọn
1. Postgres (Supabase) — RLS, Auth, giao dịch, audit log chung một chỗ; truy vấn tổ tiên/hậu duệ bằng `WITH RECURSIVE`.
2. FalkorDB — mạnh với đồ thị hàng triệu nút, truy vấn nhiều bước; thêm một DB phải tự vận hành, không có RLS, phải đồng bộ dữ liệu.

## Quyết định
Chọn 1.

## Lý do và hệ quả
- Một cuốn gia phả ≤ 1.000 người: nhỏ. Xưng hô/quan hệ giữa hai người tính ở client (`packages/core`) trên toàn cây đã tải.
- Ràng buộc (≤ 1 cha + 1 mẹ, không nối vòng) làm bằng constraint/trigger và kiểm tra lại trong `core`.
- Xem lại khi làm nối cây giữa các dòng họ ở quy mô lớn; thử extension Apache AGE trước khi tách DB.
