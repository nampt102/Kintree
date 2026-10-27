# Tasks

## 1. Môi trường Supabase đầy đủ

- [x] 1.1 Sửa `db:start` (giữ gotrue, kong, postgrest, mailpit; loại phần còn lại), thêm `db:env` ghi `apps/app/.env.local` từ `supabase status -o env`, thêm `.env.example`, đưa `.env.local` vào `.gitignore`; kiểm: `pnpm db:start` rồi `curl <API>/auth/v1/health` trả 200 và `.env.local` có URL + khoá anon, không có `service_role`
- [x] 1.2 `supabase/config.toml`: `site_url` và `additional_redirect_urls` cho cổng 5173/5175, `email_sent = 100`, khối Google (`enabled = false`, khoá lấy từ biến môi trường); kiểm: `pnpm db:reset` chạy lại không lỗi và gửi thử `signInWithOtp` thấy thư trong Mailpit (API `/api/v1/messages`)

## 2. Schema quyền và hàm (`clan-access`, `tree-storage`)

- [x] 2.1 Migration `<ts>_auth_access.sql`: cột `is_root`, `removed_at`, `removal_id`, `trees.removed_at`; chỉ mục thuỷ tổ duy nhất; ràng buộc `memberships.role in ('admin','viewer')`; bảng `platform_admins`, `clan_admin_invites`; `role_rank`, `is_platform_admin`, `clan_role`, `tree_role` (null khi cuốn đã xoá); thu hồi quyền `anon`/`public`; kiểm: `pnpm db:reset` chạy không lỗi, `\d persons` và `\d trees` có cột mới
- [x] 2.2 Chính sách RLS theo bảng trong design D3 (chỉ admin ghi, không policy delete, quản trị nền tảng không đọc dữ liệu gia phả); kiểm: test pgTAP "Người xem sửa", "Quản trị ở tầng dòng họ", "Quản trị của đúng cuốn", "Gán vai trò biên tập", "Tự tạo dòng họ", "Người xem" (tạo cuốn), "Quản trị của một cuốn tạo cuốn mới", "Người xem muốn xoá", "Sửa tên cuốn", "Xoá cuốn" (sau xoá không đọc được người), "Đoán mã của dòng họ khác", "Người chỉ có quyền một cuốn", "Tự nâng quyền", người chưa đăng nhập qua
- [x] 2.3 Hàm `platform_create_clan`, `platform_list_clans` và trigger `handle_new_user` trên `auth.users`; kiểm: test pgTAP "Email đã có tài khoản", "Email chưa có tài khoản" (chèn `auth.users` rồi thấy membership admin), "Thiếu tên hoặc email sai", "Trùng tên", "Danh sách vận hành", "Truy vấn cuốn của khách", "Người dùng thường gọi lệnh tạo dòng họ", "Tự cấp quyền" qua
- [x] 2.4 Hàm `apply_tree_changes` (nguyên tử, đúng thứ tự khoá ngoại, từ chối khi không phải admin của cuốn); kiểm: test pgTAP "Thêm con kèm quan hệ" (đủ ba dòng), "một dòng vi phạm trigger thì không dòng nào được ghi", người xem gọi thì bị từ chối; `pnpm db:test` qua toàn bộ (gồm các test cũ)
- [x] 2.5 Công cụ `scripts/promote-platform-admin.mjs <email>` (khoá `service_role` từ biến môi trường hoặc `supabase status`, tạo người dùng nếu chưa có, ghi `platform_admins`, không in khoá) và script `pnpm admin:promote`; kiểm: chạy trên Supabase local với một email rồi `select` thấy dòng trong `platform_admins` ("Cấp bằng công cụ vận hành")
- [x] 2.6 Cập nhật `openspec/kb/data-model.md` (cột mới, bảng, hàm, bảng chính sách, quy trình cấp quản trị nền tảng); kiểm: mọi bảng, hàm và policy trong migration có mặt trong KB

## 3. Lớp dữ liệu phía app

- [x] 3.1 Cài `@supabase/supabase-js`, `lib/supabase.ts` (client, đọc `VITE_*`, báo rõ khi thiếu cấu hình); kiểm: `pnpm --filter app build` qua và mở app thiếu `.env.local` hiện hướng dẫn chạy `pnpm db:env`
- [x] 3.2 `lib/cloudStore.ts`: `rowsToDoc`, `docToRows`, `diffDocs` (hàm thuần) và test Vitest vòng đổi qua lại giữ mọi trường kể cả ngày không đầy đủ, `removedAt`/`removalId`, thứ tự anh chị em/vợ chồng; kiểm: test qua và `diffDocs` chỉ trả đúng dòng đổi
- [x] 3.3 `cloudStore` cài `ClanStore` + `TreeStore` (`listClans`, `listTrees`, `createTree`, `updateTreeInfo`, `removeTree`, `load` (cuốn đã xoá → `NOT_FOUND`), `save` qua `apply_tree_changes`) và `platformStore` (`listClans`, `createClan` qua hàm `platform_*`) và ánh xạ lỗi sang `StoreError` (`NOT_SIGNED_IN`, `FORBIDDEN`, `NOT_FOUND`, `OFFLINE`, `SAVE_FAILED`) trong `messages.ts`; kiểm: test Vitest với client giả cho từng mã lỗi, và test tích hợp đọc/ghi thật trong nhóm 6
- [x] 3.4 `useTreeDoc`: hàng đợi ghi tuần tự, hoàn lại về bản đã lưu khi lỗi và huỷ các lần ghi chờ; xoá `localStorageStore`, `downloadRaw`, nhánh `CORRUPT`; kiểm: test Vitest "Hai thao tác liền nhau" (đúng thứ tự) và "Ghi lỗi thì hoàn lại" (lần sau không ghi trên nền sai)

## 4. Đăng nhập (`user-auth`)

- [x] 4.1 `auth.tsx` (`AuthProvider`, `useAuth`, theo dõi phiên) và cổng đăng nhập: chưa có phiên thì không dựng và không tải bất kỳ màn dữ liệu nào; kiểm: test Playwright "Mở app lần đầu" và "Phiên hết hạn"
- [x] 4.2 Màn đăng nhập email → mã 6 số bằng thành phần `src/ui` (kiểm email phía giao diện, lỗi gắn ô và chuyển con trỏ, gửi lại mã khoá 30 giây, nút Google khi `VITE_AUTH_GOOGLE=1`); kiểm: test Playwright "Đăng nhập thành công" (mã đọc từ Mailpit), "Mã sai", "Email không hợp lệ", "Gửi lại mã", "Chưa cấu hình Google"
- [x] 4.3 Menu tài khoản (email, đăng xuất) ở màn danh sách dòng họ; đăng xuất xoá state và dọn lịch sử; kiểm: test Playwright "Tải lại trang", "Đăng xuất", "Nhiều tài khoản", và test không còn tên người hay nội dung cuốn trong `localStorage`/`sessionStorage`/IndexedDB sau khi đăng xuất

## 5. Dòng họ và cuốn trên giao diện (`clan-access`)

- [x] 5.1 `ClanList` (danh sách có vai trò, không có nút tạo dòng họ; chưa thuộc dòng họ nào thì hiện "chưa được cấp quyền" + đăng xuất) và `ClanScreen` (danh sách cuốn, tạo cuốn chỉ hiện cho quản trị dòng họ, đổi `TreeList` hiện có); kiểm: test Playwright "Tài khoản mới", "Chưa được cấp quyền", "Thấy đúng dòng họ của mình", "Người xem" (không có nút tạo cuốn)
- [x] 5.2 Truyền `role` xuống `TreeScreen`: người xem không thấy thao tác sửa (bảng thông tin chỉ còn Thu gọn/Xem riêng nhánh và hồ sơ chỉ đọc, ẩn nút quanh khung và "Thêm thuỷ tổ"); kiểm: test Playwright "Người xem sửa" qua giao diện (không có nút) và qua API (RLS từ chối)
- [x] 5.3 Hộp thoại "Sửa thông tin cuốn" và "Xoá cuốn" (gõ lại đúng tên mới bật nút, ghi `removed_at`) trong menu cuốn ở `ClanScreen` và `TreeScreen`, chỉ hiện với admin; kiểm: test Playwright "Sửa tên cuốn", "Xoá cuốn", "Gõ sai tên", "Người xem muốn xoá" (không có mục), "Mở cuốn đã xoá bằng mã"
- [x] 5.4 `PlatformScreen` (danh sách dòng họ đã cấp + biểu mẫu tên dòng họ và email quản trị, lỗi gắn ô), lối vào chỉ hiện khi `is_platform_admin()`; kiểm: test Playwright quản trị nền tảng tạo dòng họ cho email mới, email ấy đăng nhập thì thấy dòng họ với vai trò quản trị; người dùng thường không thấy lối vào và mở thẳng đường dẫn bị đưa về
- [x] 5.5 Điều hướng ba tầng với nút Back (dòng họ → cuốn → cây) và thông báo lỗi tiếng Việt cho mọi mã `StoreError`; kiểm: test Playwright Back qua từng tầng

## 6. Kiểm thử đầu cuối với Supabase local (`tree-storage`)

- [x] 6.1 `e2e/global-setup.ts` + `fixtures.ts`: tạo người dùng thử (quản trị dòng họ, người xem, quản trị nền tảng), dòng họ và cuốn mẫu bằng khoá `service_role` chỉ trong tiến trình test (không mật khẩu: lấy phiên bằng `generateLink` + `verifyOtp`), đưa phiên vào `localStorage`, dọn dữ liệu cuối; chuyển 26 test hiện có sang cách này; kiểm: `pnpm --filter app e2e` qua đủ như trước (26 qua, 1 bỏ qua)
- [x] 6.2 Test `tree-storage`: "Mở trên thiết bị khác" (hai ngữ cảnh trình duyệt), "Cuốn đã gỡ người", "Sửa một người" (chỉ một dòng được gửi, đo bằng chặn yêu cầu), "Thêm con kèm quan hệ", "Hai thiết bị, hai người", "Mất mạng khi sửa" và "Bị từ chối vì quyền" (hoàn lại + thông báo), "Hai thao tác liền nhau", "Tải bản sao"; kiểm: tất cả qua, chạy 3 lần liên tiếp không lần nào hỏng
- [x] 6.3 Test an ninh: không có chuỗi `service_role` trong `apps/app/src` và `dist`; người dùng B không đọc được dòng họ của A qua REST; người xem và người chưa được cấp quyền gọi REST/RPC ghi đều bị từ chối; kiểm: test qua

## 7. Tài liệu và kiểm tổng

- [x] 7.1 Cập nhật `openspec/kb/tech-stack.md` (chạy Supabase đầy đủ, `.env.local`, Mailpit, chạy e2e cần Docker, bật Google, cấp quản trị nền tảng bằng `pnpm admin:promote`), `openspec/kb/design-system.md` nếu thêm thành phần, `openspec/status.md`, và ADR 0007 (ghi phần đã làm); kiểm: làm theo tài liệu trên máy sạch (`db:start` → `db:env` → `pnpm dev`) vào được màn đăng nhập
- [x] 7.2 Chạy `pnpm test`, `pnpm db:test`, `pnpm --filter app e2e` (3 lần), `pnpm --filter app build`, `openspec validate cloud-auth-storage --strict`; kiểm: tất cả qua

## Workflow follow-up

- Chủ dự án tạo Google OAuth client, đặt `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID/SECRET`, bật `[auth.external.google]` và `VITE_AUTH_GOOGLE=1`, rồi thử đăng nhập Google (chưa kiểm được ở change này).
- Kiểm tay trên iPhone/máy gập thật cho màn đăng nhập mới (bàn phím ảo, ô mã 6 số, chế độ tự điền mã từ tin nhắn).
- Cập nhật `openspec/status.md` bằng skill `project-sync`; hỏi người dùng trước khi archive.
- Change tiếp theo: `clan-invites`.
