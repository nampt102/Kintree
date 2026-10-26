# death-anniversary Specification

## Purpose

Tính ngày giỗ (theo âm lịch) của một người ra ngày dương lịch cho từng năm, để hiển thị trên lịch dòng họ và gửi nhắc giỗ.

## Requirements

### Requirement: Ngày giỗ lấy theo ngày và tháng âm của ngày mất
Hệ thống SHALL xác định ngày giỗ là ngày và tháng âm lịch của ngày mất, và với một năm âm lịch cho trước SHALL trả ngày dương lịch tương ứng trong năm ấy.

#### Scenario: Ngày mất ghi bằng dương lịch
- **WHEN** ngày mất là 26/10/1942 (dương) và cần ngày giỗ năm âm lịch 2026
- **THEN** hệ thống trả ngày dương của ngày 17 tháng 9 âm lịch năm 2026

#### Scenario: Ngày mất ghi bằng âm lịch
- **WHEN** ngày mất là ngày 5 tháng 3 âm lịch năm 1980 và cần ngày giỗ năm âm lịch 2027
- **THEN** hệ thống trả ngày dương của ngày 5 tháng 3 âm lịch năm 2027

### Requirement: Người mất trong tháng nhuận
Hệ thống SHALL làm giỗ vào tháng thường cùng số khi người mất trong tháng nhuận, kể cả năm có tháng nhuận trùng số ấy.

#### Scenario: Năm sau không có tháng nhuận đó
- **WHEN** người mất ngày 10 tháng 6 nhuận năm Ất Tỵ (2025) và cần ngày giỗ năm 2026
- **THEN** hệ thống trả ngày dương của ngày 10 tháng 6 (thường) âm lịch năm 2026

### Requirement: Người mất ngày 30
Hệ thống SHALL làm giỗ vào ngày 29 của cùng tháng âm khi người mất ngày 30 mà năm cần tính tháng ấy chỉ có 29 ngày; hệ thống MUST NOT đẩy sang mùng 1 tháng sau.

#### Scenario: Tháng thiếu
- **WHEN** người mất ngày 30 tháng 12 âm lịch và tháng 12 âm lịch của năm cần tính chỉ có 29 ngày
- **THEN** hệ thống trả ngày dương của ngày 29 tháng 12 âm lịch năm ấy

#### Scenario: Tháng đủ
- **WHEN** người mất ngày 30 tháng 12 âm lịch và tháng 12 âm lịch của năm cần tính có 30 ngày
- **THEN** hệ thống trả ngày dương của ngày 30 tháng 12 âm lịch năm ấy

### Requirement: Ngày mất không đầy đủ
Hệ thống SHALL không sinh ngày giỗ khi ngày mất thiếu ngày hoặc thiếu tháng, và SHALL báo rõ lý do thay vì đoán ngày.

#### Scenario: Chỉ biết năm mất
- **WHEN** ngày mất chỉ có năm 1950
- **THEN** hệ thống không trả ngày giỗ và báo “thiếu ngày/tháng mất”

#### Scenario: Biết tháng và năm, thiếu ngày
- **WHEN** ngày mất là tháng 12 năm 1950, không rõ ngày
- **THEN** hệ thống không trả ngày giỗ và báo “thiếu ngày/tháng mất”

### Requirement: Kỳ giỗ trong ba năm đầu
Hệ thống SHALL gọi tên kỳ giỗ theo số năm âm lịch kể từ năm mất: năm thứ 1 là “Giỗ đầu”, năm thứ 2 là “Giỗ hết”, từ năm thứ 3 là “Giỗ thường”.

#### Scenario: Giỗ đầu
- **WHEN** người mất năm âm lịch 2025 và cần ngày giỗ năm âm lịch 2026
- **THEN** kỳ giỗ là “Giỗ đầu”

#### Scenario: Giỗ thường
- **WHEN** người mất năm âm lịch 2020 và cần ngày giỗ năm âm lịch 2026
- **THEN** kỳ giỗ là “Giỗ thường”

#### Scenario: Chưa tới giỗ đầu
- **WHEN** người mất năm âm lịch 2026 và cần ngày giỗ năm âm lịch 2026 hoặc sớm hơn
- **THEN** hệ thống không trả ngày giỗ và báo “chưa tới giỗ đầu”
