# Design

## Context

Hiện có (đọc từ repo, 2026-10-27): token trong `apps/app/src/index.css` (`@theme`: `canvas #FAFAF7`, `surface`, `surface-muted`, `line #E3E0D8`, `line-strong #857F73`, `accent #A3302A`, `focus #1D4ED8`, `danger`), thành phần ở `src/ui/` (`Button` có `primary/secondary/ghost/danger`, `IconButton`, `TextField`, `Dialog`, `Sheet`, `OverflowMenu`, `TopBar`, `EmptyState`, `Skeleton`, toast), màn ở `src/components/` và `src/auth.tsx`. Spec đang ràng buộc: `app-ui-foundation` (vùng chạm 44 px, tương phản 4,5:1/3:1, focus ≥ 3 px, giảm chuyển động, không mất dữ liệu khi đóng nhầm), `responsive-layout` (cỡ gọn/vừa/rộng, máy gập, vùng an toàn), `family-tree-viewing` (khung người, kiểu nét đường nối). Test Playwright (67) chọn phần tử theo vai trò và tên (vd. nút "Sửa hồ sơ", "Thêm con", "Gỡ người này", "Thêm", "Tài khoản", nhãn "Email", "Mã 6 số"). Kết quả rà bằng `ui-ux-pro-max`: xem `proposal.md`. Theo ADR 0004: dùng `ui-ux-pro-max` cho màn trong app.

## Goals / Non-Goals

**Goals:**
- Nhìn chuyên nghiệp, ấm, hợp sản phẩm gia phả; tách lớp bằng nền + bóng, ít viền.
- Không đổi hành vi, giữ nguyên tên/nhãn mà test và trình đọc màn hình dùng; bộ 67 test vẫn qua.
- Mọi màu qua token theo ngữ nghĩa (chuẩn bị chế độ tối).

**Non-Goals:**
- Chế độ tối; trang giới thiệu (landing, dùng hallmark ở change riêng); ảnh chân dung thật (cần lưu ảnh, change sau).
- Ngày giỗ, thành viên, nguồn, tìm trong cả dòng họ (chỉ có trong bản mẫu).

## Decisions

### D1. Token màu (thay khối `@theme`)
| Token | Giá trị | Dùng cho | Tương phản đã đo |
|---|---|---|---|
| `canvas` | `#FAF8F5` | nền trang (trắng ấm) | chữ `ink` 16,3:1 |
| `surface` | `#FFFFFF` | thẻ, tấm, hộp thoại, khung người | |
| `surface-muted` | `#F3EFEA` | nền nhóm, người đã mất, ô chọn đang bật | `ink-muted` 5,2:1 |
| `line` | `#ECE6DC` | đường chia trang trí (không dùng làm ranh giới duy nhất của thứ bấm được) | |
| `line-input` | `#8F877C` | viền ô nhập | 3,5:1 trên `surface`, 3,4:1 trên `canvas` |
| `ink` / `ink-muted` | `#1F1A17` / `#6B635A` | chữ chính / phụ | 5,9:1 phụ trên trắng |
| `accent` | `#A42F28` (đỏ son, theo nút kiểu D), `accent-hover` `#8C2721`, `accent-soft` `#F8ECEA` | nút chính, chọn, liên kết | trắng trên đỏ 7,4:1; đỏ trên `accent-soft` 6,3:1 |
| `male` / `female` | `#2F5E8C` / `#A23F6B` | vạch giới tính, ảnh chữ cái | 6,8:1 / 6,1:1 trên trắng |
| `danger` | `#B42318`, `danger-soft` `#FBEAE8` | gỡ, xoá, lỗi | 6,5:1 |
| `focus` | `#1D4ED8` (giữ) | vòng focus 3 px | |

`contrast.test.ts` cập nhật danh sách cặp trên; test hỏng nếu cặp nào dưới ngưỡng.

### D2. Độ sâu, bo góc, khoảng cách, chữ
- Bóng: `shadow-1` (thẻ, khung người: `0 1px 2px rgb(31 26 23 / .06), 0 1px 3px rgb(31 26 23 / .08)`), `shadow-2` (menu, toast, khung đang chọn), `shadow-3` (tấm trượt, hộp thoại). Không đặt bóng tuỳ chỗ.
- Bo góc: `rounded-lg` 10 px cho nút và ô nhập, `rounded-xl` 14 px cho thẻ và khung người, `rounded-2xl` 20 px cho tấm và hộp thoại.
- Khoảng cách theo bội 4; khoảng giữa mục 24/32 px.
- Chữ (Be Vietnam Pro, giữ gốc 112,5 %): tiêu đề màn 24/600, tiêu đề mục 13/600 chữ hoa giãn (nhãn nhóm kiểu iOS), nội dung 16/400, nhãn 15/500, chú thích 14/400 `ink-muted`; số dùng `tabular`.

### D3. Thành phần (`src/ui/`) — theo bản mẫu lần 2 (`mockup.html`), chủ dự án bỏ vàng đồng và chê nút thao tác lần 1 thô
- `Button`: thêm `tonal` (nền `accent-soft`, chữ `accent`) và `plain`; `secondary` bỏ viền đậm (nền `surface` + `shadow-1` + viền `line`); `danger` thành chữ đỏ nền `danger-soft`. Giữ `min-h-11`.
- `QuickActions` (mới): hàng tối đa 4 nút tròn 48 px có nhãn dưới (kiểu danh bạ iOS) cho việc hay dùng; chỉ "Sửa hồ sơ" nền đỏ, còn lại nền `surface-muted`.
- `ActionList` (mới): danh sách gọn cho việc ít dùng: khối `surface` bo 16 px + `shadow-1`, mỗi dòng là `<button>` cao ≥ 48 px, biểu tượng mảnh màu phụ + chữ + mũi tên, không ô màu. Gỡ/xoá là nút chữ đỏ riêng ở cuối, không khung. Tên dòng giữ đúng chữ của nút cũ ("Thêm con", "Gỡ người này"...) để test và trình đọc màn hình không đổi.
- `Card` (thẻ bấm được: `surface`, `shadow-1`, hover `shadow-2`, nhấn `scale(.99)` trừ khi giảm chuyển động), `Badge`, `Avatar` (chữ cái đầu của tên gọi = từ cuối của họ tên, màu theo giới, `aria-hidden`), `PageHeader` (tiêu đề + dòng phụ + thao tác chính).
- `TextField`/`SelectField`: viền `line-input`, nền `surface`, focus viền `accent` + vòng `focus`.
- `TopBar`: nền `surface/90` + `backdrop-blur` (chỉ khi cuộn), bóng `shadow-1` thay đường viền đáy.

### D4. Bố cục và màn hình (theo `layout.html` hướng ghép, nút theo `buttons.html` kiểu D)
- **Nút chính**: `rounded-full`, cao 44–48 px, nền `accent`, chữ trắng 15/600, bóng `0 8px 18px -6px rgb(164 47 40/.55)`; nút phụ `rounded-full` nền trắng viền `line`; nút chữ; nút nguy hiểm là chữ đỏ. Ô nhập bo 12, viền `line-input` (giữ 3:1).
- **Danh sách dòng họ**: như bản mẫu lần 2 (thẻ có biểu tượng, vai trò, mũi tên).
- **Trang nhà dòng họ** (`ClanScreen`): khối tiêu đề nền đỏ chuyển sắc bo 28 px: nhãn "Dòng họ của bạn · <vai trò>", tên dòng họ cỡ 40, nút "Tạo cuốn gia phả" (nền trắng chữ đỏ, chỉ quản trị dòng họ) và các ô số: người, cuốn (thành viên chỉ khi là quản trị). Dưới là lưới thẻ cuốn: phần trên hình cây thu nhỏ trang trí (SVG tĩnh, `aria-hidden`), phần dưới tên, "Miền · N người · <vai trò>", menu "⋯" (quản trị). Ngày giỗ: không làm (change khác).
- **Không gian làm việc** (`TreeScreen`):
  - Sơ đồ tràn vùng nội dung, nền chấm.
  - Thanh nổi trên (`glass`: nền trắng 82% + `backdrop-blur`, bo tròn): nút quay lại, tên cuốn + dòng phụ "N người · Miền", nhóm chuyển Cây/Danh sách, ô tìm (ở cỡ gọn: nút quay lại, ô tìm, menu; chế độ xem chuyển xuống thanh dưới).
  - Thanh nổi dưới: thu nhỏ, mức phóng, phóng to, căn khung, (bản đồ thu nhỏ bật/tắt ở cỡ rộng), nút viên thuốc "Thêm người" (quản trị; cuốn trống thì là "Thêm thuỷ tổ", đã có người thì mở hộp thoại thêm con cho người đang chọn, chưa chọn thì nút mờ kèm gợi ý "Chọn một người").
  - Cỡ vừa/rộng: ngăn thông tin là thẻ nổi bo 24 px nằm trong cột riêng bên phải (giữ chỗ như hai ngăn hiện tại nên khung không dịch); đầu thẻ có dải nền nhạt theo giới, ảnh chữ cái 80 px, tên, dòng phụ; hàng nút: "Sửa hồ sơ" (viên thuốc) + các nút tròn "Thêm con", "Thêm vợ/chồng", "Thêm" (menu các việc còn lại); dưới là bảng nhãn–giá trị và các việc xem (thu gọn, xem riêng nhánh); "Gỡ" là chữ đỏ cuối thẻ.
  - Cỡ gọn: thẻ thông tin nổi ở đáy (cách mép 12 px, bo 26 px) gồm ảnh chữ cái, tên, năm sống, hàng nút như trên; kéo tay nắm lên thì mở rộng gần toàn màn hiện đủ thông tin (dùng lại `Sheet` hai mức, mức thấp là thẻ gọn); thanh nổi dưới ẩn khi thẻ mở.
  - Máy gập: giữ nguyên quy tắc hai đoạn (thông tin ở đoạn phải).
- **Thanh bên** (`AppRail`, từ 1200 px, rộng 248 px, nền `#F5F1EC`): logo, bộ chọn dòng họ (thẻ trắng: tên + vai trò; bấm mở danh sách dòng họ), nhãn nhóm "Cuốn gia phả" với danh sách cuốn + số người, cuốn đang mở nền trắng `shadow-1`, mục "Tạo cuốn" (quản trị dòng họ); dưới cùng là tài khoản (email, đăng xuất). Có thanh bên thì ẩn nút quay lại trên thanh nổi.
- **Đăng nhập, hộp thoại, chế độ danh sách, quản trị nền tảng**: như bản mẫu lần 2, đổi nút sang viên thuốc.
- **Đếm người**: `cloudStore.directory()` thêm `personCount` cho mỗi cuốn bằng `select('tree_id', { count: 'exact', head: true })` theo từng cuốn (số cuốn mỗi dòng họ nhỏ); tổng người của dòng họ là tổng các cuốn. Không thêm cột hay hàm SQL.

### D5. Không vỡ test
- Giữ tên vai trò/nhãn: mọi nút trong `ActionList` vẫn là `<button>` với chữ cũ; nút biểu tượng giữ `aria-label`. `expectTouchTargets` (44 px) và `expectNoHorizontalScroll` vẫn chạy ở 5 cỡ màn.
- Thêm `e2e/visual.spec.ts` chụp 6 màn × 2 cỡ (390, 1280) vào `test-results/visual/` để duyệt bằng mắt (không so điểm ảnh: phông và khử răng cưa khác máy làm test chập chờn).

### D6. Khác bản mẫu khi làm thật (2026-10-27)
- Bỏ nút "Thêm người" trên thanh nổi dưới: không có người đang chọn thì nút vô nghĩa, có người chọn thì ngăn thông tin đã có "Thêm con"; cuốn trống vẫn có "Thêm thuỷ tổ" giữa màn.
- Cỡ gọn: nút đổi Cây/Danh sách là nút nổi tròn ở góc dưới phải (không nằm trên thanh trên): ở cỡ chữ 200%, thanh trên không đủ chỗ cho ô tìm cùng ba nút 44 px.
- Thanh bên không có mục "Ngày giỗ", "Thành viên" (change sau); mục tạo cuốn ghi "Thêm cuốn mới" để khác nút "Tạo cuốn" của hộp thoại.
- Có thanh bên thì màn trang nhà bỏ thanh trên (logo, tài khoản đã ở thanh bên).
- Đo lại cuốn 1.000 người: chọn một khung sinh tác vụ dài 64–114 ms (5 lần, 2026-10-27), trước đó 50–175 ms; mở cuốn ~2,7 s kể cả tải mạng local.

## Risks / Trade-offs

- **R1.** Bỏ viền đậm của nút/thẻ làm giảm ranh giới cho người nhìn kém. → Ô nhập giữ viền 3:1; thẻ có nền khác nền trang + bóng + chữ; focus 3 px giữ nguyên; spec sửa ghi rõ.
- **R2.** Khung người nhiều chi tiết hơn (ảnh chữ cái, biểu tượng) có thể chậm ở cuốn 1.000 người. → Chỉ thêm phần tử tĩnh, không ảnh thật; đo lại thời gian bố cục và tác vụ dài khi chọn khung, ghi vào KB.
- **R3.** Đỏ son (chính) và đỏ nguy hiểm gần màu nhau. → Thao tác nguy hiểm luôn có biểu tượng thùng rác + chữ, nền `danger-soft`, đặt nhóm riêng.
- **R4.** Đánh giá "đẹp" là chủ quan. → Chụp ảnh trước/sau ở 390 và 1280 cho chủ dự án duyệt trước khi archive.

## Migration Plan

Chỉ đổi giao diện; không dữ liệu, không schema. Hoàn lại bằng revert commit.

## Open Questions

- Biểu tượng thuỷ tổ: `Landmark` (nhà thờ họ) hay `Sprout` (gốc cây)? Mặc định `Landmark`, đổi dễ.
