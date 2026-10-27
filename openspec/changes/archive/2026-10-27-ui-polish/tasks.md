# Tasks

## 0. Bản mẫu để duyệt (chủ dự án yêu cầu duyệt thiết kế trước khi code)

- [x] 0.1 Bản mẫu HTML: `mockup.html` (màu, độ sâu, các màn; lần 2 bỏ vàng đồng, làm lại nút thao tác), `buttons.html` (4 kiểu nút chính), `layout.html` (2 hướng bố cục); kiểm: mở được trên trình duyệt, ảnh ở `screens/`
- [x] 0.2 Chủ dự án duyệt: tông đỏ trầm không vàng đồng, nút viên thuốc (D), bố cục ghép "trang nhà dòng họ" + "không gian làm việc" (2026-10-27); kiểm: chủ dự án đồng ý

## 1. Nền tảng

- [x] 1.1 Chụp ảnh "trước" 6 màn × 2 cỡ (390, 1280) bằng `e2e/visual.spec.ts`; kiểm: ảnh nằm ở `test-results/visual/before-*` (bản giữ lại: `screens/`, không commit)
- [x] 1.2 Token mới trong `src/index.css` theo design D1–D2 (màu không vàng đồng, bóng, bo góc, chữ); cập nhật `src/ui/contrast.test.ts`; kiểm: `pnpm --filter app test` qua
- [x] 1.3 Thành phần `src/ui/`: `Button` (chính viên thuốc, phụ, chữ, nguy hiểm dạng chữ), `IconButton` tròn nền nhạt, `QuickActions`, `ActionList`, `CardButton`, `Card`, `Badge`, `Avatar`, `PageHeader`, `FloatingBar` (nền kính), ô nhập bo 12; `Dialog`/`Sheet`/`OverflowMenu`/toast theo thang bóng; kiểm: `tsc -b` qua và bộ Playwright hiện có vẫn qua (trừ test bố cục sẽ đổi ở nhóm 2)
- [x] 1.4 `cloudStore.directory()` thêm số người còn hiện của mỗi cuốn (`count` head, có RLS); kiểm: test Vitest với client giả và Playwright trang nhà hiện đúng số người của cuốn mẫu (8)

## 2. Màn hình

- [x] 2.1 Đăng nhập, danh sách dòng họ, quản trị nền tảng, menu tài khoản theo bản mẫu lần 2 với nút viên thuốc; kiểm: test `auth`, `platform`, `smoke` qua
- [x] 2.2 Trang nhà dòng họ (`ClanScreen`): khối tiêu đề đỏ có số người/số cuốn (thành viên chỉ với quản trị), "Tạo cuốn gia phả" chỉ với quản trị dòng họ, lưới thẻ cuốn có hình cây thu nhỏ và số người, menu sửa/xoá; kiểm: test `clan` qua; test mới "Danh sách cuốn" (chỉ "Tạo cuốn gia phả" là nút nền màu chính) và "Trang nhà hiện số người"
- [x] 2.3 Không gian làm việc: sơ đồ tràn màn, thanh nổi trên (quay lại, tên cuốn, Cây/Danh sách, tìm) và dưới (thu phóng, căn khung, bản đồ thu nhỏ, "Thêm người"); cỡ gọn đổi bố cục theo spec `responsive-layout`; kiểm: sửa test "Mở một cuốn trên điện thoại" theo requirement mới (thanh nổi một hàng, sơ đồ không bị che ≥ 70%), các test `layout` khác qua ở 5 cỡ màn
- [x] 2.4 Khung người trên sơ đồ (ảnh chữ cái, vạch + biểu tượng giới tính, dấu "Thuỷ tổ", người đã mất, dâu/rể), đường nối, nhãn đời, bản đồ thu nhỏ dịu màu; kiểm: test mới "Giới tính không chỉ bằng màu" và "Thuỷ tổ"; test "Người còn sống và đã mất" qua
- [x] 2.5 Ngăn thông tin nổi (cỡ vừa/rộng) và thẻ thông tin nổi kéo lên được (cỡ gọn): đầu thẻ, "Sửa hồ sơ" viên thuốc, nút tròn "Thêm con"/"Thêm vợ/chồng"/"Thêm", bảng nhãn–giá trị, việc xem, "Gỡ" chữ đỏ cuối; người xem chỉ có việc xem; kiểm: test mới "Bảng thông tin một người" (đúng một nút nền màu chính, "Gỡ" ở cuối), test mới "Xem đủ thông tin" (kéo lên), test `interaction`, `clan`, "Kéo tấm trượt xuống để đóng", "Máy tính bảng ngang: khung không dịch" qua
- [x] 2.6 Thanh bên từ 1200 px (`AppRail`): bộ chọn dòng họ, danh sách cuốn + số người, cuốn đang mở nổi, "Tạo cuốn", tài khoản; ẩn nút quay lại khi có thanh bên; kiểm: test mới "Chuyển cuốn trên máy tính" (1440 px) và "Máy tính bảng" (1024 px không có thanh bên)
- [x] 2.7 Chế độ danh sách (hàng có ảnh chữ cái, bộ lọc dạng chip) và hộp thoại theo hệ mới; kiểm: test "Chế độ danh sách: lọc Đã mất", "Phóng chữ 200%", các test hộp thoại qua

## 3. Kiểm và tài liệu

- [x] 3.1 Đo lại cuốn 1.000 người (bố cục, tác vụ dài khi chọn khung); kiểm: không chậm hơn quá 20 % so với số đã ghi, ghi số vào `kb/design-system.md`
- [x] 3.2 Chụp ảnh "sau" bằng `e2e/visual.spec.ts`, đặt cạnh ảnh "trước" và bản mẫu cho chủ dự án duyệt; kiểm: chủ dự án đồng ý
- [x] 3.3 Cập nhật `openspec/kb/design-system.md` (token, thành phần, bố cục, quy tắc phân cấp thao tác) và `openspec/status.md`; chạy `pnpm test`, `pnpm --filter app e2e` (3 lần), `pnpm --filter app build`, `openspec validate ui-polish --strict`; kiểm: tất cả qua
