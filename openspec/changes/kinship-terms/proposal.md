# Proposal

## Why
Con cháu trẻ, nhất là người ở xa hay ở nước ngoài, không biết gọi các cụ, các bác, các cô là gì. Gọi đúng vai vế là việc quan trọng trong dòng họ Việt, và mỗi miền gọi khác nhau (chị gái của cha: Bắc "Bác", Trung "O", Nam "Cô"). Đối thủ Gia Phả Số đã có xưng hô 3 miền; PRD F9 (E6, US-3.4, US-6.1, US-6.2) đặt việc này ngay sau lịch giỗ. Mỗi cuốn đã có `region` (Bắc/Trung/Nam) từ `tree-editing` nhưng chưa dùng để tính gì.

## What Changes
- **"Tôi là ai":** người có quyền xem một cuốn chọn mình là người nào trong cuốn (một người mỗi cuốn, đổi hoặc bỏ được). Chỉ ảnh hưởng cách hiển thị cho chính họ; không đổi dữ liệu cây.
- **Nhãn xưng hô trên cây:** khi đã chọn "Tôi là ai", mỗi khung người hiện "tôi gọi là …" (vd. "Bác", "Ông nội", "Anh họ"); bảng thông tin người hiện thêm "người ấy gọi tôi là …" và đường quan hệ bằng chữ (vd. "anh trai của cha").
- **Tra quan hệ giữa hai người bất kỳ** (US-6.2): chọn hai người trong cuốn, xem quan hệ và cách gọi hai chiều.
- **Lõi tính xưng hô** trong `packages/core` (hàm thuần, có test): tìm đường quan hệ qua cha mẹ (ruột, nuôi), vợ chồng; xác định đời, bên nội/ngoại, vai trên/dưới (theo thứ tự anh chị em, rồi năm sinh); đổi thành từ gọi theo miền của cuốn. Phạm vi: trực hệ lên/xuống tới 5 đời, anh chị em, cô dì chú bác cậu và vợ/chồng họ, anh chị em họ (vai theo nhánh: "con chú con bác"), cháu, quan hệ thông gia gần (bố mẹ chồng/vợ, con dâu/rể, anh chị em dâu/rể). Ngoài phạm vi thì ghi "họ hàng xa" kèm đường quan hệ bằng chữ, không bịa từ gọi.
- **Bảng từ gọi ba miền** viết ra trong `design.md` để chủ dự án duyệt trước khi code (như bản mẫu giao diện); bản mẫu giao diện cũng duyệt trước.

## Capabilities

### New Capabilities
- `kinship-terms`: chọn "Tôi là ai" theo cuốn, tính quan hệ và từ gọi ba miền, nhãn trên cây và trong bảng người, tra quan hệ giữa hai người.

### Modified Capabilities
<!-- Không có: cây và vùng miền giữ nguyên; change này chỉ đọc. -->

## Impact
- **`packages/core`:** `kinship.ts` (đường quan hệ, mô tả quan hệ, từ gọi theo miền) và test bảng nhiều ca, gồm các ca khác nhau giữa ba miền.
- **Cơ sở dữ liệu:** một bảng nhỏ lưu "Tôi là ai" (người dùng, cuốn, người) với RLS chỉ chủ dòng; pgTAP.
- **App:** chọn/đổi "Tôi là ai" (bảng người và lời nhắc sau khi nhận lời mời), nhãn trên khung người (`TreeDiagram`), dòng xưng hô trong `PersonPanel`, hộp "Tra quan hệ".
- **Test:** Vitest bảng xưng hô; Playwright chọn "Tôi là ai", nhãn trên cây, tra quan hệ, màn điện thoại.
- **Không thêm thư viện.**
- **Ngoài phạm vi:** xưng hô theo phương ngữ chi tiết hơn ba miền (vd. Huế, Nghệ Tĩnh riêng), tuỳ chỉnh từ gọi theo từng dòng họ, quan hệ qua nhiều hôn nhân chồng chéo (vợ của em họ của chồng…), xác minh "Tôi là ai" bởi quản trị.
