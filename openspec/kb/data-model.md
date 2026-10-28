# Data model

Nguồn: `supabase/migrations/20261026000000_init.sql`, `20261027000000_auth_access.sql`, `20261028000000_clan_invites.sql`. Test: `supabase/tests/integrity.test.sql`, `access.test.sql`, `members.test.sql`. Lý do thiết kế: `openspec/changes/archive/2026-10-26-bootstrap-core/design.md` (D4, D5) và ADR 0002, 0003.

## Bảng

| Bảng | Vai trò | Cột / ràng buộc đáng chú ý |
|---|---|---|
| `clans` | dòng họ | `slug` duy nhất (dùng cho URL) |
| `trees` | cuốn gia phả (chi) trong dòng họ | `removed_at` = đã xoá (đánh dấu); trigger khoá `clan_id`; `region` = `north`/`central`/`south`, quyết định cách xưng hô |
| `persons` | một người trong một cuốn | `is_root` = thuỷ tổ (duy nhất một đang hiện mỗi cuốn); `removed_at`/`removal_id` = đã gỡ (ADR 0006, cũng có ở `parent_child`, `marriages`); `gender` = `male`/`female`/`unknown`; `is_outsider` = dâu/rể; ngày sinh, ngày mất dạng không đầy đủ (xem dưới); `biography` in vào sách, `note` không in |
| `parent_child` | quan hệ cha/mẹ–con | `role` = `father`/`mother`; `kind` = `biological`/`adopted`/`step`; `UNIQUE (child_id, role, kind)` |
| `marriages` | vợ chồng | `wife_order` = thứ tự các bà |
| `memberships` | vai trò người dùng | đúng một trong `clan_id`/`tree_id`; `role` = `admin`/`viewer` (không có biên tập); trigger `memberships_keep_last_admin` chặn gỡ/hạ quản trị cấp dòng họ cuối cùng (`LAST_ADMIN`, trừ khi chính dòng họ hoặc tài khoản đang bị xoá) |
| `platform_admins` | quản trị nền tảng (nhà vận hành) | chỉ ghi bằng `service_role` (`pnpm admin:promote <email>`); không policy cho client |
| `invites` | lời mời bằng email cho người chưa có tài khoản (thay `clan_admin_invites`) | `email` chữ thường, `role`, đúng một trong `clan_id`/`tree_id`, duy nhất theo (email, phạm vi); trigger `on_auth_user_created` đổi thành `memberships` khi đăng ký |
| `invite_links` | link mời, chỉ cấp vai trò xem | `token_hash` = sha256 của mã link (không lưu mã gốc); `code_hash` = bcrypt mã mời tuỳ chọn; `expires_at`, `revoked_at`, `failed_attempts`/`locked_until` (5 lần sai → khoá 15 phút), `accepted_count` |
| `sources` | tư liệu: ảnh (lát đầu), ghi âm, lời kể, văn bản | thêm `tree_id`, `image_kind` (`grave`/`page`/`altar`/`other`), `status` (`queued`/`processing`/`done`/`failed`), `status_at`, `error`, `proposal_count`; `consent_at` cho ghi âm; ảnh ở bucket `sources` (`<clan>/<tree>/<source>.jpg`) |
| `proposals` | đề xuất do AI sinh | `op` (`add_person`/`update_field`/`add_relation`), `payload` (jsonb, schema ở `supabase/functions/_shared/schema.ts`), `anchor` (vùng ảnh 0–1), `ref` (mã tạm của người trong lô), `quote` (chữ AI đọc), `provider`/`model`, `status` (`pending`/`accepted`/`rejected`/`superseded`), `edited`, `review_note`, `result_person_id`; chỉ quản trị cuốn đọc |
| `field_sources` | nguồn của từng trường (kể cả nguồn không chọn) | `person_id`, `field` (`fullName`/`gender`/`birth`/`death`/`birthPlace`/`burialPlace`/`biography`), `source_id`, `proposal_id`, `value`, `anchor`, `accepted`, `note`; mọi người có vai trò ở cuốn đọc được |
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
| `platform_create_clan(name, admin_email)` | chỉ quản trị nền tảng; tạo dòng họ + slug `<tên-không-dấu>-<6 ký tự>`; quản trị đầu tiên qua `_grant_by_email`. Lỗi: `NOT_PLATFORM_ADMIN` (42501), `NAME_REQUIRED`, `EMAIL_INVALID` (23514) |
| `platform_list_clans()` | chỉ quản trị nền tảng; dòng họ + email quản trị (cả đang chờ) |
| `platform_list_clan_admins(clan)`, `platform_add_clan_admin(clan, email)`, `platform_remove_clan_admin(kind, id)` | chỉ quản trị nền tảng; chỉ quản trị cấp dòng họ (không thấy người xem, không đọc cây) |
| `_grant_by_email(clan, tree, email, role)` | nội bộ, client không gọi được: email có tài khoản → upsert `memberships`, chưa có → upsert `invites`; trả `added`/`pending` |
| `member_invite`, `member_list`, `member_set_role`, `member_remove`, `invite_cancel` | chỉ quản trị cấp dòng họ (`require_clan_admin`, `FORBIDDEN` 42501), kể cả thành viên chỉ thuộc một cuốn; `member_list` trả email (đọc `auth.users`) |
| `link_create(clan, tree, days 1/7/30, code)`, `link_list`, `link_revoke` | chỉ quản trị cấp dòng họ; `link_create` trả mã link một lần |
| `link_peek(token)`, `link_accept(token, code)` | người đã đăng nhập; trả jsonb `status` (`ok`/`invalid`/`expired`/`revoked`/`locked`/`wrong_code`). `link_accept` **không raise** khi sai mã để giữ được bộ đếm lần sai (raise sẽ rollback) |
| `apply_tree_changes(tree, persons, parents, marriages)` | `security invoker`: ghi các dòng đã đổi trong một giao dịch, thứ tự khoá ngoại; RLS và trigger áp dụng nguyên |
| `ingest_proposals(source, items, provider, model)` | `security definer`, chỉ `service_role` (Edge Function): bỏ đề xuất chờ cũ của tư liệu (`superseded`), chèn đề xuất mới theo thứ tự AI trả về, đánh dấu tư liệu `done` |
| `review_proposal(proposal, decision, edited, note, result_person, changes, fields, children)` | `security invoker`, quản trị cuốn: nhận (gọi `apply_tree_changes` với `changes`, kèm `changes.also` = quan hệ đi cùng) hoặc bỏ; ghi `field_sources`; chèn đề xuất sửa trường khi gộp; nhận người thì quan hệ chờ trỏ đúng người, bỏ người thì quan hệ bỏ theo. Lỗi: `FORBIDDEN`, `NOT_PENDING`, `DECISION_INVALID` |

| Bảng | select | insert | update |
|---|---|---|---|
| `clans` | `clan_role` không null | không (qua `platform_create_clan`) | không |
| `trees` | `tree_role` không null | không (qua `create_tree`) | admin cuốn/dòng họ (`with check (true)` vì sau khi đặt `removed_at` thì `tree_role` null) |
| `persons` | `tree_role` không null | admin | admin |
| `parent_child`, `marriages` | thấy người liên quan | admin của cuốn chứa người | như insert |
| `memberships` | dòng của mình, hoặc admin dòng họ | admin dòng họ | admin dòng họ (có cả delete) |
| `platform_admins`, `invites`, `invite_links`, `sources`, `proposals`, `field_sources`, `audit_log` | không | không | không |

Quản trị nền tảng không có policy đọc gia phả: chỉ gọi được các hàm `platform_*` (ADR 0008, 0009). Người chỉ có vai trò ở một cuốn không đọc được dòng `clans` (policy cần vai trò cấp dòng họ), nên nhận link một cuốn thì app mở thẳng cuốn ấy. Supabase cấp sẵn `execute` cho `authenticated` trên hàm mới: hàm nội bộ phải `revoke` riêng. Lưu ý đã gặp: `INSERT … RETURNING` trên `trees` bị policy select chặn (hàm `tree_role` không thấy dòng vừa chèn trong cùng câu lệnh), nên cuốn chỉ tạo qua `create_tree`, không có policy insert trực tiếp.
