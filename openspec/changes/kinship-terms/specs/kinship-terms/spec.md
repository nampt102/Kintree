# Spec Delta

## Purpose

Cho con cháu biết gọi từng người trong gia phả là gì, theo vùng miền của cuốn, và tra được quan hệ giữa hai người bất kỳ.

## ADDED Requirements

### Requirement: Chọn "Tôi là ai"
Người có quyền xem một cuốn SHALL chọn được mình là một người trong cuốn đó (tối đa một người mỗi cuốn), đổi hoặc bỏ được bất cứ lúc nào. Lựa chọn MUST chỉ ảnh hưởng cách hiển thị của chính người dùng ấy và MUST NOT đổi dữ liệu cây. Người dùng khác MUST NOT đọc được lựa chọn này. Nếu người đã chọn bị gỡ khỏi cây, app SHALL coi như chưa chọn.

#### Scenario: Chọn mình
- **WHEN** người xem mở cuốn và chọn "Đây là tôi" ở bảng của người A
- **THEN** khung của A ghi "Tôi" và các khung khác hiện cách gọi tính từ A

#### Scenario: Đổi người
- **WHEN** người dùng đã chọn A rồi chọn "Đây là tôi" ở người B
- **THEN** cách gọi trên cây tính lại từ B

#### Scenario: Người khác không thấy
- **WHEN** người dùng U chọn mình là A
- **THEN** người dùng khác mở cùng cuốn không thấy lựa chọn của U

### Requirement: Từ gọi theo vùng miền
Hệ thống SHALL tính quan hệ giữa hai người qua cha mẹ (ruột, nuôi, riêng) và vợ chồng, rồi đổi thành từ gọi theo vùng miền của cuốn (Bắc, Trung, Nam) theo bảng đã duyệt. Quan hệ ngoài phạm vi bảng SHALL ghi "Họ hàng xa" kèm đường quan hệ bằng chữ và MUST NOT đưa ra từ gọi đoán.

#### Scenario: Chị gái của cha
- **WHEN** B là chị gái của cha A
- **THEN** A gọi B là "Bác" ở cuốn miền Bắc, "O" ở cuốn miền Trung, "Cô" ở cuốn miền Nam

#### Scenario: Anh trai của mẹ
- **WHEN** B là anh trai của mẹ A
- **THEN** A gọi B là "Bác" ở miền Bắc, "Cậu" ở miền Trung và miền Nam

#### Scenario: Quan hệ xa
- **WHEN** đường từ A tới B đi qua hai lần vợ chồng
- **THEN** cách gọi là "Họ hàng xa" kèm đường quan hệ bằng chữ

### Requirement: Vai trên dưới
Vai trên/dưới giữa anh chị em SHALL theo thứ tự anh chị em, không có thì theo năm sinh. Anh chị em họ SHALL xếp vai theo nhánh tại chỗ rẽ, không theo tuổi. Khi không xác định được vai hoặc giới tính, hệ thống SHALL dùng từ trung tính (vd. "Bác/Chú", "Anh/Chị").

#### Scenario: Con chú con bác
- **WHEN** cha của B là anh trai cha của A, và B ít tuổi hơn A
- **THEN** A gọi B là "Anh họ" hoặc "Chị họ" theo giới tính của B

#### Scenario: Không rõ vai
- **WHEN** B là anh em trai của cha A nhưng không có thứ tự anh chị em và năm sinh
- **THEN** A gọi B là "Bác/Chú"

### Requirement: Nhãn xưng hô trên cây và trong bảng người
Khi đã chọn "Tôi là ai", mỗi khung người trên sơ đồ SHALL hiện từ người dùng gọi người ấy, và bảng thông tin người SHALL hiện cả hai chiều ("Bạn gọi …", "Người ấy gọi bạn …") cùng đường quan hệ bằng chữ. Người dùng SHALL ẩn hoặc hiện được nhãn trên sơ đồ. Đổi vùng miền của cuốn SHALL đổi từ gọi theo.

#### Scenario: Bảng người hai chiều
- **WHEN** người dùng là A, mở bảng của B là em trai cha A, cuốn miền Bắc
- **THEN** bảng ghi "Bạn gọi: Chú", "Người ấy gọi bạn: Cháu" và "Quan hệ: em trai của cha"

#### Scenario: Đổi vùng miền
- **WHEN** quản trị đổi cuốn từ miền Bắc sang miền Nam
- **THEN** nhãn của chị gái cha đổi từ "Bác" sang "Cô"

### Requirement: Tra quan hệ giữa hai người
Người có quyền xem cuốn SHALL chọn được hai người bất kỳ trong cuốn để xem đường quan hệ và cách gọi hai chiều, không cần đã chọn "Tôi là ai".

#### Scenario: Tra hai người
- **WHEN** người dùng chọn A và B, với B là ông nội của A, cuốn miền Nam
- **THEN** hộp tra ghi A gọi B là "Ông nội", B gọi A là "Cháu", quan hệ "cha của cha"
