# Spec Delta

## Purpose

Bố cục "không gian làm việc": sơ đồ tràn màn, công cụ nổi, thông tin một người nổi gọn trên điện thoại, và thanh bên để chuyển cuốn trên màn hình lớn.

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Màn rất rộng: thanh bên chuyển cuốn
Khi cửa sổ rộng từ 1200 px, màn dòng họ và màn cây SHALL có thanh bên cố định bên trái gồm tên dòng họ đang mở (và vai trò), danh sách các cuốn của dòng họ (cuốn đang mở được làm nổi) và tài khoản; chọn một cuốn ở thanh bên SHALL mở cuốn ấy mà không phải quay về màn trước. Dưới 1200 px, thanh bên SHALL ẩn và điều hướng dùng nút quay lại như cũ.

#### Scenario: Chuyển cuốn trên máy tính
- **WHEN** đang mở cuốn "Chi trưởng" ở cửa sổ 1440 px và bấm "Chi thứ hai" ở thanh bên
- **THEN** cuốn "Chi thứ hai" mở ra và thanh bên đánh dấu nó là cuốn đang mở

#### Scenario: Máy tính bảng
- **WHEN** mở một cuốn ở cửa sổ 1024 px
- **THEN** không có thanh bên, và nút "Về danh sách cuốn" vẫn có
