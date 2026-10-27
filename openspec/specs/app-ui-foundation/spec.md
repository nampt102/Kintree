# app-ui-foundation Specification

## Purpose

Các bảo đảm chung mà mọi màn hình của Kintree phải giữ để dễ dùng với người lớn tuổi và trên điện thoại: vùng chạm, tương phản, cỡ chữ, chuyển động, bàn phím và phản hồi thao tác.

## Requirements

### Requirement: Vùng chạm đủ lớn
Mọi phần tử bấm được (nút, nút biểu tượng, ô nhập, ô chọn, mục danh sách) SHALL có vùng chạm tối thiểu 44 × 44 px CSS trên mọi kích thước màn hình, kể cả khi hình vẽ của nút nhỏ hơn.

#### Scenario: Nút biểu tượng trên điện thoại
- **WHEN** mở bất kỳ màn hình nào ở bề rộng 375 px
- **THEN** không có phần tử bấm được nào có vùng chạm nhỏ hơn 44 × 44 px

### Requirement: Tương phản và chữ
Chữ thường SHALL có tương phản tối thiểu 4,5:1 với nền, chữ lớn và biểu tượng tối thiểu 3:1; cỡ chữ nội dung mặc định và chữ trong ô nhập SHALL không dưới 16 px; khi người dùng phóng chữ của trình duyệt hoặc hệ điều hành tới 200%, nội dung SHALL không bị cắt hay chồng lên nhau.

#### Scenario: Màu chữ phụ
- **WHEN** đo tương phản của chữ phụ (năm sinh, chú thích) trên nền thẻ
- **THEN** tỉ lệ không dưới 4,5:1

#### Scenario: Phóng chữ 200%
- **WHEN** cỡ chữ gốc của trình duyệt tăng gấp đôi
- **THEN** các màn danh sách cuốn, hồ sơ và danh sách người vẫn đọc và thao tác được, không phải cuộn ngang

### Requirement: Biểu tượng có tên
Mọi nút chỉ có biểu tượng SHALL có tên đọc được cho trình đọc màn hình; các thao tác chính trên điện thoại (thêm con, thêm vợ/chồng, sửa hồ sơ, gỡ) SHALL hiện cả biểu tượng lẫn chữ.

#### Scenario: Trình đọc màn hình
- **WHEN** trình đọc màn hình đi qua các nút trên khung một người
- **THEN** mỗi nút đọc ra việc nó làm kèm tên người, ví dụ "Thêm con cho Nguyễn Văn An"

### Requirement: Dùng được bằng bàn phím
Mọi thao tác SHALL làm được bằng bàn phím; phần tử đang được chọn SHALL có viền nhấn nhìn thấy rõ; hộp thoại và tấm trượt SHALL giữ con trỏ bàn phím bên trong, đóng bằng Esc và trả con trỏ về chỗ cũ khi đóng.

#### Scenario: Mở rồi đóng hộp thoại
- **WHEN** người dùng mở hộp thoại "Thêm con" bằng bàn phím rồi bấm Esc
- **THEN** hộp thoại đóng và con trỏ bàn phím trở lại nút đã mở nó

### Requirement: Giảm chuyển động
Khi người dùng bật tuỳ chọn giảm chuyển động của hệ điều hành, hệ thống SHALL tắt hiệu ứng nhấp nháy, trượt và thu phóng có hoạt ảnh, chuyển ngay tới trạng thái cuối.

#### Scenario: Tìm một người khi bật giảm chuyển động
- **WHEN** người dùng chọn một kết quả tìm kiếm trong khi hệ thống đang bật giảm chuyển động
- **THEN** sơ đồ nhảy thẳng tới người ấy, khung được làm nổi bằng viền tĩnh, không nhấp nháy

#### Scenario: Làm nổi khi chưa bật giảm chuyển động
- **WHEN** người dùng chọn một kết quả tìm kiếm
- **THEN** hiệu ứng làm nổi chạy tối đa vài nhịp rồi dừng ở viền tĩnh, không lặp vô hạn

### Requirement: Phản hồi sau mỗi thao tác
Sau mỗi thao tác thêm, sửa, gỡ hay sắp thứ tự thành công, hệ thống SHALL báo ngắn gọn bằng thông báo tự ẩn; khi thao tác bị từ chối, lỗi SHALL hiện ngay cạnh chỗ nhập liên quan bằng câu tiếng Việt và giữ nguyên dữ liệu người dùng đã nhập.

#### Scenario: Thêm con thành công
- **WHEN** người dùng thêm con "Nguyễn Văn Bình"
- **THEN** hộp thoại đóng, một thông báo "Đã thêm Nguyễn Văn Bình" hiện vài giây rồi tự ẩn, và khung người mới được làm nổi

#### Scenario: Thêm bị từ chối
- **WHEN** người dùng bấm thêm con mà chưa chọn giới tính
- **THEN** hộp thoại vẫn mở, họ tên đã nhập vẫn còn, lỗi hiện ngay dưới ô giới tính và con trỏ bàn phím chuyển tới ô giới tính

### Requirement: Viền và vùng bấm nhìn thấy được
Viền của ô nhập (ô chữ, ô chọn, ô nhiều dòng) SHALL có tương phản tối thiểu 3:1 với nền kề. Nút và thẻ bấm được SHALL nhận ra được nhờ chữ hoặc biểu tượng có nhãn cùng một ranh giới nhìn thấy (nền khác nền kề, bóng, hoặc viền nhạt); không bắt buộc viền đậm. Vòng focus bàn phím SHALL dày tối thiểu 3 px và nhìn thấy trên mọi nền.

#### Scenario: Viền ô nhập
- **WHEN** đo tương phản viền một ô nhập so với nền thẻ
- **THEN** tỉ lệ không dưới 3:1

#### Scenario: Thẻ bấm được không viền đậm
- **WHEN** một thẻ dòng họ hoặc cuốn nằm trên nền trang
- **THEN** thẻ có nền khác nền trang và có tên hoặc biểu tượng có nhãn, và khi bàn phím đặt focus vào thẻ thì vòng focus nhìn thấy được

### Requirement: Không mất dữ liệu đang nhập khi đóng nhầm
Khi đóng hộp thoại hay tấm trượt đang có dữ liệu chưa lưu (bằng Esc, nút đóng, bấm ra ngoài hay kéo xuống), hệ thống SHALL hỏi xác nhận trước khi bỏ; khi chưa nhập gì SHALL đóng ngay.

#### Scenario: Đóng khi đã nhập tên
- **WHEN** người dùng đã gõ họ tên trong hộp thoại "Thêm con" rồi bấm Esc
- **THEN** hệ thống hỏi có bỏ dữ liệu đã nhập không, và chỉ đóng khi người dùng xác nhận

#### Scenario: Đóng khi chưa nhập gì
- **WHEN** người dùng mở hộp thoại "Thêm con" rồi bấm Esc ngay
- **THEN** hộp thoại đóng, không hỏi

### Requirement: Trạng thái trống và đang tải
Màn hình chưa có dữ liệu SHALL giải thích một câu và đưa đúng một nút hành động chính; khi đang tải SHALL hiện khung giữ chỗ thay vì màn hình trắng.

#### Scenario: Cuốn chưa có ai
- **WHEN** mở một cuốn gia phả chưa có người nào
- **THEN** màn hình có một câu giải thích và một nút "Thêm thuỷ tổ"

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
