# Proposal

## Why
Chủ dự án thấy các form vẫn "xấu", đặc biệt form hồ sơ người và ô chọn (select). Nguyên nhân: các thành phần trong `apps/app/src/ui/` đều tự viết, và ô chọn đang là `<select>` gốc của trình duyệt (danh sách xổ xuống nền xanh của hệ điều hành, không theo tông đỏ trầm). Viết tiếp từng thành phần cho đẹp và đủ trợ năng (bàn phím, trình đọc màn hình, cảm ứng) tốn công và dễ sai. Chủ dự án muốn dùng một bộ component đang phổ biến, ưu tiên tiện dụng và đẹp.

## What Changes
- **Dùng shadcn/ui** (mã thành phần chép vào repo, dựa trên Radix UI, chạy với Tailwind v4) làm nền cho các thành phần UI, theo token đỏ trầm hiện có. Ghi ADR 0010.
- **Thay các thành phần** trong `apps/app/src/ui/` bằng bản dựa trên shadcn, giữ API hiện có ở mức có thể để màn hình ít phải sửa:
  - Nút (`Button`, `IconButton`), ô chữ, ô nhiều dòng, nhãn.
  - **Ô chọn** (`Select`) xổ danh sách tự vẽ theo tông ứng dụng, thay `<select>` gốc.
  - Hộp thoại (`Dialog`), tấm trượt dưới trên điện thoại (`Drawer`), menu "⋯" (`DropdownMenu`).
  - Công tắc (`Switch`), nhóm chọn một (`RadioGroup`, `ToggleGroup`), thông báo ngắn (`Sonner`), chú thích khi trỏ (`Tooltip`).
- **Làm lại form hồ sơ người** (`ProfileDialog`): chia nhóm "Thông tin chung", "Ngày sinh – ngày mất", "Nơi chốn", "Tiểu sử"; giới tính chọn bằng nhóm nút; ô ngày gọn một hàng với nút chuyển Dương/Âm lịch; chân hộp thoại dính đáy.
- **Làm lại các form thêm người** (thêm con, thêm vợ/chồng, thêm cha/mẹ), form mời người và tạo link theo cùng mẫu.
- **Sửa nhỏ đã làm ngay** (không chờ change này): nút quanh khung người không còn bị khung kế bên che; thanh "Đang xem riêng nhánh" cách thanh trên và có nút rõ ràng.
- **Bản mẫu HTML** form hồ sơ, ô chọn, nút, các form thêm người phải được chủ dự án duyệt trước khi code.

## Capabilities

### New Capabilities
<!-- không có -->

### Modified Capabilities
- `app-ui-foundation`: thêm yêu cầu về ô chọn theo tông ứng dụng dùng được bằng bàn phím và cảm ứng, form dài chia nhóm có chân dính đáy, và nút quanh khung người không bị che.

## Impact
- **Thư viện mới:** các gói Radix (`radix-ui`), `class-variance-authority`, `clsx`, `tailwind-merge`, `sonner`, `vaul` (tấm trượt). Mã thành phần chép vào `apps/app/src/ui/` (cách dùng của shadcn), không phụ thuộc gói "shadcn" lúc chạy.
- **Code:** `apps/app/src/ui/*` thay ruột; các màn dùng `SelectField`, `Segmented`, `OverflowMenu`, `Sheet`, `useToast` sửa theo API mới; `ActionDialogs.tsx`, `DateInput.tsx`, `Members.tsx`, `TreeManage.tsx` làm lại form.
- **Test:** e2e đang chọn ô bằng `selectOption` (chỉ chạy với `<select>` gốc) phải đổi cách chọn; `layout.spec.ts` (vùng chạm 44 px, không cuộn ngang) và `contrast.test.ts` vẫn phải qua.
- **Tài liệu:** ADR 0010; KB `design-system.md`; `tech-stack.md`.
- **Ngoài phạm vi:** chế độ tối; đổi bố cục màn (đã chốt ở `ui-polish`); sơ đồ cây (React Flow giữ nguyên).
