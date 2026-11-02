# Spec Delta

## Purpose

Cho cả dòng họ thấy ngày giỗ và sinh nhật trên lịch tháng âm–dương và danh sách sắp tới, để không lỡ giỗ và tính ngày theo đúng âm lịch.

## ADDED Requirements

### Requirement: Lịch tháng âm–dương
Hệ thống SHALL hiện lịch từng tháng dương lịch, mỗi ô ghi ngày dương và ngày âm tương ứng; ô mùng 1 âm lịch SHALL ghi cả tháng âm (kèm chữ "nhuận" khi là tháng nhuận). Đầu lịch SHALL ghi tháng dương lịch đang xem, tháng âm lịch (hoặc hai tháng âm khi tháng dương giao hai tháng âm) và năm Can Chi. Người dùng SHALL chuyển được tháng trước, tháng sau và về hôm nay; ngày hôm nay SHALL nhận ra được không chỉ bằng màu. Lịch SHALL không cho chuyển ra ngoài các năm 1800 đến 2199.

#### Scenario: Ngày dương và ngày âm
- **WHEN** người dùng mở tháng 2/2026
- **THEN** ô ngày 17/2/2026 ghi "17" và ngày âm 1 tháng Giêng (Tết Bính Ngọ), kèm tên tháng âm

#### Scenario: Tháng nhuận
- **WHEN** người dùng mở tháng dương có mùng 1 một tháng âm nhuận
- **THEN** ô mùng 1 ghi tháng âm đó kèm chữ "nhuận"

#### Scenario: Hết phạm vi
- **WHEN** người dùng ở tháng 12/2199 và bấm tháng sau
- **THEN** nút bị tắt và lịch không chuyển

### Requirement: Giỗ trên lịch
Mỗi người đã mất có đủ ngày và tháng mất SHALL hiện ngày giỗ trong ô ngày dương tương ứng, tính bằng `deathAnniversary` (tháng nhuận, ngày 30, kỳ Giỗ đầu / Giỗ hết / Giỗ thường). Một tháng dương giao hai năm âm SHALL hiện đủ giỗ của cả hai năm. Kỳ giỗ SHALL hiện bằng chữ, không chỉ bằng màu: đầy đủ ở danh sách sự kiện của ngày; trong ô lịch (chỗ hẹp) chip giỗ đầu và giỗ hết SHALL ghi "đầu" hoặc "hết", giỗ thường có thể bỏ chữ.

#### Scenario: Giỗ trong tháng
- **WHEN** người mất ngày 5 tháng 3 âm lịch năm 1968 và người dùng mở tháng dương chứa ngày 5 tháng 3 âm lịch năm 2026
- **THEN** ô ngày dương ấy hiện giỗ của người đó với kỳ "Giỗ thường"

#### Scenario: Giỗ đầu
- **WHEN** người mất năm âm lịch 2025 và người dùng mở tháng chứa ngày giỗ năm 2026
- **THEN** giỗ hiện với kỳ "Giỗ đầu"

#### Scenario: Tháng giao hai năm âm
- **WHEN** tháng dương 2/2026 có ngày thuộc năm âm 2025 (trước Tết 17/2) và ngày thuộc năm âm 2026 (từ Tết)
- **THEN** giỗ có ngày âm ở năm 2025 và giỗ có ngày âm ở năm 2026 đều hiện đúng ngày dương của chúng

### Requirement: Sinh nhật
Người chưa có ngày mất SHALL có sinh nhật trên lịch khi ngày sinh đủ ngày và tháng và sinh trong vòng 100 năm trở lại; sinh nhật SHALL theo lịch mà ngày sinh được nhập (ngày sinh dương thì theo ngày dương mỗi năm, ngày sinh âm thì theo ngày âm mỗi năm). Người đã có ngày mất MUST NOT có sinh nhật. Ngày sinh âm 30 mà tháng ấy năm đang xem chỉ có 29 ngày SHALL rơi vào ngày 29; sinh ngày 29/2 dương SHALL rơi vào 28/2 ở năm không nhuận.

#### Scenario: Sinh nhật dương
- **WHEN** một người chưa mất sinh ngày 17/9/1975 (dương) và người dùng mở tháng 9 năm 2026
- **THEN** ô 17/9/2026 hiện sinh nhật người đó

#### Scenario: Sinh nhật theo âm lịch
- **WHEN** một người chưa mất sinh ngày 1 tháng 1 âm lịch năm 1980 và người dùng mở tháng dương chứa mùng 1 Tết năm 2026
- **THEN** ô mùng 1 Tết hiện sinh nhật người đó

#### Scenario: Người đã mất
- **WHEN** một người có ngày mất
- **THEN** người ấy không có sinh nhật trên lịch

#### Scenario: Sinh 29/2
- **WHEN** một người chưa mất sinh ngày 29/2/2000 và người dùng mở tháng 2/2026
- **THEN** sinh nhật hiện ở ngày 28/2/2026

### Requirement: Danh sách sắp tới
Hệ thống SHALL hiện danh sách giỗ và sinh nhật trong 30 ngày tới kể từ hôm nay (kể cả hôm nay), theo thứ tự ngày; mỗi dòng ghi ngày dương, ngày âm, tên người, loại (kỳ giỗ hoặc sinh nhật), tên cuốn và số ngày còn lại ("hôm nay", "ngày mai" hoặc "còn N ngày"). Bấm một dòng SHALL mở người ấy trong cây của cuốn.

#### Scenario: Giỗ trong tuần tới
- **WHEN** hôm nay là 1/3/2026 và một người có giỗ ngày 5/3/2026
- **THEN** danh sách có dòng giỗ của người đó với "còn 4 ngày"

#### Scenario: Mở người từ danh sách
- **WHEN** người dùng bấm dòng giỗ của một người
- **THEN** app mở cuốn chứa người đó, chọn người đó và hiện bảng thông tin của họ

### Requirement: Lọc theo cuốn
Lịch và danh sách sắp tới SHALL gộp mọi cuốn trong dòng họ mà người dùng có quyền xem, và SHALL lọc được theo từng cuốn (chi); mỗi sự kiện SHALL ghi tên cuốn khi dòng họ có từ hai cuốn.

#### Scenario: Lọc một cuốn
- **WHEN** dòng họ có hai cuốn A và B, giỗ của người ở A và của người ở B cùng trong tháng, người dùng chọn lọc cuốn A
- **THEN** lịch chỉ còn giỗ của người ở cuốn A

### Requirement: Người chưa đủ ngày mất
Người đã có ghi chép mất nhưng thiếu ngày hoặc tháng mất SHALL không hiện trên lịch và SHALL được liệt kê trong mục "Chưa tính được giỗ" kèm lý do "thiếu ngày/tháng mất"; quản trị của cuốn SHALL có lối mở hồ sơ người ấy để bổ sung, người xem chỉ đọc.

#### Scenario: Chỉ biết năm mất
- **WHEN** một người có ngày mất chỉ ghi năm 1950
- **THEN** người ấy không có giỗ trên lịch và nằm trong mục "Chưa tính được giỗ" với lý do "thiếu ngày/tháng mất"

### Requirement: Quyền xem lịch
Mọi người có vai trò trong dòng họ (quản trị hoặc xem) SHALL xem được lịch của dòng họ. Lịch MUST chỉ gồm người thuộc các cuốn mà người dùng có quyền xem; người ngoài dòng họ MUST NOT đọc được dữ liệu lịch. Cuốn đã xoá MUST NOT hiện trên lịch.

#### Scenario: Người xem
- **WHEN** người chỉ có quyền xem mở mục "Ngày giỗ" của dòng họ
- **THEN** thấy lịch và danh sách sắp tới, không có nút sửa

#### Scenario: Cuốn đã xoá
- **WHEN** một cuốn đã bị đánh dấu xoá
- **THEN** giỗ và sinh nhật của người trong cuốn ấy không còn trên lịch
