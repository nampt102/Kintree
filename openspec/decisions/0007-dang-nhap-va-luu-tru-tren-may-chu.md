# 0007. Đăng nhập Google + email OTP; dữ liệu cây chỉ lưu trên máy chủ

- **Ngày:** 2026-10-26
- **Trạng thái:** đã chốt (áp dụng ở change `auth-invite-roles`, chưa làm)
- **Người quyết định:** jamesphan
- **Thay thế một phần:** `0006` (phần "dữ liệu cây lưu cục bộ trước")

## Bối cảnh
Chuẩn bị change đăng nhập, mời người, phân quyền. Cần chốt cách đăng nhập ở bản đầu, Supabase chạy ở đâu, và dữ liệu đang nằm trong `localStorage` xử lý thế nào.

## Các lựa chọn
- Đăng nhập: (a) Google + email OTP; (b) chỉ email OTP; (c) Google + Apple + Zalo ngay.
- Nơi chạy: (a) Supabase local (Docker) trước; (b) dựng project hosted ngay.
- Dữ liệu: (a) nút chuyển dữ liệu cục bộ lên tài khoản; (b) bỏ dữ liệu cục bộ; (c) chỉ lưu trên máy chủ, không lưu cục bộ ở client.

## Quyết định
- Đăng nhập: Google là chính; email OTP để thử ở máy local (Mailpit). Apple và Zalo làm sau.
- Nơi chạy: Supabase local (Docker) trước; project hosted làm khi sẵn sàng triển khai.
- Dữ liệu: cây chỉ lưu trong cơ sở dữ liệu trên máy chủ; app không lưu bản cục bộ (bỏ `localStorageStore`). Dữ liệu thử đang có trong `localStorage` không chuyển.

## Lý do và hệ quả
- Mọi lần mở cây cần mạng và đăng nhập. **Mâu thuẫn với PRD / ADR 0001** ("xem offline" là một tính năng native để giảm rủi ro Apple từ chối app Capacitor, Guideline 4.2): cần quyết định lại khi làm bản iOS (ví dụ bộ nhớ đệm chỉ đọc, không coi là nơi lưu).
- Nút "Tải bản sao" JSON vẫn giữ để người dùng có bản của mình.
- Google OAuth cần chủ dự án tạo OAuth client (Google Cloud Console) và đặt khoá vào biến môi trường của Supabase; trước khi có khoá, chỉ email OTP chạy được.
- `TreeStore` có bản cài đặt Supabase; cột `removed_at`, `removal_id` thêm theo ADR 0006.
