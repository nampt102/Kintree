# Design

## Context
Lý do làm: xem `proposal.md`. Hành vi bắt buộc: xem `specs/app-ui-foundation`.

Hiện trạng:
- `apps/app/src/ui/` gồm `Button`, `IconButton`, `Dialog` (dùng `<dialog>` gốc), `Sheet` (tấm trượt tự viết, có nấc peek/half/full), `OverflowMenu`, `Segmented`, `TextField`, `SelectField` (`<select>` gốc), `TextAreaField`, `ToastProvider`/`useToast`, cùng các thành phần hiển thị (`Card`, `Badge`, `Avatar`…). Token màu, bóng, bo góc nằm trong khối `@theme` của `src/index.css` (Tailwind v4).
- Các màn chỉ nhập từ `../ui/index.ts`, nên thay ruột ở một chỗ.
- e2e dùng `selectOption` và `getByLabel` cho ô chọn; `layout.spec.ts` kiểm vùng chạm 44 px và không cuộn ngang ở 320–1440 px; `contrast.test.ts` kiểm tương phản các cặp màu.

## Goals / Non-Goals

**Goals**
- Thành phần đẹp, đủ trợ năng mà không tự viết logic bàn phím, focus, lớp nổi.
- Giữ tông đỏ trầm và mọi quy tắc đã duyệt ở `ui-polish` (một nút chính, nút viên thuốc, vùng chạm 44 px).
- Màn hình sửa ít nhất: giữ tên và props của thành phần ở `ui/index.ts` khi có thể.

**Non-Goals**
- Không đổi bố cục màn, không làm chế độ tối.
- Không thay `Sheet` có nấc peek của bảng thông tin người trên điện thoại (đã duyệt, đang chạy tốt); chỉ dùng `Drawer` (vaul) cho hộp thoại trên điện thoại nếu bản mẫu được duyệt.

## Decisions

### D1. shadcn/ui, chép mã vào repo
- shadcn/ui không phải gói chạy: mỗi thành phần là một file chép vào `src/ui/`, dựa trên Radix (trợ năng, bàn phím, lớp nổi) và lớp Tailwind. Ta sửa trực tiếp file để theo token `accent`, `line-input`, `shadow-*`, `rounded-*` hiện có.
- Dùng gói gộp `radix-ui` (một gói thay cho nhiều `@radix-ui/react-*`), `class-variance-authority` + `clsx` + `tailwind-merge` (biến thể nút, ghép lớp), `sonner` (thông báo ngắn), `vaul` (tấm trượt dưới cho hộp thoại trên điện thoại).
- Không dùng CLI `shadcn` để sinh file lúc chạy app; dùng CLI một lần lúc làm (hoặc chép tay) rồi sửa theo token. Ghi phiên bản đã chép vào đầu mỗi file.

*Phương án đã cân nhắc:*
- **React Aria Components** (Adobe): trợ năng và cảm ứng tốt nhất, có chọn ngày, nhưng phải tự viết giao diện nhiều hơn; chủ dự án ưu tiên tiện dụng và đẹp sẵn.
- **Mantine**: đủ nhất, dùng ngay, nhưng có hệ CSS riêng, nặng, khó giữ token Tailwind.

### D2. Giữ API ở `ui/index.ts`
- `Button`, `IconButton`: giữ `variant` (`primary`, `secondary`, `ghost`, `danger`; `raised` cho nút tròn), `icon`, `full`, `block`, `data-variant` (test và quy tắc một nút chính dựa vào đây).
- `TextField`, `TextAreaField`: giữ `label`, `hint`, `error`, `ref`; dựng bằng `Label` + `Input` của shadcn.
- `SelectField` đổi ruột thành Radix `Select`; nhận `options: {value, label}[]` thay cho `<option>` con. Đây là chỗ đổi API duy nhất; sửa các nơi gọi (khoảng 8 chỗ).
- `Segmented` dựng bằng `ToggleGroup` (chọn một, `aria-pressed`/`data-state`), giữ props.
- `OverflowMenu` dựng bằng `DropdownMenu`, giữ props.
- `Dialog` dựng bằng Radix `Dialog`, giữ `title`, `dirty`, `footer`, `onClose`, giữ hỏi xác nhận khi đóng có dữ liệu và đóng bằng Back (`useBackToClose`).
- `useToast()` gọi `toast()` của `sonner`; giữ `data-testid="toast"`.

### D3. Form hồ sơ
- Bốn nhóm có tiêu đề nhỏ: **Thông tin chung** (họ tên, giới tính bằng nhóm nút), **Ngày sinh – ngày mất** (mỗi ngày một hàng: ngày, tháng, năm, nút Dương/Âm; ô "Tháng nhuận" là công tắc chỉ hiện khi âm lịch), **Nơi chốn** (nơi sinh, nơi an táng), **Tiểu sử** (tiểu sử, ghi chú riêng).
- Máy tính: hộp thoại rộng hơn (khoảng 640 px), nơi sinh và nơi an táng hai cột. Điện thoại: toàn màn, một cột.
- Chân dính đáy: "Huỷ" (phụ) và "Lưu hồ sơ" (chính).

### D4. Test
- e2e: thay `selectOption` bằng helper `pickOption(page, label, text)` (bấm ô, bấm mục) trong `fixtures.ts`.
- `layout.spec.ts`: thêm trạng thái ô chọn đang mở vào kiểm vùng chạm.
- Thêm test e2e chọn bằng bàn phím (spec "Ô chọn theo tông ứng dụng") và test khung trỏ chuột nằm trên (spec "Nút quanh khung người không bị che").

## Risks / Trade-offs
- **[Kích thước gói tăng]** Radix + sonner + vaul thêm khoảng vài chục KB nén. → Chỉ chép thành phần dùng tới; đo kích thước build trước/sau, ghi vào KB.
- **[Đổi API `SelectField`]** → Có kiểu TypeScript bắt mọi chỗ gọi; e2e chạy lại toàn bộ.
- **[Lớp nổi Radix trong `<dialog>` gốc]** Menu/ô chọn mở trong hộp thoại có thể bị đè. → Đổi luôn `Dialog` sang Radix (cùng hệ lớp nổi, portal chung).
- **[Hành vi Back/Esc]** Radix tự đóng bằng Esc; phải giữ hỏi xác nhận khi có dữ liệu và đóng bằng Back. → Bắt `onEscapeKeyDown`/`onInteractOutside` để hỏi trước; test hiện có (`interaction.spec.ts`) phải qua.

## Migration Plan
1. Bản mẫu được duyệt.
2. Thêm thư viện, chép thành phần, thay ruột `ui/` từng nhóm (nút → ô nhập → ô chọn → hộp thoại/menu → thông báo), chạy e2e sau mỗi nhóm.
3. Làm lại form hồ sơ và các form thêm người.
4. Rollback: revert commit (không đụng dữ liệu).

## Open Questions
- Hộp thoại trên điện thoại: giữ toàn màn như hiện tại hay đổi sang tấm trượt kéo từ dưới (`Drawer`)? Quyết khi duyệt bản mẫu; không đổi spec.

## Kết luận duyệt bản mẫu (2026-10-28)
- Chủ dự án duyệt `mockup.html` (A–E). Hộp thoại trên điện thoại: **D1 toàn màn** (không dùng `vaul`, bỏ khỏi danh sách thư viện).
- Thông báo ngắn: thẻ trắng kiểu Sonner như mục E; chưa làm nút "Hoàn tác" (để sau).
