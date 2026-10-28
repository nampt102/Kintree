# proposal-review Specification

## Purpose
Cho người có quyền sửa duyệt từng đề xuất do AI sinh ra cạnh nguồn của nó, chỉ ghi vào cây những gì đã được nhận, và cho mọi người trong cuốn thấy mỗi trường được lấy từ nguồn nào.

## Requirements

### Requirement: Hàng chờ duyệt cạnh nguồn
Quản trị của cuốn SHALL thấy số đề xuất đang chờ và mở được hàng chờ trong không gian làm việc của cuốn. Mỗi đề xuất SHALL hiện nội dung đề xuất (người, trường, giá trị cũ → mới, hoặc quan hệ) cạnh ảnh nguồn có tô vùng ảnh của nó. Người xem MUST NOT thấy hàng chờ.

#### Scenario: Mở hàng chờ
- **WHEN** quản trị mở cuốn có 3 đề xuất đang chờ từ một ảnh bia mộ
- **THEN** thấy "Đề xuất 3", mở ra thấy 3 đề xuất, chọn một đề xuất thì ảnh hiện với khung vùng ảnh của đề xuất đó

#### Scenario: Người xem
- **WHEN** người chỉ có quyền xem mở cuốn
- **THEN** không có lối vào hàng chờ và truy vấn thẳng đề xuất không nhận được dòng nào

### Requirement: Nhận, sửa rồi nhận, bỏ
Với mỗi đề xuất đang chờ, quản trị SHALL chọn được Nhận (ghi đúng như đề xuất), Sửa rồi nhận (mở form điền sẵn, ghi theo nội dung đã sửa) hoặc Bỏ (lý do tuỳ chọn). Đề xuất đã nhận hoặc đã bỏ MUST NOT nhận lại được.

#### Scenario: Nhận đề xuất thêm người
- **WHEN** quản trị nhận đề xuất thêm "Nguyễn Văn Thử"
- **THEN** người ấy xuất hiện trong cây, đề xuất biến khỏi hàng chờ, và các trường của người ấy có nguồn là ảnh đó

#### Scenario: Sửa rồi nhận
- **WHEN** quản trị mở "Sửa rồi nhận" cho đề xuất năm sinh 1901, đổi thành 1902 rồi lưu
- **THEN** cây ghi năm sinh 1902 và đề xuất được đánh dấu đã nhận có sửa

#### Scenario: Bỏ
- **WHEN** quản trị bỏ một đề xuất với lý do "đọc nhầm chữ"
- **THEN** cây không đổi, đề xuất biến khỏi hàng chờ và lưu lý do

### Requirement: Nhận nguyên tử
Nhận một đề xuất SHALL ghi thay đổi cây, trạng thái đề xuất và nguồn của từng trường trong một giao dịch: lỗi ở bất kỳ bước nào thì không bước nào được ghi.

#### Scenario: Mất kết nối khi nhận
- **WHEN** quản trị bấm Nhận nhưng lần ghi thất bại
- **THEN** cây không có người mới, đề xuất vẫn đang chờ, và app báo lỗi để thử lại

### Requirement: Đề xuất vi phạm ràng buộc cây
Đề xuất mà nếu ghi sẽ vi phạm ràng buộc của cây (vòng lặp tổ tiên, sai giới tính cha/mẹ, hai dâu/rể, cha mẹ đã đủ…) MUST NOT nhận được; hàng chờ SHALL hiện lý do bằng câu tiếng Việt và vẫn cho Sửa rồi nhận hoặc Bỏ.

#### Scenario: Quan hệ tạo vòng
- **WHEN** có đề xuất ghi người con là cha của tổ tiên mình
- **THEN** nút Nhận không dùng được và hiện "Quan hệ này sẽ khiến một người trở thành tổ tiên của chính mình."

### Requirement: Gợi ý gộp người trùng
Đề xuất thêm người có họ tên giống (không phân biệt dấu cách, hoa thường) một người đã có trong cuốn và năm sinh lệch không quá 2 năm (hoặc một bên không có năm sinh) SHALL hiện gợi ý "Có thể là X đã có" kèm lựa chọn **Gộp vào X**. Gộp SHALL ghi các trường X còn trống, biến mỗi trường đã có ở X mà khác giá trị thành một đề xuất sửa trường chờ duyệt riêng, và MUST NOT tạo người mới.

#### Scenario: Bia mộ của người đã có
- **WHEN** có đề xuất thêm "Nguyễn Văn Cả, sinh 1890" và cuốn đã có "Nguyễn Văn Cả, sinh 1890" chưa có nơi an táng
- **THEN** hàng chờ gợi ý gộp; chọn Gộp vào Nguyễn Văn Cả thì cây chỉ thêm nơi an táng cho người đó, số người không đổi

### Requirement: Người mới phải gắn được vào cây
Cây chỉ có một thuỷ tổ và mọi người khác phải nối được với nhau, nên đề xuất thêm người SHALL chỉ nhận được khi có chỗ gắn vào cây. Nếu đề xuất có quan hệ đi kèm nối người ấy với một người đã có, Nhận SHALL thêm người và áp dụng quan hệ đó trong cùng một lần, và quan hệ SHALL được đánh dấu đã nhận chung. Nếu không có quan hệ đi kèm, Nhận MUST không dùng được và hiện cách làm; "Sửa rồi nhận" SHALL cho chọn nơi gắn (con của ai, cha/mẹ của ai, hoặc vợ/chồng của ai).

#### Scenario: Nhận người kèm quan hệ
- **WHEN** có đề xuất thêm "Nguyễn Văn Thử" và đề xuất "Nguyễn Văn Thử là con của Nguyễn Văn Cả", quản trị nhận đề xuất thêm người
- **THEN** người mới xuất hiện trong cây là con của Nguyễn Văn Cả, và đề xuất quan hệ cũng được đánh dấu đã nhận

#### Scenario: Người không có chỗ gắn
- **WHEN** có đề xuất thêm một người mà không có quan hệ nào đi kèm
- **THEN** nút Nhận không dùng được, hiện "Người này chưa gắn được vào cây. Hãy dùng Sửa rồi nhận để chọn cha mẹ hoặc vợ/chồng", và Sửa rồi nhận cho chọn nơi gắn

### Requirement: Quan hệ chờ người chưa nhận
Đề xuất quan hệ trỏ tới một người còn nằm trong đề xuất thêm người chưa nhận MUST NOT nhận riêng được và SHALL hiện "Cần nhận người X trước". Khi người đó được nhận hoặc gộp, quan hệ SHALL trỏ đúng tới người trong cây. Nếu đề xuất người đó bị bỏ, quan hệ SHALL tự bỏ theo kèm lý do "Người liên quan đã bị bỏ".

#### Scenario: Nhận quan hệ trước người
- **WHEN** quản trị cố nhận đề xuất quan hệ "Nguyễn Văn Thử là con của Nguyễn Văn Cả" khi người Nguyễn Văn Thử chưa được nhận
- **THEN** không nhận được và hiện "Cần nhận người Nguyễn Văn Thử trước"

#### Scenario: Bỏ người thì quan hệ bỏ theo
- **WHEN** quản trị bỏ đề xuất thêm "Nguyễn Văn Thử"
- **THEN** đề xuất quan hệ của người ấy tự bỏ kèm lý do "Người liên quan đã bị bỏ"

### Requirement: Nguồn của từng trường
Trên bảng thông tin một người, mỗi trường có nguồn (họ tên, giới tính, ngày sinh, ngày mất, nơi sinh, nơi an táng, tiểu sử) SHALL có dấu nhận ra không chỉ bằng màu; bấm vào thấy ảnh nguồn, vùng ảnh, ngày nhận và người duyệt. Cùng một trường có từ hai nguồn khác giá trị trở lên SHALL hiện tất cả các nguồn kèm giá trị và ghi chú của người duyệt. Mọi người có vai trò trong cuốn (kể cả người xem) SHALL xem được nguồn.

#### Scenario: Người xem xem nguồn ngày mất
- **WHEN** người xem bấm dấu nguồn cạnh ngày mất của một người được nhận từ ảnh bia mộ
- **THEN** thấy ảnh bia mộ với khung vùng ảnh ghi ngày mất

#### Scenario: Hai nguồn mâu thuẫn
- **WHEN** năm sinh 1890 được nhận từ ảnh bia mộ, sau đó một trang phả đề xuất 1891 và người duyệt bỏ đề xuất ấy với ghi chú "bia mộ khắc rõ hơn"
- **THEN** bấm dấu nguồn cạnh năm sinh thấy cả hai nguồn, giá trị của từng nguồn, nguồn nào được chọn và ghi chú ấy
