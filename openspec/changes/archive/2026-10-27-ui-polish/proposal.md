# Proposal

## Why

Sau `ui-design-system` và `cloud-auth-storage`, app chạy đúng nhưng chủ dự án thấy giao diện "thô và xấu", chưa chuyên nghiệp. Rà bằng skill `ui-ux-pro-max` (2026-10-27, ảnh chụp ở 390 px và 1280 px) thấy nguyên nhân là cách trình bày, không phải chức năng:

- Viền xám đậm (`line-strong` `#857F73`) ở mọi nút, thẻ, khung người nên màn nào cũng giống bản vẽ khung (wireframe).
- Mọi thao tác trông ngang nhau: bảng thông tin là một cột 6–8 nút viền giống hệt, không có nút chính, không gom nhóm.
- Không có độ sâu: nền và thẻ chỉ tách nhau bằng viền, không có thang đổ bóng.
- Khung người trên cây là hộp chữ trơn: không biết giới tính, không thấy ai là thuỷ tổ, người đã mất (viền đứt xám trên nền xám) trông như khung lỗi, đường nối đậm và thô; bản đồ thu nhỏ là các khối đỏ.
- Các màn danh sách (dòng họ, cuốn, quản trị nền tảng) thưa, thiếu tiêu đề, ngữ cảnh và số liệu; trên máy tính để trống phần lớn màn hình.
- Thanh công cụ trên máy tính có ô tìm, nút "Cây / Danh sách" cao thấp lệch nhau.

## What Changes

- **Tông màu "đỏ trầm"** (chủ dự án chọn; bỏ vàng đồng sau bản mẫu lần 1): nền trắng ấm, đỏ son là màu nhấn duy nhất, chữ nâu đen; tách lớp bằng nền và bóng nhẹ thay vì viền đậm. Ô nhập vẫn giữ viền đủ tương phản.
- **Token mới**: thang đổ bóng 3 mức, bo góc theo cấp (ô nhập/nút, thẻ, tấm/hộp thoại), thang khoảng cách 4/8, kiểu chữ theo vai (tiêu đề màn, tiêu đề mục, nội dung, nhãn, chú thích), màu theo ngữ nghĩa (thêm `male`, `female`).
- **Thành phần**: nút có biến thể "tonal" (nền nhạt) và "plain", danh sách thao tác kiểu nhóm (inset grouped list) thay cho cột nút viền, thẻ (`Card`), huy hiệu (`Badge`), ảnh đại diện chữ cái đầu (`Avatar`), tiêu đề màn có dòng phụ (`PageHeader`).
- **Bố cục mới (chủ dự án chọn sau 3 vòng bản mẫu, xem `mockup.html`, `buttons.html`, `layout.html`)**:
  - *Trang nhà dòng họ*: khối tiêu đề lớn (tên dòng họ, vai trò, số người, số cuốn; số thành viên chỉ với quản trị), các cuốn là thẻ lớn có hình cây thu nhỏ trang trí và số người.
  - *Không gian làm việc* khi mở cuốn: sơ đồ tràn màn; công cụ là thanh nổi trong suốt (trên: tên cuốn, cây/danh sách, tìm; dưới: thu phóng, căn khung, thêm người); thông tin một người là ngăn nổi bo tròn bên phải (máy tính) hoặc thẻ nổi gọn ở đáy kéo lên được (điện thoại).
  - *Thanh bên* từ 1200 px: chọn dòng họ, chuyển cuốn, tài khoản.
  - *Nút chính kiểu viên thuốc* (bo tròn hoàn toàn, đỏ son, bóng cùng màu).
- **Làm lại mọi màn, không đổi hành vi nghiệp vụ**: đăng nhập, danh sách dòng họ, các cuốn của dòng họ, quản trị nền tảng, sơ đồ cây (khung người, đường nối, nhãn đời, nút phóng, bản đồ thu nhỏ), bảng thông tin và tấm trượt, hộp thoại, chế độ danh sách, menu tài khoản.
- **Khung người** có ảnh chữ cái đầu, vạch màu theo giới tính, năm sống; thuỷ tổ có dấu riêng (biểu tượng + chữ); người đã mất vẫn khác kiểu viền nhưng tinh hơn (viền đứt mảnh, ảnh chữ cái đầu nhạt).
- **Không đổi**: hành vi, `packages/core`, schema, quyền, lưu trữ, nhãn trợ năng và tên nút mà test đang dựa vào (trừ chỗ ghi trong design). Chưa làm chế độ tối (token đặt theo ngữ nghĩa để thêm sau).

## Capabilities

### New Capabilities
<!-- Không có -->

### Modified Capabilities
- `app-ui-foundation`: viền không bắt buộc ở nút và thẻ (vẫn bắt buộc ở ô nhập), thêm yêu cầu phân cấp thao tác (một nút chính mỗi màn, thao tác nguy hiểm tách riêng) và thang độ sâu nhất quán.
- `responsive-layout`: cỡ gọn dùng thanh nổi trên/dưới và thẻ thông tin nổi kéo lên được; thêm thanh bên chuyển cuốn từ 1200 px.
- `family-tree-viewing`: khung mỗi người thêm dấu giới tính (không chỉ bằng màu) và dấu thuỷ tổ; người đã mất vẫn phân biệt được không cần đọc năm.

## Impact

- Code: `apps/app/src/index.css` (token), `apps/app/src/ui/**` (thành phần), `apps/app/src/components/**`, `apps/app/src/auth.tsx`.
- Không thêm phụ thuộc (dùng lại `lucide-react`, Be Vietnam Pro, Tailwind).
- Dữ liệu: thêm truy vấn đếm người còn hiện của mỗi cuốn (đọc `persons` có RLS, `count` không tải dòng) cho trang nhà và thanh bên; không đổi schema.
- Ngoài phạm vi (chỉ có trong bản mẫu): mục/cột "Ngày giỗ", "Thành viên", tab "Nguồn", mô tả và địa danh dòng họ, số đời trên thẻ, tìm trong cả dòng họ, phím tắt ⌘K.
- Test: giữ nguyên bộ Playwright (67) và `contrast.test.ts` (cập nhật cặp màu mới); thêm ảnh chụp tham chiếu để duyệt bằng mắt.
- Tài liệu: `openspec/kb/design-system.md`.
