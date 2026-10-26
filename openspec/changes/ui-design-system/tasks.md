# Tasks

## 1. Nền tảng hình ảnh

- [x] 1.1 Thêm `@fontsource/be-vietnam-pro` (400/500/600, bộ `latin` + `vietnamese`) và `lucide-react`; kiểm: `pnpm --filter app build` thành công và tệp phông nằm trong `dist/assets`
- [x] 1.2 `index.html`: `viewport-fit=cover`, `interactive-widget=resizes-content`, `theme-color`; kiểm: đọc lại thẻ meta trong `dist/index.html`
- [x] 1.3 Viết token trong `src/index.css` theo design D1 (màu gồm `line-strong`, phông, thang chữ, thang `z-index`, bo góc, chuyển động vào 250 / ra 160 ms, vòng focus 3 px, `touch-action: manipulation`), `html { font-size: 112.5% }`, mốc `md: 600px` / `lg: 840px`, tắt chuyển động dưới `prefers-reduced-motion`; kiểm: build thành công, không còn mã màu hex trong `src/components/**` (grep)
- [x] 1.4 Test Vitest tính tương phản WCAG cho từng cặp chữ/nền dùng thật đọc từ `src/index.css`; kiểm: test qua (chữ thường ≥ 4,5:1, chữ lớn/biểu tượng ≥ 3:1, `line-strong` ≥ 3:1 trên `surface`, `canvas`, `surface-muted`)

## 2. Thành phần dùng chung (`src/ui/`)

- [x] 2.1 `Button`, `IconButton` (vùng chạm 44 px, `label` bắt buộc), `TextField`, `SelectField`, `Segmented`; chuyển các màn đang dùng `components/ui.tsx` sang và xoá file cũ; kiểm: `tsc -b` qua, không còn import `components/ui.tsx`
- [x] 2.2 `Dialog`: toàn màn ở cỡ gọn với chân dính đáy, căn giữa ở cỡ vừa/rộng, trả con trỏ về nút đã mở khi đóng, chiều cao theo `visualViewport`, hỏi xác nhận khi đóng lúc đang có dữ liệu chưa lưu, chuyển con trỏ tới ô sai khi bị từ chối; kiểm: test Playwright "Mở rồi đóng hộp thoại", "Nhập tên khi bàn phím ảo mở", "Đóng khi đã nhập tên", "Đóng khi chưa nhập gì" (đo nút chính nằm trong vùng nhìn khi thu nhỏ chiều cao vùng nhìn)
- [x] 2.3 `Sheet` (tấm trượt hai nấc, kéo tay nắm ở giữa, kéo xuống để đóng, nút đóng, Esc, hỏi xác nhận khi đang có dữ liệu chưa lưu) và `TopBar`; nút Back của trình duyệt đóng tấm trượt / hộp thoại / quay về danh sách cuốn (design D7); kiểm: test Playwright "Kéo tấm trượt"
- [x] 2.4 `ToastProvider` + `useToast` (`aria-live`, tự ẩn 3 giây), `EmptyState`, `Skeleton`; kiểm: test Playwright "Thêm con thành công" thấy thông báo rồi thông báo tự ẩn
- [x] 2.5 Viết `openspec/kb/design-system.md`: token, thành phần, quy tắc dùng, mốc cỡ cửa sổ, cách thêm màn mới; kiểm: mọi thành phần export từ `src/ui/index.ts` có mặt trong tài liệu

## 3. Bố cục theo thiết bị

- [x] 3.1 Hook `useWindowClass()` (gọn/vừa/rộng) và `useViewportSegments()` (Viewport Segments API, có đường lui); kiểm: test Vitest cho hàm phân loại bề rộng (319/599/600/839/840)
- [x] 3.2 Vùng an toàn cho thanh trên, tấm trượt, nút nổi, chân hộp thoại; dùng `dvh`; kiểm: grep thấy `env(safe-area-inset-` ở cả bốn chỗ, và test Playwright giả `safe-area` bằng biến CSS đặt tay thấy phần tử lùi vào

## 4. Làm lại các màn hình

- [x] 4.1 Danh sách cuốn: thẻ cuốn, trạng thái trống một nút, biểu mẫu tạo cuốn theo thành phần mới; kiểm: test Playwright "Cuốn chưa có ai" và bề rộng 320 px không cuộn ngang
- [x] 4.2 Màn cây cỡ gọn: `TopBar` một hàng, lớp tìm mở từ nút biểu tượng, menu thêm (Tải bản sao), nút thu phóng nổi, minimap chỉ ở cỡ rộng, bỏ thanh "Kintree" chung khi trong cuốn; kiểm: test Playwright "Mở một cuốn trên điện thoại 375 × 812" (một hàng, sơ đồ ≥ 70%)
- [x] 4.3 Khung người và nút quanh khung theo design D5 (biểu tượng `lucide-react`, vùng chạm 44 px, tên tối đa 2 dòng, kiểu đã mất / đang chọn / làm nổi 2 nhịp rồi dừng, viên thu gọn "+N"); truyền cỡ khung mới vào `computeLayout`; kiểm: test Playwright "Trình đọc màn hình" (tên nút) và "Tìm một người khi bật giảm chuyển động"
- [x] 4.4 Bảng thông tin: `Sheet` ở cỡ gọn, ngăn phải ở cỡ vừa/rộng, đoạn phải khi có hai đoạn vùng nhìn; thao tác chính có biểu tượng + chữ; mở/đóng không dịch khung; kiểm: test Playwright "Máy tính bảng ngang" và "Mở rộng máy gập" (giả nếp gập qua CDP), "Trình duyệt không báo đoạn vùng nhìn"
- [x] 4.5 Các hộp thoại thao tác, hồ sơ và ô ngày ba ô theo thành phần mới; lỗi hiện cạnh ô liên quan và giữ dữ liệu đã nhập; kiểm: test Playwright "Thêm bị từ chối"
- [x] 4.6 Chế độ danh sách: bộ lọc dạng `Segmented`/viên cuộn ngang được trong vùng riêng, dòng người theo thành phần mới; kiểm: test Playwright lọc "Đã mất" và 320 px không cuộn ngang trang
- [x] 4.7 Thông báo sau mỗi thao tác thành công (thêm, sửa, gỡ, sắp thứ tự) qua `useToast`; kiểm: test Playwright cho thêm và gỡ

## 5. Kiểm thử tự động

- [x] 5.1 Cài `@playwright/test` (Chromium), cấu hình chạy trên `vite preview`, script `pnpm --filter app e2e`; kiểm: một test mẫu mở trang danh sách cuốn qua
- [x] 5.2 Test chung ở 320 × 640, 375 × 812, 600 × 900, 1024 × 768, 1440 × 900: không cuộn ngang (trừ sơ đồ), mọi phần tử bấm được ≥ 44 × 44 px, phóng chữ 200% không cuộn ngang ở danh sách cuốn/hồ sơ/danh sách; kiểm: toàn bộ qua
- [x] 5.3 Test "Xoay điện thoại" (đổi 375 × 812 → 812 × 375 giữ người đang chọn, chế độ xem, nhánh thu gọn); kiểm: test qua
- [x] 5.4 Chạy `pnpm test`, `pnpm --filter app e2e`, `pnpm --filter app build`, `openspec validate ui-design-system --strict`; kiểm: tất cả qua

## Workflow follow-up

- Kiểm tay trên iPhone thật (dọc và ngang, có Dynamic Island) và một máy gập Android thật: vùng an toàn, bàn phím ảo khi nhập trong hộp thoại, kéo tấm trượt bằng ngón tay. Ghi kết quả vào `openspec/status.md`.
- Cập nhật `openspec/status.md` bằng skill `project-sync`.
- Hỏi người dùng trước khi archive.
