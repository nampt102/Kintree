# Proposal

## Why
"AI chép phả" là điểm khác biệt của Kintree (PRD F5–F7): thay vì gõ tay từng người, người chép phả đưa tư liệu vào, AI đọc và đề xuất, người có quyền duyệt. Hiện các bảng `sources`, `proposals`, `field_sources` đã có từ `bootstrap-core` nhưng chưa có đường nào dùng tới. Lát đầu làm **ảnh** (bia mộ, phả cũ, bài vị) vì ít rủi ro hơn ghi âm (không cần chuyển giọng nói, không cần xin đồng ý người được ghi âm) mà vẫn dựng được toàn bộ hạ tầng dùng chung cho ghi âm sau này. Chưa có khoá AI nên gọi AI qua **bộ giả lập** trước; nhà cung cấp thật cắm vào bằng cấu hình khi có khoá.

## What Changes
- **Đưa ảnh vào cuốn:** quản trị của cuốn chụp hoặc chọn ảnh (bia mộ, trang phả, bài vị, khác), đặt tên ngắn. App thu nhỏ ảnh (cạnh dài tối đa 2048 px, JPEG) rồi tải lên kho riêng tư của dòng họ.
- **AI đọc ảnh ở máy chủ:** một Edge Function nhận ảnh, gửi cho AI kèm danh sách người đã có trong cuốn, nhận về kết quả có cấu trúc, **kiểm theo schema**, rồi ghi thành đề xuất. Sai schema hoặc AI lỗi thì không tạo đề xuất nào và tư liệu ghi trạng thái lỗi để thử lại. AI không bao giờ ghi thẳng vào người hay quan hệ (ADR 0003).
  - Ba loại đề xuất: thêm người, sửa một trường của người đã có, thêm quan hệ (cha/mẹ–con, vợ chồng).
  - Mỗi đề xuất trỏ tới vùng ảnh (khung chữ nhật) và lưu nhà cung cấp, model đã sinh ra nó.
  - Nhà cung cấp chọn bằng biến môi trường (`mock:` mặc định; `anthropic:…`, `openai:…`, `google:…` qua Vercel AI SDK, ADR 0005).
- **Hàng chờ duyệt** trong không gian làm việc của cuốn:
  - Danh sách đề xuất đang chờ, nhóm theo tư liệu; mỗi đề xuất hiện cạnh ảnh có tô vùng nguồn.
  - **Nhận**, **Sửa rồi nhận** (mở form điền sẵn), **Bỏ** (ghi lý do tuỳ chọn).
  - Đề xuất thêm người giống người đã có (cùng tên, năm sinh gần) thì gợi ý **gộp** vào người đó thay vì tạo mới.
  - Đề xuất vi phạm ràng buộc cây (vòng lặp, sai giới tính…) thì không nhận được và báo lý do.
  - Nhận một đề xuất = một giao dịch: đổi cây, đánh dấu đề xuất, ghi nguồn cho từng trường.
- **Nguồn từng trường:** trên bảng thông tin một người, trường có nguồn có dấu "nguồn"; bấm vào thấy ảnh và vùng ảnh. Hai nguồn khác nhau cho cùng một trường thì hiện cả hai kèm ghi chú của người duyệt.
- **Hạ tầng:** bật Storage và Edge Runtime trong `pnpm db:start`; bucket `sources` riêng tư có policy theo dòng họ; policy cho `sources`, `proposals`, `field_sources`.
- **Bản mẫu giao diện** (đưa ảnh vào, hàng chờ duyệt, nguồn từng trường) phải được chủ dự án duyệt trước khi code giao diện.
- **Ngoài phạm vi:** ghi âm và chuyển giọng nói (change `ai-audio-proposals` sau); bộ đánh giá độ chính xác trên tư liệu thật (cần ảnh thật và khoá AI; Phase 0 của PRD); chọn model mặc định; đọc nhiều ảnh một lần; tính phí.

## Capabilities

### New Capabilities
- `ai-sources`: đưa tư liệu ảnh vào cuốn, lưu riêng tư theo dòng họ, AI đọc ở máy chủ và sinh đề xuất đã kiểm schema, trạng thái xử lý và thử lại, chọn nhà cung cấp bằng cấu hình.
- `proposal-review`: hàng chờ duyệt đề xuất cạnh nguồn (nhận, sửa rồi nhận, bỏ, gộp người trùng), nhận nguyên tử, và xem nguồn của từng trường.

### Modified Capabilities
<!-- không có: ghi vào cây vẫn đi qua luật của family-tree-editing và family-tree-integrity -->

## Impact
- **Cơ sở dữ liệu:** migration mới: cột trạng thái xử lý cho `sources`, `tree_id` cho `sources`, `result_person_id` cho `proposals`; policy RLS cho ba bảng; bucket Storage và policy; RPC `review_proposal` (nhận/bỏ nguyên tử). pgTAP mới.
- **Edge Function** `supabase/functions/extract-image` (Deno): kiểm quyền người gọi, gọi AI, kiểm schema (zod), ghi đề xuất bằng khoá máy chủ. Thư viện `ai`, `@ai-sdk/*`, `zod` dùng trong function (chưa gọi thật khi chạy `mock:`).
- **App:** `lib/sourceStore.ts`; màn/ngăn "Đề xuất" và "Tư liệu" trong `TreeScreen`; nút đưa ảnh vào; dấu nguồn trong `PersonPanel`. `packages/core`: hàm tìm người có thể trùng.
- **Cấu hình:** `package.json` (`db:start` bỏ loại trừ `storage-api`, `edge-runtime`); `supabase/.env.example` thêm `AI_IMAGE_MODEL`, `ANTHROPIC_API_KEY` (để trống), chuyển vào function qua `[edge_runtime.secrets]`.
- **Pháp lý:** ảnh và tên tuổi người còn sống gửi tới nhà cung cấp AI khi dùng nhà cung cấp thật (Nghị định 13/2023) — ghi ở rủi ro mở, xử lý trước khi ra mắt; bộ giả lập không gửi gì ra ngoài.
- **Tài liệu:** ADR 0011 (luồng AI ảnh, bộ giả lập, giới hạn); KB `data-model.md`, `tech-stack.md`.
