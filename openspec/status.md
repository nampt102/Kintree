# Trạng thái dự án

> Đọc file này đầu tiên mỗi phiên. Cập nhật cuối mỗi bước/phiên. Giữ dưới ~150 dòng; lịch sử chi tiết nằm ở `changes/archive/` và git log.

**Cập nhật lần cuối:** 2026-10-27

## Phase hiện tại
Phase 1 — MVP: dựng được khung gia phả từ ghi âm/ảnh qua AI đề xuất + hàng chờ duyệt (xem `docs/PRD.md`). Phase 0 (kiểm chứng AI bằng tư liệu thật) tạm bỏ qua theo quyết định của chủ dự án.

## Bước đang làm
Change `cloud-auth-storage` đã **làm xong 25/25 task** (2026-10-27), đã archive 2026-10-27: đăng nhập email OTP (+ Google và Gmail SMTP đã thử thật), mô hình SaaS (quản trị nền tảng cấp dòng họ, chỉ quản trị thêm/sửa/xoá, xoá cuốn = đánh dấu), RLS, lưu trên máy chủ; kiểm: Vitest 328 + 51, pgTAP 64, Playwright 67 qua (1 bỏ qua), chạy 3 lần ổn định. `ui-design-system` đã archive; còn **kiểm tay trên iPhone / máy gập thật** (xem Rủi ro mở).

## Bước tiếp theo
1. Kiểm tay trên iPhone / máy gập thật cho `ui-design-system` và màn đăng nhập mới (song song, không chặn).
2. `ui-components` xong, chờ chủ dự án duyệt app chạy thật. `clan-invites` 14/15: còn task 5.2 — chủ dự án thử tay luồng Google (mở link mời khi chưa đăng nhập → đăng nhập Google → màn nhận lời mời; cần `pnpm db:trust-ca` sau `db:reset`), duyệt app chạy thật, rồi commit + archive.

## Việc bị chặn / chờ quyết định
- `ui-design-system` — chờ kiểm tay trên máy thật; "iPhone Duo" = iPhone gập của Apple; thông số và việc Safari báo nếp gập chưa xác nhận, kiểm trên máy thật/giả lập khi có (design R3).

## Bảng tiến độ

| # | Bước | Trạng thái | Change / PR | Ghi chú |
|---|---|---|---|---|
| 1 | Nền tảng: monorepo, lịch âm, ngày giỗ, schema (E1) | done | `bootstrap-core` | archive 2026-10-26 |
| 2 | Dựng cây (E2, F1–F4), dữ liệu cục bộ trước | done | `tree-editing` | archive 2026-10-26 |
| 2b | Thiết kế UI/UX: hệ thống thiết kế, làm lại màn hiện có | done | `ui-design-system` | archive 2026-10-26; còn kiểm tay máy thật |
| 3a | Đăng nhập, dòng họ, RLS, lưu trên máy chủ (E3, F10) | done | `cloud-auth-storage` | 25/25 task; ADR 0007, 0008; Google + Gmail SMTP đã thử |
| 3b | Lời mời (email + link xem), quản lý thành viên (E3) | in-progress 14/15 | `clan-invites` | "Tôi là ai" dời sang `kinship-terms` |
| 3c | Bộ component shadcn/ui, làm lại form | done (chờ duyệt app) | `ui-components` | 15/15 task; ADR 0010; bản mẫu đã duyệt (D1 toàn màn) |
| 4 | AI chép phả: nguồn, đề xuất, duyệt (E4, F5–F7) | todo | `ai-sources-proposals` | điểm khác biệt |
| 5 | Lịch tháng + nhắc giỗ (E5, F8, F11) | todo | `lunar-calendar-reminders` | |
| 6 | Xưng hô ba miền (E6, F9) | todo | `kinship-terms` | |
| 7 | Nhật ký thay đổi (E7, F12) | todo | `audit-log` | |
| 8 | Poster PDF, GEDCOM (E8, F13) | todo | `export-poster-gedcom` | |
| 9 | Bọc Capacitor, lên store | todo | | sau khi 1–8 chạy trên web |

User stories chi tiết: `docs/user-stories.md`.

## Quyết định chính (link tới `decisions/`)
- `0001-stack-web-mobile` — Vite + React + TS, bọc Capacitor; landing bằng Astro.
- `0002-postgres-khong-graph-db` — Postgres (Supabase), không dùng FalkorDB.
- `0003-ai-chi-de-xuat-co-nguon` — AI chỉ tạo đề xuất; mỗi trường gắn nguồn.
- `0004-skills-cho-ai-agent` — skill chính cho từng loại việc; hallmark cho landing/audit, ui-ux-pro-max cho app.
- `0005-ai-nhieu-nha-cung-cap` — gọi được OpenAI, Claude, Gemini qua Vercel AI SDK; chọn model bằng cấu hình.
- `0006-gia-nguoi-danh-dau-va-du-lieu-cuc-bo-truoc` — gỡ người = đánh dấu đã gỡ (giữ dữ liệu); cây lưu `localStorage` trước, Supabase sau.
- `0007-dang-nhap-va-luu-tru-tren-may-chu` — Google + email OTP, Supabase local trước, dữ liệu chỉ trên máy chủ (thay phần lưu cục bộ của 0006).
- `0008-saas-chi-quan-tri-sua-quan-tri-nen-tang-cap-dong-ho` — chỉ quản trị thêm/sửa/xoá; quản trị nền tảng cấp dòng họ; hai vai trò admin/viewer; xoá cuốn = đánh dấu.
- `0009-moi-thanh-vien-email-va-link-xem` — mời bằng email (mọi vai trò) và link (chỉ xem, hạn, mã mời, khoá khi sai); chỉ quản trị dòng họ quản lý thành viên; luôn còn quản trị; không gửi thư.

## Rủi ro mở
- `ui-design-system` chưa kiểm trên thiết bị thật: vùng an toàn và bàn phím ảo của iPhone, kéo tấm trượt bằng ngón tay, chụm hai ngón; bố cục theo nếp gập (test máy gập bị bỏ qua vì Chrome không báo hai đoạn vùng nhìn khi giả lập; iPhone gập của Apple chưa rõ Safari có báo không).
- Playwright dùng Google Chrome cài trên máy (`channel: 'chrome'`) vì mạng chặn tải Chromium (lỗi chứng chỉ TLS); máy khác không có Chrome thì đặt `PW_CHANNEL=msedge` hoặc chạy `npx playwright install chromium`.
- Bỏ lưu cục bộ (ADR 0007) mâu thuẫn với "xem offline" trong PRD/ADR 0001 (giảm rủi ro Apple 4.2) — quyết định lại khi làm bản iOS.
- Đăng nhập Google và email OTP qua Gmail SMTP đã thử thật ở máy local (2026-10-27, chủ dự án đăng nhập được). Máy này sau tường lửa Sophos: sau mỗi `db:start` phải chạy `pnpm db:trust-ca`. SMTP thật bật thì e2e đọc OTP hỏng (xem `kb/tech-stack.md`).
- `supabase/config.toml` đang nới giới hạn cho máy phát triển (`email_sent = 100`, giới hạn đăng nhập 1.000) và site_url `localhost:5173`: phải đặt lại khi dựng môi trường hosted (kèm SMTP thật).
- Mở cuốn cần mạng và đăng nhập (ADR 0007); không có xem offline. Hai người cùng sửa **một** người: lần ghi sau thắng, không báo (design R2).
- Thông tin cá nhân người sống lưu trên máy chủ nhưng chưa có chính sách/đồng ý (Nghị định 13/2023): xử lý trước khi ra mắt công khai.
- Giao diện chưa có test tự động (R3 trong design): kiểm tay 2026-10-26 trong Browser pane. Đã kiểm ở 375 px (mô phỏng): không cuộn ngang, mọi nút ≥ 44 px, chạm khung mở bảng thông tin dạng tấm trượt dưới; ở desktop: trỏ chuột hiện nút, bấm đúp mở hồ sơ. **Chưa kiểm cảm ứng thật** (kéo một ngón, chụm hai ngón) và chỉ kiểm cuốn 1.000 người ở mức đo: bố cục ~3 ms; kéo/phóng to không sinh tác vụ dài; bấm chọn một khung sinh tác vụ dài ~50–175 ms (đã dựng chỉ mục nút một lần và giữ nguyên đối tượng khung không đổi; phần còn lại có thể do MiniMap vẽ cả nghìn khung). Cây thử ngẫu nhiên rộng ~99.000 px nên zoom vừa khung chạm mức tối thiểu 0,05.
- AI đọc sai phả Hán Nôm / giọng các cụ (Phase 0 bị bỏ qua) — đo độ chính xác ngay khi làm change `ai-sources-proposals`.
- Lịch âm trước 1968 (ít nhất miền Nam) theo UTC+8, code dùng UTC+7 — ngày giỗ người mất trước 1968 có thể lệch 1 ngày; xem `kb/tech-stack.md`.
- Lịch âm sai tháng 7/1967 (điểm sóc 00:00:03, sát nửa đêm) theo PyEphem; ca biên vài giây cần lịch chính thức — xem `kb/tech-stack.md`.
- Bảng Tết test lấy từ 2 gói phần mềm có thể cùng gốc Hồ Ngọc Đức, chưa đối chiếu lịch giấy — xem `packages/core/test/fixtures/tet.json`.
- Apple Guideline 4.2 với app Capacitor — có camera, ghi âm, push, offline.
- Nghị định 13/2023 khi đặt server ở Singapore — cần tư vấn pháp lý trước khi ra mắt.

## Gần đây (tối đa ~10 dòng, mới nhất trên cùng)
- 2026-10-28: Làm xong `ui-components`: shadcn/Radix cho nút, ô nhập, ô chọn (danh sách tự vẽ), nhóm nút chọn một, công tắc, hộp thoại, menu, thông báo (Sonner); form hồ sơ chia 4 nhóm; e2e 105 qua ×3 (1 bỏ qua), Vitest 73, JS gzip 226 → 282 KB; còn chủ dự án duyệt app chạy thật.
- 2026-10-28: Đề xuất `ui-components` (dùng shadcn/ui, làm lại form hồ sơ và ô chọn) + bản mẫu chờ duyệt; sửa ngay: nút quanh khung người bị khung kế bên che, thanh "Đang xem riêng nhánh" dính thanh trên. Thêm `supabase/seed.sql` (4 dòng họ mẫu).
- 2026-10-27: `clan-invites` làm xong giao diện theo bản mẫu đã duyệt: màn Thành viên (mời email, link mời, đổi vai trò, gỡ), màn nhận lời mời (giữ link qua đăng nhập, cả khi dán link vào thẻ đang mở), chi tiết dòng họ cho quản trị nền tảng; ADR 0009; pgTAP 120, Vitest 328 + 73, Playwright 100 qua ×3 (1 bỏ qua), build sạch.
- 2026-10-27: `clan-invites` làm xong DB + lớp dữ liệu (7/15): migration `clan_invites` (bảng `invites` thay `clan_admin_invites`, `invite_links`, trigger giữ quản trị cuối, RPC `member_*`/`link_*`/`platform_*_clan_admin`), pgTAP 120 qua, Vitest app 73; bản mẫu giao diện chờ duyệt.
- 2026-10-27: Đề xuất `clan-invites`: mời bằng email (quản trị/xem, dòng họ/cuốn), link mời chỉ cấp quyền xem (hạn, mã mời, khoá sau 5 lần sai), màn Thành viên, giữ quản trị cuối, quản trị nền tảng xem/thêm/gỡ quản trị; không gửi thư; "Tôi là ai" dời sang `kinship-terms`.
- 2026-10-27: Chủ dự án duyệt, archive `ui-polish` (sync `app-ui-foundation`, `family-tree-viewing`, `responsive-layout`).
- 2026-10-27: Làm xong `ui-polish`: token đỏ trầm, nút viên thuốc, trang nhà dòng họ, không gian làm việc (thanh nổi, thẻ/ngăn thông tin nổi), khung người mới, thanh bên ≥ 1200 px, đếm người/thành viên; Vitest 58, Playwright 79 qua ×3; còn chủ dự án duyệt ảnh.
- 2026-10-27: `ui-polish` qua 3 vòng bản mẫu (`mockup.html`, `buttons.html`, `layout.html`): bỏ vàng đồng, nút viên thuốc, bố cục ghép trang nhà dòng họ + không gian làm việc; sửa thêm spec `responsive-layout`.
- 2026-10-27: Rà giao diện bằng `ui-ux-pro-max`, đề xuất change `ui-polish` (tông đỏ trầm di sản, toàn bộ màn, chưa làm chế độ tối).
- 2026-10-27: Làm xong `cloud-auth-storage` 25/25: migration `auth_access` (RLS, `create_tree`, `platform_*`, `apply_tree_changes`), `cloudStore` + hàng đợi ghi, đăng nhập OTP, màn dòng họ/cuốn/quản trị nền tảng; 41 test e2e mới (67 qua); ADR 0008.
- 2026-10-26: Đổi `cloud-auth-storage` sang mô hình SaaS theo chủ dự án: chỉ quản trị nền tảng tạo dòng họ và chỉ định quản trị, bỏ vai trò biên tập (chỉ admin/viewer), xoá cuốn = đánh dấu + gõ tên xác nhận; thêm spec `platform-admin`.
- 2026-10-26: Đề xuất `cloud-auth-storage` (tách `auth-invite-roles` làm hai: phần này và `clan-invites`).
- 2026-10-26: Archive `ui-design-system`, sync 2 spec (`app-ui-foundation`, `responsive-layout`) vào `openspec/specs/`.
- 2026-10-26: Làm xong `ui-design-system` 22/22: token, `src/ui/`, làm lại 7 màn hình, 27 test Playwright (26 qua, 1 bỏ qua) ổn định qua 5 lần chạy; sửa lỗi nút thu gọn đè giữa khung ở mức phóng nhỏ.
- 2026-10-26: Chạy `ui-ux-pro-max` để rà `ui-design-system`: thêm `line-strong` (viền ô nhập ≥ 3:1), thang z-index, chuyển động vào/ra, tên khung 2 dòng, xác nhận khi đóng có dữ liệu, điều hướng Back; không dùng Atkinson Hyperlegible (thiếu bộ chữ Việt).
- 2026-10-26: Đề xuất change `ui-design-system` (ưu tiên trước đăng nhập); ghi ADR 0007 cho change đăng nhập.
- 2026-10-26: Archive `tree-editing`, sync 2 spec (`family-tree-editing`, `family-tree-viewing`) vào `openspec/specs/`.
- 2026-10-26: Làm xong `tree-editing`: thao tác sửa cây, bố cục, tìm kiếm ở `core` (327 test); giao diện cây, hồ sơ, danh sách ở `apps/app`.
- 2026-10-26: Đề xuất change `tree-editing`; chốt dữ liệu cục bộ trước và gỡ người = đánh dấu đã gỡ.
