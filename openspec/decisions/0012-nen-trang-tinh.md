# 0012. Nền trắng tinh thay nền be ấm

- **Ngày:** 2026-11-02
- **Trạng thái:** đã chốt
- **Người quyết định:** jamesphan

## Bối cảnh
Nền be ấm của `ui-polish` (`canvas` #FAF8F5, `rail` #F5F1EC, `surface-muted` #F3EFEA) khiến chủ dự án thấy app "hơi tối và u ám", muốn tươi sáng hơn.

## Các lựa chọn
1. **Trắng tinh:** nền #FFFFFF, thanh bên #F7F7F8, nền phụ #F4F4F5, đường kẻ #ECECEE.
2. **Trắng ấm:** nền #FFFDFB, thanh bên #FFF8F2, nền phụ #FAF5F0.
3. Như (1) nhưng đổi màu nhấn sang đỏ tươi hơn (#C0392B).

## Quyết định
Chọn (1). Giữ màu nhấn đỏ son #A42F28, chữ và các token khác. `accent-soft` đổi #F8ECEA → #FCEEEC cho hợp nền trắng. Màn đăng nhập bỏ khối nền chuyển màu, chỉ giữ hoạ tiết cây.

## Lý do và hệ quả
- Sáng và sạch nhất, đỏ son nổi rõ hơn. Mọi cặp trong `contrast.test.ts` vẫn đạt (chữ phụ trên nền ≥ 5,4:1).
- `canvas` trùng `surface`: thẻ tách khỏi nền bằng bóng và đường kẻ, không bằng màu nền.
- Bản mẫu cũ trong `openspec/changes/*/mockup.html` còn màu be; khi làm giao diện thì theo token mới.
