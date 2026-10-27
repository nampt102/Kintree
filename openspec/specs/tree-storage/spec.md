# tree-storage Specification

## Purpose
Lưu và đọc cuốn gia phả trên máy chủ cho người đã đăng nhập, sao cho nhiều thiết bị thấy cùng dữ liệu, một lần sửa hoặc thành công trọn vẹn hoặc không để lại gì, và không còn bản sao nào nằm lại trên thiết bị.

## Requirements

### Requirement: Đọc cuốn từ máy chủ
Khi mở một cuốn, hệ thống SHALL đọc toàn bộ người, quan hệ cha/mẹ–con, hôn nhân và thông tin cuốn từ máy chủ, kể cả phần tử đã gỡ (đánh dấu), và dựng đúng nội dung và thứ tự đã lưu.

#### Scenario: Mở trên thiết bị khác
- **WHEN** người dùng sửa cuốn trên một thiết bị rồi mở cuốn ấy trên thiết bị khác bằng cùng tài khoản
- **THEN** thiết bị sau thấy đúng các thay đổi, thứ tự anh chị em và thứ tự vợ/chồng

#### Scenario: Cuốn đã gỡ người
- **WHEN** mở một cuốn có người đã gỡ
- **THEN** người đã gỡ không hiện trên sơ đồ nhưng vẫn có trong bản sao tải về

### Requirement: Cuốn đã xoá không đọc được
Cuốn đã bị đánh dấu xoá SHALL không xuất hiện trong danh sách và MUST NOT đọc được người hay quan hệ của nó qua giao diện hay API, kể cả với quản trị; dữ liệu vẫn nằm trên máy chủ.

#### Scenario: Mở cuốn đã xoá bằng mã
- **WHEN** người dùng mở thẳng một cuốn đã xoá bằng mã đã biết
- **THEN** nhận thông báo không tìm thấy cuốn

### Requirement: Ghi theo dòng thay đổi, nguyên tử
Sau mỗi thao tác sửa thành công, hệ thống SHALL gửi lên máy chủ chỉ những dòng đã đổi (người, quan hệ, hôn nhân, thông tin cuốn) trong một giao dịch duy nhất: hoặc tất cả được ghi hoặc không có gì được ghi.

#### Scenario: Thêm con kèm quan hệ
- **WHEN** người dùng thêm một người con (một người và hai quan hệ cha/mẹ)
- **THEN** máy chủ có đủ người và hai quan hệ, hoặc không có gì trong ba thứ đó

#### Scenario: Sửa một người
- **WHEN** người dùng sửa ngày sinh của một người
- **THEN** chỉ dòng của người ấy được gửi và ghi, các dòng khác không bị ghi đè

### Requirement: Ghi lỗi thì hoàn lại
Khi ghi lên máy chủ bị lỗi (mất mạng, bị từ chối vì quyền, hết phiên), hệ thống SHALL hoàn màn hình về bản đã lưu gần nhất và báo lỗi bằng tiếng Việt kèm cách thử lại; MUST NOT để màn hình hiện dữ liệu khác với máy chủ mà không báo.

#### Scenario: Mất mạng khi sửa
- **WHEN** người dùng thêm một người trong lúc mất mạng
- **THEN** người ấy biến khỏi sơ đồ, hiện thông báo không lưu được, và dữ liệu máy chủ không đổi

#### Scenario: Bị từ chối vì quyền
- **WHEN** quyền của người dùng bị hạ xuống chỉ xem rồi họ sửa tiếp
- **THEN** sửa bị hoàn lại và có thông báo không đủ quyền

### Requirement: Sửa liên tiếp theo thứ tự
Các lần sửa liên tiếp nhanh SHALL được ghi lên máy chủ đúng thứ tự thao tác; một lần ghi lỗi MUST NOT làm các lần sửa sau đó bị ghi trên nền dữ liệu sai.

#### Scenario: Hai thao tác liền nhau
- **WHEN** người dùng thêm một người rồi thêm con cho chính người ấy ngay lập tức
- **THEN** cả hai được ghi, và con có cha/mẹ đúng

### Requirement: Người khác sửa khác người thì không đè nhau
Hai người cùng sửa một cuốn nhưng sửa những người khác nhau SHALL giữ cả hai thay đổi (ghi theo dòng, không ghi đè cả cuốn); khi cùng sửa một người, lần ghi sau SHALL thắng và người ghi trước thấy giá trị mới khi mở lại cuốn.

#### Scenario: Hai thiết bị, hai người
- **WHEN** thiết bị A sửa tên người X và thiết bị B sửa tên người Y, rồi cả hai tải lại cuốn
- **THEN** cả hai thấy tên mới của X và của Y

### Requirement: Không lưu cuốn trên thiết bị
Ứng dụng MUST NOT lưu nội dung cây, người hay quan hệ vào `localStorage`, `sessionStorage` hay IndexedDB; ngoài phiên đăng nhập, không có dữ liệu dòng họ nào nằm lại trên thiết bị sau khi đăng xuất.

#### Scenario: Sau khi đăng xuất
- **WHEN** người dùng mở, sửa một cuốn rồi đăng xuất
- **THEN** bộ nhớ trình duyệt không chứa tên người hay nội dung cuốn

### Requirement: Giữ bản sao tải về
Nút "Tải bản sao" SHALL vẫn tải tệp JSON của cuốn đang mở, gồm cả phần tử đã gỡ, từ dữ liệu đang hiển thị.

#### Scenario: Tải bản sao
- **WHEN** người dùng bấm "Tải bản sao" ở một cuốn đã có người bị gỡ
- **THEN** tệp chứa người đã gỡ cùng dấu thời điểm gỡ
