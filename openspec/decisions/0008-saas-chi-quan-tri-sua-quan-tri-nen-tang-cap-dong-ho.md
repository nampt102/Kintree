# 0008. Kiểu dịch vụ (SaaS): chỉ quản trị thêm/sửa/xoá; quản trị nền tảng cấp dòng họ

- **Ngày:** 2026-10-27
- **Trạng thái:** đã chốt (áp dụng ở change `cloud-auth-storage`)
- **Người quyết định:** jamesphan

## Bối cảnh
Chủ dự án muốn Kintree chạy kiểu dịch vụ: "chỉ có admin hoặc admin của nhánh đó mới được thêm sửa, không cho user tự thêm sửa". Kế hoạch ban đầu cho người dùng tự tạo dòng họ và có ba vai trò (quản trị / biên tập / xem).

## Các lựa chọn
- Ai tạo dòng họ: (a) người dùng tự tạo; (b) chỉ quản trị nền tảng (nhà vận hành); (c) tự đăng ký + duyệt.
- Vai trò: (a) giữ biên tập; (b) chỉ quản trị và xem.
- Xoá cuốn: (a) xoá hẳn; (b) đánh dấu đã xoá, dữ liệu vẫn giữ.

## Quyết định
- Chỉ **quản trị nền tảng** tạo dòng họ và chỉ định người quản trị đầu tiên (nhập email; chưa có tài khoản thì nhận quyền khi đăng nhập lần đầu). Quản trị nền tảng chỉ cấp được bằng công cụ vận hành (`pnpm admin:promote <email>`, khoá `service_role`), không qua API của người dùng.
- Hai vai trò **quản trị / xem** ở hai tầng (dòng họ, cuốn). Chỉ quản trị thêm, sửa, gỡ người và quan hệ; chỉ quản trị dòng họ tạo cuốn; quản trị của dòng họ hoặc của cuốn sửa thông tin và xoá cuốn.
- Xoá cuốn = đánh dấu `removed_at` (gõ lại tên cuốn để xác nhận); cuốn đã xoá không đọc được qua API, dữ liệu vẫn nằm trên máy chủ.
- Quản trị nền tảng **không** tự động đọc dữ liệu gia phả: chỉ gọi hai hàm `platform_create_clan`, `platform_list_clans` (ít quyền nhất; Nghị định 13/2023).
- Tất cả do cơ sở dữ liệu cưỡng chế (RLS); giao diện chỉ ẩn nút.

## Lý do và hệ quả
- Dữ liệu gia phả là thông tin cá nhân; kiểm soát ai ghi được là điều kiện để bán dịch vụ cho từng dòng họ.
- Nút thắt: khách mới phải qua nhà vận hành. Giảm bằng công cụ `admin:promote`; nếu thành vấn đề, làm tự đăng ký + duyệt ở change sau.
- Bỏ vai trò biên tập: người biên soạn hằng ngày phải là quản trị. Thêm lại khi có nhu cầu (đổi ràng buộc `memberships_role_check` và policy).
- Chưa làm: quản trị mời thêm người xem/quản trị cuốn trên giao diện (change `clan-invites`), quản trị nền tảng xoá/khôi phục dòng họ.
- `INSERT … RETURNING` trên `trees` bị policy select chặn, nên cuốn chỉ tạo qua hàm `create_tree` (xem `kb/data-model.md`).
