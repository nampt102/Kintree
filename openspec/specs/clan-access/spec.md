# clan-access Specification

## Purpose
Tổ chức dữ liệu theo dòng họ và cuốn gia phả theo kiểu dịch vụ có người vận hành: người dùng thường không tự tạo hay sửa cấu trúc, chỉ quản trị mới thêm, sửa, xoá; quyền được cơ sở dữ liệu (không phải giao diện) cưỡng chế ở hai tầng dòng họ và cuốn.

## Requirements

### Requirement: Hai vai trò ở hai tầng
Hệ thống SHALL có hai vai trò, quản trị và xem, gán ở tầng dòng họ hoặc tầng một cuốn; quyền thực tế của một người với một cuốn SHALL là mức cao hơn trong vai trò ở tầng dòng họ và vai trò ở tầng cuốn đó; người chỉ có vai trò xem MUST NOT thêm, sửa hay gỡ bất cứ thứ gì; chỉ quản trị mới thêm, sửa, gỡ người và quan hệ trong cuốn.

#### Scenario: Người xem sửa
- **WHEN** người chỉ có quyền xem cố ghi thêm một người vào cuốn
- **THEN** cơ sở dữ liệu từ chối và dữ liệu không đổi

#### Scenario: Quản trị ở tầng dòng họ
- **WHEN** quản trị của dòng họ thêm một người vào cuốn bất kỳ của dòng họ
- **THEN** thêm được

#### Scenario: Quản trị của đúng cuốn
- **WHEN** người chỉ xem ở tầng dòng họ nhưng là quản trị của cuốn A sửa một người trong cuốn A rồi cố sửa một người trong cuốn B
- **THEN** sửa được ở cuốn A và bị từ chối ở cuốn B

### Requirement: Không có vai trò biên tập
Hệ thống MUST NOT có vai trò nào khác ngoài quản trị và xem; giá trị vai trò khác SHALL bị cơ sở dữ liệu từ chối.

#### Scenario: Gán vai trò biên tập
- **WHEN** có yêu cầu ghi một thành viên với vai trò "editor"
- **THEN** cơ sở dữ liệu từ chối

### Requirement: Người dùng thường không tự tạo dòng họ
Người dùng đã đăng nhập mà không phải quản trị nền tảng MUST NOT tạo được dòng họ, cuốn trong dòng họ họ không quản trị, hay tự gán vai trò cho mình; giao diện SHALL không có nút tạo dòng họ cho họ.

#### Scenario: Tự tạo dòng họ
- **WHEN** người dùng thường gọi thẳng API tạo dòng họ
- **THEN** cơ sở dữ liệu từ chối

#### Scenario: Chưa được cấp quyền
- **WHEN** người dùng đăng nhập lần đầu mà chưa được gán vào dòng họ nào
- **THEN** thấy thông báo chưa được cấp quyền kèm cách liên hệ quản trị, không có nút tạo dòng họ

### Requirement: Danh sách theo dòng họ
Giao diện SHALL đi từ danh sách dòng họ của người dùng, vào danh sách cuốn của một dòng họ, rồi vào một cuốn; mỗi mục SHALL cho biết vai trò của người dùng; người dùng MUST chỉ thấy dòng họ và cuốn họ có vai trò.

#### Scenario: Thấy đúng dòng họ của mình
- **WHEN** người dùng là thành viên của dòng họ A, không thuộc dòng họ B
- **THEN** danh sách chỉ có dòng họ A

### Requirement: Chỉ quản trị tạo cuốn
Chỉ quản trị của dòng họ SHALL tạo được cuốn gia phả trong dòng họ ấy; người khác MUST NOT thấy nút tạo và cơ sở dữ liệu MUST từ chối nếu họ cố tạo.

#### Scenario: Người xem
- **WHEN** người chỉ có quyền xem mở một dòng họ
- **THEN** không có nút tạo cuốn

#### Scenario: Quản trị của một cuốn tạo cuốn mới
- **WHEN** người chỉ là quản trị của cuốn A (không phải quản trị dòng họ) cố tạo thêm một cuốn trong dòng họ
- **THEN** cơ sở dữ liệu từ chối

### Requirement: Chỉ quản trị sửa thông tin và xoá cuốn
Chỉ quản trị của dòng họ hoặc quản trị của đúng cuốn ấy SHALL sửa được tên, vùng miền, mô tả của cuốn và SHALL xoá được cuốn; xoá SHALL là đánh dấu đã xoá có thời điểm (dữ liệu vẫn giữ trên máy chủ), cuốn đã xoá SHALL biến khỏi mọi danh sách và MUST NOT mở được qua giao diện hay API; giao diện SHALL bắt gõ lại đúng tên cuốn để xác nhận xoá.

#### Scenario: Xoá cuốn
- **WHEN** quản trị xoá cuốn sau khi gõ đúng tên cuốn
- **THEN** cuốn biến khỏi danh sách của mọi thành viên và các người trong cuốn không còn đọc được qua API, nhưng dòng dữ liệu vẫn còn trên máy chủ với dấu đã xoá

#### Scenario: Gõ sai tên
- **WHEN** quản trị gõ sai tên cuốn trong hộp xác nhận
- **THEN** nút xoá không bật và không có gì bị xoá

#### Scenario: Người xem muốn xoá
- **WHEN** người chỉ có quyền xem cố đánh dấu xoá một cuốn qua API
- **THEN** cơ sở dữ liệu từ chối và cuốn vẫn còn

#### Scenario: Sửa tên cuốn
- **WHEN** quản trị đổi tên cuốn
- **THEN** tên mới hiện ở mọi danh sách và thiết bị sau khi tải lại

### Requirement: Cách ly giữa các dòng họ
Người dùng MUST NOT đọc hay ghi được bất kỳ dữ liệu nào (dòng họ, cuốn, người, quan hệ, thành viên) của dòng họ mà họ không có vai trò; người chỉ có vai trò ở một cuốn SHALL chỉ thấy đúng cuốn đó.

#### Scenario: Đoán mã của dòng họ khác
- **WHEN** người dùng truy vấn thẳng cuốn của dòng họ khác bằng mã đã biết
- **THEN** không nhận được dòng nào

#### Scenario: Người chỉ có quyền một cuốn
- **WHEN** người có vai trò xem ở cuốn A (không có vai trò ở tầng dòng họ) liệt kê các cuốn
- **THEN** chỉ thấy cuốn A

### Requirement: Thành viên chỉ do quản trị đổi
Danh sách thành viên và vai trò của một dòng họ SHALL chỉ quản trị dòng họ ấy đọc đầy đủ và sửa được; người dùng thường chỉ thấy vai trò của chính mình.

#### Scenario: Tự nâng quyền
- **WHEN** người chỉ có quyền xem cố sửa vai trò của chính mình thành quản trị
- **THEN** cơ sở dữ liệu từ chối
