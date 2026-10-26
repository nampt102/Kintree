# Spec Delta

## Purpose

Đổi ngày giữa dương lịch và âm lịch Việt Nam, kèm Can Chi, làm nền cho ngày giỗ, lịch dòng họ và hiển thị ngày trong hồ sơ.

## ADDED Requirements

### Requirement: Đổi dương lịch sang âm lịch Việt Nam
Hệ thống SHALL đổi một ngày dương lịch sang ngày, tháng, năm âm lịch và cờ tháng nhuận, tính theo múi giờ UTC+7 (lịch Việt Nam, không phải lịch Trung Quốc UTC+8).

#### Scenario: Tết lệch với lịch Trung Quốc
- **WHEN** đổi ngày dương 17/02/2007
- **THEN** kết quả là mùng 1 tháng 1 âm lịch năm Đinh Hợi, không nhuận

#### Scenario: Ngày bình thường
- **WHEN** đổi ngày dương 26/10/1942
- **THEN** kết quả là ngày 17 tháng 9 âm lịch năm Nhâm Ngọ

#### Scenario: Ngày nằm trong tháng nhuận
- **WHEN** đổi một ngày dương thuộc tháng 6 nhuận năm Ất Tỵ (2025)
- **THEN** kết quả có tháng 6 và cờ nhuận bằng đúng

### Requirement: Đổi âm lịch sang dương lịch Việt Nam
Hệ thống SHALL đổi ngày, tháng, năm âm lịch và cờ nhuận sang ngày dương lịch; ngày âm không tồn tại SHALL bị từ chối với lỗi rõ ràng thay vì trả một ngày khác.

#### Scenario: Đổi ngược khớp với đổi xuôi
- **WHEN** đổi mọi ngày dương từ 01/01/1900 đến 31/12/2100 sang âm rồi đổi ngược lại
- **THEN** mọi ngày đều ra đúng ngày dương ban đầu

#### Scenario: Tháng nhuận không tồn tại
- **WHEN** yêu cầu đổi ngày 1 tháng 6 nhuận của một năm không có tháng 6 nhuận
- **THEN** hệ thống trả lỗi “ngày âm không tồn tại”

#### Scenario: Ngày 30 của tháng thiếu
- **WHEN** yêu cầu đổi ngày 30 của một tháng âm chỉ có 29 ngày
- **THEN** hệ thống trả lỗi “ngày âm không tồn tại”

### Requirement: Tết Nguyên đán đúng trong phạm vi hỗ trợ
Hệ thống SHALL cho ra đúng ngày Tết Nguyên đán của mọi năm từ 1900 đến 2100 theo bảng đối chiếu lịch Việt Nam được lưu trong bộ test.

#### Scenario: Đối chiếu Tết nhiều năm
- **WHEN** tính mùng 1 tháng 1 âm lịch của mỗi năm từ 1900 đến 2100
- **THEN** ngày dương khớp với bảng đối chiếu cho mọi năm

### Requirement: Phạm vi năm hỗ trợ
Hệ thống SHALL chỉ nhận ngày trong khoảng năm 1800 đến 2199 và SHALL trả lỗi rõ ràng với ngày ngoài khoảng ấy.

#### Scenario: Năm ngoài phạm vi
- **WHEN** đổi ngày dương 01/01/1700
- **THEN** hệ thống trả lỗi “ngoài phạm vi hỗ trợ”

### Requirement: Can Chi
Hệ thống SHALL trả tên Can Chi tiếng Việt của năm, tháng và ngày âm lịch.

#### Scenario: Can Chi năm
- **WHEN** lấy Can Chi của năm âm lịch 2026
- **THEN** kết quả là “Bính Ngọ”

#### Scenario: Can Chi năm Tết 2007
- **WHEN** lấy Can Chi của năm âm lịch chứa ngày dương 17/02/2007
- **THEN** kết quả là “Đinh Hợi”
