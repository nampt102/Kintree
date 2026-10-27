# Spec Delta

## Purpose

Cho người dùng đăng nhập vào Kintree mà không cần mật khẩu riêng, giữ phiên giữa các lần mở app, và bảo đảm người chưa đăng nhập không thấy dữ liệu nào.

## ADDED Requirements

### Requirement: Cổng đăng nhập
Khi chưa có phiên đăng nhập hợp lệ, hệ thống SHALL chỉ hiện màn đăng nhập và MUST NOT hiện hay tải bất kỳ dòng họ, cuốn gia phả hay người nào.

#### Scenario: Mở app lần đầu
- **WHEN** người chưa đăng nhập mở app
- **THEN** chỉ thấy màn đăng nhập với ô email và (nếu đã cấu hình) nút Google

#### Scenario: Phiên hết hạn
- **WHEN** phiên đăng nhập hết hạn hoặc bị thu hồi lúc đang dùng
- **THEN** app quay về màn đăng nhập và không hiện dữ liệu cũ còn trong bộ nhớ

### Requirement: Đăng nhập bằng email và mã 6 số
Người dùng SHALL đăng nhập được bằng cách nhập email, nhận mã 6 số qua email, rồi nhập mã; mã sai hoặc hết hạn SHALL cho nhập lại hoặc gửi mã mới mà không phải gõ lại email; lần đăng nhập đầu của một email SHALL tự tạo tài khoản.

#### Scenario: Đăng nhập thành công
- **WHEN** người dùng nhập email, nhận mã và nhập đúng mã
- **THEN** vào màn danh sách dòng họ (hoặc thông báo chưa được cấp quyền nếu chưa thuộc dòng họ nào) với phiên được giữ

#### Scenario: Mã sai
- **WHEN** người dùng nhập mã sai
- **THEN** lỗi hiện ngay dưới ô mã bằng tiếng Việt, ô mã giữ con trỏ, email vẫn còn

#### Scenario: Email không hợp lệ
- **WHEN** người dùng gửi biểu mẫu với email thiếu "@"
- **THEN** lỗi hiện dưới ô email và không gửi yêu cầu nào

#### Scenario: Gửi lại mã
- **WHEN** người dùng bấm "Gửi lại mã" sau khi nhận được mã đầu
- **THEN** mã mới được gửi, mã cũ không còn dùng được, và nút bị khoá một lúc để tránh gửi dồn

### Requirement: Đăng nhập bằng Google
Khi nhà vận hành đã bật Google, màn đăng nhập SHALL có nút "Đăng nhập bằng Google"; khi chưa bật SHALL không hiện nút ấy.

#### Scenario: Chưa cấu hình Google
- **WHEN** app chạy mà chưa bật đăng nhập Google
- **THEN** màn đăng nhập không có nút Google

### Requirement: Giữ phiên và đăng xuất
Phiên SHALL được giữ khi tải lại trang và khi mở lại app; người dùng SHALL đăng xuất được từ màn danh sách dòng họ; sau khi đăng xuất, app MUST xoá mọi dữ liệu dòng họ khỏi bộ nhớ và quay về màn đăng nhập, và nút Back của trình duyệt MUST NOT đưa lại dữ liệu đã đăng xuất.

#### Scenario: Tải lại trang
- **WHEN** người đã đăng nhập tải lại trang
- **THEN** vẫn ở trong app, không phải đăng nhập lại

#### Scenario: Đăng xuất
- **WHEN** người dùng chọn đăng xuất rồi bấm Back
- **THEN** vẫn ở màn đăng nhập, không thấy dữ liệu dòng họ

### Requirement: Người đăng nhập chưa được cấp quyền
Người đăng nhập thành công mà chưa thuộc dòng họ nào và không phải quản trị nền tảng SHALL thấy thông báo chưa được cấp quyền kèm cách liên hệ, và MUST NOT thấy nút tạo dòng họ.

#### Scenario: Tài khoản mới
- **WHEN** một email chưa từng được gán đăng nhập lần đầu
- **THEN** tài khoản được tạo, và người ấy thấy thông báo chưa được cấp quyền cùng nút đăng xuất

### Requirement: Hiện người đang đăng nhập
Màn danh sách dòng họ SHALL cho biết email đang đăng nhập để người dùng biết mình đang dùng tài khoản nào.

#### Scenario: Nhiều tài khoản
- **WHEN** người dùng mở menu tài khoản
- **THEN** thấy email đang đăng nhập và nút đăng xuất
