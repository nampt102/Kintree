# Tasks

## 1. Thử hạ tầng (làm trước)

- [x] 1.1 Bật `storage-api`, `edge-runtime` trong `pnpm db:start`; viết function "hello" nhập `npm:zod`, gọi từ app với JWT người dùng. Lỗi x509 thì mở rộng `pnpm db:trust-ca` cho container edge-runtime. Kiểm: function trả 200 với người đã đăng nhập, 401 khi không có JWT; ghi kết quả vào KB `tech-stack.md`.

## 2. Cơ sở dữ liệu và kho ảnh

- [x] 2.1 Migration `ai_image_proposals`: cột mới cho `sources`, `proposals`, `field_sources` (design D1); policy ba bảng (D2); bucket `sources` riêng tư và policy `storage.objects`. Kiểm: pgTAP quyền (quản trị cuốn, người xem, người ngoài, quản trị nền tảng) cho bảng và ảnh.
- [x] 2.2 RPC `ingest_proposals` (chỉ `service_role`, đánh dấu `superseded` khi đọc lại) và `review_proposal` (security invoker, nguyên tử, ghi `field_sources` cả khi bỏ đề xuất sửa trường, tự bỏ quan hệ phụ thuộc). Kiểm: pgTAP nhận/bỏ, lỗi trigger cây thì không đổi gì, đọc lại không nhân đôi.

## 3. Edge Function

- [x] 3.1 `_shared/`: schema zod, enum trường, kiểm D5, bộ giả lập tất định (gồm chế độ `fail`). Kiểm: Vitest chạy trên file `_shared` (person_id lạ, anchor ngoài 0–1, ref treo, quá 50 đề xuất → từ chối cả lần đọc).
- [x] 3.2 `extract-image`: kiểm quyền, giành xử lý có điều kiện, trả 202, xử lý nền bằng `EdgeRuntime.waitUntil`, gọi nhà cung cấp theo `AI_IMAGE_MODEL` (mặc định `mock`), ghi qua `ingest_proposals`. Thêm biến AI vào `supabase/.env.example` (tên biến, để trống) và `[edge_runtime.secrets]`. Kiểm: gọi thật trên máy local tạo đúng đề xuất; người xem bị từ chối; gọi hai lần cùng lúc thì lần sau nhận 409.

## 4. Lớp dữ liệu app

- [x] 4.1 `lib/sourceStore.ts`: thu nhỏ ảnh (2048 px JPEG), tải lên, gọi function, thăm dò trạng thái, đọc đề xuất, địa chỉ ảnh ký có hạn, đọc nguồn từng trường. Kiểm: Vitest cho phần thuần (tính cỡ thu nhỏ, kiểm loại tệp).
- [x] 4.2 `core`: `findSimilarPersons`; app: thông dịch đề xuất → thao tác `core`, chạy thử trên bản sao để biết lỗi ràng buộc; `saveQueue` thêm loại việc RPC tuỳ ý cho `review_proposal`. Kiểm: Vitest (thêm người kèm quan hệ, sửa trường, quan hệ chờ người, vòng lặp bị chặn, gộp chia trường trống / khác).

## 5. Bản mẫu giao diện (chờ duyệt)

- [x] 5.1 `openspec/changes/ai-image-proposals/mockup.html` bằng skill `ui-ux-pro-max`, token và thành phần đã có: đưa ảnh vào (chọn loại, xem trước), danh sách tư liệu và trạng thái, hàng chờ cạnh ảnh có khung vùng, sửa rồi nhận, gợi ý gộp, đề xuất bị chặn kèm lý do, quan hệ chờ người, dấu nguồn và hộp nguồn (gồm hai nguồn mâu thuẫn); máy tính 1280 px và điện thoại 375 px. Kiểm: chủ dự án xem.
- [x] 5.2 Sửa theo góp ý đến khi duyệt; ghi kết luận vào `design.md`. Kiểm: chủ dự án ghi "duyệt".

## 6. Giao diện (chỉ làm sau 5.2)

- [x] 6.1 Đưa ảnh vào và danh sách tư liệu (trạng thái, đọc lại). Kiểm: e2e đưa ảnh → "Đang đọc" → "Đã đọc"; tệp sai loại; người xem không thấy nút; tư liệu lỗi (`AI_IMAGE_MOCK=fail`) rồi đọc lại.
- [x] 6.2 Hàng chờ: nhận, sửa rồi nhận, bỏ, bị chặn, quan hệ chờ người. Kiểm: e2e đi đường thật tới cây; mất kết nối khi nhận thì không đổi gì.
- [x] 6.3 Gợi ý gộp. Kiểm: e2e gộp vào thuỷ tổ chỉ thêm trường trống, số người không đổi.
- [x] 6.4 Dấu nguồn và hộp nguồn trên bảng thông tin người. Kiểm: e2e người xem xem nguồn; hai nguồn mâu thuẫn hiện cả hai cùng ghi chú.

## 7. Hoàn tất

- [x] 7.1 `layout.spec.ts` và `visual.spec.ts` thêm các màn mới; ADR 0011; KB `data-model.md`, `tech-stack.md`, `design-system.md`; `status.md` (rủi ro Nghị định 13 khi bật nhà cung cấp thật). Kiểm: Vitest, pgTAP, Playwright toàn bộ qua 3 lần liên tiếp, build sạch, `openspec validate --strict` qua.

## Workflow follow-up

- Chủ dự án duyệt app chạy thật, rồi commit, push và `/opsx:archive ai-image-proposals`.
- Khi có khoá AI: đặt `AI_IMAGE_MODEL`, thử trên ảnh thật, làm bộ đánh giá (Phase 0 của PRD) trước khi chọn model mặc định.
