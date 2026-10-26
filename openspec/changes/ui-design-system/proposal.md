# Proposal

## Why

Giao diện hiện tại (`tree-editing`) chạy đúng nhưng dựng tạm: thanh công cụ chiếm gần nửa màn hình điện thoại, nút dùng ký tự (↑ ♥ ✕), không có hệ token chung, chưa tính tai thỏ / Dynamic Island / thanh Home hay máy gập, màn kép. Chủ dự án muốn chốt UI/UX trước khi thêm đăng nhập và AI, để các màn sau theo một hệ thống: hiện đại tối giản, dễ dùng, ưu tiên điện thoại.

## What Changes

- Hệ thống thiết kế trong `apps/app`: token (màu, chữ, khoảng cách, bo góc, đổ bóng, chuyển động) khai báo một chỗ bằng Tailwind `@theme`; phông Be Vietnam Pro (OFL, đóng gói cùng app, không tải từ Google); bộ biểu tượng `lucide-react` thay ký tự.
- Bộ thành phần dùng chung: nút, nút biểu tượng, ô nhập, ô chọn, nhóm chuyển (segmented control), tấm trượt dưới (bottom sheet), hộp thoại (toàn màn trên điện thoại), thanh công cụ, thông báo ngắn (toast), trạng thái trống.
- Làm lại mọi màn đang có theo hệ mới: danh sách cuốn, sơ đồ cây và khung người, bảng thông tin, các hộp thoại thao tác, hồ sơ và ô ngày, chế độ danh sách.
- Bố cục theo thiết bị: điện thoại dọc (≥ 320 px), điện thoại ngang, máy gập / màn kép (hai nửa màn hình), máy tính bảng, máy tính; tôn trọng vùng an toàn (safe area) của iPhone và Android.
- Trợ năng: tương phản WCAG AA, vùng chạm ≥ 44 px, theo cỡ chữ hệ điều hành, giảm chuyển động khi người dùng bật.
- Tài liệu hệ thống thiết kế ở `openspec/kb/design-system.md`.
- **Không đổi** hành vi nghiệp vụ, `packages/core`, schema hay cách lưu dữ liệu. Chưa có chế độ tối (dark mode), chưa có màn đăng nhập / dòng họ / lời mời (thiết kế ở change của chúng, theo hệ này).

## Capabilities

### New Capabilities
- `app-ui-foundation`: các bảo đảm chung về giao diện mọi màn phải giữ: vùng chạm, tương phản, cỡ chữ theo hệ thống, giảm chuyển động, biểu tượng có nhãn, phản hồi thao tác.
- `responsive-layout`: cách bố trí màn hình theo loại thiết bị: điện thoại, máy gập / màn kép, máy tính bảng, máy tính, và vùng an toàn.

### Modified Capabilities
<!-- Không đổi requirement nào của `family-tree-editing` / `family-tree-viewing`: các bảo đảm hiện có (vùng chạm 44 px, bảng thông tin trên điện thoại) vẫn giữ, change này chỉ thêm yêu cầu mới. -->

## Impact

- Code: `apps/app/src/**` (thành phần, màn hình, CSS), `apps/app/index.html` (`viewport-fit=cover`, màu thanh trạng thái).
- Phụ thuộc mới: `@fontsource/be-vietnam-pro` (OFL-1.1), `lucide-react` (ISC).
- Tài liệu: `openspec/kb/design-system.md`; cập nhật `openspec/kb/tech-stack.md`.
- Thứ tự công việc: change này làm trước `auth-invite-roles` (theo yêu cầu của chủ dự án, 2026-10-26).
