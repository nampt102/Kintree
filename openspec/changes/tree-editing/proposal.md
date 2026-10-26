# Proposal

## Why

Kintree chưa có thứ người dùng chạm vào được: lõi lịch âm và schema đã xong nhưng chưa có cây. Trước khi làm đăng nhập hay AI, cần một trình dựng cây dùng được trên cả máy tính lẫn điện thoại, vì mọi tính năng sau (đề xuất AI, xưng hô, nhắc giỗ) đều đọc và ghi vào cây này. Dựng và xem cây là E2 trong `docs/user-stories.md` (F1–F4).

## What Changes

- Thêm các thao tác sửa cây ở `packages/core`, đều là hàm thuần trả lỗi thay vì ném ngoại lệ: tạo cuốn gia phả, thêm người, thêm con (ruột/nuôi/riêng), thêm vợ/chồng, thêm cha/mẹ còn thiếu, gỡ người (đánh dấu đã gỡ, giữ dữ liệu), sắp thứ tự anh chị em và thứ tự các bà. Các thao tác dùng lại `checkParentLink` và `checkMarriage` đã có.
- Thêm phần tính bố cục sơ đồ theo đời, thu gọn nhánh, xem riêng nhánh con cháu, tìm người không dấu và lọc danh sách, cũng ở `packages/core` để kiểm thử không cần trình duyệt.
- Trong `apps/app`: màn hình danh sách cuốn gia phả, sơ đồ cây (React Flow), bảng thông tin người, biểu mẫu hồ sơ có ô ngày tháng không đầy đủ, chế độ xem danh sách, và thêm Tailwind.
- Dữ liệu lưu trong trình duyệt (localStorage) qua một giao diện `TreeStore`; chưa nối Supabase. Xem design D1.
- **Chưa có:** đăng nhập, mời người, phân quyền, nhập GEDCOM, xưng hô, hình quạt/tỏa tròn/niên biểu, nhật ký thay đổi, phiên bản, ảnh đại diện.

## Capabilities

### New Capabilities
- `family-tree-editing`: tạo cuốn gia phả, thêm/sửa/gỡ người và quan hệ, sắp thứ tự, giữ cây hợp lệ.
- `family-tree-viewing`: vẽ cây theo đời, thu gọn nhánh, tìm người, xem danh sách có lọc, dùng được trên điện thoại.

### Modified Capabilities
<!-- Không có: các luật toàn vẹn trong `family-tree-integrity` được dùng lại nguyên, không đổi. -->

## Impact

- Code mới: `packages/core/src/tree/` (mô hình, thao tác, bố cục, tìm kiếm), `apps/app/src/` (giao diện, kho lưu).
- Phụ thuộc mới: `@xyflow/react`, `tailwindcss`, `@tailwindcss/vite`.
- Tài liệu: `openspec/kb/modules/tree.md`.
- `supabase/` không đổi trong change này.
