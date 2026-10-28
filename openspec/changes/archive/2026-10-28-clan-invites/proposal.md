# Proposal

## Why
Sau `cloud-auth-storage`, mỗi dòng họ chỉ có đúng người quản trị do quản trị nền tảng nhập lúc tạo. Không ai thêm được người xem hay quản trị khác trên giao diện, và quản trị nền tảng cũng không xem hay sửa được danh sách quản trị của một dòng họ đã cấp. Muốn con cháu vào xem cây thì phải chèn SQL tay, nên không bán được dịch vụ.

## What Changes
- **Quản trị dòng họ mời bằng email.** Nhập email, chọn vai trò (quản trị hoặc xem) và phạm vi (cả dòng họ hoặc một cuốn).
  - Email đã có tài khoản: có quyền ngay.
  - Email chưa có tài khoản: lời mời nằm chờ, người đó có quyền khi đăng nhập lần đầu bằng đúng email này.
  - Không gửi thư; quản trị tự báo cho người được mời (có nút sao chép lời nhắn).
- **Quản trị dòng họ tạo link mời, chỉ cấp vai trò xem.**
  - Phạm vi là cả dòng họ hoặc một cuốn.
  - Có hạn dùng và mã mời tuỳ chọn.
  - Thu hồi được.
  - Nhập sai mã mời 5 lần thì link bị khoá tạm 15 phút.
  - Mở link khi chưa đăng nhập: đăng nhập xong vẫn được nhận vào.
- **Màn "Thành viên" của dòng họ** (chỉ quản trị dòng họ):
  - Danh sách người đã vào và lời mời đang chờ, mỗi dòng có email, vai trò và phạm vi.
  - Đổi vai trò, gỡ người, huỷ lời mời.
  - Danh sách link đang hiệu lực.
- **Luôn còn ít nhất một quản trị cấp dòng họ.** Cơ sở dữ liệu từ chối gỡ hoặc hạ quyền quản trị cuối cùng, kể cả khi người làm là quản trị nền tảng.
- **Quản trị nền tảng**:
  - Bấm vào một dòng họ đã cấp để xem danh sách quản trị (đã vào và đang chờ).
  - Thêm quản trị bằng email.
  - Gỡ quản trị (trừ người cuối).
  - Vẫn không thấy người xem và không đọc được cây (giữ nguyên tinh thần ADR 0008).
- **Dữ liệu.** Bảng `clan_admin_invites` được thay bằng bảng lời mời chung có vai trò và phạm vi; dữ liệu cũ chuyển sang bảng mới. Sửa `handle_new_user`, `platform_create_clan` và `platform_list_clans` theo bảng mới.
- **Ngoài phạm vi:**
  - "Tôi là ai" (để change `kinship-terms`).
  - Gửi thư mời tự động.
  - Link cấp quyền quản trị.
  - Quản trị của một cuốn tự quản lý thành viên.
  - Quản trị nền tảng xoá hoặc khôi phục dòng họ.
  - Người dùng tự rời dòng họ.

## Capabilities

### New Capabilities
- `clan-membership`: quản lý thành viên của dòng họ gồm danh sách thành viên và lời mời, mời bằng email, link mời cho người xem (hạn, mã mời, khoá khi sai, thu hồi), nhận lời mời khi đăng nhập, bảo vệ quản trị cuối cùng.

### Modified Capabilities
- `platform-admin`:
  - Danh sách dòng họ đã cấp mở được chi tiết.
  - Quản trị nền tảng xem, thêm, gỡ quản trị của một dòng họ.
  - Lời chỉ định quản trị đầu tiên dùng chung cơ chế lời mời email.

## Impact
- **Cơ sở dữ liệu.** Migration mới (không sửa migration cũ):
  - Bảng `invites` và `invite_links`; chuyển dữ liệu khỏi `clan_admin_invites`.
  - Trigger bảo vệ quản trị cuối.
  - Các RPC security definer: mời, liệt kê thành viên, đổi vai trò, gỡ, tạo/thu hồi/nhận link, và các hàm `platform_*` mới.
  - Test pgTAP mới; sửa `supabase/tests/access.test.sql`.
- **App:**
  - `lib/cloudStore.ts`: thêm `memberStore`, mở rộng `platformStore`.
  - Màn mới `MembersScreen`, chi tiết dòng họ trong `PlatformScreen`, màn nhận link.
  - `App.tsx` đọc `#invite=` và giữ qua bước đăng nhập.
  - Lối vào "Thành viên" ở `ClanScreen` và `AppRail`.
- **Thiết kế.** Bản mẫu HTML cho các màn mới phải được chủ dự án duyệt trước khi code giao diện.
- **Tài liệu.** ADR 0009 (mở rộng 0008); KB `data-model.md`; e2e Playwright mới (`members.spec.ts`, `invite-link.spec.ts`).
- **Không thêm thư viện.** Dùng `pgcrypto` đã có trong schema `extensions`.
