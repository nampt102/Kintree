# family-tree-viewing Specification

## Purpose

Cho người dùng xem một cuốn gia phả như sơ đồ các đời hoặc như danh sách, tìm một người nhanh, và dùng được trên cả máy tính lẫn điện thoại.

## Requirements

### Requirement: Sơ đồ theo đời
Hệ thống SHALL vẽ cây với tổ tiên ở trên, mỗi hàng là một đời đánh số "Đời 1", "Đời 2"…; vợ/chồng đứng cạnh nhau cùng hàng; con hạ xuống từ giữa cặp cha mẹ và đứng theo thứ tự anh chị em từ trái sang phải; các khung SHALL không chồng lên nhau.

#### Scenario: Ba đời
- **WHEN** cuốn có thuỷ tổ, hai con và một cháu
- **THEN** có ba hàng Đời 1 đến Đời 3, thuỷ tổ ở hàng trên cùng, hai con cùng hàng theo thứ tự đã đặt, cháu ở hàng thứ ba dưới cha hoặc mẹ

#### Scenario: Nhiều vợ
- **WHEN** một người có hai vợ, mỗi vợ một con
- **THEN** hai bà đứng hai bên hoặc nối tiếp theo thứ tự các bà và mỗi con hạ xuống từ đúng cặp cha mẹ

### Requirement: Khung mỗi người
Khung của mỗi người SHALL hiện họ tên và khoảng năm sống ("1890 – 1968", hoặc "1915 –" khi chưa mất); người đã mất SHALL có kiểu viền khác người còn sống; đường nối con ruột, con nuôi, con riêng SHALL có kiểu nét khác nhau (liền, đứt, chấm).

#### Scenario: Người còn sống và đã mất
- **WHEN** cây có một người đã có ngày mất và một người chưa có
- **THEN** hai khung phân biệt được bằng kiểu viền mà không cần đọc năm

#### Scenario: Con nuôi
- **WHEN** một người được ghi là con nuôi
- **THEN** đường nối tới cha mẹ nuôi là nét đứt

### Requirement: Thu gọn và xem riêng một nhánh
Hệ thống SHALL cho thu gọn con cháu của một người (rồi mở lại) và cho xem riêng nhánh con cháu của một người; khi thu gọn, khung SHALL cho biết số người đang bị ẩn; thoát chế độ xem riêng SHALL trả lại toàn cây.

#### Scenario: Thu gọn
- **WHEN** người dùng thu gọn một người có 5 con cháu
- **THEN** các khung của 5 người ấy ẩn đi và khung người đó ghi 5 người đang ẩn

#### Scenario: Xem riêng nhánh
- **WHEN** người dùng chọn xem riêng nhánh của một người
- **THEN** sơ đồ chỉ còn người ấy, vợ/chồng và con cháu, và có nút quay lại toàn cây

### Requirement: Tìm người không cần gõ dấu
Hệ thống SHALL tìm người theo họ tên không phân biệt hoa thường và dấu tiếng Việt ("nguyen" khớp "Nguyễn", "dang" khớp "Đặng"); chọn một kết quả SHALL đưa sơ đồ tới người ấy, làm nổi khung và mở các nhánh đang thu gọn che người ấy.

#### Scenario: Gõ không dấu
- **WHEN** người dùng gõ "nguyen van" trong cuốn có "Nguyễn Văn An"
- **THEN** kết quả gồm "Nguyễn Văn An"

#### Scenario: Người nằm trong nhánh thu gọn
- **WHEN** người dùng chọn một kết quả đang bị ẩn do thu gọn
- **THEN** nhánh được mở ra và khung người ấy được làm nổi

### Requirement: Xem dạng danh sách
Hệ thống SHALL có chế độ danh sách hiện mọi người của cuốn thành bảng, với bộ lọc Tất cả, Nam, Nữ, Đã mất, Dâu/Rể, Đã kết hôn, Chưa kết hôn và ô tìm theo tên như trên; chọn một dòng SHALL mở hồ sơ người ấy.

#### Scenario: Lọc người đã mất
- **WHEN** người dùng chọn bộ lọc Đã mất
- **THEN** danh sách chỉ còn những người có ngày mất

#### Scenario: Lọc dâu rể
- **WHEN** người dùng chọn bộ lọc Dâu/Rể
- **THEN** danh sách chỉ còn người ngoại tộc

### Requirement: Dùng được trên điện thoại
Trên màn hình hẹp, hệ thống SHALL cho kéo một ngón và chụm hai ngón để di chuyển, phóng to thu nhỏ sơ đồ; chạm một người SHALL mở bảng thông tin chứa các thao tác thêm cha/mẹ, thêm con, thêm vợ/chồng, gỡ và sửa hồ sơ, thay cho các nút hiện khi trỏ chuột; mọi nút SHALL đủ lớn để chạm (tối thiểu 44 px).

#### Scenario: Chạm một người
- **WHEN** người dùng chạm vào một khung trên màn hình 375 px
- **THEN** bảng thông tin mở ra với các thao tác sửa cây

#### Scenario: Trên máy tính
- **WHEN** người dùng trỏ chuột vào một khung
- **THEN** các nút thao tác hiện quanh khung, và bấm hai lần mở hồ sơ

### Requirement: Cuốn lớn vẫn dùng được
Hệ thống SHALL tính bố cục cho một cuốn 1.000 người trong dưới 1 giây trên máy tính cá nhân thông thường và SHALL chỉ vẽ các khung đang trong vùng nhìn.

#### Scenario: Cuốn 1.000 người
- **WHEN** mở một cuốn có 1.000 người
- **THEN** sơ đồ hiện ra, kéo và phóng to không bị khựng kéo dài
