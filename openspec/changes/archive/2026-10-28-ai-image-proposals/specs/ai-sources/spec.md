# Spec Delta

## Purpose

Cho người chép phả đưa tư liệu (lát đầu: ảnh bia mộ, phả cũ, bài vị) vào một cuốn và để AI đọc ở máy chủ, sinh đề xuất có kiểm tra cho hàng chờ duyệt, không bao giờ ghi thẳng vào cây.

## ADDED Requirements

### Requirement: Đưa ảnh vào cuốn
Quản trị của một cuốn (cấp cuốn hoặc cấp dòng họ) SHALL chụp hoặc chọn một ảnh, chọn loại (bia mộ, trang phả, bài vị, khác) và đặt tên ngắn tuỳ chọn. App SHALL thu nhỏ ảnh còn cạnh dài tối đa 2048 px dạng JPEG trước khi tải lên. Người xem và người ngoài MUST NOT đưa được ảnh vào.

#### Scenario: Quản trị đưa ảnh bia mộ
- **WHEN** quản trị của cuốn chọn một ảnh 4000 × 3000 px, loại "Bia mộ", rồi bấm "Đưa vào"
- **THEN** ảnh được lưu (cạnh dài 2048 px) và tư liệu hiện trong danh sách tư liệu của cuốn với trạng thái "Đang đọc"

#### Scenario: Người xem
- **WHEN** người chỉ có quyền xem mở cuốn
- **THEN** không có nút đưa ảnh vào, và gọi thẳng API tải ảnh lên bị từ chối

#### Scenario: Không phải ảnh
- **WHEN** quản trị chọn một tệp không phải ảnh JPEG, PNG hoặc WebP
- **THEN** app báo "Chỉ nhận ảnh JPEG, PNG hoặc WebP" và không tải gì lên

### Requirement: Ảnh riêng tư theo dòng họ
Ảnh tư liệu SHALL lưu ở kho riêng tư. Chỉ người có vai trò trong cuốn chứa tư liệu SHALL xem được ảnh, qua địa chỉ có hạn dùng; người ngoài MUST NOT tải được ảnh dù biết đường dẫn. Quản trị nền tảng MUST NOT xem được ảnh chỉ vì là quản trị nền tảng.

#### Scenario: Người ngoài đoán đường dẫn
- **WHEN** người không có vai trò trong dòng họ xin địa chỉ tải một ảnh tư liệu bằng đường dẫn đã biết
- **THEN** bị từ chối

### Requirement: AI đọc ảnh và sinh đề xuất
Sau khi ảnh được đưa vào, máy chủ SHALL gửi ảnh cùng danh sách người đã có trong cuốn (họ tên, giới tính, năm sinh, năm mất) cho AI và nhận về các đề xuất thuộc ba loại: thêm người, sửa một trường của người đã có, thêm quan hệ (cha/mẹ–con hoặc vợ chồng). Mỗi đề xuất SHALL có vùng ảnh nguồn (khung chữ nhật tính theo tỉ lệ ảnh), nhà cung cấp và model đã sinh ra nó. AI MUST NOT ghi vào người hay quan hệ.

#### Scenario: Ảnh bia mộ của người chưa có
- **WHEN** AI đọc bia mộ ghi "Nguyễn Văn Thử, sinh 1901, mất ngày 5 tháng 3 năm Quý Tỵ" của người chưa có trong cuốn
- **THEN** có một đề xuất thêm người kèm ngày mất âm lịch và vùng ảnh, số người trong cuốn không đổi

#### Scenario: Ảnh có thông tin của người đã có
- **WHEN** AI thấy nơi an táng của một người đã có trong cuốn
- **THEN** có đề xuất sửa trường "nơi an táng" của đúng người đó, không có đề xuất thêm người mới

### Requirement: Kiểm kết quả AI theo schema
Máy chủ SHALL kiểm kết quả AI theo một schema cố định (loại đề xuất, trường, kiểu ngày không đầy đủ, vùng ảnh trong khoảng 0–1). Nếu kết quả không khớp schema hoặc gọi AI lỗi, máy chủ MUST NOT tạo đề xuất nào từ lần đọc đó và SHALL ghi tư liệu ở trạng thái lỗi kèm lý do ngắn.

#### Scenario: AI trả về sai schema
- **WHEN** AI trả về một đề xuất thiếu vùng ảnh
- **THEN** không có đề xuất nào từ ảnh đó được tạo, và tư liệu hiện "Đọc lỗi" cùng nút "Đọc lại"

### Requirement: Trạng thái xử lý và đọc lại
Mỗi tư liệu SHALL có trạng thái "Đang đọc", "Đã đọc" (kèm số đề xuất) hoặc "Đọc lỗi". Quản trị SHALL đọc lại được tư liệu lỗi; đọc lại một tư liệu đã đọc MUST NOT nhân đôi các đề xuất đang chờ của nó.

#### Scenario: Đọc lại sau lỗi
- **WHEN** quản trị bấm "Đọc lại" ở tư liệu "Đọc lỗi" và lần này AI trả kết quả hợp lệ
- **THEN** tư liệu thành "Đã đọc" và các đề xuất xuất hiện trong hàng chờ

### Requirement: Chọn nhà cung cấp AI bằng cấu hình
Nhà cung cấp và model đọc ảnh SHALL chọn bằng cấu hình máy chủ, không đổi code. Khi chưa cấu hình, máy chủ SHALL dùng bộ giả lập trả kết quả cố định và MUST NOT gửi ảnh ra ngoài. Khoá API MUST NOT xuống app.

#### Scenario: Chưa có khoá AI
- **WHEN** máy chủ chưa đặt nhà cung cấp và quản trị đưa một ảnh vào
- **THEN** đề xuất được tạo từ bộ giả lập với nhà cung cấp ghi "mock", và không có yêu cầu mạng nào ra ngoài máy chủ
