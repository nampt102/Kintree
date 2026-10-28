# Tasks

## 1. Cơ sở dữ liệu

- [x] 1.1 Viết migration `20261028000000_clan_invites.sql`:
  - tạo bảng `invites` và chép dữ liệu từ `clan_admin_invites` rồi xoá bảng cũ;
  - viết lại `handle_new_user` theo vai trò và phạm vi của lời mời;
  - sửa `platform_create_clan` và `platform_list_clans` sang bảng mới.

  Kiểm: `pnpm db:reset` chạy sạch; pgTAP cũ (64) qua sau khi sửa `access.test.sql`.
- [x] 1.2 Thêm trigger `memberships_keep_last_admin` (design D4). Kiểm bằng pgTAP:
  - tự hạ quyền hoặc tự gỡ khi là quản trị duy nhất thì bị chặn;
  - còn quản trị khác thì gỡ được;
  - xoá dòng họ (cascade) không bị chặn.
- [x] 1.3 Viết RPC `member_invite`, `member_list`, `member_set_role`, `member_remove`, `invite_cancel` và hàm nội bộ `_grant_by_email`. Kiểm bằng pgTAP:
  - quản trị cuốn, người xem và quản trị dòng họ khác đều bị từ chối;
  - email có tài khoản thì có quyền ngay, chưa có thì nằm chờ;
  - mời lại thì đổi vai trò, không thêm dòng mới;
  - lời mời cấp cuốn thành quyền khi người được mời đăng ký;
  - thành viên của cuốn đã xoá không hiện trong danh sách.
- [x] 1.4 Viết RPC `platform_list_clan_admins`, `platform_add_clan_admin`, `platform_remove_clan_admin`. Kiểm bằng pgTAP:
  - chỉ trả quản trị cấp dòng họ, không trả người xem;
  - người dùng thường bị từ chối;
  - gỡ quản trị cuối thì bị chặn.
- [x] 1.5 Tạo bảng `invite_links` và RPC `link_create`, `link_list`, `link_revoke`, `link_peek`, `link_accept`. `link_accept` trả mã trạng thái, không `raise`. Kiểm bằng pgTAP:
  - link hết hạn, đã thu hồi, mã không tồn tại;
  - sai mã 5 lần thì khoá, nhập đúng lúc đang khoá vẫn bị chặn, hết khoá thì nhận được;
  - không tạo được link quản trị;
  - quản trị nhận link vẫn giữ quyền quản trị;
  - `accepted_count` chỉ tăng khi có dòng mới.

## 2. Lớp dữ liệu app

- [x] 2.1 Thêm `memberStore` (thành viên, lời mời, link) vào `lib/cloudStore.ts` và mở rộng `platformStore`. Thêm các mã lỗi mới vào `lib/messages.ts`. Kiểm bằng Vitest: ánh xạ đủ mọi mã trạng thái của `link_accept` và lỗi `LAST_ADMIN`.
- [x] 2.2 Đọc `#invite=` khi app khởi động: lưu vào `sessionStorage`, xoá hash, giữ qua bước đăng nhập (design D6). Kiểm bằng Vitest cho hàm đọc và xoá mã.

## 3. Bản mẫu giao diện (chờ duyệt)

- [x] 3.1 Làm bản mẫu HTML `openspec/changes/clan-invites/mockup.html` bằng skill `ui-ux-pro-max`, theo token của `kb/design-system.md`. Các màn:
  - Thành viên (cả hai tab);
  - hộp thoại mời bằng email, gồm trạng thái sau khi mời;
  - hộp thoại tạo link, gồm màn hiện link một lần;
  - màn nhận lời mời, gồm các trạng thái lỗi và ô nhập mã mời;
  - chi tiết dòng họ của quản trị nền tảng.

  Mỗi màn có bản cỡ 375 px và 1280 px. Kiểm: chủ dự án duyệt.
- [x] 3.2 Sửa bản mẫu theo góp ý của chủ dự án đến khi được duyệt. Ghi kết luận vào `design.md`. Kiểm: chủ dự án ghi "duyệt".

## 4. Giao diện (chỉ làm sau khi 3.2 xong)

- [x] 4.1 Làm `MembersScreen`, `InviteDialog`, `LinkDialog` theo bản mẫu. Lối vào: số thành viên trên `ClanScreen` và mục "Thành viên" trong `AppRail`, chỉ cho quản trị dòng họ. Kiểm bằng `members.spec.ts`:
  - mời, đổi vai trò, gỡ, huỷ lời mời;
  - báo lỗi khi đụng quản trị cuối;
  - người xem không thấy lối vào.
- [x] 4.2 Làm màn `AcceptInvite` và dòng nhắc trên màn đăng nhập. Kiểm bằng `invite-link.spec.ts`:
  - người khác nhận link;
  - mở link khi chưa đăng nhập, đăng nhập bằng mã email, rồi vào được màn nhận;
  - link hết hạn hoặc đã thu hồi;
  - nhập sai mã mời.
- [x] 4.3 Làm hộp thoại chi tiết dòng họ trong `PlatformScreen` (danh sách quản trị, thêm, gỡ). Kiểm bằng `platform.spec.ts`: thêm quản trị cho dòng họ đã cấp; không gỡ được quản trị cuối.
- [x] 4.4 Thêm các màn mới vào `layout.spec.ts` (vùng chạm 44 px, không cuộn ngang ở 320–1440 px) và `visual.spec.ts`. Kiểm: toàn bộ Playwright qua 3 lần liên tiếp.

## 5. Tài liệu và hoàn tất

- [x] 5.1 Ghi ADR `0009` (mở rộng ADR 0008) với các nội dung:
  - chỉ quản trị dòng họ quản lý thành viên;
  - link mời chỉ cấp quyền xem, có hạn, mã mời và khoá khi sai;
  - không gửi thư mời;
  - quản trị nền tảng chỉ thấy quản trị;
  - chấp nhận việc lộ email có tài khoản hay chưa.

  Cập nhật `kb/data-model.md` và `kb/design-system.md`. Kiểm: `openspec validate --specs --strict` qua.
- [x] 5.2 Chạy đủ bộ kiểm tra: Vitest core và app, pgTAP, Playwright, build. Kiểm thử tay luồng Google: mở link khi chưa đăng nhập, đăng nhập Google, vào được màn nhận. Kiểm: ghi kết quả vào `status.md`.

## Workflow follow-up

- Chủ dự án duyệt app chạy thật, rồi mới commit, push và `/opsx:archive clan-invites`.
