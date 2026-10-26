# Design

## Context

Repo mới, chưa có code (chỉ có `docs/` và `openspec/`). Stack đã chốt ở `openspec/decisions/0001`–`0003`. Hành vi cần đạt nằm trong `specs/` của change này.

## Goals / Non-Goals

**Goals:**
- `pnpm install && pnpm test` chạy được trên máy sạch (Node ≥ 20.19, pnpm 10).
- `packages/core` không phụ thuộc DOM, Node hay Supabase, để chạy được ở trình duyệt, WebView Capacitor và Edge Function (Deno).
- Schema đủ cho các change sau dùng mà không phải đổi cấu trúc bảng chính.

**Non-Goals:**
- Capacitor, UI cây, đăng nhập, chính sách RLS chi tiết, gọi AI.
- Xưng hô, xếp cây, GEDCOM (thuộc các change sau).

## Decisions

### D1. Cấu trúc monorepo
```
package.json            # scripts: test, dev, lint
pnpm-workspace.yaml     # apps/*, packages/*
apps/app/               # Vite + React + TS, import "@kintree/core"
packages/core/          # TS thuần, Vitest, export qua src/index.ts
supabase/               # supabase init; migrations/
```
- `packages/core` dùng trực tiếp mã nguồn `.ts` qua workspace (không build bước riêng); Vite và Vitest đều đọc được TS. Thêm bước build khi Edge Function cần import.
- Không dùng Turborepo/Nx: hai package chưa cần công cụ điều phối build.

### D2. Thuật toán lịch âm
- Tự viết từ phương pháp thiên văn đã công bố (Jean Meeus, *Astronomical Algorithms*: tính điểm sóc và kinh độ mặt trời, áp múi giờ) theo quy tắc lịch Việt Nam mà Hồ Ngọc Đức mô tả. Không chép mã nguồn của Hồ Ngọc Đức: bản amlich được cho là chỉ cho phép dùng cá nhân, phi thương mại (chưa xác nhận, xem R5), mà Kintree có gói trả phí.
- Thay vì dùng gói npm có sẵn (`lunar-javascript`, `@dqcai/vn-lunar`...): phần lớn theo lịch Trung Quốc (UTC+8) hoặc chưa rõ độ tin cậy; lõi này quá quan trọng để phụ thuộc gói ít người duy trì. Có thể dùng chúng làm nguồn đối chiếu thứ ba trong test.
- Thay vì bảng dữ liệu tra sẵn theo năm: bảng nhanh hơn nhưng phải có nguồn đáng tin cho 400 năm; thuật toán ngắn và kiểm được bằng test.
- Múi giờ: dùng UTC+7 cho mọi năm, khớp với lịch Việt Nam hiện hành và các phần mềm phổ biến. Xem rủi ro R1 về giai đoạn trước 1968.
- API dự kiến (tên có thể đổi khi code):
  - `solarToLunar({y,m,d}) → {y,m,d,leap}`
  - `lunarToSolar({y,m,d,leap}) → {y,m,d}` (ném lỗi nếu không tồn tại)
  - `canChiYear/Month/Day(...)`
  - `deathAnniversary(deathDate, lunarYear) → {date, kind: 'giỗ đầu'|'giỗ hết'|'giỗ thường'} | {error}`
- Lỗi trả dạng mã cố định (`OUT_OF_RANGE`, `INVALID_LUNAR_DATE`, `INCOMPLETE_DEATH_DATE`) để UI dịch thành câu tiếng Việt.

### D3. Kiểm thử lịch âm
- Bảng đối chiếu Tết 1900–2100 lưu ở `packages/core/test/fixtures/tet.json`, lấy từ lịch Việt Nam đã xuất bản (nguồn ghi trong file). Không sinh bảng bằng chính thuật toán đang test.
- Test vòng: mọi ngày 1900–2100 đổi xuôi rồi đổi ngược phải ra đúng ngày ban đầu (~73.000 ngày, chạy trong vài giây).
- Test riêng cho tháng nhuận, ngày 30, và các ví dụ trong spec.

### D4. Ngày tháng không đầy đủ
- Kiểu dùng chung: `PartialDate = { year: number; month?: number; day?: number; lunar: boolean; leap?: boolean }`.
- Trong Postgres: 5 cột trên mỗi loại ngày (`birth_year`, `birth_month`, `birth_day`, `birth_lunar`, `birth_leap`; tương tự `death_*`) cộng `CHECK` (có ngày thì có tháng, có tháng thì có năm, khoảng giá trị). Ngày dương có tồn tại hay không kiểm ở cả DB (hàm SQL dùng `make_date`) và `core`; ngày âm chỉ kiểm ở `core` vì cần lịch âm.
- Thay vì cột `date`: `date` bắt đủ ngày, ép người nhập đoán ngày (đúng điều PRD muốn tránh). Thay vì `jsonb`: khó đặt `CHECK` và khó truy vấn theo tháng cho lịch giỗ.

### D5. Schema chính (`supabase/migrations/0001_init.sql`)

| Bảng | Cột chính |
|---|---|
| `clans` | `id`, `name`, `slug` (unique), `created_by` |
| `trees` | `id`, `clan_id`, `name`, `region` (`north`/`central`/`south`) |
| `persons` | `id`, `tree_id`, `full_name`, `gender` (`male`/`female`/`unknown`), `is_outsider`, ngày theo D4, `birth_place`, `burial_place`, `biography`, `note`, `sibling_order` |
| `parent_child` | `parent_id`, `child_id`, `role` (`father`/`mother`), `kind` (`biological`/`adopted`/`step`); `UNIQUE (child_id, role, kind)` |
| `marriages` | `husband_id`, `wife_id`, `wife_order` |
| `memberships` | `user_id`, `clan_id` hoặc `tree_id`, `role` (`admin`/`editor`/`viewer`) |
| `sources` | `id`, `clan_id`, `kind` (`audio`/`image`/`oral`/`document`), `storage_path`, `provided_by`, `consent_at` |
| `proposals` | `id`, `tree_id`, `source_id`, `op` (`add_person`/`update_field`/`add_relation`), `payload jsonb`, `anchor jsonb` (mốc ghi âm hoặc vùng ảnh), `status` (`pending`/`accepted`/`rejected`), `reviewed_by` |
| `field_sources` | `person_id`, `field`, `source_id` — nguồn của từng trường đã nhận |
| `audit_log` | `table_name`, `row_id`, `action`, `old jsonb`, `new jsonb`, `actor`, `at` — ghi bằng trigger |

- `UNIQUE (child_id, role, kind)` chặn cha/mẹ thứ hai cùng loại ở mức DB; cha nuôi, cha dượng ghi riêng, khớp GEDCOM (một con thuộc nhiều gia đình, `PEDI` birth/adopted) để nhập trọn gói không bị vỡ. Trigger kiểm: `role` khớp `gender` của cha/mẹ (bỏ qua khi `gender = 'unknown'`), hai người cùng `tree_id`, không cả hai là ngoại tộc, không tạo vòng (truy vấn `WITH RECURSIVE` tổ tiên của cha/mẹ).
- Vợ chồng tách bảng `marriages` thay vì gộp vào một bảng `relations` chung: ràng buộc của hai loại khác nhau, tách ra thì `CHECK`/`UNIQUE` đơn giản hơn.
- RLS bật trên mọi bảng, chưa có policy (mặc định từ chối với client); policy viết ở change `auth-invite-roles`.

## Risks / Trade-offs

- **R1.** Trước năm 1968, lịch âm Việt Nam được cho là tính theo múi giờ UTC+8 (chưa xác nhận); dùng UTC+7 có thể lệch một ngày ở vài tháng của giai đoạn này, ảnh hưởng ngày giỗ các cụ mất trước 1968. → Ghi rõ trong KB; thêm test cho các ngày đã biết lệch nếu tìm được nguồn; cân nhắc tham số múi giờ theo năm ở change sau.
- **R2.** Bảng đối chiếu Tết lấy từ nguồn ngoài có thể sai. → Đối chiếu hai nguồn độc lập; chỗ hai nguồn khác nhau ghi chú trong fixture.
- **R3.** Trigger kiểm vòng chạy `WITH RECURSIVE` mỗi lần ghi quan hệ. → Cây ≤ 1.000 người nên chi phí nhỏ; đo lại nếu nhập GEDCOM lớn chậm.
- **R4.** Supabase CLI cần Docker để chạy Postgres local. → Ghi yêu cầu trong `openspec/kb/tech-stack.md`; test SQL chạy được khi có Docker, test `core` không cần Docker.

- **R5.** Giấy phép mã amlich của Hồ Ngọc Đức (chưa xác nhận, không mở được trang gốc khi viết) có thể cấm dùng thương mại. → Không chép mã; viết lại từ công thức thiên văn đã công bố; ghi nguồn công thức trong file.

## Open Questions

- Lấy bảng Tết 1900–2100 từ nguồn nào (sách lịch vạn niên, trang tra cứu đã công bố)? Không đổi thiết kế, chỉ ảnh hưởng nội dung fixture.
