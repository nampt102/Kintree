# Design

## Context
Lý do làm: xem `proposal.md`. Hành vi bắt buộc: xem `specs/clan-membership` và `specs/platform-admin`.

Hiện trạng ở `supabase/migrations/20261027000000_auth_access.sql`:

**Bảng `memberships`**
- Cột `user_id`, cùng đúng một trong hai `clan_id` / `tree_id`, và `role` thuộc `admin` / `viewer`.
- Ràng buộc `unique nulls not distinct (user_id, clan_id, tree_id)`.
- Policy cho quản trị dòng họ đọc, ghi và xoá mọi dòng của dòng họ (hàm `membership_clan`).
- Hiện chưa có gì chặn việc gỡ quản trị cuối cùng.

**Bảng `clan_admin_invites (email, clan_id)`**
- Chỉ dùng cho quản trị đầu tiên do `platform_create_clan` tạo.
- Trigger `handle_new_user` đổi các dòng này thành membership admin khi người dùng đăng ký.

**Email của thành viên**
- `memberships` không có cột email; client không đọc được `auth.users`.
- Vì vậy mọi chỗ cần email phải đi qua RPC security definer, giống `platform_list_clans`.

**App không có router**
- Điều hướng hoàn toàn bằng state trong `App.tsx`.
- Đăng nhập Google gọi `signInWithOAuth({ redirectTo: location.origin })`, nên mất phần hash của địa chỉ.
- Đăng nhập bằng mã email (OTP) ở nguyên trang, không đổi địa chỉ.

**Hạ tầng sẵn có**
- `pgcrypto` đã cài sẵn trong schema `extensions`, gồm `digest`, `crypt`, `gen_salt` và `gen_random_bytes`.
- Hook an toàn của dự án chặn code có chữ "password", nên mật khẩu link gọi là **mã mời**: cột `code_hash`, tham số `p_code`.

## Goals / Non-Goals

**Goals**
- Mọi quy tắc quyền nằm ở cơ sở dữ liệu: RPC kiểm quyền, trigger giữ quản trị cuối. Giao diện chỉ ẩn nút.
- Một cơ chế lời mời email dùng chung cho quản trị dòng họ và quản trị nền tảng.
- Giữ nguyên các policy hiện có của `memberships`.

**Non-Goals**
- Không làm Edge Function, không gửi thư.
- Không cho quản trị cấp cuốn quản lý thành viên (ADR 0009).
- Không có trang tách riêng cho link mời ngoài app: link mở chính app.

## Decisions

### D1. Bảng `invites` thay `clan_admin_invites`
`invites(id, email, clan_id, tree_id, role, created_by, created_at)`:
- `check (num_nonnulls(clan_id, tree_id) = 1)`, giống `memberships`.
- `email = lower(email)`.
- `unique nulls not distinct (email, clan_id, tree_id)`.
- Bật RLS và không có policy nào: chỉ RPC chạm vào bảng.

Migration mới:
1. Chép mọi dòng của `clan_admin_invites` sang `invites` với `role = 'admin'`.
2. Xoá bảng cũ.
3. Thay `handle_new_user`: chèn membership theo đúng vai trò và phạm vi của từng lời mời, `on conflict` thì nâng vai trò nếu cao hơn, rồi xoá các lời mời của email đó.

`platform_create_clan` và `platform_list_clans` đọc và ghi sang bảng mới. Kết quả trả về không đổi.

*Phương án đã cân nhắc:* thêm cột vào `clan_admin_invites`. Bỏ vì tên bảng sẽ sai nghĩa (không chỉ cho quản trị nữa), và sửa migration cũ thì phá DB đã chạy.

### D2. RPC cho quản trị dòng họ
Mọi hàm là security definer, `search_path = ''`, và mở đầu bằng `if public.clan_role(v_clan) is distinct from 'admin' then raise 'FORBIDDEN'`.

**`member_invite(p_clan, p_tree, p_email, p_role)`**
- Kiểm cuốn `p_tree` thuộc `p_clan` và chưa bị xoá.
- Email đã có tài khoản: upsert vào `memberships` (đổi vai trò khi trùng phạm vi).
- Email chưa có tài khoản: upsert vào `invites`.
- Trả về `status`:
  - `'added'` hoặc `'pending'`: dùng để giao diện hiện trạng thái.
  - Lộ việc email có tài khoản hay không, nhưng chỉ cho quản trị dòng họ. Chấp nhận, xem Rủi ro.

**`member_list(p_clan)`**
- Trả về `(kind 'member'|'invite', id, email, role, tree_id, tree_name)`.
- Gộp `memberships` (join `auth.users` lấy email) với `invites` của dòng họ và của các cuốn chưa xoá.

**`member_set_role(p_membership, p_role)`, `member_remove(p_membership)`, `invite_cancel(p_invite)`**
- Lấy dòng họ của bản ghi qua `membership_clan`, kiểm quyền như trên.

Không cho client ghi thẳng bảng cho các việc này, vì cần email và kiểm phạm vi cuốn. Giữ nguyên các policy ghi `memberships` hiện có: trigger D4 vẫn bảo vệ, và bỏ policy thì không có lợi gì thêm.

### D3. RPC cho quản trị nền tảng
**`platform_list_clan_admins(p_clan)`**
- Trả về `(kind, id, email)`.
- Chỉ gồm membership admin cấp dòng họ và lời mời admin cấp dòng họ.

**`platform_add_clan_admin(p_clan, p_email)`**
- Cùng logic với `member_invite(p_clan, null, p_email, 'admin')`. Phần dùng chung tách thành hàm nội bộ `_grant_by_email`, không cấp quyền execute cho client.

**`platform_remove_clan_admin(p_kind, p_id)`**
- Chỉ nhận membership admin hoặc lời mời admin cấp dòng họ.
- Không đụng được tới người xem hay quyền cấp cuốn.

Cả ba hàm đều mở đầu bằng `is_platform_admin()`. Đây là phần mở rộng ADR 0008, được ghi lại ở ADR 0009.

### D4. Trigger giữ quản trị cuối
`memberships_keep_last_admin` chạy `before update or delete` trên `memberships`.

Trigger chặn khi đồng thời:
- dòng cũ là `role = 'admin'` cấp dòng họ,
- và dòng mới không còn là admin (hoặc dòng bị xoá),
- và không còn membership admin cấp dòng họ nào khác của dòng họ đó.

Khi chặn, trigger `raise 'LAST_ADMIN'` (errcode `23514`).

Đặt ở trigger thay vì trong RPC, để chặn cả đường ghi thẳng qua policy, quản trị nền tảng và mọi hàm sau này.

Lời mời admin đang chờ **không** tính là quản trị còn lại, vì người được mời có thể không bao giờ đăng nhập.

Ngoại lệ: khi xoá cả dòng họ (`on delete cascade` từ `clans`) thì trigger phải cho qua. Cách làm: chỉ chặn khi dòng họ vẫn còn tồn tại. Phần xoá dòng họ chưa có giao diện, nhưng nhà vận hành có thể xoá bằng SQL.

### D5. Link mời
**Bảng `invite_links`**
- Cột: `id`, `clan_id`, `tree_id`, `token_hash bytea unique`, `code_hash text null`, `expires_at`, `revoked_at`, `failed_attempts int`, `locked_until`, `accepted_count int`, `created_by`, `created_at`.
- Không có cột `role`: link luôn cấp vai trò xem (spec).
- Bật RLS, không có policy.

**Mã link**
- `encode(extensions.gen_random_bytes(24), 'base64')`, chuyển sang dạng an toàn cho URL. Khoảng 192 bit, không đoán được.
- Chỉ lưu `digest(token, 'sha256')`; mã gốc chỉ trả về một lần lúc tạo. Mất link thì tạo link mới.
- Mã mời (nếu có) lưu bằng `crypt(code, gen_salt('bf'))`.

**RPC**
- `link_create(p_clan, p_tree, p_days in (1,7,30), p_code)`: trả về `token`.
- `link_list(p_clan)`: trả về phạm vi, hạn, `has_code`, `accepted_count`, trạng thái.
- `link_revoke(p_link)`.
- `link_peek(p_token)`: người đã đăng nhập xem trước tên dòng họ, tên cuốn, `has_code` và trạng thái (`ok`, `expired`, `revoked`, `locked`, `invalid`). Không đọc được dữ liệu cây.
- `link_accept(p_token, p_code)`: trả về `(status, clan_id)`.

**Khoá khi sai mã: `link_accept` trả mã trạng thái, không `raise`.**
- Nếu `raise` khi sai mã thì giao dịch rollback, và phép tăng `failed_attempts` mất theo, nên link không bao giờ bị khoá.
- Vì vậy hàm tự cập nhật bộ đếm rồi `return 'wrong_code'`. Khi đủ 5 lần thì đặt `locked_until = now() + 15 phút`, xoá bộ đếm về 0 và trả `'locked'`.
- Nhập đúng mã thì xoá bộ đếm về 0.
- Thứ tự kiểm tra: `invalid` → `revoked` → `expired` → `locked` → mã sai → nhận.

**Nhận lời mời:** chèn `memberships(viewer)` ở phạm vi của link, `on conflict do nothing`.
- Ràng buộc unique là theo đúng phạm vi, nên người đã là admin ở phạm vi đó vẫn giữ admin.
- Người là admin cấp dòng họ mà nhận link của một cuốn sẽ có thêm dòng viewer ở cuốn đó. Vô hại, vì `tree_role` lấy vai trò cao nhất.
- Chỉ tăng `accepted_count` khi thực sự chèn được dòng mới.

*Phương án đã cân nhắc:* lưu mã link dạng rõ để hiện lại được. Bỏ vì ai đọc được bảng là có link mời của mọi dòng họ.

### D6. Mang mã link qua bước đăng nhập
**Dạng link:** `https://<app>/#invite=<token>`. Phần sau `#` không được gửi lên máy chủ web hay ghi vào log.

**Đọc mã khi khởi động** (`App.tsx`, chạy trước `AuthGate`):
1. Đọc `location.hash`.
2. Lưu mã vào `sessionStorage['kt-invite']`.
3. Xoá hash bằng `history.replaceState`.

**Mã còn qua được cả hai cách đăng nhập**
- `sessionStorage` vẫn còn khi tab đó được chuyển hướng sang Google rồi quay về `location.origin`.
- Đăng nhập bằng mã OTP không rời trang nên không mất gì.

**Sau đăng nhập:** khi `Home` gắn vào và trong `sessionStorage` có mã, hiện màn `AcceptInvite`:
- gọi `link_peek` để xem trước;
- người dùng bấm nhận thì gọi `link_accept`;
- xoá mã khỏi `sessionStorage` khi nhận xong, khi link lỗi hẳn (`invalid`, `revoked`, `expired`), hoặc khi người dùng bấm "Bỏ qua";
- nhận xong thì tải lại danh mục và mở dòng họ.

**Màn đăng nhập:** khi có mã đang chờ, hiện dòng "Đăng nhập để nhận lời mời vào dòng họ". Không có tên dòng họ ở đây, vì `link_peek` yêu cầu đã đăng nhập; như vậy người lạ cầm link không biết được tên dòng họ.

*Phương án đã cân nhắc:* thêm React Router với đường dẫn `/join/:token`. Bỏ, vì thêm một thư viện chỉ cho một đường dẫn, đường dẫn bị ghi vào log máy chủ, và Capacitor cần cấu hình riêng cho deep link.

### D7. Giao diện
Theo `kb/design-system.md` và skill `ui-ux-pro-max` (ADR 0004). **Bản mẫu HTML được duyệt trước** rồi mới code.

**`MembersScreen`** (quản trị dòng họ)
- Lối vào: số "N thành viên" trên khối tiêu đề đỏ (đổi thành nút), và mục "Thành viên" trong `AppRail`.
- `PageHeader` và một nút chính "Mời người".
- `Segmented`: "Thành viên" / "Link mời".
- Danh sách nhóm theo phạm vi ("Cả dòng họ", rồi từng cuốn). Mỗi dòng gồm Avatar, email, `Badge` vai trò, chữ "chờ đăng nhập", và menu "⋯" (đổi vai trò, gỡ, huỷ lời mời).

**`InviteDialog`**
- Các ô: email, vai trò, phạm vi.
- Sau khi mời: hiện trạng thái và nút "Sao chép lời nhắn".

**`LinkDialog`**
- Các ô: phạm vi, hạn, mã mời tuỳ chọn.
- Sau khi tạo: hiện link một lần, với nút "Sao chép link" và "Chia sẻ" (`navigator.share` nếu có).

**`PlatformScreen`**
- Thẻ dòng họ thành `CardButton`, bấm vào mở `Dialog` chi tiết: danh sách quản trị, ô thêm email, nút gỡ.

**`AcceptInvite`**
- Thẻ giữa màn: tên dòng họ / cuốn, ô mã mời nếu cần, nút chính "Nhận lời mời", và "Bỏ qua".

**Báo lỗi**
- Thêm vào `lib/messages.ts` các mã: `LAST_ADMIN`, `LINK_EXPIRED`, `LINK_REVOKED`, `LINK_LOCKED`, `LINK_INVALID`, `WRONG_CODE`.

### D8. Kiểm thử
**pgTAP** (`supabase/tests/members.test.sql`)
- Quyền: quản trị cuốn, người xem và dòng họ khác đều bị từ chối.
- Mời email trong cả hai trường hợp (có / chưa có tài khoản); mời lại thì không trùng.
- `handle_new_user` cho lời mời cấp cuốn.
- Giữ quản trị cuối, gồm cả trường hợp quản trị nền tảng gỡ và trường hợp xoá dòng họ cascade.
- Link:
  - hết hạn, thu hồi, mã không tồn tại;
  - **sai mã 5 lần thì khoá, nhập đúng trong lúc khoá vẫn bị chặn, hết khoá thì nhận được**;
  - không tạo được link admin;
  - admin nhận link vẫn giữ admin.
- Các hàm `platform_*` mới, và việc người dùng thường gọi chúng.

Sửa `access.test.sql` cho chỗ đang dùng `clan_admin_invites`.

**Playwright**
- `members.spec.ts`: mời, đổi vai trò, gỡ, quản trị cuối.
- `invite-link.spec.ts`:
  - tạo link rồi người khác nhận;
  - **mở link khi chưa đăng nhập → đăng nhập OTP → vào màn nhận**;
  - link hết hạn hoặc thu hồi.
- `platform.spec.ts`: thêm và gỡ quản trị.
- `layout.spec.ts`: thêm các màn mới vào kiểm tra vùng chạm và cuộn ngang.

Luồng Google qua đường chuyển hướng chỉ kiểm tay (e2e đặt `VITE_AUTH_GOOGLE=''`).

## Risks / Trade-offs
- **[Lộ việc email đã có tài khoản]** `member_invite` trả `added` hoặc `pending`, nên quản trị dòng họ biết được một email đã đăng ký Kintree hay chưa. → Chỉ quản trị dòng họ gọi được, và họ vốn đang mời người quen. Chấp nhận, ghi vào ADR 0009.
- **[Khoá link theo link, không theo người]** Kẻ có link có thể cố tình nhập sai để khoá link với mọi người. → Khoá chỉ 15 phút, và quản trị tạo link mới được. Chưa đếm theo người, vì Supabase không cho biết IP trong RPC.
- **[Link bị chuyển tiếp]** Link xem không mã ai có cũng vào được. → Có hạn dùng, có mã tuỳ chọn, thu hồi được, và số người đã nhận hiện trong danh sách. Link không bao giờ cấp quyền quản trị.
- **[Mất link]** Không hiện lại được link cũ. → Giao diện nói rõ "chỉ hiện một lần", có nút tạo link mới.
- **[Không gửi thư]** Người được mời bằng email không biết mình được mời. → Có nút sao chép lời nhắn. Gửi thư tự động để change sau, khi có Edge Function và SMTP hosted.
- **[Quản trị nền tảng lỡ gỡ nhầm quản trị]** → Có hộp xác nhận; trigger giữ quản trị cuối.

## Migration Plan
1. Migration `20261028000000_clan_invites.sql`: tạo `invites` và chép dữ liệu, xoá `clan_admin_invites`, rồi tạo trigger, RPC và `invite_links`.
2. Chạy được trên DB local đã có dữ liệu. `pnpm db:reset` chạy lại toàn bộ từ đầu.
3. Rollback: chưa có môi trường hosted, nên rollback bằng `db:reset` về commit trước.

## Open Questions
- Hạn dùng 1/7/30 ngày và thời gian khoá 15 phút là số tạm. Chủ dự án có thể đổi khi duyệt bản mẫu; đổi chỉ là đổi hằng số, không ảnh hưởng spec.

## Kết luận duyệt bản mẫu (2026-10-27)
- Chủ dự án duyệt `mockup.html` (A–F) không sửa; giữ số mặc định: hạn link 1/7/30 ngày, khoá 15 phút sau 5 lần sai.
- Sai mã mời chỉ báo "Mã mời không đúng", không hiện số lần còn lại (máy chủ không trả, đỡ lộ thông tin).
- Chưa làm ô tìm theo email ở màn Thành viên: thêm khi dòng họ đông người.
- Lời nhắn soạn sẵn dùng đúng câu trong bản mẫu (mục C).
