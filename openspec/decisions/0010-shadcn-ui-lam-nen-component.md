# 0010. Dùng shadcn/ui (Radix + Tailwind) làm nền component

- **Ngày:** 2026-10-28
- **Trạng thái:** đã chốt (áp dụng ở change `ui-components`)
- **Người quyết định:** jamesphan

## Bối cảnh
Các thành phần ở `apps/app/src/ui/` đều tự viết. Ô chọn là `<select>` gốc (danh sách xổ nền xanh của hệ điều hành), form hồ sơ dài một cột. Chủ dự án thấy form và ô chọn "xấu" và muốn dùng một bộ component đang phổ biến, ưu tiên tiện dụng và đẹp.

## Các lựa chọn
1. **shadcn/ui** (chép mã vào repo, dựa trên Radix UI, chạy với Tailwind): đẹp sẵn, sửa tự do theo token, trợ năng do Radix lo.
2. **React Aria Components** (Adobe): trợ năng và cảm ứng tốt nhất, có chọn ngày; phải tự viết giao diện nhiều hơn.
3. **Mantine**: đủ nhất, nhưng có hệ CSS riêng, nặng, khó giữ token Tailwind.

## Quyết định
Chọn (1). Dùng gói gộp `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge` (hàm `cn`), `sonner` (thông báo ngắn). Thành phần nằm trong `apps/app/src/ui/` và theo token đỏ trầm (`ui-polish`). Giữ API ở `ui/index.ts`, trừ `SelectField` (nhận `options`) và `OverflowMenu` (mục `danger`).
- Ô chọn dài: Radix `Select`; lựa chọn 2–4 mục ngắn: nhóm nút `ChoiceField` (Radix `RadioGroup`); `Switch`; `Dialog` Radix (hộp thoại điện thoại vẫn toàn màn, phương án D1); `DropdownMenu`; thông báo ngắn thẻ trắng bằng Sonner.
- Không dùng `vaul` (tấm trượt): hộp thoại điện thoại giữ toàn màn.

## Lý do và hệ quả
- Trợ năng (bàn phím, trình đọc màn hình, lớp nổi) do Radix lo, không tự viết.
- Gói tăng: JS gzip 226 → 282 KB (+56 KB), CSS gzip 10,9 → 11,4 KB. Chấp nhận; xem lại khi tối ưu cho điện thoại (tách mã theo màn).
- Radix Select giữ một `<select>` ẩn 1×1 để gửi form: kiểm vùng chạm của e2e phải bỏ qua phần tử `aria-hidden`.
- e2e không dùng `selectOption` nữa: ô chọn bấm rồi chọn `option`, nhóm nút chọn bằng `radio`.
- Xem lại khi: cần chọn ngày kiểu lịch (cân nhắc React Aria `DatePicker`), hoặc làm chế độ tối.
