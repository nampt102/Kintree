# platform-admin Specification

## Purpose
Cho đội vận hành dịch vụ (quản trị nền tảng) cấp dòng họ mới và chỉ định quản trị cho dòng họ, mà không được tự động đọc dữ liệu gia phả của khách hàng.

## Requirements

### Requirement: Quản trị nền tảng do nhà vận hành chỉ định
Vai trò quản trị nền tảng SHALL chỉ được cấp bằng công cụ của nhà vận hành (không qua giao diện hay API của người dùng); người dùng thường MUST NOT tự cấp cho mình.

#### Scenario: Tự cấp quyền
- **WHEN** người dùng thường cố ghi chính mình vào danh sách quản trị nền tảng qua API
- **THEN** cơ sở dữ liệu từ chối

#### Scenario: Cấp bằng công cụ vận hành
- **WHEN** nhà vận hành chạy công cụ cấp quyền cho một email
- **THEN** người ấy đăng nhập vào thấy màn quản trị nền tảng

### Requirement: Tạo dòng họ và chỉ định quản trị
Quản trị nền tảng SHALL tạo được dòng họ với tên (bắt buộc) và email của người quản trị đầu tiên; nếu email đã có tài khoản thì người ấy SHALL thành quản trị dòng họ ngay; nếu chưa có thì SHALL thành quản trị ngay khi đăng nhập lần đầu bằng email ấy.

#### Scenario: Email đã có tài khoản
- **WHEN** quản trị nền tảng tạo dòng họ "Họ Nguyễn" với email của một người đã đăng ký
- **THEN** người ấy thấy dòng họ trong danh sách với vai trò quản trị

#### Scenario: Email chưa có tài khoản
- **WHEN** quản trị nền tảng tạo dòng họ với email chưa đăng ký rồi người ấy đăng nhập lần đầu
- **THEN** người ấy thấy dòng họ với vai trò quản trị

#### Scenario: Thiếu tên hoặc email sai
- **WHEN** gửi biểu mẫu thiếu tên dòng họ hoặc email không hợp lệ
- **THEN** lỗi hiện dưới ô tương ứng và không tạo gì

#### Scenario: Trùng tên
- **WHEN** tạo hai dòng họ cùng tên
- **THEN** cả hai tạo được, mỗi dòng họ có địa chỉ ngắn riêng

### Requirement: Xem danh sách dòng họ đã cấp
Quản trị nền tảng SHALL xem được danh sách mọi dòng họ (tên, địa chỉ ngắn, email quản trị, ngày tạo) để vận hành.

#### Scenario: Danh sách vận hành
- **WHEN** quản trị nền tảng mở màn quản trị
- **THEN** thấy mọi dòng họ đã cấp kèm email quản trị

### Requirement: Không tự động đọc dữ liệu gia phả
Quản trị nền tảng MUST NOT đọc được cuốn, người hay quan hệ của một dòng họ chỉ vì là quản trị nền tảng; muốn xem họ SHALL có vai trò trong dòng họ ấy như mọi người.

#### Scenario: Truy vấn cuốn của khách
- **WHEN** quản trị nền tảng (không thuộc dòng họ A) truy vấn các người trong cuốn của dòng họ A
- **THEN** không nhận được dòng nào

### Requirement: Người dùng thường không thấy màn quản trị
Màn quản trị nền tảng SHALL chỉ hiện cho quản trị nền tảng; người dùng thường MUST NOT thấy lối vào và các lệnh quản trị MUST từ chối họ.

#### Scenario: Người dùng thường gọi lệnh tạo dòng họ
- **WHEN** người dùng thường gọi hàm tạo dòng họ của quản trị nền tảng
- **THEN** bị từ chối
