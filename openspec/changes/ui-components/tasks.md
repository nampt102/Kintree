# Tasks

## 1. Bản mẫu (chờ duyệt)

- [x] 1.1 Làm `openspec/changes/ui-components/mockup.html` theo kiểu shadcn/ui với token đỏ trầm:
  - các kiểu nút (chính, phụ, ghost, nguy hiểm, nút tròn), trạng thái trỏ/bấm/tắt;
  - ô chữ, ô chọn đang đóng và đang mở, nhóm nút chọn một, công tắc, ô nhiều dòng, lỗi dưới ô;
  - form hồ sơ người trên máy tính (1280 px) và điện thoại (375 px), hai phương án hộp thoại điện thoại (toàn màn / tấm trượt);
  - form thêm con; menu "⋯"; thông báo ngắn.

  Kiểm: chủ dự án xem.
- [x] 1.2 Sửa theo góp ý đến khi chủ dự án duyệt; ghi kết luận (kể cả câu hỏi mở về hộp thoại điện thoại) vào `design.md`. Kiểm: chủ dự án ghi "duyệt".

## 2. Nền shadcn/ui (chỉ làm sau 1.2)

- [x] 2.1 Thêm `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `sonner`; thêm hàm `cn()`; ghi ADR 0010. Kiểm: `pnpm build` qua, ghi kích thước gói trước/sau vào KB.
- [x] 2.2 Thay ruột `Button`, `IconButton`, `TextField`, `TextAreaField` giữ API. Kiểm: Vitest, `contrast.test.ts`, e2e toàn bộ qua.
- [x] 2.3 `SelectField` dựng bằng Radix Select (props `options`), sửa mọi chỗ gọi; thêm helper `pickOption` cho e2e. Kiểm: test e2e mới chọn bằng bàn phím; e2e toàn bộ qua.
- [x] 2.4 `Segmented` bằng `ToggleGroup`, `OverflowMenu` bằng `DropdownMenu`, `Switch`, `RadioGroup`. Kiểm: e2e toàn bộ qua.
- [x] 2.5 `Dialog` bằng Radix Dialog (giữ hỏi xác nhận khi có dữ liệu, đóng bằng Back); `useToast` bằng `sonner`. Kiểm: `interaction.spec.ts` và e2e toàn bộ qua.

## 3. Làm lại form

- [x] 3.1 Form hồ sơ người theo bản mẫu (bốn nhóm, giới tính nhóm nút, ô ngày một hàng, chân dính đáy). Kiểm: e2e mới cho spec "Form dài chia nhóm" ở 375 px; e2e hồ sơ cũ qua.
- [x] 3.2 Form thêm con, thêm vợ/chồng, thêm cha/mẹ, mời người, tạo link, tạo/sửa cuốn theo cùng mẫu. Kiểm: e2e toàn bộ qua.
- [x] 3.3 Test e2e cho spec "Nút quanh khung người không bị che" (đã sửa trước bằng CSS). Kiểm: test qua.

## 4. Hoàn tất

- [x] 4.1 `layout.spec.ts` thêm trạng thái ô chọn mở; `visual.spec.ts` chụp lại; cập nhật KB `design-system.md`, `tech-stack.md`, `status.md`. Kiểm: Playwright toàn bộ qua 3 lần liên tiếp, `openspec validate --strict` qua.

## Workflow follow-up

- Chủ dự án duyệt app chạy thật, rồi commit, push và `/opsx:archive ui-components`.
