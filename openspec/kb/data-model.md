# Data model

Nguồn: `supabase/migrations/20261026000000_init.sql`, `20261027000000_auth_access.sql`. Test: `supabase/tests/integrity.test.sql`, `access.test.sql`. Lý do thiết kế: `openspec/changes/archive/2026-10-26-bootstrap-core/design.md` (D4, D5) và ADR 0002, 0003.

## Bảng

| Bảng | Vai trò | Cột / ràng buộc đáng chú ý |
|---|---|---|
| `clans` | dòng họ | `slug` duy nhất (dùng cho URL) |
| `trees` | cuốn gia phả (chi) trong dòng họ | `removed_at` = đã xoá (đánh dấu); trigger khoá `clan_id`; `region` = `north`/`central`/`south`, quyết định cách xưng hô |
| `persons` | một người trong một cuốn | `is_root` = thuỷ tổ (duy nhất một đang hiện mỗi cuốn); `removed_at`/`removal_id` = đã gỡ (ADR 0006, cũng có ở `parent_child`, `marriages`); `gender` = `male`/`female`/`unknown`; `is_outsider` = dâu/rể; ngày sinh, ngày mất dạng không đầy đủ (xem dưới); `biography` in vào sách, `note` không in |
| `parent_child` | quan hệ cha/mẹ–con | `role` = `father`/`mother`; `kind` = `biological`/`adopted`/`step`; `UNIQUE (child_id, role, kind)` |
| `marriages` | vợ chồng | `wife_order` = thứ tự các bà |
| `memberships` | vai trò người dùng | đúng một trong `clan_id`/`tree_id`; `role` = `admin`/`viewer` (không có biên tập) |
| `platform_admins` | quản trị nền tảng (nhà vận hành) | chỉ ghi bằng `service_role` (`pnpm admin:promote <email>`); không policy cho client |
| `clan_admin_invites` | email được chỉ định quản trị dòng họ nhưng chưa có tài khoản | `email` chữ thường; trigger `on_auth_user_created` đổi thành `memberships` khi đăng ký |
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

## Phân quyền (RLS)
Hai vai trò `admin`/`viewer` ở hai tầng (dòng họ, cuốn); quyền thực tế là mức cao hơn. Chỉ admin ghi. Không có policy `delete` ở bảng gia phả: gỡ/xoá = đánh dấu. `anon` không có quyền gì; `authenticated` chỉ có các quyền policy cho phép.

| Hàm | Ý nghĩa |
|---|---|
| `role_rank(text)` | admin 2, viewer 1 |
| `is_platform_admin()` | `auth.uid()` có trong `platform_admins` |
| `clan_role(clan)` | vai trò của người gọi ở dòng họ, hoặc null |
| `tree_role(tree)` | mức cao nhất giữa vai trò ở dòng họ chứa cuốn và ở chính cuốn; **null nếu cuốn đã xoá** |
| `membership_clan(clan, tree)` | dòng họ của một membership (cho policy `memberships`) |
| `create_tree(clan, name, region, description)` | `security definer`, chỉ admin dòng họ (`FORBIDDEN` 42501); tạo cuốn và trả dòng vừa tạo |
| `platform_create_clan(name, admin_email)` | chỉ quản trị nền tảng; tạo dòng họ + slug `<tên-không-dấu>-<6 ký tự>`; email có tài khoản → membership admin ngay, chưa có → `clan_admin_invites`. Lỗi: `NOT_PLATFORM_ADMIN` (42501), `NAME_REQUIRED`, `EMAIL_INVALID` (23514) |
| `platform_list_clans()` | chỉ quản trị nền tảng; dòng họ + email quản trị (cả đang chờ) |
| `apply_tree_changes(tree, persons, parents, marriages)` | `security invoker`: ghi các dòng đã đổi trong một giao dịch, thứ tự khoá ngoại; RLS và trigger áp dụng nguyên |

| Bảng | select | insert | update |
|---|---|---|---|
| `clans` | `clan_role` không null | không (qua `platform_create_clan`) | không |
| `trees` | `tree_role` không null | không (qua `create_tree`) | admin cuốn/dòng họ (`with check (true)` vì sau khi đặt `removed_at` thì `tree_role` null) |
| `persons` | `tree_role` không null | admin | admin |
| `parent_child`, `marriages` | thấy người liên quan | admin của cuốn chứa người | như insert |
| `memberships` | dòng của mình, hoặc admin dòng họ | admin dòng họ | admin dòng họ (có cả delete) |
| `platform_admins`, `clan_admin_invites`, `sources`, `proposals`, `field_sources`, `audit_log` | không | không | không |

Quản trị nền tảng không có policy đọc gia phả: chỉ gọi được hai hàm `platform_*`. Lưu ý đã gặp: `INSERT … RETURNING` trên `trees` bị policy select chặn (hàm `tree_role` không thấy dòng vừa chèn trong cùng câu lệnh), nên cuốn chỉ tạo qua `create_tree`, không có policy insert trực tiếp.
