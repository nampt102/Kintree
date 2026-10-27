# family-tree-editing Specification

## Purpose

Cho người chép phả tạo cuốn gia phả và thêm, sửa, gỡ người cùng quan hệ trong cuốn đó, trong khi cây luôn giữ hợp lệ theo `family-tree-integrity`.

## Requirements

### Requirement: Tạo cuốn gia phả
Người dùng SHALL tạo được một cuốn gia phả với tên (bắt buộc), vùng miền xưng hô (Bắc, Trung hoặc Nam, mặc định Bắc) và mô tả tùy chọn; người dùng SHALL có thể tạo nhiều cuốn và mỗi cuốn có dữ liệu riêng.

#### Scenario: Tạo cuốn đầu tiên
- **WHEN** người dùng tạo cuốn tên "Chi trưởng" vùng Nam
- **THEN** cuốn xuất hiện trong danh sách với vùng Nam và chưa có ai

#### Scenario: Thiếu tên
- **WHEN** người dùng tạo cuốn với tên trống hoặc chỉ có khoảng trắng
- **THEN** hệ thống từ chối và báo thiếu tên, không tạo cuốn

### Requirement: Thêm người chỉ cần họ tên và giới tính
Hệ thống SHALL chỉ bắt buộc họ tên và giới tính khi thêm một người; mọi mục khác SHALL được để trống; người đầu tiên của một cuốn SHALL là thuỷ tổ.

#### Scenario: Thuỷ tổ
- **WHEN** người dùng thêm người đầu tiên vào cuốn trống
- **THEN** người ấy được đánh dấu là thuỷ tổ và ở đời 1

#### Scenario: Thiếu giới tính
- **WHEN** người dùng thêm người không chọn giới tính
- **THEN** hệ thống từ chối và báo thiếu giới tính

### Requirement: Thêm con
Khi thêm con cho một người trong họ, hệ thống SHALL hỏi loại quan hệ (ruột, nuôi hoặc riêng); nếu người ấy có nhiều vợ/chồng thì SHALL hỏi đây là con chung với ai; con SHALL được xếp cuối trong thứ tự anh chị em.

#### Scenario: Con ruột chung với vợ
- **WHEN** người dùng thêm con ruột cho một người đang có một vợ và chọn người vợ làm mẹ
- **THEN** người con ở đời kế tiếp, nối với cả hai người, và đứng cuối các anh chị em

#### Scenario: Chọn sai vợ chồng
- **WHEN** người dùng chọn làm cha/mẹ kia một người không phải vợ/chồng của người đang thêm con
- **THEN** hệ thống từ chối và không thêm

### Requirement: Dâu rể không tự thêm con
Hệ thống MUST chỉ cho thêm con từ phía người trong họ; người ngoại tộc chỉ có thể là cha hoặc mẹ kia của đứa con ấy.

#### Scenario: Thêm con từ dâu
- **WHEN** người dùng chọn thêm con từ một người ngoại tộc
- **THEN** hệ thống không cho thực hiện và gợi ý thêm từ chồng hoặc vợ trong họ của người ấy

### Requirement: Thêm vợ hoặc chồng
Khi thêm vợ/chồng cho một người trong họ, hệ thống SHALL đánh dấu người mới là ngoại tộc, đặt cùng đời với người ấy và xếp vào cuối thứ tự các bà; một người trong họ MAY có nhiều vợ/chồng, một người ngoại tộc MUST chỉ có một vợ/chồng trong cuốn.

#### Scenario: Cụ ông có hai bà
- **WHEN** người dùng thêm vợ thứ hai cho một người nam đã có một vợ
- **THEN** hệ thống thêm bà thứ hai, ngoại tộc, cùng đời, đứng sau bà thứ nhất

#### Scenario: Dâu thêm chồng thứ hai
- **WHEN** người dùng thêm một chồng nữa cho một người ngoại tộc đã có chồng
- **THEN** hệ thống từ chối

### Requirement: Thêm cha hoặc mẹ còn thiếu
Hệ thống SHALL cho thêm mẹ cho người chỉ mới có cha, hoặc thêm cha cho người chỉ mới có mẹ, bằng cách tạo người ngoại tộc làm vợ/chồng của cha/mẹ đã có nếu họ chưa có vợ/chồng; hệ thống MUST NOT cho thêm cha mẹ cho thuỷ tổ, vợ/chồng của thuỷ tổ, hay người chưa có cha mẹ nào.

#### Scenario: Thêm mẹ
- **WHEN** người dùng thêm mẹ cho một người đã có cha và cha chưa có vợ
- **THEN** hệ thống tạo người mẹ ngoại tộc, nối làm vợ của người cha và làm mẹ của người con

#### Scenario: Thuỷ tổ bị khoá
- **WHEN** người dùng thêm cha cho thuỷ tổ
- **THEN** hệ thống từ chối và báo thuỷ tổ không thêm được cha mẹ

### Requirement: Gỡ người nhưng giữ lại dữ liệu
Hệ thống SHALL chỉ cho gỡ một người khi người ấy không có con (đang hiện); gỡ cả nhánh (người và mọi con cháu) SHALL cần thao tác riêng và xác nhận nêu số người sẽ bị gỡ; người bị gỡ SHALL biến khỏi sơ đồ, danh sách, tìm kiếm và các luật toàn vẹn, nhưng dữ liệu SHALL được giữ lại và đánh dấu đã gỡ kèm thời điểm; vợ/chồng ngoại tộc không còn liên hệ nào với người đang hiện SHALL bị gỡ cùng; thuỷ tổ MUST NOT bị gỡ.

#### Scenario: Gỡ người không có con
- **WHEN** người dùng gỡ một người không có con
- **THEN** người ấy biến khỏi sơ đồ và danh sách, người khác không đổi, và dữ liệu của người ấy vẫn còn trong tệp lưu, đánh dấu đã gỡ

#### Scenario: Gỡ người có con
- **WHEN** người dùng gỡ một người đang có con bằng thao tác gỡ thường
- **THEN** hệ thống từ chối và báo cần gỡ cả nhánh hoặc gỡ các con trước

#### Scenario: Gỡ cả nhánh
- **WHEN** người dùng xác nhận gỡ nhánh của một người
- **THEN** người ấy, mọi con cháu và vợ/chồng ngoại tộc chỉ liên hệ với nhánh ấy đều biến khỏi cây, và cùng mang một dấu thời điểm gỡ để có thể khôi phục cả nhánh sau này

#### Scenario: Gỡ thuỷ tổ
- **WHEN** người dùng gỡ thuỷ tổ
- **THEN** hệ thống từ chối

#### Scenario: Xuất bản sao sau khi gỡ
- **WHEN** người dùng tải bản sao JSON sau khi gỡ một nhánh
- **THEN** tệp vẫn chứa nhánh đã gỡ cùng dấu đã gỡ

### Requirement: Sắp thứ tự anh chị em và thứ tự các bà
Người dùng SHALL sắp lại được thứ tự anh chị em cùng cha mẹ và thứ tự các vợ/chồng của một người; thứ tự đã đặt SHALL được giữ khi lưu và mở lại.

#### Scenario: Đổi chỗ hai anh em
- **WHEN** người dùng chuyển người con thứ ba lên đầu
- **THEN** người ấy đứng đầu các anh chị em, hai người kia lùi một chỗ

#### Scenario: Thứ tự các bà
- **WHEN** người dùng chuyển bà thứ hai lên trước bà cả
- **THEN** sơ đồ và danh sách xếp bà thứ hai liền kề trước

### Requirement: Sửa hồ sơ một người
Người dùng SHALL sửa được họ tên, giới tính, ngày sinh, ngày mất (ba ô ngày, tháng, năm, chọn âm hoặc dương, nhuận khi là âm), nơi sinh, nơi an táng, tiểu sử và ghi chú; hệ thống MUST từ chối ngày không hợp lệ theo `family-tree-integrity` và báo bằng tiếng Việt; đổi giới tính MUST bị từ chối nếu làm sai vai trò cha/mẹ đã có.

#### Scenario: Chỉ nhớ năm
- **WHEN** người dùng nhập ngày sinh chỉ có năm 1890
- **THEN** hồ sơ lưu năm 1890, không thêm ngày hay tháng

#### Scenario: Ngày không hợp lệ
- **WHEN** người dùng nhập ngày dương 30/02/1960
- **THEN** hệ thống báo ngày không hợp lệ và không lưu thay đổi ngày

#### Scenario: Đổi giới tính làm sai vai trò
- **WHEN** người dùng đổi một người đang là cha của ai đó sang nữ
- **THEN** hệ thống từ chối và giữ giới tính cũ

### Requirement: Thao tác lỗi không làm đổi cây
Mọi thao tác sửa cây bị từ chối MUST trả mã lỗi cố định và MUST giữ nguyên toàn bộ dữ liệu của cuốn.

#### Scenario: Từ chối rồi xem lại
- **WHEN** một thao tác bị từ chối vì tạo vòng
- **THEN** dữ liệu của cuốn trước và sau thao tác giống hệt nhau

### Requirement: Dữ liệu được lưu và mở lại
Hệ thống SHALL lưu các cuốn gia phả trên máy chủ cho người dùng đã đăng nhập và SHALL khôi phục đúng nội dung và thứ tự khi mở lại, trên cùng thiết bị hay thiết bị khác; hệ thống MUST NOT giữ bản lưu cuốn nào trên thiết bị; chi tiết ghi và đọc nằm ở khả năng `tree-storage`.

#### Scenario: Tải lại trang
- **WHEN** người dùng thêm vài người rồi tải lại trang
- **THEN** các cuốn, người, quan hệ và thứ tự y như trước khi tải

#### Scenario: Dữ liệu hỏng
- **WHEN** dữ liệu của cuốn trên máy chủ không dựng lại được (thiếu trường hay sai kiểu)
- **THEN** hệ thống báo lỗi bằng tiếng Việt, không ghi gì lên máy chủ và không làm mất dữ liệu đang có

#### Scenario: Mở trên thiết bị khác
- **WHEN** người dùng đăng nhập cùng tài khoản trên thiết bị khác
- **THEN** thấy cùng các cuốn, người, quan hệ và thứ tự
