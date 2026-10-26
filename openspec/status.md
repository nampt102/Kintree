# Trạng thái dự án

> Đọc file này đầu tiên mỗi phiên. Cập nhật cuối mỗi bước/phiên. Giữ dưới ~150 dòng; lịch sử chi tiết nằm ở `changes/archive/` và git log.

**Cập nhật lần cuối:** 2026-10-26

## Phase hiện tại
Phase 1 — MVP: dựng được khung gia phả từ ghi âm/ảnh qua AI đề xuất + hàng chờ duyệt (xem `docs/PRD.md`). Phase 0 (kiểm chứng AI bằng tư liệu thật) tạm bỏ qua theo quyết định của chủ dự án.

## Bước đang làm
Không có change đang mở. `bootstrap-core` đã xong và archive (`changes/archive/2026-10-26-bootstrap-core/`); spec chính ở `openspec/specs/` (`lunar-calendar`, `death-anniversary`, `family-tree-integrity`).

## Bước tiếp theo
1. `/opsx:propose` change `tree-editing` (E2 trong `docs/user-stories.md`).

## Việc bị chặn / chờ quyết định

## Bảng tiến độ

| # | Bước | Trạng thái | Change / PR | Ghi chú |
|---|---|---|---|---|
| 1 | Nền tảng: monorepo, lịch âm, ngày giỗ, schema (E1) | done | `bootstrap-core` | archive 2026-10-26 |
| 2 | Dựng cây (E2, F1–F4) | todo | `tree-editing` | |
| 3 | Đăng nhập, mời, phân quyền + RLS (E3, F10) | todo | `auth-invite-roles` | |
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

## Rủi ro mở
- AI đọc sai phả Hán Nôm / giọng các cụ (Phase 0 bị bỏ qua) — đo độ chính xác ngay khi làm change `ai-sources-proposals`.
- Lịch âm trước 1968 (ít nhất miền Nam) theo UTC+8, code dùng UTC+7 — ngày giỗ người mất trước 1968 có thể lệch 1 ngày; xem `kb/tech-stack.md`.
- Lịch âm sai tháng 7/1967 (điểm sóc 00:00:03, sát nửa đêm) theo PyEphem; ca biên vài giây cần lịch chính thức — xem `kb/tech-stack.md`.
- Bảng Tết test lấy từ 2 gói phần mềm có thể cùng gốc Hồ Ngọc Đức, chưa đối chiếu lịch giấy — xem `packages/core/test/fixtures/tet.json`.
- Apple Guideline 4.2 với app Capacitor — có camera, ghi âm, push, offline.
- Nghị định 13/2023 khi đặt server ở Singapore — cần tư vấn pháp lý trước khi ra mắt.

## Gần đây (tối đa ~10 dòng, mới nhất trên cùng)
- 2026-10-26: Chốt ADR 0004; cài hallmark vào `.claude/skills/hallmark`.
- 2026-10-26: Archive `bootstrap-core`, sync 3 spec vào `openspec/specs/`.
- 2026-10-26: Làm xong `bootstrap-core`; thêm KB `tech-stack.md`, `data-model.md`; push lên github.com/nampt102/Kintree.
- 2026-10-26: ADR 0005 — AI nhiều nhà cung cấp (OpenAI, Claude, Gemini).
- 2026-10-26: Cài project-kit/OpenSpec; ghi ADR 0001–0003; viết `docs/user-stories.md`; tạo change `bootstrap-core`.
- 2026-10-26: Viết `docs/PRD.md`; chốt tên Kintree, stack, Postgres.
