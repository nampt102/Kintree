# User stories — Phase 1 (MVP)

Nguồn: [PRD.md](PRD.md) mục 7.2 (F1–F13). Mỗi epic sẽ thành một OpenSpec change (`openspec/changes/<tên>`), làm theo thứ tự trong bảng tiến độ ở `openspec/status.md`.

Vai trò: **Người chép phả** (quản trị/biên tập), **Con cháu** (người xem), **Hệ thống**.

---

## E1. Nền tảng: monorepo, lõi lịch âm, schema — change `bootstrap-core`

**US-1.1** Là lập trình viên, tôi muốn một monorepo chạy được (`apps/app`, `packages/core`) để mọi tính năng sau dùng chung lõi nghiệp vụ.
- `pnpm install && pnpm test && pnpm dev` chạy được trên máy sạch.
- `apps/app` import được hàm từ `packages/core`.

**US-1.2** Là hệ thống, tôi cần đổi ngày dương ↔ âm theo lịch Việt Nam (UTC+7), kèm Can Chi.
- Tết Nguyên đán 1900–2100 đúng với bảng đối chiếu (gồm Tết 2007 = 17/02/2007).
- Năm có tháng nhuận trả đúng tháng nhuận.

**US-1.3** Là hệ thống, tôi cần tính ngày giỗ dương lịch của một năm từ ngày mất.
- Mất tháng nhuận → giỗ tháng thường cùng số.
- Mất ngày 30, năm đó tháng thiếu → giỗ ngày 29 cùng tháng.
- Ngày mất không đủ ngày/tháng → không sinh ngày giỗ.

**US-1.4** Là lập trình viên, tôi cần schema Postgres cho dòng họ, cuốn gia phả, người, quan hệ, thành viên, nguồn, đề xuất, nhật ký.
- Migration chạy được trên Supabase local.
- Constraint: mỗi người ≤ 1 cha + 1 mẹ cho mỗi loại (ruột/nuôi/riêng); ngày tháng không đầy đủ hợp lệ (có ngày thì phải có tháng và năm).

## E2. Dựng cây — change `tree-editing` (F1–F4)

**US-2.1** Là người chép phả, tôi muốn tạo dòng họ và nhiều cuốn gia phả (chi) bên trong.
- Cuốn mới có chọn vùng miền xưng hô (Bắc/Trung/Nam).

**US-2.2** Là người chép phả, tôi muốn thêm cha mẹ / con / vợ chồng ngay trên sơ đồ.
- Thêm con hỏi loại: ruột / nuôi / riêng, và là con chung với ai.
- Thêm vợ/chồng tự đánh dấu ngoại tộc.

**US-2.3** Là người chép phả, tôi muốn ghi ngày sinh/mất biết đến đâu ghi đến đó (năm / năm-tháng / đủ), âm hoặc dương.
- Hiện kèm ngày quy đổi và Can Chi khi đủ ngày.

**US-2.4** Là người chép phả, tôi muốn phần mềm chặn các thao tác làm hỏng cây.
- Từ chối: cha/mẹ thứ hai cùng loại (cha nuôi vẫn ghi được bên cạnh cha ruột), nối vòng, thêm/gỡ cha mẹ của thuỷ tổ, quan hệ giữa hai người ngoại tộc. Báo lỗi rõ, không lưu.

**US-2.5** Là người xem, tôi muốn xem cây theo đời, thu gọn nhánh, tìm người theo tên (gõ không dấu được), và xem dạng danh sách có lọc.

**US-2.6** Là người chép phả, tôi muốn sắp thứ tự anh chị em và thứ tự các bà.

## E3. Đăng nhập, mời, phân quyền — change `auth-invite-roles` (F10)

**US-3.1** Là người dùng, tôi muốn đăng nhập bằng Google hoặc Apple, không cần mật khẩu.

**US-3.2** Là quản trị, tôi muốn tạo link mời (vai trò, hạn, mật khẩu tùy chọn) và thu hồi được.
- Sai mật khẩu 5 lần → khoá link tạm.

**US-3.3** Là hệ thống, tôi cần phân quyền 2 tầng (dòng họ / cuốn) bằng RLS; quyền thực tế là quyền cao hơn.
- Người chỉ được mời vào một cuốn không đọc được dữ liệu cuốn khác (kiểm bằng test SQL).

**US-3.4** Là con cháu mới vào, tôi muốn chọn “Tôi là ai” trong cây.

## E4. AI chép phả — change `ai-sources-proposals` (F5–F7) — điểm khác biệt

**US-4.1** Là người chép phả, tôi muốn ghi âm trong app hoặc tải file ghi âm buổi nói chuyện với các cụ.
- Có bước xác nhận người được ghi âm đã đồng ý.

**US-4.2** Là người chép phả, tôi muốn chụp/tải ảnh phả cũ, bia mộ, bài vị.

**US-4.3** Là hệ thống, tôi xử lý tư liệu ở nền và tạo đề xuất (thêm người, sửa trường, thêm quan hệ), mỗi đề xuất trỏ tới mốc thời gian ghi âm hoặc vùng ảnh.
- Kết quả AI được kiểm schema; sai schema → không tạo đề xuất, ghi lỗi.
- AI không bao giờ ghi thẳng vào bảng người/quan hệ.

**US-4.4** Là người chép phả, tôi muốn duyệt đề xuất cạnh nguồn: Nhận / Sửa rồi nhận / Bỏ.
- Đề xuất trùng người đã có → gợi ý gộp thay vì tạo mới.
- Đề xuất vi phạm ràng buộc US-2.4 → không nhận được, báo lý do.

**US-4.5** Là người xem, tôi muốn bấm vào một trường để thấy nguồn; hai nguồn mâu thuẫn thì thấy cả hai và lý do người duyệt chọn.

## E5. Lịch và nhắc giỗ — change `lunar-calendar-reminders` (F8, F11)

**US-5.1** Là người xem, tôi muốn lịch tháng hiện song song ngày dương/âm với ngày giỗ, sinh nhật; lọc theo chi.

**US-5.2** Là con cháu, tôi muốn nhận thông báo trước giỗ 7 ngày, 1 ngày và đúng ngày, trên điện thoại và trình duyệt.

## E6. Xưng hô — change `kinship-terms` (F9)

**US-6.1** Là con cháu đã chọn “Tôi là ai”, tôi muốn mỗi khung trên cây hiện tôi gọi người ấy là gì và người ấy gọi tôi là gì, theo vùng miền của cuốn.
- Bảng test gồm các ca khác nhau giữa 3 miền (chị gái của cha: Bác gái / O / Cô; anh trai của mẹ: Bác / Cậu / Cậu).

**US-6.2** Là người xem, tôi muốn chọn hai người bất kỳ để tra quan hệ và cách gọi.

## E7. Nhật ký thay đổi — change `audit-log` (F12)

**US-7.1** Là quản trị, tôi muốn xem ai sửa gì, lúc nào, giá trị cũ/mới; lọc theo người, loại việc, khoảng ngày.

**US-7.2** Là quản trị, tôi muốn khôi phục giá trị cũ của một trường hoặc một người đã gỡ nhầm.

## E8. Xuất dữ liệu — change `export-poster-gedcom` (F13)

**US-8.1** Là người chép phả, tôi muốn xuất poster cây (cả cây hoặc một nhánh) ra PDF để in khổ lớn.

**US-8.2** Là người chép phả, tôi muốn nhập tệp GEDCOM (≤ 5MB, xem trước, nhập trọn gói hoặc không gì) và xuất GEDCOM.
- Xuất rồi nhập lại không mất trường nào, giữ loại con nuôi/riêng.
