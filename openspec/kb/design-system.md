# Hệ thống thiết kế

Hiện trạng sau change `ui-polish` (2026-10-27). Lý do chọn: `openspec/changes/archive/2026-10-27-ui-polish/design.md` và các bản mẫu đã duyệt ở `openspec/changes/archive/2026-10-27-ui-polish/` (`mockup.html`, `buttons.html`, `layout.html`); hành vi bắt buộc ở `openspec/specs/app-ui-foundation` và `responsive-layout`. Kiểm bằng `apps/app/e2e/` (Playwright) và `apps/app/src/ui/contrast.test.ts`.

Quy tắc: màn hình chỉ dùng token và thành phần dưới đây, không tự đặt mã màu hex hay cỡ riêng (trừ hình trang trí SVG). Thiết kế UI theo skill đã chốt ở ADR 0004 (`ui-ux-pro-max`).

## Phong cách (chủ dự án chốt qua 3 vòng bản mẫu)
- Tông "đỏ trầm": nền trắng ấm, đỏ son là màu nhấn duy nhất (không vàng đồng).
- Tách lớp bằng nền và bóng nhẹ, không viền đậm (ô nhập vẫn có viền 3:1).
- Nút chính kiểu viên thuốc đỏ có bóng cùng màu; mỗi màn hoặc bảng chỉ một nút chính (`data-variant="primary"`).
- Bố cục: trang nhà dòng họ (khối tiêu đề đỏ có số liệu) + không gian làm việc khi mở cuốn (sơ đồ tràn màn, thanh nổi nền kính, thông tin người nổi); thanh bên từ 1200 px.

## Token (`apps/app/src/index.css`, khối `@theme`)
| Nhóm | Token | Ghi chú |
|---|---|---|
| Nền | `canvas` `#FAF8F5`, `surface` `#FFFFFF`, `surface-muted` `#F3EFEA`, `rail` `#F5F1EC` | trang / thẻ / nền nhạt, người đã mất / thanh bên |
| Chữ | `ink` `#1F1A17`, `ink-muted` `#6B635A` | chữ phụ ≥ 4,5:1 trên mọi nền |
| Viền | `line` `#ECE7E1` (trang trí), `line-input` `#8F877C` (viền ô nhập, ≥ 3:1), `connector` `#BDB4AA` (đường nối cây, mũi tên) | |
| Nhấn | `accent` `#A42F28`, `accent-hover` `#8C2721`, `accent-soft` `#F8ECEA` | nút chính, người đang chọn, thuỷ tổ |
| Giới tính | `male` `#2F5E8C` / `male-soft`, `female` `#A23F6B` / `female-soft` | chỉ ở khung người và ảnh chữ cái; luôn kèm biểu tượng ♂/♀ và chữ cho trình đọc màn hình |
| Trạng thái | `danger` `#B42318`, `danger-soft`, `focus` `#1D4ED8` | gỡ / xoá / lỗi; vòng focus 3 px |
| Bóng | `shadow-1` (thẻ, khung người), `shadow-2` (thanh nổi, đang chọn, hover), `shadow-3` (menu, hộp thoại, ngăn nổi, toast), `shadow-pill` (nút chính), `shadow-sheet` | không đặt bóng tuỳ chỗ |
| Bo góc | `rounded-md` 12 (ô nhập), `rounded-lg` 14, `rounded-xl` 16 (thẻ, khung người), `rounded-2xl` 22 (hộp thoại), `rounded-3xl` 28 (khối tiêu đề); nút: `rounded-full` | |
| Chữ | `text-xs…2xl` = 14…30 px (theo `rem`, cỡ gốc 112,5%) | Be Vietnam Pro 400/500/600 (`@fontsource`); tiêu đề `tracking` âm nhẹ |
| Cỡ cửa sổ | `md:` ≥ 600 px, `lg:` ≥ 840 px; thanh bên ≥ 1200 px (`useMinWidth(1200)`) | gọn < 600, vừa 600–839, rộng ≥ 840 |
| z-index | `--z-diagram` 0, `--z-bar` 10, `--z-sheet` 20, `--z-search` 40, `--z-dialog` 100, `--z-toast` 1000 | |
| Chuyển động | vào 250 ms, ra 160 ms; nhấn nút `scale(.98)` | tắt dưới `prefers-reduced-motion` |

Lớp tiện ích riêng: `.kt-glass` (nền kính của thanh nổi), `.tabular`, `.kt-glow`, `.kt-node-btn` (nút trong sơ đồ giữ 44 px trên màn hình ở mọi mức phóng; ẩn khi phóng < 50%).

## Thành phần (`apps/app/src/ui/`, nhập từ `../ui/index.ts`)
| Thành phần | Dùng cho |
|---|---|
| `Button` | viên thuốc; `primary` (đỏ, một mỗi màn), `secondary` (trắng viền nhạt), `ghost` (chữ), `danger` (chữ đỏ); `full` (rộng hết, chữ giữa), `block` (rộng hết, căn trái) |
| `IconButton` | tròn 44 px, bắt buộc `label`; `ghost`, `secondary` (nền xám ấm), `primary`, `raised` (trắng có bóng, nổi trên sơ đồ) |
| `CardButton`, `Card` | thẻ bấm được / khối tĩnh: nền trắng, `shadow-1`, viền rất nhạt |
| `Badge` | nhãn nhỏ: `neutral`, `accent`, `male`, `female`, `danger` |
| `Avatar`, `initialOf` | ảnh chữ cái đầu của tên gọi (từ cuối họ tên), màu theo giới, `aria-hidden` |
| `PageHeader`, `GroupLabel` | tiêu đề màn có dòng phụ; nhãn nhóm chữ hoa nhỏ |
| `ActionList` | danh sách việc ít dùng: biểu tượng mảnh, chữ, mũi tên; mỗi dòng là nút giữ đúng tên |
| `InfoList` | bảng nhãn–giá trị (ngày sinh, nơi sinh…) |
| `TextField`, `SelectField`, `TextAreaField` | ô nhập có nhãn hiện, lỗi dưới ô (`aria-invalid`, `role="alert"`) |
| `Segmented` | nhóm chuyển viên thuốc trong nền xám (chế độ xem); `wrap` thành chip (bộ lọc) |
| `Dialog` | `<dialog>` bo 22, `shadow-3`; toàn màn ở cỡ gọn; `dirty` thì hỏi trước khi bỏ; Back đóng được |
| `Sheet` | tấm trượt cỡ gọn; có `peek` thì nấc thấp là thẻ nổi gọn (bo 26, cách mép 12, trên thanh nổi dưới), kéo lên mở gần toàn màn; không `peek` thì 50% / 92% |
| `TopBar` | thanh trên nền trắng mờ, đường kẻ mảnh |
| `OverflowMenu`, `ToastProvider`/`useToast`, `EmptyState`, `Skeleton` | menu "Thêm"; thông báo viên thuốc đen; trạng thái trống có ô biểu tượng đỏ nhạt; khung đang tải |
| `useWindowClass`, `useMinWidth`, `useViewportSegments`, `useVisualViewportHeight`, `useBackToClose`, `usePrefersReducedMotion` | cỡ cửa sổ; ngưỡng bề rộng; máy gập; bàn phím ảo; Back đóng lớp; giảm chuyển động |

## Bố cục
- **Danh sách dòng họ** (`ClanList`): thanh trên có logo, lưới thẻ dòng họ (số cuốn, vai trò); "chưa được cấp quyền" khi trống.
- **Trang nhà dòng họ** (`ClanScreen`): khối tiêu đề đỏ chuyển sắc (vai trò, tên, nút trắng "Tạo cuốn gia phả" chỉ với quản trị dòng họ, số người / số cuốn / số thành viên — thành viên chỉ với quản trị); lưới thẻ cuốn có hình cây thu nhỏ trang trí, miền, số người, vai trò, menu "⋯" (quản trị).
- **Không gian làm việc** (`TreeScreen`): sơ đồ tràn màn; thanh nổi trên (quay lại khi không có thanh bên, tên cuốn + số người, Cây/Danh sách, ô tìm có kết quả kèm ảnh chữ cái, menu); thanh nổi dưới trái (thu nhỏ, phóng to, vừa khung); bản đồ thu nhỏ dịu màu ở cỡ rộng. Cỡ gọn: thanh trên chỉ quay lại + ô tìm + menu, nút đổi Cây/Danh sách nổi góc dưới phải, thông tin người là `Sheet` có `peek`. Vừa/rộng: ngăn nổi bo 24 trong cột riêng 340/384 px (khung không dịch khi mở). Máy gập: sơ đồ đoạn trái, thông tin đoạn phải, khe nếp gập trống (`data-testid="hinge"`).
- **Khung người** (`TreeDiagram`): 176 × 72, ảnh chữ cái 34 px, tên, ♂/♀ + năm sống (+ Dâu/Rể); vạch màu giới tính mép trái; đã mất: nền nhạt, viền đứt, không vạch; thuỷ tổ: nhãn "Thuỷ tổ" đỏ nhạt trên mép; đang chọn: viền đỏ 2 px + `shadow-2`. Đường nối 1,5 px màu `connector` (nuôi: đứt, riêng: chấm), vợ chồng: đỏ mờ. Nhãn "Đời n" là chip xám.
- **Thông tin một người** (`PersonPanel`): đầu (ảnh chữ cái, tên, ♂/♀, năm sống, Thuỷ tổ/Dâu/Rể), hàng nhanh ("Sửa hồ sơ" viên thuốc + nút tròn Thêm con, Thêm vợ/chồng, Xem riêng nhánh này), `InfoList`, `ActionList` (thêm cha/mẹ, sắp thứ tự, thu gọn), "Gỡ" chữ đỏ cuối. Người xem: không nút sửa, có nút "Xem riêng nhánh này" và tiểu sử.
- **Thanh bên** (`AppRail`, ≥ 1200 px, 248 px): logo, thẻ dòng họ đang mở (bấm để đổi dòng họ), "Cuốn gia phả" (về trang nhà), danh sách cuốn + số người (`aria-current` cho cuốn đang mở), "Thêm cuốn mới" (quản trị dòng họ), tài khoản + đăng xuất.

## Cách thêm màn mới
1. Màn danh sách: `TopBar` (hoặc thanh bên khi ≥ 1200 px) + nội dung `pageClass`/`pagePad` (`ClanList.tsx`); tiêu đề bằng `PageHeader`, mục bằng `CardButton`.
2. Biểu mẫu: `Dialog` + `TextField`…, `dirty` khi đã nhập; lỗi gắn vào ô, chuyển con trỏ tới ô sai; một nút `primary`, nút huỷ `secondary`.
3. Báo kết quả bằng `useToast()`; trạng thái trống bằng `EmptyState`.
4. Thêm test Playwright ở `apps/app/e2e/`; `layout.spec.ts` kiểm vùng chạm 44 px và không cuộn ngang ở 320, 375, 600, 1024, 1440 px; `visual.spec.ts` chụp 6 màn × 2 cỡ (`VISUAL_TAG=<tên>`) để duyệt bằng mắt.

## Đo hiệu năng
- Cuốn 1.000 người (2026-10-27, sau `ui-polish`): chọn một khung sinh tác vụ dài 64–114 ms (5 lần); trước đó 50–175 ms. Mở cuốn ~2,7 s kể cả tải từ Supabase local. Bố cục `computeLayout` ~3 ms.

## Kiểm thử và giới hạn đã biết
- `pnpm --filter app e2e` chạy bằng Google Chrome cài trên máy (`channel: 'chrome'`, đổi bằng `PW_CHANNEL`). Máy chủ test đặt `VITE_AUTH_GOOGLE=''` để chạy như máy chưa bật Google.
- Test máy gập dùng `Emulation.setDisplayFeaturesOverride` của CDP; Chrome không báo hai đoạn thì test tự bỏ qua. **Bố cục theo nếp gập và vùng an toàn chưa kiểm trên thiết bị thật.**
- `backdrop-filter` của thanh nổi có thể nặng trên máy yếu; chưa đo trên điện thoại thật.
- React Flow: đã tắt `zoomOnDoubleClick`; `fitView` không dùng (cần đo khung), sơ đồ tự tính khung nhìn từ bố cục và chừa chỗ thanh nổi trên (`topInset`).
