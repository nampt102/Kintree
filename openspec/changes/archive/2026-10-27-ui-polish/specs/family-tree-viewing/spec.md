# Spec Delta

## Purpose

Khung người trên sơ đồ cho biết nhiều hơn chỉ trong một cái nhìn (giới tính, thuỷ tổ, còn sống hay đã mất) mà không dựa vào màu sắc.

## MODIFIED Requirements

### Requirement: Khung mỗi người
Khung của mỗi người SHALL hiện họ tên và khoảng năm sống ("1890 – 1968", hoặc "1915 –" khi chưa mất); người đã mất SHALL có kiểu viền khác người còn sống; giới tính SHALL được thể hiện bằng một dấu không chỉ dựa vào màu (ký hiệu hoặc chữ trong nhãn trợ năng); thuỷ tổ SHALL có dấu riêng gồm biểu tượng và chữ "Thuỷ tổ"; đường nối con ruột, con nuôi, con riêng SHALL có kiểu nét khác nhau (liền, đứt, chấm).

#### Scenario: Người còn sống và đã mất
- **WHEN** cây có một người đã có ngày mất và một người chưa có
- **THEN** hai khung phân biệt được bằng kiểu viền mà không cần đọc năm

#### Scenario: Con nuôi
- **WHEN** một người được ghi là con nuôi
- **THEN** đường nối tới cha mẹ nuôi là nét đứt

#### Scenario: Giới tính không chỉ bằng màu
- **WHEN** xem sơ đồ ở chế độ thang xám hoặc bằng trình đọc màn hình
- **THEN** vẫn biết được người nam, người nữ và người chưa rõ giới tính

#### Scenario: Thuỷ tổ
- **WHEN** mở một cuốn có thuỷ tổ
- **THEN** khung thuỷ tổ có biểu tượng và chữ "Thuỷ tổ"
