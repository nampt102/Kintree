# Spec Delta

## Purpose

Nhắc người trong dòng họ ngày giỗ sắp tới bằng thông báo trên thiết bị, trước 7 ngày, 1 ngày và đúng ngày, để không lỡ giỗ.

## ADDED Requirements

### Requirement: Bật và tắt nhắc giỗ
Người có vai trò trong một dòng họ (quản trị hoặc xem) SHALL bật hoặc tắt "Nhắc ngày giỗ" riêng cho từng dòng họ; mặc định MUST là tắt. Khi bật, app SHALL xin quyền thông báo của trình duyệt và đăng ký thiết bị hiện tại; nếu người dùng từ chối quyền, nhắc SHALL không được bật và app SHALL báo lý do cùng cách cấp lại quyền. Tắt nhắc SHALL gỡ đăng ký của thiết bị hiện tại cho dòng họ đó.

#### Scenario: Bật lần đầu
- **WHEN** người dùng bật nhắc ở một dòng họ và cho phép thông báo
- **THEN** thiết bị được đăng ký và màn hiện trạng thái "Đang bật"

#### Scenario: Từ chối quyền
- **WHEN** người dùng bật nhắc nhưng từ chối quyền thông báo của trình duyệt
- **THEN** nhắc vẫn tắt và app giải thích cách cấp lại quyền

#### Scenario: Tắt
- **WHEN** người dùng tắt nhắc của một dòng họ
- **THEN** thiết bị không còn nhận nhắc của dòng họ đó

### Requirement: Mốc nhắc
Mỗi ngày vào 7:00 giờ Việt Nam, hệ thống SHALL gửi nhắc cho giỗ rơi vào ngày dương 7 ngày sau, 1 ngày sau và hôm nay, tính bằng đúng lõi lịch của app (`calendarEvents`/`upcomingEvents`, kỳ Giỗ đầu / Giỗ hết / Giỗ thường, tháng nhuận). Hệ thống MUST NOT nhắc sinh nhật. Người đã mất thiếu ngày hoặc tháng mất MUST NOT được nhắc.

#### Scenario: Nhắc 7 ngày
- **WHEN** một người có giỗ vào 22/4/2026 và hôm nay là 15/4/2026 lúc 7:00
- **THEN** người đã bật nhắc của dòng họ nhận thông báo "còn 7 ngày"

#### Scenario: Đúng ngày
- **WHEN** hôm nay là ngày giỗ
- **THEN** người đã bật nhắc nhận thông báo "hôm nay"

#### Scenario: Sinh nhật
- **WHEN** hôm nay là sinh nhật một người còn sống
- **THEN** không có thông báo nào được gửi

### Requirement: Nội dung và đích đến của thông báo
Thông báo SHALL ghi tên người, kỳ giỗ, ngày dương và ngày âm, và tên cuốn khi dòng họ có từ hai cuốn. Bấm thông báo SHALL mở app ở màn "Ngày giỗ" của dòng họ đó. Nhiều giỗ cùng mốc trong cùng dòng họ SHALL được gộp thành một thông báo cho mỗi người nhận.

#### Scenario: Gộp
- **WHEN** hai người có giỗ cùng ngày
- **THEN** người nhận chỉ được một thông báo nêu cả hai

#### Scenario: Mở từ thông báo
- **WHEN** người dùng bấm thông báo
- **THEN** app mở màn "Ngày giỗ" của đúng dòng họ

### Requirement: Không gửi trùng
Mỗi (người nhận, người có giỗ, ngày giỗ, mốc nhắc) MUST được gửi tối đa một lần dù lịch chạy lại nhiều lần trong ngày. Một lần gửi lỗi tạm thời SHALL được thử lại ở lần chạy sau trong cùng ngày; đăng ký thiết bị mà dịch vụ push báo đã hết hạn SHALL bị xoá.

#### Scenario: Chạy lại
- **WHEN** lịch chạy hai lần trong cùng một ngày
- **THEN** mỗi người nhận chỉ có một thông báo cho mỗi giỗ và mốc

#### Scenario: Thiết bị hết hạn
- **WHEN** dịch vụ push báo đăng ký của một thiết bị không còn hợp lệ
- **THEN** đăng ký đó bị xoá và không ảnh hưởng thiết bị khác

### Requirement: Phạm vi quyền
Người nhận MUST chỉ nhận giỗ của các cuốn họ có quyền xem; người bị gỡ khỏi dòng họ MUST NOT còn nhận nhắc; cuốn đã xoá MUST NOT sinh nhắc. Mỗi người MUST chỉ đọc và sửa được đăng ký thiết bị và tuỳ chọn nhắc của chính mình.

#### Scenario: Bị gỡ khỏi dòng họ
- **WHEN** một thành viên bị gỡ khỏi dòng họ
- **THEN** họ không nhận nhắc của dòng họ đó từ lần chạy kế tiếp

#### Scenario: Người khác
- **WHEN** một người cố đọc đăng ký thiết bị của người khác
- **THEN** cơ sở dữ liệu không trả dòng nào
