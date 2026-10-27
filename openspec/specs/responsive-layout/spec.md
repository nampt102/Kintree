# responsive-layout Specification

## Purpose

Quy định cách Kintree bố trí màn hình trên điện thoại, máy gập / màn kép, máy tính bảng và máy tính, để sơ đồ gia phả luôn có đủ chỗ và không có nội dung bị che bởi tai thỏ, Dynamic Island, thanh Home hay nếp gập.

## Requirements

### Requirement: Ba cỡ cửa sổ
Hệ thống SHALL chọn bố cục theo bề rộng cửa sổ: gọn (dưới 600 px), vừa (600–839 px) và rộng (từ 840 px), không theo tên thiết bị; đổi cỡ cửa sổ hay xoay máy SHALL đổi bố cục ngay mà không mất trạng thái đang xem (người đang chọn, chế độ xem, nhánh thu gọn, ô tìm).

#### Scenario: Xoay điện thoại
- **WHEN** người dùng đang chọn một người rồi xoay điện thoại từ dọc sang ngang
- **THEN** bố cục đổi theo cỡ mới và người ấy vẫn đang được chọn

### Requirement: Cỡ gọn: sơ đồ chiếm phần lớn màn hình
Ở cỡ gọn, sơ đồ SHALL tràn toàn màn; nút quay lại, ô tìm và menu SHALL nằm trên một thanh nổi phía trên; thu phóng và căn khung SHALL nằm trên một thanh nổi phía dưới; nút đổi chế độ xem (cây / danh sách) SHALL là nút nổi ở góc dưới; khi chưa chọn ai, phần sơ đồ không bị thanh nổi che SHALL chiếm ít nhất 70% chiều cao vùng nhìn.

#### Scenario: Mở một cuốn trên điện thoại 375 × 812
- **WHEN** mở một cuốn gia phả ở cỡ 375 × 812 px và chưa chọn ai
- **THEN** thanh nổi phía trên chỉ một hàng và phần sơ đồ không bị che cao ít nhất 70% vùng nhìn

### Requirement: Cỡ gọn: tấm trượt và hộp thoại
Ở cỡ gọn, chạm một người SHALL mở thẻ thông tin nổi gọn ở đáy màn hình (tên, năm sống, các thao tác nhanh), có tay nắm; kéo lên SHALL mở toàn bộ thông tin, kéo xuống SHALL đóng; hộp thoại SHALL phủ toàn màn hình với nút đóng và nút chính luôn nhìn thấy khi bàn phím ảo đang mở.

#### Scenario: Kéo tấm trượt
- **WHEN** người dùng chạm một khung rồi kéo tay nắm của thẻ thông tin xuống
- **THEN** thẻ đóng và sơ đồ trở lại không bị che

#### Scenario: Xem đủ thông tin
- **WHEN** người dùng kéo tay nắm của thẻ thông tin lên
- **THEN** thẻ mở rộng, hiện đủ ngày sinh, ngày mất, nơi sinh, vợ/chồng và các thao tác

#### Scenario: Nhập tên khi bàn phím ảo mở
- **WHEN** người dùng gõ họ tên trong hộp thoại "Thêm con" trên điện thoại
- **THEN** ô đang nhập và nút "Thêm con" đều nằm trong phần nhìn thấy phía trên bàn phím

### Requirement: Cỡ vừa và rộng: hai ngăn
Ở cỡ vừa và rộng, màn cây SHALL chia hai ngăn: sơ đồ và bảng thông tin đặt cạnh nhau; mở hay đóng bảng thông tin SHALL không làm các khung đang thấy dịch chỗ dưới ngón tay hay con trỏ.

#### Scenario: Máy tính bảng ngang
- **WHEN** chạm một khung trên màn 1024 × 768 px
- **THEN** bảng thông tin mở ở ngăn bên phải và khung vừa chạm giữ nguyên vị trí trên màn hình

### Requirement: Máy gập và màn kép
Khi cửa sổ trải qua nếp gập hoặc hai màn hình (trình duyệt báo hai đoạn vùng nhìn theo chiều ngang), sơ đồ SHALL nằm trọn ở một đoạn và bảng thông tin hay hộp thoại ở đoạn còn lại; không nút, chữ hay khung người nào SHALL nằm vắt qua nếp gập.

#### Scenario: Mở rộng máy gập
- **WHEN** trình duyệt báo hai đoạn vùng nhìn ngang và người dùng chọn một người
- **THEN** sơ đồ ở đoạn trái, bảng thông tin ở đoạn phải, và vùng nếp gập không có nội dung

#### Scenario: Trình duyệt không báo đoạn vùng nhìn
- **WHEN** máy gập mở rộng nhưng trình duyệt không hỗ trợ báo đoạn vùng nhìn
- **THEN** hệ thống dùng bố cục theo bề rộng (cỡ vừa hoặc rộng) như máy tính bảng

### Requirement: Vùng an toàn
Nội dung bấm được và chữ SHALL không nằm dưới tai thỏ, Dynamic Island, góc bo màn hình hay thanh Home, ở cả hướng dọc lẫn ngang; nền SHALL vẫn phủ kín tới mép màn hình.

#### Scenario: iPhone có Dynamic Island, xoay ngang
- **WHEN** mở màn cây trên iPhone có Dynamic Island ở hướng ngang
- **THEN** thanh công cụ, nút thu phóng và tấm trượt đều lùi vào trong vùng an toàn hai bên và phía dưới

### Requirement: Bề rộng tối thiểu
Mọi màn hình SHALL dùng được ở bề rộng 320 px mà không phải cuộn ngang, trừ chính vùng sơ đồ (vốn được kéo và thu phóng).

#### Scenario: Điện thoại nhỏ
- **WHEN** mở danh sách cuốn, màn cây, hồ sơ và danh sách người ở bề rộng 320 px
- **THEN** không màn nào có thanh cuộn ngang

### Requirement: Màn rất rộng: thanh bên chuyển cuốn
Khi cửa sổ rộng từ 1200 px, màn dòng họ và màn cây SHALL có thanh bên cố định bên trái gồm tên dòng họ đang mở (và vai trò), danh sách các cuốn của dòng họ (cuốn đang mở được làm nổi) và tài khoản; chọn một cuốn ở thanh bên SHALL mở cuốn ấy mà không phải quay về màn trước. Dưới 1200 px, thanh bên SHALL ẩn và điều hướng dùng nút quay lại như cũ.

#### Scenario: Chuyển cuốn trên máy tính
- **WHEN** đang mở cuốn "Chi trưởng" ở cửa sổ 1440 px và bấm "Chi thứ hai" ở thanh bên
- **THEN** cuốn "Chi thứ hai" mở ra và thanh bên đánh dấu nó là cuốn đang mở

#### Scenario: Máy tính bảng
- **WHEN** mở một cuốn ở cửa sổ 1024 px
- **THEN** không có thanh bên, và nút "Về danh sách cuốn" vẫn có
