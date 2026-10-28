# 0009. Mời thành viên bằng email và bằng link chỉ cho xem; quản trị nền tảng quản lý quản trị dòng họ

- **Ngày:** 2026-10-27
- **Trạng thái:** đã chốt (áp dụng ở change `clan-invites`; mở rộng ADR 0008)
- **Người quyết định:** jamesphan

## Bối cảnh
Sau ADR 0008, mỗi dòng họ chỉ có quản trị đầu tiên do quản trị nền tảng chỉ định. Không ai thêm được người xem hay quản trị khác trên giao diện. Quản trị nền tảng cũng không xem hay sửa được quản trị của một dòng họ đã cấp. US-3.2 gốc muốn có link mời mang vai trò, có hạn dùng và mật khẩu.

## Các lựa chọn

**Cách mời**
- (a) chỉ email;
- (b) chỉ link;
- (c) cả hai: email cho mọi vai trò, link chỉ cho người xem.

**Ai quản lý thành viên**
- (a) chỉ quản trị cấp dòng họ;
- (b) thêm quản trị của từng cuốn.

**Quản trị nền tảng thấy gì**
- (a) chỉ quản trị dòng họ;
- (b) mọi thành viên.

## Quyết định

**Cách mời: cả hai, theo lựa chọn (c).**
- Email chọn được vai trò quản trị hoặc xem, phạm vi cả dòng họ hoặc một cuốn.
- Email chưa có tài khoản thì lời mời nằm chờ (bảng `invites`), thành quyền khi người ấy đăng nhập lần đầu.
- Link **chỉ cấp quyền xem**:
  - hạn dùng 1, 7 hoặc 30 ngày;
  - **mã mời** tuỳ chọn (bcrypt), sai 5 lần thì khoá link 15 phút;
  - thu hồi được;
  - máy chủ chỉ lưu bản băm sha256 của link, nên địa chỉ link chỉ hiện một lần lúc tạo.
- Link ở dạng `/#invite=<mã>`. App cất mã vào `sessionStorage` để giữ qua bước đăng nhập, kể cả đăng nhập Google có chuyển hướng.

**Không gửi thư mời.** Sau khi mời, quản trị sao chép lời nhắn soạn sẵn để tự gửi.

**Ai quản lý thành viên:** chỉ **quản trị cấp dòng họ** (lựa chọn a). Quản trị của một cuốn không mời người.

**Luôn còn quản trị:** mỗi dòng họ luôn còn ít nhất một quản trị cấp dòng họ đã có tài khoản. Trigger trong cơ sở dữ liệu chặn gỡ hoặc hạ quyền người cuối, kể cả khi người làm là quản trị nền tảng.

**Quản trị nền tảng:** thêm 3 hàm `platform_list_clan_admins`, `platform_add_clan_admin`, `platform_remove_clan_admin`.
- Chỉ thấy và đổi quản trị cấp dòng họ.
- Không thấy người xem, không đọc được cây.

## Lý do và hệ quả
- **Link không cấp quyền quản trị:** link dễ bị chuyển tiếp, nên chỉ cấp quyền xem để rủi ro chỉ là lộ quyền đọc, không ai sửa được cây qua link.
- **Không gửi thư:** gửi thư từ Postgres cần Edge Function và SMTP hosted. Bật SMTP cũng làm hỏng phần e2e đọc mã OTP từ Mailpit. Làm sau, khi dựng môi trường hosted.
- **Lộ trạng thái tài khoản:** `member_invite` trả `added` hoặc `pending`, nên quản trị dòng họ biết một email đã có tài khoản Kintree hay chưa. Chấp nhận, vì chỉ quản trị dòng họ gọi được và họ vốn mời người quen.
- **Khoá theo link, không theo người:** kẻ có link có thể cố ý nhập sai để khoá link 15 phút. Chấp nhận, vì quản trị tạo link mới được. Đếm theo người hay theo IP để sau.
- **Người chỉ có quyền một cuốn** không đọc được dòng `clans`, nên nhận link của một cuốn thì app mở thẳng cuốn ấy.
- **Xem lại khi:**
  - cần quản trị cuốn tự mời người;
  - cần gửi thư tự động;
  - bị lạm dụng khoá link.
