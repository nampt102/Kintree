# 0011. AI đọc ảnh chỉ tạo đề xuất; chạy bằng bộ giả lập trước, nhà cung cấp thật cắm sau

- **Ngày:** 2026-10-28
- **Trạng thái:** đã chốt (áp dụng ở change `ai-image-proposals`; cụ thể hoá ADR 0003 và 0005)
- **Người quyết định:** jamesphan

## Bối cảnh
ADR 0003 chốt "AI chỉ đề xuất, người duyệt"; ADR 0005 chốt gọi được nhiều nhà cung cấp qua Vercel AI SDK. Lát đầu của AI chép phả làm ảnh (bia mộ, phả cũ, bài vị). Chưa có khoá AI nên chưa thử được nhà cung cấp thật, nhưng vẫn phải dựng và kiểm toàn bộ đường đi.

## Các lựa chọn
1. Chờ có khoá rồi mới làm.
2. Làm toàn bộ hạ tầng và giao diện, gọi AI qua bộ giả lập tất định; nhà cung cấp thật chọn bằng cấu hình.

## Quyết định
Chọn 2.
- **Đường đi:** app thu nhỏ ảnh (cạnh dài 2048 px, JPEG) → kho Storage riêng tư `sources` (`<clan>/<tree>/<source>.jpg`) → Edge Function `extract-image` → đề xuất vào `proposals` (qua RPC `ingest_proposals`, chỉ `service_role`) → quản trị duyệt (RPC `review_proposal`, security invoker) → cây và `field_sources`.
- **Kết quả AI là dữ liệu không tin cậy:** schema zod, danh sách trắng người của đúng cuốn, vùng ảnh trong 0–1, tối đa 50 đề xuất; sai một chỗ thì bỏ cả lần đọc, tư liệu "Đọc lỗi" và đọc lại được.
- **Chọn nhà cung cấp:** `AI_IMAGE_MODEL` = `mock` (mặc định) | `anthropic:<model>` | `openai:<model>` | `google:<model>`. Bộ giả lập không gọi mạng và dựa trên người của cuốn (nên chạy với mọi cuốn). Tiêu đề tư liệu bắt đầu `mock:fail` thì trả kết quả sai schema (để thử "Đọc lỗi").
- **Xử lý nền:** function trả 202 ngay, làm việc bằng `EdgeRuntime.waitUntil`; app thăm dò mỗi 2 giây (không có Realtime); đang đọc quá 5 phút coi như lỗi để đọc lại; giành quyền xử lý bằng `UPDATE` có điều kiện (lần gọi đồng thời nhận 409).
- **Cây chỉ có một thuỷ tổ và mọi người phải nối vào nhau:** Nhận một người = thêm người **và** áp dụng quan hệ đi kèm trong một lần (`p_changes.also`); người không có quan hệ đi kèm chỉ nhận được qua "Sửa rồi nhận" (chọn nơi gắn).
- **Gộp người trùng:** chỉ ghi trường còn trống; trường đã có mà khác giá trị thành đề xuất `update_field` riêng, không ghi đè.
- **Nguồn:** `field_sources` giữ cả nguồn không chọn (`accepted = false`) cùng giá trị, vùng ảnh và ghi chú, để người xem thấy hai nguồn mâu thuẫn mà không cần đọc `proposals` (người xem không đọc được hàng chờ).

## Lý do và hệ quả
- Kiểm được cả đường đi (quyền, nguyên tử, đọc lại, gộp, nguồn) bằng pgTAP và Playwright mà không cần khoá hay ảnh thật.
- **Chưa xác nhận:** nhánh nhà cung cấp thật (Anthropic, OpenAI, Google qua `ai` và `@ai-sdk/*`) chưa chạy thử; khả năng đọc Hán Nôm và giọng các cụ chưa đo (rủi ro Phase 0 của PRD).
- **Pháp lý:** ảnh có tên và ngày tháng của người còn sống gửi tới nhà cung cấp AI là dữ liệu cá nhân (Nghị định 13/2023): phải có chính sách và đồng ý trước khi bật nhà cung cấp thật ở môi trường thật. Bộ giả lập không gửi gì ra ngoài.
- Thêm một Edge Function mới phải `pnpm db:stop` rồi `pnpm db:start` (chỉ khởi động lại container thì danh sách function không đổi).
- AI chỉ gợi ý thông tin rút ra từ ảnh: quan hệ giữa hai người đã có trong cây bị bỏ ở bước kiểm (chủ dự án chốt 2026-10-28, không làm nối người sẵn có); chỉ giữ quan hệ có một đầu là người mới để gắn họ vào cây.
- Chưa làm: đọc nhiều ảnh một lần; ghi âm (change sau); chọn model mặc định (cần khoá và bộ đánh giá).
- Xem lại khi: có khoá AI (chạy bộ đánh giá, chọn model), hoặc `ai` SDK đổi API.
