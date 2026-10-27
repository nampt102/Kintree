# Design

## Context

Hiện có (đọc từ repo, 2026-10-26): `apps/app` chỉ có `localStorageStore` qua giao diện `TreeStore` (`list/load/save`), `useTreeDoc` giữ `TreeDoc` trong bộ nhớ và gọi `save` sau mỗi `edit`; Playwright dùng `localStorage` để gieo dữ liệu. Schema (`supabase/migrations/20261026000000_init.sql`) đã có `clans`, `trees`, `persons`, `parent_child`, `marriages`, `memberships` (đúng một trong `clan_id`/`tree_id`), `sources`, `proposals`, `field_sources`, `audit_log`; RLS bật nhưng chưa có policy; chưa có cột `is_root`, `removed_at`, `removal_id`. `pnpm db:start` chỉ chạy container Postgres (loại trừ gotrue, kong, postgrest, mailpit…); `config.toml` có `[auth]` mặc định, `site_url` `http://127.0.0.1:3000`, `email_sent = 2`/giờ. Quyết định đã chốt: ADR 0003 (AI chỉ đề xuất), 0006 (gỡ = đánh dấu), 0007 (Google + email OTP, Supabase local, dữ liệu chỉ trên máy chủ). Lý do làm change: xem `proposal.md`.

## Goals / Non-Goals

**Goals:**
- Quyền do cơ sở dữ liệu cưỡng chế (RLS), giao diện chỉ ẩn nút cho đỡ rối; thử được bằng test SQL không cần trình duyệt.
- Giữ nguyên `packages/core` và toàn bộ luật sửa cây (hàm thuần); chỉ thay phần lưu.
- Mọi thứ chạy được trên máy phát triển bằng một lệnh `pnpm db:start`, không cần tài khoản dịch vụ ngoài (trừ nút Google).

**Non-Goals:**
- Lời mời, đổi vai trò trên giao diện, "Tôi là ai" (change `clan-invites`); vai trò biên tập (đã bỏ, thêm lại khi có nhu cầu); xoá/khôi phục dòng họ bởi quản trị nền tảng; thanh toán/gói dịch vụ.
- Realtime, giải quyết xung đột nhiều người cùng sửa một người, nhật ký thay đổi trên giao diện.
- Apple, Zalo, mật khẩu, xem offline, hosted Supabase, bảng `sources`/`proposals` (change AI).

## Decisions

### D1. Môi trường Supabase đầy đủ, một lệnh
- `db:start` chỉ loại các dịch vụ không cần: `realtime, storage-api, imgproxy, postgres-meta, studio, edge-runtime, logflare, vector, supavisor`; giữ `gotrue` (Auth), `kong` (cổng API), `postgrest` (REST), `mailpit` (hộp thư thử cho OTP, cổng 54324).
- `pnpm db:env` chạy `supabase status -o env` và ghi `apps/app/.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); khoá dịch vụ (`service_role`) **không** ghi vào tệp nào của app, chỉ bộ test đọc trực tiếp từ `supabase status` lúc chạy.
- `config.toml`: `site_url = "http://localhost:5173"` (+ `additional_redirect_urls` cho cổng 5173/5175 của test); `[auth.rate_limit] email_sent = 100` (chỉ máy phát triển, để test OTP không bị chặn); `enable_signup = true`; Google `enabled = false` kèm khối `client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"`/`secret` để bật bằng một dòng khi có khoá. Để `enabled = true` với khoá rỗng làm CLI từ chối khởi động, nên mặc định tắt.
- `.env.example` liệt kê `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AUTH_GOOGLE` (`1` để hiện nút Google), `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID/SECRET`.
- Rủi ro: lần đầu phải kéo thêm image (kong, postgrest, mailpit; gotrue đã có), vài trăm MB.

### D2. Đăng nhập
- `@supabase/supabase-js` một client dùng chung (`lib/supabase.ts`), `persistSession` mặc định (token nằm trong `localStorage` của Supabase; đây là phiên chứ không phải dữ liệu cây — spec "Không lưu cuốn trên thiết bị" chỉ cấm nội dung cây).
- Email OTP: `signInWithOtp({ email, options: { shouldCreateUser: true } })` rồi `verifyOtp({ email, token, type: 'email' })`, mã 6 số (`otp_length = 6`). Thay vì liên kết thần kỳ (magic link): trên điện thoại, link mở trình duyệt khác với app Capacitor làm mất phiên; mã nhập tay không có vấn đề đó và hợp người lớn tuổi.
- Google: `signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } })`, nút hiện khi `VITE_AUTH_GOOGLE === '1'`. Không thử được ở đây (cần khoá do chủ dự án tạo); phần này chỉ kiểm bằng đọc code và cấu hình.
- Gửi lại mã: khoá nút 30 giây phía giao diện (máy chủ cũng giới hạn qua `max_frequency`).
- Trạng thái phiên qua `onAuthStateChange`; đăng xuất gọi `signOut()`, xoá toàn bộ state dòng họ/cuốn trong bộ nhớ (đặt `key` của cây ứng dụng theo `user.id` để React huỷ hết state cũ).
- Back sau đăng xuất: dùng `history.replaceState` về màn đăng nhập và dọn mục lịch sử do `useBackToClose` đẩy.

### D3. Schema quyền (`supabase/migrations/<ts>_auth_access.sql`)
- Cột mới: `persons.is_root boolean not null default false` (+ chỉ mục duy nhất một thuỷ tổ đang hiện mỗi cuốn: `unique (tree_id) where is_root and removed_at is null`), `removed_at timestamptz`, `removal_id uuid` trên `persons`, `parent_child`, `marriages`; `trees.removed_at timestamptz`.
- Vai trò: `memberships` (một trong `clan_id`/`tree_id`), ràng buộc `role in ('admin','viewer')` (bỏ `editor`). Hàm SQL (`stable`, `security definer`, `search_path = ''` để dùng trong RLS mà không đệ quy):
  - `public.is_platform_admin() → boolean`: `auth.uid()` có trong `platform_admins`.
  - `public.clan_role(c uuid) → text`: vai trò của `auth.uid()` ở dòng họ `c` hoặc null.
  - `public.tree_role(t uuid) → text`: null nếu cuốn đã xoá (`trees.removed_at is not null`); ngược lại mức cao nhất giữa `clan_role(trees.clan_id)` và vai trò ở tầng cuốn (`admin > viewer`).
  - `public.role_rank(text) → int`.
- Bảng mới: `platform_admins(user_id pk → auth.users)` (RLS bật, không policy: chỉ chủ cơ sở dữ liệu / `service_role` ghi); `clan_admin_invites(email, clan_id, created_at)` (RLS bật, không policy; chỉ hàm `security definer` đụng tới).
- Chính sách (cho vai trò `authenticated`; `anon` không có gì):

| Bảng | select | insert | update | delete |
|---|---|---|---|---|
| `clans` | `clan_role(id)` không null | không (qua `platform_create_clan`) | không | không |
| `trees` | `tree_role(id)` không null | không trực tiếp: qua hàm `create_tree` (admin dòng họ; vì `INSERT … RETURNING` bị policy select chặn) | `tree_role(id) = admin` (tên, vùng, mô tả, `removed_at`) | không (xoá = đánh dấu) |
| `persons`, `parent_child`, `marriages` | `tree_role` không null | `tree_role = admin` | `tree_role = admin` | không (gỡ = đánh dấu, ADR 0006) |
| `memberships` | dòng của chính mình, hoặc admin dòng họ | admin dòng họ | admin dòng họ | admin dòng họ |
| `sources`, `proposals`, `field_sources`, `audit_log` | không (change sau) | không | không | không |

  `parent_child`/`marriages` suy `tree_id` qua người (`persons`), nên policy dùng `exists (select 1 from persons …)`; chỉ mục `persons(tree_id)` và `parent_child(child_id)` có sẵn. `update` trên `trees` có `with check` giữ nguyên `clan_id`. `select` của `trees` không trả cuốn đã xoá (qua `tree_role`).
- Quản trị nền tảng **không** có policy đọc `persons`, `trees`…: vai trò này chỉ gọi được hai hàm dưới đây (ít quyền nhất, Nghị định 13/2023).
- `public.platform_create_clan(p_name text, p_admin_email text) → clans` (`security definer`): từ chối nếu không phải `is_platform_admin()`; kiểm tên và email; sinh `slug` từ tên không dấu + hậu tố ngẫu nhiên 6 ký tự; chèn `clans`; nếu `auth.users` đã có email thì chèn `memberships(clan_id, admin)`, nếu chưa thì chèn `clan_admin_invites`. Trigger `after insert on auth.users` (hàm `handle_new_user`, `security definer`) đổi các `clan_admin_invites` khớp email (không phân biệt hoa thường) thành `memberships` rồi xoá lời mời đã dùng.
- `public.platform_list_clans() → table(id, name, slug, created_at, admin_emails text[])` (`security definer`, chỉ quản trị nền tảng): gộp email quản trị từ `memberships` + `clan_admin_invites`.
- Công cụ vận hành `scripts/promote-platform-admin.mjs <email>`: dùng khoá `service_role` (đọc từ `supabase status` hoặc biến môi trường) tạo người dùng nếu chưa có và ghi vào `platform_admins`; không bao giờ chạy trong trình duyệt.
- Nhận quyền: thu hồi `all` của `anon` và `public` trên mọi bảng/hàm, cấp lại đúng cho `authenticated`; hàm `platform_*` tự kiểm `is_platform_admin()`.
- Trigger toàn vẹn (`check_parent_child`, `check_marriage`) vốn chạy quyền người gọi và đọc `persons`: người ghi luôn là admin của cuốn nên đọc được, đúng ý; giữ `security invoker`. Trigger `audit_row` đã `security definer`.

### D4. Ghi nguyên tử theo dòng thay đổi (`apply_tree_changes`)
- Hàm `public.apply_tree_changes(p_tree jsonb, p_persons jsonb, p_parents jsonb, p_marriages jsonb) → void` (`security invoker`, nên RLS và trigger áp dụng nguyên): `insert … on conflict do update` cho `trees` (chỉ `name`, `description`, `region`, và chỉ khi admin; nếu không đổi thông tin cuốn thì `p_tree` = null), rồi `persons`, rồi `parent_child`, rồi `marriages` — đúng thứ tự khoá ngoại. Một lời gọi RPC = một giao dịch.
- Phía app so `TreeDoc` mới với bản đã lưu gần nhất (`savedRef`) để tìm dòng đổi (so sánh JSON từng phần tử theo `id`); dòng không đổi không gửi. Thay vì gửi cả cuốn: ghi đè người khác vừa sửa (spec "không đè nhau") và tốn băng thông.
- Đồng thời nhiều thiết bị cùng sửa **một** người: lần ghi sau thắng (cột `updated_at` cập nhật bởi trigger, chưa dùng để phát hiện xung đột). Giới hạn đã biết, ghi ở Risks.
- Lỗi PostgREST/Postgres → mã `StoreError`: `NOT_SIGNED_IN` (401), `FORBIDDEN` (RLS, 42501), `OFFLINE` (fetch lỗi), `SAVE_FAILED` (còn lại, kể cả lỗi từ trigger toàn vẹn — core đã chặn trước nên đây là lưới an toàn).

### D5. Lớp lưu phía app
- Giữ giao diện `TreeStore` nhưng mở rộng: `list(clanId)`, `load(treeId)`, `save(prev, next)`, thêm `ClanStore` (`listClans`, `createTree`, `updateTreeInfo`, `removeTree`) và `platformStore` (`listClans`, `createClan` qua hàm `platform_*`). Cuốn đã xoá đọc về rỗng → `StoreError` `NOT_FOUND`. Một file `lib/cloudStore.ts` cài cả hai; phần chuyển hàng↔`TreeDoc` là hàm thuần (`rowsToDoc`, `docToRows`, `diffDocs`) có test đơn vị, không đụng mạng.
- Ánh xạ: `PartialDate` ↔ 5 cột (`<x>_year/_month/_day/_lunar/_leap`); `siblingOrder` ↔ `sibling_order`; `isRoot` ↔ `is_root`; `removedAt/removalId` ↔ `removed_at/removal_id`; marriage `wifeOrder` ↔ `wife_order`.
- `useTreeDoc`: `edit(op)` chạy thao tác của core trên bản trong bộ nhớ, đặt state, đưa lần ghi vào hàng đợi tuần tự (một promise nối đuôi). Lỗi → huỷ các lần ghi còn trong hàng đợi, đặt lại state về `savedRef` (bản máy chủ xác nhận gần nhất), báo lỗi. Thay vì ghi chồng song song: lần ghi sau có thể thành công trên dữ liệu mà lần trước chưa vào.
- Xoá `localStorageStore`, `downloadRaw`, và nhánh `CORRUPT`; `downloadBackup` giữ.

### D6. Giao diện
- Ba tầng điều hướng: `AuthGate` → `ClanList` (người chưa có dòng họ thấy "chưa được cấp quyền"; quản trị nền tảng có thêm lối vào `PlatformScreen`) → `ClanScreen` (danh sách cuốn; tạo cuốn nếu admin dòng họ) → `TreeScreen`. `PlatformScreen`: danh sách dòng họ (`platform_list_clans`) và biểu mẫu tạo dòng họ + email quản trị (`platform_create_clan`).
- Sửa thông tin và xoá cuốn: "Sửa thông tin cuốn" và "Xoá cuốn" trong menu của cuốn (ở `ClanScreen` và `TreeScreen`), chỉ hiện khi vai trò là admin; xoá mở hộp thoại bắt gõ lại đúng tên cuốn (nút xoá chỉ bật khi khớp), ghi `removed_at = now()`. Dùng `useBackToClose` đã có cho mỗi tầng; `App` giữ `{clanId, treeId}`.
- Màn đăng nhập hai bước (email → mã), dùng thành phần `src/ui`; lỗi gắn vào ô và chuyển con trỏ (theo `app-ui-foundation`); hộp thư: tài khoản + đăng xuất trong `OverflowMenu` của `TopBar`.
- Nút theo vai trò: `canCreateTree = clanRole === 'admin'`; `TreeScreen` nhận `role` và ẩn mọi thao tác sửa khi `viewer` (sơ đồ chỉ xem, bảng thông tin chỉ có "Thu gọn", "Xem riêng nhánh", xem hồ sơ chỉ đọc); quyền thật vẫn do RLS.
- Theo ADR 0004: dùng `ui-ux-pro-max` cho màn mới, không tự đặt màu/cỡ ngoài token.

### D7. Kiểm thử
- **pgTAP** (`supabase/tests/access.test.sql`): mỗi scenario trong `clan-access` và `platform-admin` thành một test, chạy bằng cách `set local role authenticated` + `set local request.jwt.claims` giả người dùng; thêm test `platform_create_clan` (email có sẵn / chưa có → nhận quyền khi đăng ký), cuốn đã xoá không đọc được, `apply_tree_changes` (nguyên tử khi một dòng vi phạm trigger), và các trigger toàn vẹn vẫn đúng dưới RLS.
- **Vitest**: `rowsToDoc/docToRows/diffDocs` (vòng đổi qua lại giữ nguyên mọi trường kể cả `removedAt`), hàng đợi ghi và hoàn lại với kho giả.
- **Playwright** chạy với Supabase local đang bật: `global-setup` tạo người dùng thử và dòng họ bằng khoá `service_role` (đọc từ `supabase status`; chèn thẳng vì người dùng thường không có đường tạo), lấy phiên không cần mật khẩu (API quản trị `generateLink` sinh mã một lần, `verifyOtp` đổi lấy phiên) rồi đưa vào `localStorage` của trình duyệt; gieo dòng họ và cuốn mẫu thẳng bằng `service_role` (độc lập với mã đang được kiểm; `cloudStore` được kiểm bởi chính các test thao tác trên giao diện); mỗi test dùng dòng họ riêng (id ngẫu nhiên) để chạy song song không đụng nhau; xoá dữ liệu cuối bộ test. Riêng test đăng nhập OTP đọc mã từ API của Mailpit. Test ghi lỗi dùng `page.route` chặn `/rest/v1/rpc/apply_tree_changes`.
- Thay vì mock Supabase ở trình duyệt: mock không chứng minh RLS và trigger hoạt động.

## Risks / Trade-offs

- **R1.** Mở cây cần mạng và đăng nhập, mâu thuẫn "xem offline" trong PRD/ADR 0001 (giảm rủi ro Apple 4.2). → Đã ghi ở ADR 0007; quyết định lại khi làm bản iOS (bộ nhớ đệm chỉ đọc).
- **R2.** Hai người sửa cùng một người, lần ghi sau đè lần trước không báo. → Chấp nhận ở bước này (người dùng ít, thường một biên tập chính); dùng `updated_at` để phát hiện và hỏi ở change sau (cùng realtime/nhật ký).
- **R3.** RLS dựa vào `tree_role()` đọc `memberships`, `trees` mỗi dòng: có thể chậm với cuốn nghìn người. → Hàm `stable` + chỉ mục; đo thời gian mở cuốn 1.000 người và ghi vào KB; nếu chậm, đưa `tree_id` vào `parent_child`/`marriages` để bỏ phép nối.
- **R4.** Google chỉ cấu hình, chưa thử được. → Ghi rõ trong báo cáo và KB; thử khi chủ dự án cung cấp OAuth client.
- **R5.** E2E cần Docker và Supabase đang chạy; CI chưa có. → Ghi yêu cầu ở `kb/tech-stack.md`; CI để change sau.
- **R6.** Khoá `service_role` rò vào repo/app. → Chỉ đọc lúc chạy test từ `supabase status`, không ghi tệp; `.env.local` chỉ chứa khoá `anon`; có test grep không có chuỗi `service_role` trong `apps/app/src` và `dist`.
- **R9.** Đóng cổng tạo dòng họ: khách hàng mới phải qua nhà vận hành (có thể thành nút thắt). → Công cụ `promote-platform-admin` chạy bằng khoá `service_role`, khôi phục được khi mất quản trị nền tảng; ghi quy trình vào KB.
- **R7.** Người dùng đăng nhập lần đầu nhận mã qua email thật ở môi trường hosted sau này cần SMTP. → Ngoài phạm vi (chỉ local/Mailpit).
- **R8.** Thông tin cá nhân người sống lưu trên máy chủ (Nghị định 13/2023). → Chưa có chính sách/đồng ý; ghi ở rủi ro mở dự án, cần xử lý trước khi ra mắt công khai.

## Migration Plan

- Dữ liệu cục bộ cũ (`kintree:*` trong `localStorage`) bị bỏ theo ADR 0007; app không cố đọc hay xoá chúng (người dùng thử có thể xoá tay). Không có dữ liệu thật cần chuyển.
- Migration mới chỉ thêm cột/hàm/policy; không đổi dữ liệu có sẵn; hoàn lại bằng `pnpm db:reset`.

## Open Questions

- Quản trị nền tảng có cần xoá/khôi phục dòng họ và đổi quản trị đầu tiên ngay không? Hiện chưa (ngoài phạm vi); làm bằng công cụ vận hành khi có nhu cầu, không đổi thiết kế.
