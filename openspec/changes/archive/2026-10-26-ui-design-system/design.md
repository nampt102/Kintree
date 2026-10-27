# Design

## Context

`apps/app` hiện có (sau `tree-editing`): Tailwind v4 với vài màu trong `@theme` (`src/index.css`), chữ gốc ép cứng 18 px, thành phần tự viết trong `src/components/ui.tsx`, `Dialog.tsx` dùng thẻ `<dialog>`, sơ đồ React Flow (`TreeDiagram.tsx`), bảng thông tin đổi từ cạnh phải sang tấm cố định dưới ở mốc 768 px (`PersonPanel.tsx`). `index.html` chưa có `viewport-fit=cover`. Kiểm giao diện tới nay là thao tác tay trong Browser pane. Lý do làm change: xem `proposal.md`.

Chủ dự án chọn: hiện đại tối giản, dễ dùng, ưu tiên điện thoại, chú ý iPhone và máy gập / màn kép.

## Goals / Non-Goals

**Goals:**
- Một nguồn token duy nhất; màn sau (đăng nhập, dòng họ, lời mời, hàng chờ duyệt AI) chỉ ghép thành phần có sẵn.
- Mọi yêu cầu đo được trong hai spec được kiểm tự động ở nhiều cỡ màn hình.

**Non-Goals:**
- Chế độ tối, đổi chủ đề màu, đa ngôn ngữ.
- Đổi hành vi nghiệp vụ hay luồng thao tác (chỉ đổi cách trình bày và vị trí).
- Hình quạt, tỏa tròn, niên biểu; ảnh đại diện.

## Decisions

### D1. Hướng hình ảnh: tối giản ấm
- Nền gần trắng hơi ấm, một màu nhấn duy nhất (đỏ son, dùng tiết chế cho nút chính, người đang chọn, liên kết), xám ấm cho chữ phụ và đường viền. Không hoa văn, không ảnh nền, không đổ bóng đậm.
- Token (đã tính tỉ lệ tương phản WCAG ngày 2026-10-26: chữ chính 17:1, chữ phụ ≥ 6,3:1 trên mọi nền, chữ trắng trên `accent` 7,0:1, `danger` ≥ 5,5:1, `focus` ≥ 6,4:1; sẽ được kiểm bằng test ở task 1.4):

| Token | Giá trị | Dùng cho |
|---|---|---|
| `canvas` | `#FAFAF7` | nền trang, nền sơ đồ |
| `surface` | `#FFFFFF` | thẻ, tấm trượt, hộp thoại |
| `surface-muted` | `#F2F1ED` | nền khung người đã mất, nền ô chọn |
| `line` | `#E3E0D8` | đường phân cách trang trí (chỉ dùng khi không mang thông tin) |
| `line-strong` | `#857F73` | viền ô nhập, nút viền, thẻ bấm được (≥ 3:1 trên `surface`, `canvas`, `surface-muted`) |
| `ink` | `#1C1B19` | chữ chính |
| `ink-muted` | `#5C5850` | chữ phụ (≥ 4,5:1 trên `surface` và `canvas`) |
| `accent` | `#A3302A` | nút chính, người đang chọn |
| `accent-soft` | `#F6E8E6` | nền nhấn nhẹ |
| `focus` | `#1D4ED8` | viền bàn phím (khác màu nhấn để luôn nhận ra) |
| `danger` | `#B42318` | gỡ, lỗi |

- Chữ: Be Vietnam Pro (thiết kế cho tiếng Việt, OFL; có bộ ký tự `vietnamese`), gói `@fontsource/be-vietnam-pro`, đóng gói cùng app (không gọi Google Fonts, chạy được offline trong Capacitor). Trọng lượng 400/500/600; `font-display: swap`; năm sống dùng `font-variant-numeric: tabular-nums`.
  - `ui-ux-pro-max` gợi ý Atkinson Hyperlegible (rất dễ đọc) nhưng bộ chữ này chỉ có `latin` và `latin-ext`, không có `vietnamese` nên dấu chồng tiếng Việt sẽ lấy từ phông dự phòng; không dùng.
  - `ui-ux-pro-max` gợi ý bảng màu xanh dương cho nhóm "Accessible & Ethical"; giữ phong cách và các quy tắc của nhóm này (tương phản cao, chữ ≥ 16 px, vòng focus 3–4 px, vùng chạm 44 px) nhưng giữ bảng màu ấm với một màu nhấn đỏ son, để khác Gia Phả Số và hợp chủ đề dòng họ.
- Cỡ chữ gốc: `html { font-size: 112.5% }` thay cho `18px` cứng, để chữ vẫn phóng theo cài đặt trình duyệt / hệ điều hành. Thang: 14 / 16 / 18 / 20 / 24 / 30 px (theo `rem`).
- Bo góc 8 / 12 / 16; khoảng cách theo lưới 4 px và tối thiểu 8 px giữa hai phần tử bấm được; thang `z-index` cố định: 0 (sơ đồ) / 10 (thanh công cụ, nút nổi) / 20 (tấm trượt) / 40 (lớp tìm) / 100 (hộp thoại) / 1000 (thông báo).
- Chuyển động: vào 250 ms, ra 160 ms (~65%), `ease-out`/`ease-in`, chỉ animate `transform` và `opacity`, hoạt ảnh ngắt được và không chặn thao tác; không có hoạt ảnh lặp vô hạn (làm nổi người chỉ chạy 2 nhịp rồi dừng ở viền tĩnh); tắt hết dưới `prefers-reduced-motion: reduce`. Nhấn nút: đổi màu nền/độ mờ trong 100 ms, không dịch bố cục.
- Focus: vòng 3 px màu `focus` cách 2 px, luôn nhìn thấy (không dùng `outline: none`).
- Ô nhập, nút và vùng bấm: chữ ≥ 16 px (tránh iOS tự phóng khi chạm vào ô nhập); `touch-action: manipulation` cho mọi phần tử bấm được; trạng thái vô hiệu mờ 0,45 kèm con trỏ cấm.
- Màu đặt theo tên ngữ nghĩa (`surface`, `ink`, `accent`...) để sau thêm chế độ tối chỉ cần ánh xạ lại bảng token.
- Biểu tượng: `lucide-react` (một bộ, nét 1,75 px, cỡ 20 / 24 px đặt thành token), thay các ký tự ↑ ♥ ✕ + − và không dùng emoji; không truyền đạt thông tin chỉ bằng màu (người đã mất có thêm viền đứt; lỗi có biểu tượng và chữ).

### D2. Thành phần dùng chung (`apps/app/src/ui/`)
`Button` (primary / secondary / ghost / danger, có ô biểu tượng), `IconButton` (vùng chạm 44 px dù hình 20–24 px, bắt buộc `label`), `TextField`, `SelectField`, `Segmented`, `Sheet`, `Dialog`, `TopBar`, `Toast` (+ `useToast`), `EmptyState`, `Skeleton`. Thành phần cũ trong `components/ui.tsx` chuyển sang đây; màn hình chỉ dùng các thành phần này và token, không tự đặt màu hex.
- Theo ADR 0004: dùng `ui-ux-pro-max` làm tham chiếu cho thành phần và trợ năng; không dùng hallmark cho màn hình app (hallmark chỉ cho landing/audit).

### D3. Cỡ cửa sổ và máy gập
- Mốc Tailwind đổi thành `md: 600px`, `lg: 840px` (theo "window size classes" của Material 3), dùng chung cho mọi màn; bỏ dùng mốc mặc định 768 px.
- Máy gập / màn kép: CSS `@media (horizontal-viewport-segments: 2)` và JS `window.viewport.segments` (Viewport Segments API) qua hook `useViewportSegments()`; khi có hai đoạn, màn cây đặt sơ đồ vào đoạn trái, bảng thông tin vào đoạn phải, bề rộng mỗi ngăn đúng bằng đoạn của nó (nếp gập rơi vào khe giữa). Không có API thì quay về theo bề rộng.
- Vùng an toàn: `viewport-fit=cover` trong `index.html`; thanh trên, tấm trượt, nút thu phóng nổi và chân hộp thoại cộng `env(safe-area-inset-*)`; chiều cao dùng `dvh`.
- Thay vì đoán theo tên máy ("iPhone", "Fold"): bố cục chỉ phụ thuộc bề rộng, đoạn vùng nhìn và vùng an toàn, nên máy mới (kể cả iPhone gập nếu có) tự đúng.

### D4. Màn cây trên cỡ gọn
- Bỏ thanh "Kintree" chung khi đang ở trong một cuốn; `TopBar` một hàng: nút quay lại, tên cuốn (cắt bớt), nút tìm (mở lớp tìm phủ toàn bề rộng), `Segmented` Cây/Danh sách dạng biểu tượng có nhãn ẩn, nút "thêm" mở menu (Tải bản sao).
- Nút thu phóng và "vừa khung" nổi ở góc dưới trái, trên vùng an toàn; minimap chỉ hiện ở cỡ rộng.
- `Sheet`: tấm trượt không chặn sơ đồ phía trên (người dùng vẫn kéo sơ đồ được), hai nấc 50% và ~92% chiều cao, kéo tay nắm bằng Pointer Events, kéo xuống quá ngưỡng thì đóng; có nút đóng cho người không kéo được; Esc đóng.
- Hộp thoại ở cỡ gọn phủ toàn màn; phần thân cuộn, chân chứa nút chính dính đáy. Để nút chính không bị bàn phím ảo che: meta `interactive-widget=resizes-content` (Chrome Android) và hook đặt chiều cao hộp thoại theo `visualViewport.height` (Safari iOS).

### D5. Khung người trên sơ đồ
- 176 × 72 px: họ tên 16 px đậm vừa, cho xuống tối đa 2 dòng (không cắt `…` ngay một dòng; tên quá dài mới cắt và có `title`), dòng phụ 14 px `ink-muted` (năm sống, nhãn "Dâu"/"Rể" dạng viên nhỏ). Đã mất: viền nét đứt + nền `surface-muted`. Đang chọn: viền 2 px `accent`. Làm nổi khi tìm: viền `accent` + quầng mờ chạy 2 nhịp rồi dừng (tĩnh khi giảm chuyển động).
- Nút thu gọn: viên nhỏ dưới khung ghi "−" hoặc "+N", vùng chạm 44 px.
- Nút thao tác quanh khung (chỉ thiết bị có hover): biểu tượng `ArrowUp`, `UserPlus`, `Heart`, `Trash2`, vùng chạm 44 px; trên thiết bị cảm ứng không hiện, dùng tấm trượt.
- Đổi cỡ khung thì truyền `cardWidth`/`cardHeight` vào `computeLayout`; `packages/core` không đổi.

### D6. Phản hồi
`ToastProvider` ở gốc app, vùng `aria-live="polite"` (không cướp con trỏ), tự ẩn sau 4 giây (chậm hơn mức 3 giây phổ biến vì người dùng lớn tuổi); mọi lời gọi `edit()` thành công trong `TreeScreen` báo một câu ngắn ("Đã thêm …", "Đã gỡ … (giữ trong bản sao)", "Đã lưu thứ tự"). Lỗi vẫn hiện ngay trong hộp thoại cạnh ô liên quan (`role="alert"`), giữ dữ liệu đã nhập và chuyển con trỏ tới ô sai đầu tiên. Đóng hộp thoại hay tấm trượt khi đang có dữ liệu chưa lưu thì hỏi xác nhận; Esc, nút đóng và kéo xuống đều qua bước hỏi này.

### D7. Điều hướng và cử chỉ
- Màn hình chỉ có hai tầng (danh sách cuốn → một cuốn) nên không dùng thanh tab dưới; nút quay lại ở `TopBar`. Nút Back của trình duyệt/Android và cử chỉ vuốt từ mép trái của iOS phải đưa về danh sách cuốn: đẩy một mục vào lịch sử khi mở cuốn (`history.pushState`) và lắng nghe `popstate`; đóng tấm trượt/hộp thoại bằng Back cũng được (đưa trạng thái vào lịch sử).
- Không đặt tay nắm kéo hay vùng kéo sơ đồ sát mép trái trong khoảng 20 px để khỏi tranh với cử chỉ vuốt-quay-lại của iOS; kéo tấm trượt chỉ bằng tay nắm ở giữa trên cùng, luôn có nút đóng thay thế (không dựa vào cử chỉ đơn thuần).
- Thanh công cụ ở trên (không dùng thanh dưới) để nhường vùng ngón cái cho tấm trượt.

### D8. Kiểm thử
- **Playwright** (`@playwright/test`, chỉ Chromium) trong `apps/app/e2e/`, chạy trên `vite preview`. Mỗi scenario đo được trong hai spec thành một test, chạy ở 320 × 640, 375 × 812, 600 × 900, 1024 × 768, 1440 × 900: không cuộn ngang, vùng chạm ≥ 44 px, sơ đồ ≥ 70% chiều cao, tấm trượt kéo/đóng, hộp thoại toàn màn, hai ngăn, giữ trạng thái khi đổi cỡ, Esc trả con trỏ, giảm chuyển động (`emulateMedia`), thông báo.
- Máy gập: giả lập nếp gập qua CDP `Emulation.setDisplayFeaturesOverride` của Chromium, kiểm không phần tử nào cắt qua nếp gập.
- Tương phản: test Vitest đọc token trong `src/index.css` và tính tỉ lệ WCAG cho từng cặp chữ/nền dùng thật.
- Thay vì tiếp tục kiểm tay: change này có quá nhiều yêu cầu đo được, kiểm tay mỗi lần sửa sẽ bỏ sót; Playwright thêm một lần tải trình duyệt (~150 MB) nhưng dùng tiếp được cho các change sau.

## Risks / Trade-offs

- **R1. Vùng an toàn và bàn phím ảo trên iPhone thật không giả lập được** trong Chromium. → Tách thành bước kiểm tay trên máy thật (mục Workflow follow-up trong `tasks.md`); code dùng `env()` và `visualViewport` theo tài liệu chuẩn.
- **R2. Viewport Segments API mới**, hỗ trợ chưa đều. → Luôn có đường lui theo bề rộng (spec có scenario riêng).
- **R3. iPhone gập của Apple (chủ dự án gọi là "iPhone Duo")**: tôi không có thông số kích thước, tỉ lệ khung hình, vùng an toàn của máy này, cũng như việc Safari có báo hai đoạn vùng nhìn hay không (chưa xác nhận từ nguồn nào), và Viewport Segments API chưa thấy trong WebKit. → Thiết kế chỉ dựa vào bề rộng cửa sổ, vùng an toàn và (nếu có) đoạn vùng nhìn, nên vẫn đúng khi Safari không báo nếp gập: máy gập mở rộng khi đó được coi như máy tính bảng (cỡ vừa/rộng) và bố cục hai ngăn chia theo bề rộng, không theo nếp gập. Bố cục theo nếp gập trên iPhone gập **chưa được xác nhận** cho tới khi kiểm trên máy thật hoặc trình giả lập của Apple.
- **R4. Phông chữ tăng dung lượng tải** (~3 trọng lượng × 2 bộ ký tự latin + vietnamese). → Chỉ nhập bộ `vietnamese` và `latin` cho 400/500/600.
- **R5. Làm lại nhiều file một lúc** dễ làm hỏng hành vi đã có. → Không đổi `packages/core`; giữ nguyên tên nhãn `aria-label` mà các thao tác dựa vào; chạy lại toàn bộ test core + test Playwright mới.

## Open Questions

- **Hoàn tác khi gỡ người** (`ui-ux-pro-max`: `undo-support`, thông báo kèm "Hoàn tác" thay cho chỉ hỏi xác nhận). Gỡ đã là đánh dấu (ADR 0006) nên làm được: cần thêm `restoreRemoval(doc, removalId)` ở `packages/core` và nút "Hoàn tác" trong thông báo. Đây là thêm tính năng ngoài phạm vi "chỉ đổi cách trình bày", nên chưa đưa vào tasks; chủ dự án quyết định có thêm vào change này hay để change nhật ký/phiên bản.
