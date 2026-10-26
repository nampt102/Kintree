# 0006. Gỡ người = đánh dấu đã gỡ; dữ liệu cây lưu cục bộ trước

- **Ngày:** 2026-10-26
- **Trạng thái:** đã chốt
- **Người quyết định:** jamesphan

## Bối cảnh
Change `tree-editing` cần hai quyết định ảnh hưởng tới các change sau: gỡ một người thì dữ liệu của họ đi đâu, và cây lưu ở đâu khi chưa có đăng nhập (RLS chưa có policy nên trình duyệt chưa đọc ghi được Supabase).

## Các lựa chọn
**Gỡ người**
1. Xoá hẳn bản ghi — đơn giản, riêng tư hơn; không khôi phục được, mất dấu vết khi người dùng gỡ nhầm.
2. Đánh dấu `removedAt`/`removalId`, giữ dữ liệu — khôi phục được sau này (nhật ký/phiên bản); dữ liệu cá nhân của người đã gỡ vẫn còn.
3. Gỡ rồi để con cháu mồ côi như Gia Phả Số — linh hoạt, nhưng sinh nhánh bị tách khỏi cây.

**Nơi lưu**
1. `localStorage` trước, nối Supabase ở change đăng nhập.
2. Làm đăng nhập + RLS trước rồi cây ghi thẳng Supabase.

## Quyết định
- Gỡ người: chọn 2, kèm luật chỉ gỡ người không có con, còn người có con thì gỡ cả nhánh (có xác nhận nêu số người). Không có thao tác xoá hẳn.
- Nơi lưu: chọn 1 qua giao diện `TreeStore` (`apps/app/src/lib/store.ts`).

## Lý do và hệ quả
- Phải thêm cột `removed_at`, `removal_id` vào `persons`, `parent_child`, `marriages` khi nối Supabase (change `auth-invite-roles`); mọi truy vấn và RLS phải bỏ qua dòng đã gỡ.
- **Quyền riêng tư:** người đã gỡ vẫn nằm trong `localStorage` và trong tệp "Tải bản sao". Khi có yêu cầu xoá dữ liệu cá nhân (Nghị định 13/2023, xem rủi ro mở trong `openspec/status.md`) cần thêm thao tác xoá hẳn; chưa có.
- Giao diện khôi phục người đã gỡ chưa có; dữ liệu đã đủ cho change nhật ký/phiên bản làm.
- Dữ liệu cục bộ chỉ nằm trên một trình duyệt; xoá dữ liệu trình duyệt là mất. Giảm nhẹ bằng nút "Tải bản sao". Chưa có nhập lại từ tệp JSON (chờ GEDCOM hoặc một change riêng).
- Nếu chỉ mục `kintree:index` hỏng, lần lưu kế tiếp ghi lại chỉ mục chỉ có một cuốn; các cuốn khác vẫn còn dữ liệu nhưng biến khỏi danh sách. Chưa xử lý (chưa liệt kê được khoá của `localStorage` qua giao diện `TreeStore` hiện tại).
- Xem lại khi làm change nối Supabase, hoặc khi có yêu cầu xoá hẳn dữ liệu.
