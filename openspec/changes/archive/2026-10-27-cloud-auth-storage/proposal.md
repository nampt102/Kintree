# Proposal

## Why

Cây gia phả hiện chỉ nằm trong `localStorage` của một trình duyệt: không đăng nhập, không dùng được trên điện thoại thứ hai, xoá dữ liệu trình duyệt là mất. Chủ dự án đã chốt (ADR 0007): đăng nhập bằng Google và email OTP, dữ liệu chỉ lưu trên máy chủ, Supabase chạy local bằng Docker trước. Đây là nền cho mọi tính năng sau (mời người, phân quyền chi tiết, đề xuất AI): phải có người dùng, dòng họ và quyền truy cập thật trước.

## What Changes

- **Đăng nhập:** màn đăng nhập bằng email OTP (nhập email, nhận mã 6 số, nhập mã) và nút Google (chỉ hiện khi đã cấu hình); phiên được giữ khi tải lại trang; đăng xuất. Chưa đăng nhập thì chỉ thấy màn đăng nhập.
- **Kiểu dịch vụ (SaaS), người dùng thường không tự tạo hay sửa:** chỉ **quản trị nền tảng** (nhà vận hành) tạo dòng họ và chỉ định quản trị cho nó; người dùng đăng nhập mà chưa được gán chỉ thấy "chưa được cấp quyền". Thêm màn quản trị nền tảng (tạo dòng họ + email quản trị, xem danh sách); email chưa có tài khoản được gán quản trị khi đăng nhập lần đầu.
- **Dòng họ và quyền:** thêm tầng dòng họ vào giao diện (danh sách dòng họ → cuốn gia phả → cây). **Hai vai trò** (quản trị / xem; bỏ vai trò biên tập) ở hai tầng (dòng họ, cuốn); **chỉ quản trị** (của dòng họ hoặc của đúng cuốn) thêm, sửa, gỡ người và quan hệ; chỉ quản trị dòng họ tạo cuốn; quản trị của dòng họ hoặc của cuốn sửa thông tin và **xoá cuốn** (đánh dấu đã xoá, gõ lại tên để xác nhận). Tất cả do **cơ sở dữ liệu cưỡng chế** bằng RLS; quản trị nền tảng không tự động đọc dữ liệu gia phả.
- **Lưu trên máy chủ:** thay `localStorageStore` bằng bản lưu Supabase; mỗi lần sửa chỉ ghi các dòng thay đổi, nguyên tử trong một giao dịch; ghi lỗi thì hoàn lại màn hình về bản đã lưu và báo. App không còn lưu cây cục bộ; dữ liệu thử cũ trong `localStorage` bị bỏ (đã chốt ở ADR 0007).
- **Schema:** thêm cột `is_root`, `removed_at`, `removal_id` (ADR 0006; thêm `trees.removed_at`), bảng `platform_admins` và `clan_admin_invites`, hàm quyền, chính sách RLS, hàm `platform_create_clan`, `platform_list_clans`, `apply_tree_changes`; test pgTAP cho quyền.
- **Môi trường:** `pnpm db:start` chạy đủ Auth, API và hộp thư thử (không chỉ Postgres); cấu hình Google làm sẵn nhưng tắt cho tới khi có khoá.
- **Kiểm thử:** bộ Playwright chuyển sang chạy với Supabase local (người dùng thử tạo bằng quyền quản trị, phiên đưa vào trình duyệt), thêm test đăng nhập, cách ly dữ liệu, hoàn lại khi ghi lỗi.
- **Để change sau (`clan-invites`):** quản trị mời thêm người xem và quản trị cuốn, quản lý thành viên và đổi vai trò trên giao diện, "Tôi là ai". Change này **tách riêng** khỏi `auth-invite-roles` trong kế hoạch ban đầu cho vừa sức làm, kiểm và duyệt; ở change này chỉ người quản trị đầu tiên do quản trị nền tảng chỉ định mới vào được dòng họ; chưa có đường mời thêm người xem hay quản trị cuốn ngoài chèn tay vào cơ sở dữ liệu.
- **Chưa có:** đăng nhập Apple và Zalo, xem offline (ADR 0007 ghi mâu thuẫn với PRD, quyết định lại khi làm bản iOS), realtime nhiều người cùng sửa, nhật ký thay đổi trên giao diện.

## Capabilities

### New Capabilities
- `user-auth`: đăng nhập bằng email OTP và Google, giữ phiên, đăng xuất, cổng đăng nhập.
- `clan-access`: hai vai trò ở hai tầng, chỉ quản trị thêm/sửa/xoá, người dùng thường không tự tạo, cách ly giữa các dòng họ.
- `platform-admin`: quản trị nền tảng cấp dòng họ và chỉ định quản trị, không tự động đọc dữ liệu gia phả.
- `tree-storage`: lưu và đọc cuốn gia phả trên máy chủ: ghi theo dòng thay đổi, nguyên tử, hoàn lại khi lỗi, không lưu cục bộ.

### Modified Capabilities
- `family-tree-editing`: yêu cầu "Dữ liệu được lưu và mở lại" đổi từ lưu trên thiết bị sang lưu trên máy chủ cho người đã đăng nhập; bỏ kịch bản dữ liệu cục bộ hỏng.

## Impact

- Code mới: `supabase/migrations/…_auth_access.sql`, `supabase/tests/access.test.sql`, `scripts/promote-platform-admin.mjs`, `apps/app/src/lib/supabase.ts`, `cloudStore.ts`, `auth.tsx`, màn đăng nhập, dòng họ và quản trị nền tảng, hộp thoại sửa/xoá cuốn; `useTreeDoc.ts` đổi sang ghi có hoàn lại.
- Xoá: `localStorageStore`, `downloadRaw`, mã lỗi `CORRUPT` ở giao diện.
- Phụ thuộc mới: `@supabase/supabase-js`.
- Cấu hình: `supabase/config.toml`, `.env.example`, script `db:start`/`db:env`.
- Yêu cầu bên ngoài: Docker (đã có); khoá Google OAuth (chủ dự án tạo) chỉ cần khi bật nút Google.
