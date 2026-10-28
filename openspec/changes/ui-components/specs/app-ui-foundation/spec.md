# Spec Delta

## ADDED Requirements

### Requirement: Ô chọn theo tông ứng dụng
Mọi ô chọn một giá trị trong danh sách SHALL hiện danh sách xổ ra theo màu, chữ và bo góc của ứng dụng (không dùng danh sách mặc định của hệ điều hành). Ô chọn SHALL mở và chọn được bằng bàn phím (mũi tên, Enter, Esc), có nhãn đọc được cho trình đọc màn hình, và mỗi mục trong danh sách SHALL có vùng chạm tối thiểu 44 px.

#### Scenario: Chọn bằng bàn phím
- **WHEN** người dùng đặt focus vào ô "Phạm vi", bấm mũi tên xuống rồi Enter
- **THEN** danh sách mở, mục được chọn đổi và danh sách đóng, focus trở lại ô

#### Scenario: Danh sách theo tông ứng dụng
- **WHEN** người dùng mở ô "Giới tính" trên máy tính
- **THEN** danh sách hiện nền trắng bo góc, mục đang chọn có dấu tích và màu nhấn đỏ trầm, không phải danh sách nền xanh của hệ điều hành

### Requirement: Lựa chọn ít mục bằng nhóm nút
Lựa chọn từ hai đến bốn giá trị ngắn (giới tính, Dương/Âm lịch, vai trò, hạn dùng link) SHALL hiện tất cả giá trị cùng lúc dưới dạng nhóm nút chọn một thay vì ô xổ xuống; giá trị đang chọn SHALL nhận ra được không chỉ bằng màu.

#### Scenario: Giới tính trong hồ sơ
- **WHEN** quản trị mở hồ sơ một người
- **THEN** giới tính hiện ba nút "Nam", "Nữ", "Chưa rõ", nút đang chọn có nền khác và dấu tích hoặc chữ đậm, và trình đọc màn hình đọc được nút nào đang chọn

### Requirement: Form dài chia nhóm
Hộp thoại có từ sáu ô nhập trở lên SHALL chia các ô thành nhóm có tiêu đề, và chân hộp thoại chứa nút lưu SHALL luôn nhìn thấy khi cuộn nội dung.

#### Scenario: Hồ sơ trên điện thoại
- **WHEN** quản trị mở hồ sơ một người trên màn 375 px và cuộn xuống ô "Tiểu sử"
- **THEN** các ô nằm trong nhóm "Thông tin chung", "Ngày sinh – ngày mất", "Nơi chốn", "Tiểu sử", và nút "Lưu hồ sơ" vẫn nhìn thấy ở chân

### Requirement: Nút quanh khung người không bị che
Khi trỏ chuột hoặc đặt focus bàn phím vào một khung người trên sơ đồ, khung đó và các nút quanh nó SHALL nằm trên mọi khung khác, để không nút nào bị khung kế bên che.

#### Scenario: Thêm vợ/chồng giữa hai vợ chồng
- **WHEN** quản trị trỏ chuột vào khung người chồng có khung vợ nằm sát bên phải
- **THEN** nút "Thêm vợ/chồng" hiện đầy đủ, bấm được, không bị khung vợ che
