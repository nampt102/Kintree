# family-tree-integrity Specification

## Purpose

Giữ cho dữ liệu cây gia phả luôn hợp lệ dù được ghi từ giao diện, từ đề xuất AI hay từ tệp nhập, để sơ đồ vẽ được và cách xưng hô tính đúng.

## Requirements

### Requirement: Tối đa một cha và một mẹ cho mỗi loại quan hệ
Hệ thống MUST từ chối việc ghi quan hệ cha/mẹ–con khiến một người có hơn một cha hoặc hơn một mẹ trong cùng một loại (ruột, nuôi, riêng); cha/mẹ nuôi và cha dượng/mẹ kế được ghi riêng, không chiếm chỗ của cha mẹ ruột.

#### Scenario: Thêm cha ruột thứ hai
- **WHEN** một người đã có cha ruột và có yêu cầu ghi thêm một người khác làm cha ruột
- **THEN** hệ thống từ chối, không lưu gì, và báo “người này đã có cha ruột”

#### Scenario: Con nuôi biết cả cha ruột
- **WHEN** một người đã có cha nuôi và có yêu cầu ghi thêm cha ruột
- **THEN** hệ thống lưu được cả hai quan hệ

### Requirement: Không nối vòng
Hệ thống MUST từ chối quan hệ cha/mẹ–con khiến một người trở thành tổ tiên của chính mình.

#### Scenario: Ông thành cháu
- **WHEN** có yêu cầu ghi một người làm con của chính cháu nội mình
- **THEN** hệ thống từ chối và báo “quan hệ tạo vòng”

### Requirement: Giới tính chưa rõ
Hệ thống SHALL cho lưu người có giới tính “chưa rõ” (thường gặp khi nhập từ tệp khác) và SHALL nhận người ấy làm cha hoặc mẹ mà không báo lỗi giới tính.

#### Scenario: Nhập người chưa rõ giới tính
- **WHEN** ghi một người có giới tính “chưa rõ” làm cha của một người khác
- **THEN** hệ thống lưu được

#### Scenario: Sai giới tính đã biết
- **WHEN** ghi một người có giới tính nữ làm cha của một người khác
- **THEN** hệ thống từ chối và báo “vai trò không khớp giới tính”

### Requirement: Loại quan hệ con
Mỗi quan hệ cha/mẹ–con SHALL có đúng một loại trong: ruột, nuôi, riêng.

#### Scenario: Thiếu loại
- **WHEN** có yêu cầu ghi quan hệ cha/mẹ–con không có loại
- **THEN** hệ thống từ chối và báo “thiếu loại quan hệ”

### Requirement: Quan hệ phải có người trong họ
Hệ thống MUST từ chối quan hệ (cha/mẹ–con hoặc vợ chồng) mà cả hai người đều là ngoại tộc.

#### Scenario: Hai người ngoại tộc
- **WHEN** có yêu cầu ghi quan hệ vợ chồng giữa hai người đều đánh dấu ngoại tộc
- **THEN** hệ thống từ chối và báo “cần ít nhất một người trong họ”

### Requirement: Người và quan hệ cùng một cuốn gia phả
Hệ thống MUST từ chối quan hệ nối hai người thuộc hai cuốn gia phả khác nhau.

#### Scenario: Nối sang cuốn khác
- **WHEN** có yêu cầu ghi quan hệ giữa người thuộc cuốn A và người thuộc cuốn B
- **THEN** hệ thống từ chối và báo “khác cuốn gia phả”

### Requirement: Ngày tháng không đầy đủ hợp lệ
Hệ thống SHALL lưu ngày sinh, ngày mất ở dạng năm, năm–tháng hoặc đầy đủ, kèm cờ âm/dương; hệ thống MUST từ chối ngày có ngày mà thiếu tháng, có tháng mà thiếu năm, hoặc ngày không tồn tại.

#### Scenario: Chỉ biết năm
- **WHEN** ghi ngày sinh chỉ có năm 1890
- **THEN** hệ thống lưu được và khi đọc ra vẫn chỉ có năm 1890, không tự thêm ngày hay tháng

#### Scenario: Có ngày thiếu tháng
- **WHEN** ghi ngày mất có ngày 12, không có tháng, năm 1950
- **THEN** hệ thống từ chối và báo “ngày tháng không hợp lệ”

#### Scenario: Ngày dương không tồn tại
- **WHEN** ghi ngày sinh dương lịch 30/02/1960
- **THEN** hệ thống từ chối và báo “ngày tháng không hợp lệ”

### Requirement: Ràng buộc được kiểm ở cả lõi nghiệp vụ và cơ sở dữ liệu
Các ràng buộc trong spec này SHALL được kiểm trước khi ghi ở lõi nghiệp vụ dùng chung cho web và app, và MUST được cơ sở dữ liệu chặn lại nếu một lối ghi nào đó bỏ qua lõi; riêng việc ngày âm lịch có tồn tại hay không chỉ kiểm ở lõi.

#### Scenario: Ghi thẳng vào cơ sở dữ liệu
- **WHEN** một câu lệnh ghi thẳng vào cơ sở dữ liệu một cha thứ hai cho cùng một người
- **THEN** cơ sở dữ liệu từ chối câu lệnh
