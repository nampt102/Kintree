# clan-membership Specification

## Purpose
Cho quản trị dòng họ đưa con cháu và người cùng quản lý vào dòng họ hoặc một cuốn, bằng email hoặc link mời cho người xem, và giữ danh sách thành viên đúng mà không để dòng họ mất hết quản trị.

## Requirements

### Requirement: Chỉ quản trị dòng họ quản lý thành viên
Chỉ quản trị cấp dòng họ SHALL mời, đổi vai trò, gỡ thành viên, huỷ lời mời và tạo hay thu hồi link mời của dòng họ ấy (kể cả thành viên chỉ thuộc một cuốn trong dòng họ). Quản trị chỉ ở một cuốn, người xem và người ngoài dòng họ MUST bị cơ sở dữ liệu từ chối; giao diện SHALL không hiện lối vào "Thành viên" cho họ.

#### Scenario: Quản trị của một cuốn mời người
- **WHEN** người chỉ là quản trị của cuốn A gọi lệnh mời một email vào cuốn A
- **THEN** cơ sở dữ liệu từ chối và không có lời mời nào được tạo

#### Scenario: Người xem không thấy lối vào
- **WHEN** người chỉ có quyền xem mở trang nhà dòng họ
- **THEN** không có lối vào "Thành viên"

#### Scenario: Quản trị dòng họ khác
- **WHEN** quản trị của dòng họ B gọi lệnh liệt kê thành viên của dòng họ A
- **THEN** bị từ chối

### Requirement: Mời bằng email
Quản trị dòng họ SHALL mời được một email với vai trò quản trị hoặc xem, phạm vi cả dòng họ hoặc một cuốn chưa xoá của dòng họ. Nếu email đã có tài khoản thì người ấy SHALL có quyền ngay. Nếu chưa có thì lời mời SHALL nằm chờ và thành quyền khi người ấy đăng nhập lần đầu bằng đúng email đó, không phân biệt hoa thường. Hệ thống MUST NOT gửi thư.

#### Scenario: Email đã có tài khoản
- **WHEN** quản trị mời email của một người đã đăng ký với vai trò xem cho cả dòng họ
- **THEN** người ấy thấy dòng họ trong danh sách với vai trò xem mà không cần làm gì thêm

#### Scenario: Email chưa có tài khoản
- **WHEN** quản trị mời "Anh.Ba@Example.com" làm quản trị cuốn A, rồi người dùng "anh.ba@example.com" đăng nhập lần đầu
- **THEN** người ấy là quản trị của cuốn A và lời mời biến khỏi danh sách đang chờ

#### Scenario: Email sai
- **WHEN** quản trị gửi biểu mẫu mời với email không hợp lệ
- **THEN** lỗi hiện dưới ô email và không tạo gì

#### Scenario: Báo cho người được mời
- **WHEN** quản trị mời xong một email
- **THEN** giao diện cho sao chép lời nhắn có tên dòng họ và địa chỉ app để tự gửi cho người ấy

### Requirement: Mời lại người đã có vai trò
Mời một email đã có vai trò, hoặc đã có lời mời đang chờ, ở đúng phạm vi đó SHALL cập nhật vai trò thay vì tạo bản thứ hai. Mỗi người có tối đa một vai trò ở mỗi phạm vi.

#### Scenario: Nâng người xem thành quản trị bằng lời mời
- **WHEN** quản trị mời lại email đang là người xem cả dòng họ với vai trò quản trị
- **THEN** người ấy có đúng một vai trò ở dòng họ là quản trị

### Requirement: Danh sách thành viên
Quản trị dòng họ SHALL xem được danh sách mọi thành viên và lời mời đang chờ của dòng họ. Mỗi dòng ghi email, vai trò, phạm vi (cả dòng họ hoặc tên cuốn) và trạng thái (đã vào hoặc chờ đăng nhập). Thành viên của cuốn đã xoá MUST NOT xuất hiện.

#### Scenario: Có cả người đã vào và lời mời chờ
- **WHEN** dòng họ có 2 quản trị, 3 người xem ở cuốn A và 1 lời mời đang chờ
- **THEN** danh sách có 6 dòng, dòng lời mời ghi "chờ đăng nhập"

### Requirement: Đổi vai trò, gỡ và huỷ lời mời
Quản trị dòng họ SHALL đổi được vai trò quản trị hoặc xem của một thành viên, gỡ thành viên và huỷ lời mời đang chờ. Người bị gỡ SHALL mất quyền ngay ở lần tải kế tiếp. Gỡ hay hạ quyền một quản trị khác SHALL hỏi xác nhận trên giao diện.

#### Scenario: Gỡ người xem
- **WHEN** quản trị gỡ một người xem rồi người ấy tải lại app
- **THEN** người ấy không còn thấy dòng họ và truy vấn thẳng cuốn không nhận được dòng nào

#### Scenario: Huỷ lời mời
- **WHEN** quản trị huỷ lời mời đang chờ của một email rồi người ấy đăng nhập lần đầu
- **THEN** người ấy không có vai trò nào trong dòng họ

### Requirement: Luôn còn quản trị dòng họ
Mỗi dòng họ SHALL luôn còn ít nhất một quản trị cấp dòng họ đã có tài khoản. Cơ sở dữ liệu MUST từ chối gỡ hoặc hạ quyền quản trị cấp dòng họ cuối cùng, dù người làm là chính người ấy, quản trị khác hay quản trị nền tảng.

#### Scenario: Tự hạ quyền khi là quản trị duy nhất
- **WHEN** quản trị duy nhất của dòng họ đổi vai trò của mình thành xem
- **THEN** bị từ chối với thông báo cần có quản trị khác trước, vai trò không đổi

#### Scenario: Còn quản trị khác
- **WHEN** dòng họ có 2 quản trị và một người gỡ người kia
- **THEN** gỡ được

### Requirement: Tạo link mời cho người xem
Quản trị dòng họ SHALL tạo được link mời với phạm vi cả dòng họ hoặc một cuốn, hạn dùng 1, 7 hoặc 30 ngày, và mã mời tuỳ chọn. Link MUST chỉ cấp vai trò xem. Địa chỉ đầy đủ của link SHALL chỉ hiện một lần ngay khi tạo; danh sách sau đó chỉ hiện phạm vi, hạn, có mã hay không và số người đã nhận.

#### Scenario: Tạo link có mã
- **WHEN** quản trị tạo link cho cuốn A, hạn 7 ngày, mã mời "1945"
- **THEN** giao diện hiện link để sao chép và danh sách có link mới ghi "có mã mời", hết hạn sau 7 ngày

#### Scenario: Cố tạo link quản trị
- **WHEN** có lời gọi thẳng API tạo link với vai trò quản trị
- **THEN** cơ sở dữ liệu từ chối

### Requirement: Nhận lời mời qua link
Người đã đăng nhập mở link còn hiệu lực SHALL thấy tên dòng họ (và tên cuốn nếu có) cùng nút "Nhận lời mời". Nếu link có mã mời thì SHALL nhập đúng mã. Nhận xong SHALL có vai trò xem ở phạm vi của link và được đưa vào dòng họ ấy. Người đã có vai trò bằng hoặc cao hơn ở phạm vi đó SHALL giữ nguyên vai trò.

#### Scenario: Nhận link không mã
- **WHEN** người đã đăng nhập mở link mời xem cả dòng họ và bấm "Nhận lời mời"
- **THEN** người ấy vào trang nhà dòng họ với vai trò xem

#### Scenario: Quản trị mở link xem
- **WHEN** quản trị của dòng họ mở link mời xem của chính dòng họ ấy và nhận
- **THEN** vẫn là quản trị

### Requirement: Mở link khi chưa đăng nhập
Mở link khi chưa đăng nhập SHALL đưa tới màn đăng nhập. Sau khi đăng nhập bằng bất kỳ cách nào (mã email hay Google) người dùng SHALL quay lại màn nhận lời mời của đúng link đó. Mã link MUST NOT được gửi lên máy chủ trừ lời gọi nhận lời mời.

#### Scenario: Đăng nhập bằng mã email giữa chừng
- **WHEN** người chưa đăng nhập mở link mời, nhập email và mã OTP
- **THEN** sau khi đăng nhập thấy ngay màn nhận lời mời của link ấy

### Requirement: Link hết hiệu lực
Link đã hết hạn hoặc đã thu hồi SHALL không nhận được, và giao diện SHALL nói rõ lý do kèm lời khuyên xin link mới từ quản trị. Link không tồn tại SHALL báo như link không hợp lệ, không cho biết dòng họ nào.

#### Scenario: Link hết hạn
- **WHEN** người dùng mở link đã quá hạn
- **THEN** thấy "Link đã hết hạn, hãy xin quản trị dòng họ link mới" và không có nút nhận

#### Scenario: Thu hồi link
- **WHEN** quản trị thu hồi link rồi một người mở link ấy
- **THEN** thấy link đã bị thu hồi và không nhận được

### Requirement: Khoá link khi nhập sai mã mời
Nhập sai mã mời 5 lần liên tiếp trên một link SHALL khoá link ấy 15 phút với mọi người. Trong thời gian khoá, nhập đúng mã cũng MUST NOT nhận được. Số lần sai SHALL được đếm cả khi lời gọi báo lỗi.

#### Scenario: Sai 5 lần
- **WHEN** một người nhập sai mã mời 5 lần rồi nhập đúng
- **THEN** lần nhập đúng vẫn bị từ chối với thông báo link đang tạm khoá, thử lại sau 15 phút

#### Scenario: Hết thời gian khoá
- **WHEN** link bị khoá đã quá 15 phút và người dùng nhập đúng mã
- **THEN** nhận được lời mời
