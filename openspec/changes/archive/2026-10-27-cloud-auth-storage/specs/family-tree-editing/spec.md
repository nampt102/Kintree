# Spec Delta

## MODIFIED Requirements

### Requirement: Dữ liệu được lưu và mở lại
Hệ thống SHALL lưu các cuốn gia phả trên máy chủ cho người dùng đã đăng nhập và SHALL khôi phục đúng nội dung và thứ tự khi mở lại, trên cùng thiết bị hay thiết bị khác; hệ thống MUST NOT giữ bản lưu cuốn nào trên thiết bị; chi tiết ghi và đọc nằm ở khả năng `tree-storage`.

#### Scenario: Tải lại trang
- **WHEN** người dùng thêm vài người rồi tải lại trang
- **THEN** các cuốn, người, quan hệ và thứ tự y như trước khi tải

#### Scenario: Dữ liệu hỏng
- **WHEN** dữ liệu của cuốn trên máy chủ không dựng lại được (thiếu trường hay sai kiểu)
- **THEN** hệ thống báo lỗi bằng tiếng Việt, không ghi gì lên máy chủ và không làm mất dữ liệu đang có

#### Scenario: Mở trên thiết bị khác
- **WHEN** người dùng đăng nhập cùng tài khoản trên thiết bị khác
- **THEN** thấy cùng các cuốn, người, quan hệ và thứ tự
