# Spec Delta

## MODIFIED Requirements

### Requirement: Xem danh sách dòng họ đã cấp
Quản trị nền tảng SHALL xem được danh sách mọi dòng họ (tên, địa chỉ ngắn, email quản trị, ngày tạo) để vận hành; mỗi dòng họ SHALL bấm được để mở chi tiết quản trị của dòng họ ấy.

#### Scenario: Danh sách vận hành
- **WHEN** quản trị nền tảng mở màn quản trị
- **THEN** thấy mọi dòng họ đã cấp kèm email quản trị

#### Scenario: Mở chi tiết
- **WHEN** quản trị nền tảng bấm vào một dòng họ trong danh sách
- **THEN** thấy danh sách quản trị của dòng họ ấy

## ADDED Requirements

### Requirement: Quản trị nền tảng xem quản trị của dòng họ
Trong chi tiết một dòng họ, quản trị nền tảng SHALL thấy mọi quản trị cấp dòng họ. Mỗi dòng ghi email và trạng thái (đã vào hoặc chờ đăng nhập). Quản trị nền tảng MUST NOT thấy người xem, quản trị cấp cuốn hay dữ liệu cây qua màn này hay qua API của nó.

#### Scenario: Chỉ thấy quản trị
- **WHEN** dòng họ có 1 quản trị đã vào, 1 lời mời quản trị đang chờ và 5 người xem
- **THEN** chi tiết hiện đúng 2 dòng quản trị, dòng thứ hai ghi "chờ đăng nhập"

### Requirement: Quản trị nền tảng thêm và gỡ quản trị dòng họ
Quản trị nền tảng SHALL thêm được quản trị cấp dòng họ bằng email theo cùng quy tắc mời bằng email (có tài khoản thì có quyền ngay, chưa có thì chờ đăng nhập lần đầu). Quản trị nền tảng SHALL gỡ được một quản trị hoặc huỷ lời mời quản trị đang chờ, trừ quản trị cuối cùng đã có tài khoản. Người dùng thường MUST bị từ chối khi gọi các lệnh này.

#### Scenario: Thêm quản trị cho dòng họ đã cấp
- **WHEN** quản trị nền tảng thêm email của người đã đăng ký vào dòng họ "Họ Nguyễn"
- **THEN** người ấy thấy dòng họ với vai trò quản trị

#### Scenario: Gỡ quản trị cuối cùng
- **WHEN** quản trị nền tảng gỡ quản trị đã vào duy nhất của một dòng họ
- **THEN** bị từ chối với thông báo cần thêm quản trị khác trước

#### Scenario: Người dùng thường gọi lệnh thêm quản trị
- **WHEN** quản trị dòng họ (không phải quản trị nền tảng) gọi lệnh thêm quản trị của quản trị nền tảng
- **THEN** bị từ chối
