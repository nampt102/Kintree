# Hệ thống thiết kế

Hiện trạng sau change `ui-design-system`. Lý do chọn: `openspec/changes/archive/2026-10-26-ui-design-system/design.md`; hành vi bắt buộc ở `openspec/specs/app-ui-foundation` và `responsive-layout`. Kiểm bằng `apps/app/e2e/` (Playwright) và `apps/app/src/ui/contrast.test.ts`.

Quy tắc: màn hình chỉ dùng token và thành phần dưới đây, không tự đặt mã màu hex hay cỡ riêng. Thiết kế UI theo skill đã chốt ở ADR 0004 (`ui-ux-pro-max`).

## Token (`apps/app/src/index.css`, khối `@theme`)
| Nhóm | Token | Ghi chú |
|---|---|---|
| Nền | `canvas` `#FAFAF7`, `surface` `#FFFFFF`, `surface-muted` `#F2F1ED` | trang / thẻ / nền người đã mất |
| Chữ | `ink` `#1C1B19`, `ink-muted` `#5C5850` | chữ phụ ≥ 6,3:1 trên mọi nền |
| Viền | `line` `#E3E0D8` (trang trí), `line-strong` `#857F73` | viền ô nhập, nút, thẻ bấm được phải dùng `line-strong` (≥ 3:1) |
| Nhấn | `accent` `#A3302A`, `accent-hover`, `accent-soft` | nút chính, người đang chọn |
| Trạng thái | `danger`, `danger-soft`, `focus` `#1D4ED8` | lỗi / gỡ; vòng focus bàn phím |
| Chữ | `text-xs…2xl` = 14…30 px (theo `rem`, cỡ gốc 112,5%) | phông Be Vietnam Pro 400/500/600, đóng gói bằng `@fontsource` |
| Bo góc | `rounded-sm/md/lg` = 8 / 12 / 16 px | |
| Cỡ cửa sổ | `md:` ≥ 600 px, `lg:` ≥ 840 px | gọn < 600, vừa 600–839, rộng ≥ 840 |
| z-index | biến `--z-diagram` 0, `--z-bar` 10, `--z-sheet` 20, `--z-search` 40, `--z-dialog` 100, `--z-toast` 1000 | |
| Chuyển động | vào 250 ms, ra 160 ms, `ease-out`/`ease-in` | tắt dưới `prefers-reduced-motion` |

Lớp tiện ích riêng: `.tabular` (số đều chữ cho năm sống), `.kt-glow` (làm nổi 2 nhịp rồi dừng), `.kt-node-btn` (nút trong sơ đồ giữ 44 px trên màn hình ở mọi mức phóng; ẩn khi phóng < 50%).

## Thành phần (`apps/app/src/ui/`, nhập từ `../ui/index.ts`)
| Thành phần | Dùng cho |
|---|---|
| `Button` | nút chữ (+ biểu tượng); biến thể `primary` `secondary` `ghost` `danger`; `block` cho danh sách thao tác |
| `IconButton` | nút chỉ biểu tượng, bắt buộc `label`; vùng chạm luôn 44 × 44 px |
| `TextField`, `SelectField`, `TextAreaField` | ô nhập có nhãn hiện, gợi ý, lỗi dưới ô (`aria-invalid`, `role="alert"`) |
| `ErrorText` | dòng lỗi có biểu tượng |
| `Segmented` | nhóm chuyển nhỏ / bộ lọc, mỗi mục `aria-pressed` |
| `Dialog` | hộp thoại `<dialog>`: toàn màn ở cỡ gọn, chân dính đáy, theo `visualViewport`; `dirty` thì hỏi trước khi bỏ; Back của trình duyệt đóng được |
| `Sheet` | tấm trượt đáy cho cỡ gọn: hai nấc 50% / 92%, kéo tay nắm, nút đóng và đổi nấc |
| `TopBar` | thanh trên, cộng vùng an toàn |
| `OverflowMenu` | menu "Thêm" |
| `ToastProvider`, `useToast` | thông báo sau thao tác, `aria-live="polite"`, tự ẩn 4 giây |
| `EmptyState`, `Skeleton` | trạng thái trống (một câu + một nút) và đang tải |
| `useWindowClass`, `windowClassOf` | cỡ gọn / vừa / rộng |
| `useViewportSegments`, `readSegments` | máy gập / màn kép (Viewport Segments API); `null` khi trình duyệt không báo |
| `useVisualViewportHeight`, `useBackToClose`, `usePrefersReducedMotion` | chiều cao trừ bàn phím ảo; nút Back đóng lớp đang mở; giảm chuyển động |

## Bố cục màn cây (`components/TreeScreen.tsx`)
- Gọn: thanh trên một hàng (quay lại, tên cuốn, tìm, đổi cây/danh sách, thêm); tìm mở lớp phủ; bảng thông tin là `Sheet`; sơ đồ ≥ 70% chiều cao; tự căn giữ mức phóng ≥ 80% để chữ đọc được.
- Vừa / rộng: bảng thông tin là ngăn bên phải (320 / 360 px); minimap chỉ ở cỡ rộng.
- Hai đoạn vùng nhìn (máy gập): sơ đồ ở đoạn trái, bảng thông tin ở đoạn phải, khe nếp gập bỏ trống (`data-testid="hinge"`). Khi trình duyệt không báo đoạn thì dùng bố cục theo bề rộng.

## Cách thêm màn mới
1. Dùng `TopBar` + nội dung có `padding` trái/phải `max(1rem, env(safe-area-inset-*))`.
2. Biểu mẫu: `Dialog` + `TextField`…, `dirty` khi đã nhập; lỗi gắn vào ô, chuyển con trỏ tới ô sai.
3. Báo kết quả bằng `useToast()`; trạng thái trống bằng `EmptyState`.
4. Thêm test Playwright ở `apps/app/e2e/` (chạy ở 320, 375, 600, 1024, 1440 px qua `layout.spec.ts`).

## Kiểm thử và giới hạn đã biết
- `pnpm --filter app e2e` chạy bằng Google Chrome cài trên máy (`channel: 'chrome'`, đổi bằng biến `PW_CHANNEL`). Playwright không tải được Chromium của nó vì mạng chặn (lỗi chứng chỉ TLS).
- Test máy gập dùng `Emulation.setDisplayFeaturesOverride` của CDP; nếu Chrome không báo hai đoạn vùng nhìn thì test tự bỏ qua. **Bố cục theo nếp gập chưa được kiểm trên thiết bị thật** và iPhone gập của Apple (Safari/WebKit) chưa xác nhận có báo nếp gập hay không.
- Vùng an toàn và bàn phím ảo của iPhone thật chưa kiểm; Chrome giả lập chỉ gần đúng.
- React Flow bật sẵn phóng khi bấm đúp (đã tắt `zoomOnDoubleClick`); `fitView` cần đo khung nên không dùng, sơ đồ tự tính khung nhìn từ bố cục (`TreeDiagram.tsx`, hàm `fit`).
