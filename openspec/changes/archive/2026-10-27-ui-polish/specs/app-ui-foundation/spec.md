# Spec Delta

## Purpose

Nâng chất lượng nhìn của mọi màn mà không bớt bảo đảm trợ năng: tách lớp bằng nền và độ sâu thay cho viền đậm, và làm rõ thao tác nào là chính.

## MODIFIED Requirements

### Requirement: Viền và vùng bấm nhìn thấy được
Viền của ô nhập (ô chữ, ô chọn, ô nhiều dòng) SHALL có tương phản tối thiểu 3:1 với nền kề. Nút và thẻ bấm được SHALL nhận ra được nhờ chữ hoặc biểu tượng có nhãn cùng một ranh giới nhìn thấy (nền khác nền kề, bóng, hoặc viền nhạt); không bắt buộc viền đậm. Vòng focus bàn phím SHALL dày tối thiểu 3 px và nhìn thấy trên mọi nền.

#### Scenario: Viền ô nhập
- **WHEN** đo tương phản viền một ô nhập so với nền thẻ
- **THEN** tỉ lệ không dưới 3:1

#### Scenario: Thẻ bấm được không viền đậm
- **WHEN** một thẻ dòng họ hoặc cuốn nằm trên nền trang
- **THEN** thẻ có nền khác nền trang và có tên hoặc biểu tượng có nhãn, và khi bàn phím đặt focus vào thẻ thì vòng focus nhìn thấy được

## ADDED Requirements

### Requirement: Phân cấp thao tác
Mỗi màn hoặc bảng SHALL có nhiều nhất một nút chính (nền màu chính); các thao tác phụ SHALL nhẹ hơn về thị giác (nền nhạt, không nền, hoặc dòng trong danh sách thao tác); thao tác gỡ, xoá SHALL dùng màu nguy hiểm kèm chữ hoặc biểu tượng và đặt tách khỏi các thao tác khác.

#### Scenario: Bảng thông tin một người
- **WHEN** quản trị mở bảng thông tin của một người
- **THEN** "Sửa hồ sơ" là nút nền màu chính duy nhất, các thao tác thêm/sắp xếp/xem nhẹ hơn về thị giác, và "Gỡ" tách riêng ở cuối bảng

#### Scenario: Danh sách cuốn
- **WHEN** quản trị dòng họ mở danh sách cuốn
- **THEN** chỉ "Tạo cuốn gia phả" có nền màu chính

### Requirement: Độ sâu nhất quán
Thẻ, tấm trượt, hộp thoại, menu và thông báo ngắn SHALL dùng một thang đổ bóng chung (không đặt bóng tuỳ ý từng chỗ); lớp nổi cao hơn SHALL có bóng đậm hơn lớp dưới.

#### Scenario: Menu trên thẻ
- **WHEN** mở menu của một cuốn nằm trên thẻ
- **THEN** menu có bóng đậm hơn thẻ và nhìn rõ là đang nổi lên trên
