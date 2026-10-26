# Data model

Nguồn: `supabase/migrations/20261026000000_init.sql`. Test: `supabase/tests/integrity.test.sql`. Lý do thiết kế: `openspec/changes/archive/2026-10-26-bootstrap-core/design.md` (D4, D5) và ADR 0002, 0003.

## Bảng

| Bảng | Vai trò | Cột / ràng buộc đáng chú ý |
|---|---|---|
| `clans` | dòng họ | `slug` duy nhất (dùng cho URL) |
| `trees` | cuốn gia phả (chi) trong dòng họ | `region` = `north`/`central`/`south`, quyết định cách xưng hô |
| `persons` | một người trong một cuốn | `gender` = `male`/`female`/`unknown`; `is_outsider` = dâu/rể; ngày sinh, ngày mất dạng không đầy đủ (xem dưới); `biography` in vào sách, `note` không in |
| `parent_child` | quan hệ cha/mẹ–con | `role` = `father`/`mother`; `kind` = `biological`/`adopted`/`step`; `UNIQUE (child_id, role, kind)` |
| `marriages` | vợ chồng | `wife_order` = thứ tự các bà |
| `memberships` | vai trò người dùng | đúng một trong `clan_id`/`tree_id`; `role` = `admin`/`editor`/`viewer` |
| `sources` | tư liệu: ghi âm, ảnh, lời kể, văn bản | `consent_at` = lúc xác nhận người được ghi âm đồng ý |
| `proposals` | đề xuất do AI sinh | `op`, `payload`, `anchor` (mốc ghi âm / vùng ảnh), `provider`, `model`, `status` |
| `field_sources` | nguồn của từng trường đã nhận | khoá (`person_id`, `field`, `source_id`) |
| `audit_log` | nhật ký thay đổi | giá trị `old`/`new` dạng jsonb, `actor` = `auth.uid()` |

## Ngày không đầy đủ
Mỗi loại ngày có 5 cột: `<x>_year`, `<x>_month`, `<x>_day`, `<x>_lunar`, `<x>_leap` (`x` = `birth`, `death`). Hàm `public.is_partial_date_ok` kiểm: có ngày thì phải có tháng, năm 1800–2199, nhuận chỉ khi là âm lịch và có tháng, ngày dương phải tồn tại. Ngày âm có tồn tại hay không chỉ kiểm ở `packages/core` (`isValidPartialDate`).

## Ràng buộc bằng trigger
| Trigger | Bảng | Từ chối (mã lỗi trong message, SQLSTATE 23514) |
|---|---|---|
| `parent_child_integrity` | `parent_child` | `DIFFERENT_TREE`, `BOTH_OUTSIDERS`, `ROLE_GENDER_MISMATCH` (bỏ qua khi `unknown`), `CYCLE` |
| `marriage_integrity` | `marriages` | `DIFFERENT_TREE`, `BOTH_OUTSIDERS` |
| `*_audit` | `persons`, `parent_child`, `marriages` | — ghi `audit_log` |

Cùng các luật ấy được kiểm trước ở `packages/core/src/integrity.ts`; sửa một bên thì sửa cả bên kia.

Chưa kiểm (để các change sau): sửa `gender`/`tree_id`/`is_outsider` của một người đã có quan hệ có thể làm quan hệ cũ trái luật; khoá cha mẹ của thuỷ tổ (change `tree-editing`).

## Phân quyền
RLS bật trên mọi bảng nhưng chưa có policy, nên client (anon/authenticated) không đọc ghi được gì. Policy viết ở change `auth-invite-roles`.
