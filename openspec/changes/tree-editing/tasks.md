# Tasks

## 1. Mô hình và thao tác sửa cây (`family-tree-editing`)

- [x] 1.1 Tạo `packages/core/src/tree/model.ts`: kiểu `TreePerson`, `TreeDoc` (version 1, `removedAt`/`removalId`), `EditError`, `Result`, hàm `activeView(doc)` bỏ phần tử đã gỡ; kiểm: `pnpm test` qua và `tsc --noEmit` không lỗi
- [x] 1.2 `createTree`, `addPerson` (thuỷ tổ, thiếu tên, thiếu giới tính); kiểm: test cho scenario "Tạo cuốn", "Thuỷ tổ", "Thiếu giới tính", "Thiếu tên"
- [x] 1.3 `addChild` (ruột/nuôi/riêng, chọn cha/mẹ kia, xếp cuối, từ chối chọn sai vợ chồng, từ chối thêm từ dâu/rể) dùng lại `checkParentLink`; kiểm: test cho 4 scenario "Thêm con" và "Dâu rể không tự thêm con"
- [x] 1.4 `addSpouse` (đánh dấu ngoại tộc, cùng đời, nhiều vợ cho người trong họ, một vợ/chồng cho ngoại tộc) dùng lại `checkMarriage`; kiểm: test cho scenario "Cụ ông có hai bà", "Dâu thêm chồng thứ hai"
- [x] 1.5 `addMissingParent` (thêm mẹ cho người chỉ có cha và ngược lại; khoá thuỷ tổ, vợ/chồng thuỷ tổ, người chưa có cha mẹ); kiểm: test cho "Thêm mẹ", "Thuỷ tổ bị khoá"
- [x] 1.6 `removePerson` và `removeBranch` theo kiểu đánh dấu đã gỡ (từ chối khi có con, gỡ kèm vợ/chồng ngoại tộc mồ côi, khoá thuỷ tổ, `removalId` chung cho nhánh); kiểm: test cho 5 scenario "Gỡ người", gồm kiểm bản xuất vẫn chứa nhánh đã gỡ
- [x] 1.7 `reorderSiblings`, `reorderSpouses` (đánh lại 1..n); kiểm: test "Đổi chỗ hai anh em", "Thứ tự các bà"
- [x] 1.8 `updatePerson` dùng `isValidPartialDate`, từ chối đổi giới tính làm sai vai trò; kiểm: test "Chỉ nhớ năm", "Ngày không hợp lệ", "Đổi giới tính làm sai vai trò", và test bất biến "Từ chối rồi xem lại" (doc trước và sau bằng nhau) chạy cho mọi thao tác ở 1.2–1.8

## 2. Tìm kiếm, lọc, lưu trữ (`family-tree-viewing`, `family-tree-editing`)

- [x] 2.1 `src/tree/search.ts`: `normalizeName`, `searchPersons`, `filterPersons` (Tất cả, Nam, Nữ, Đã mất, Dâu/Rể, Đã kết hôn, Chưa kết hôn); kiểm: test "Gõ không dấu" ("nguyen"→"Nguyễn", "dang"→"Đặng"), "Lọc người đã mất", "Lọc dâu rể"
- [x] 2.2 `src/tree/storage.ts`: `serialize`/`deserialize` có số phiên bản, từ chối dữ liệu hỏng mà không ném lỗi chưa bắt; kiểm: test vòng ghi–đọc giữ nội dung và thứ tự, test dữ liệu hỏng trả lỗi
- [x] 2.3 Tài liệu: tạo `openspec/kb/modules/tree.md` mô tả mô hình, thao tác, bảng mã lỗi và luật gỡ; kiểm: mọi hàm export từ `src/tree/index.ts` có mặt trong tài liệu

## 3. Bố cục sơ đồ (`family-tree-viewing`)

- [x] 3.1 `src/tree/layout.ts`: tính đời, đơn vị vợ/chồng, vị trí khung, thứ tự anh chị em và các bà; kiểm: test "Ba đời", "Nhiều vợ", và test không chồng khung trên cây ngẫu nhiên hạt giống cố định
- [x] 3.2 Thu gọn nhánh (kèm số người ẩn) và xem riêng nhánh con cháu ở `core`; mở các nhánh che người được tìm; kiểm: test "Thu gọn", "Xem riêng nhánh", "Người nằm trong nhánh thu gọn"
- [x] 3.3 Đo bố cục cuốn 1.000 người; kiểm: test thời gian dưới 1 giây (ngưỡng thoáng để không chập chờn trên máy chậm, ghi thời gian đo thực tế vào `openspec/kb/modules/tree.md`)

## 4. Khung giao diện và lưu trữ cục bộ

- [x] 4.1 Thêm `tailwindcss`, `@tailwindcss/vite`, `@xyflow/react` vào `apps/app`, chữ gốc 18 px; kiểm: `pnpm --filter app build` thành công
- [x] 4.2 `TreeStore` với bản `localStorage` (bắt lỗi đầy bộ nhớ và dữ liệu hỏng, nút tải bản sao JSON); kiểm: test bằng Vitest môi trường giả (`localStorage` giả) cho ghi–đọc và dữ liệu hỏng
- [x] 4.3 Bảng dịch mã lỗi sang tiếng Việt ở một file duy nhất; kiểm: test mọi mã trong `EditError` đều có câu
- [x] 4.4 Màn hình danh sách cuốn gia phả: tạo cuốn (tên, vùng miền), mở cuốn, hiện "chưa có ai" kèm nút thêm thuỷ tổ; kiểm: chạy app, tạo hai cuốn, tải lại trang vẫn còn

## 5. Sơ đồ và thao tác trên giao diện

- [x] 5.1 Sơ đồ bằng React Flow dùng `layout.ts`: số đời ở lề, khung có họ tên và năm sống, viền người đã mất, nét liền/đứt/chấm cho ruột/nuôi/riêng, minimap, chỉ vẽ khung trong vùng nhìn; kiểm: mở cuốn mẫu 3 đời ở 1.440 px và đối chiếu từng scenario "Sơ đồ theo đời", "Khung mỗi người"
- [x] 5.2 Bảng thông tin người và thao tác thêm cha/mẹ, thêm con (hỏi loại quan hệ và chọn cha/mẹ kia), thêm vợ/chồng, gỡ người, gỡ nhánh có hộp xác nhận nêu số người; nút quanh khung khi trỏ chuột, mở bảng khi chạm; kiểm: thao tác thật trong trình duyệt cho từng scenario trong spec editing, thấy thông báo đúng khi bị từ chối
- [x] 5.3 Thu gọn/mở nhánh, xem riêng nhánh, nút "Xem toàn bộ cây", ô tìm có làm nổi người và cuộn tới; kiểm: thao tác thật cho 4 scenario thu gọn/tìm
- [x] 5.4 Sắp thứ tự anh chị em và các bà bằng hộp thoại kéo thả hoặc nút lên/xuống (nút lên/xuống để dùng được bằng bàn phím và cảm ứng); kiểm: đổi chỗ rồi tải lại trang, thứ tự giữ nguyên

## 6. Hồ sơ và danh sách

- [x] 6.1 Biểu mẫu hồ sơ: họ tên, giới tính, ba ô ngày/tháng/năm cho ngày sinh và ngày mất, chọn Dương/Âm, ô Nhuận chỉ khi chọn Âm, hiện ngày quy đổi và Can Chi khi đủ ngày, nơi sinh, nơi an táng, tiểu sử, ghi chú; kiểm: nhập "chỉ năm 1890", "30/02/1960", đổi giới tính của cha, và thấy đúng kết quả theo spec
- [x] 6.2 Chế độ danh sách có bộ lọc và ô tìm, chuyển Cây/Danh sách ngay tại chỗ, chọn dòng mở hồ sơ; kiểm: thao tác thật cho "Lọc người đã mất" và "Lọc dâu rể"

## 7. Kiểm tổng

- [x] 7.1 Kiểm tay ở 375 px (có thể dùng công cụ giả lập thiết bị): chạm mở bảng thông tin, kéo và chụm, mọi nút ≥ 44 px, không có thanh cuộn ngang ngoài sơ đồ; kiểm: đối chiếu scenario "Chạm một người" và "Trên máy tính", ghi kết quả vào `openspec/status.md`
- [x] 7.2 Chạy `pnpm test`, `pnpm --filter app build` và `openspec validate tree-editing --strict`; kiểm: cả ba qua

## Workflow follow-up

- Cập nhật `openspec/status.md` bằng skill `project-sync` khi xong.
- Hỏi người dùng trước khi archive change.
- Ghi nhận cho change nối Supabase: thêm cột `removed_at`, `removal_id` vào `persons`, `parent_child`, `marriages`.
