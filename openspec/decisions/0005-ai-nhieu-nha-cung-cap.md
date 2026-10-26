# 0005. Gọi được nhiều nhà cung cấp AI: OpenAI, Claude, Gemini

- **Ngày:** 2026-10-26
- **Trạng thái:** đã chốt
- **Người quyết định:** jamesphan

## Bối cảnh
Trước đây dự định chỉ dùng Claude. Chủ dự án muốn gọi được cả OpenAI, Claude và Gemini: so sánh độ chính xác khi đọc phả Hán Nôm và giọng các cụ, đổi nhà cung cấp khi giá hoặc chất lượng thay đổi, và có đường dự phòng khi một bên lỗi.

## Các lựa chọn
1. Tự viết adapter cho từng SDK (openai, @anthropic-ai/sdk, @google/genai) — kiểm soát hết; phải tự viết và bảo trì ba lối gọi, ba kiểu structured output.
2. Vercel AI SDK (`ai` + `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`) — một API chung, `generateObject` với schema zod cho cả ba; chạy được trong Supabase Edge Function (Deno, qua `npm:`); thêm một tầng phụ thuộc.
3. OpenRouter (một khóa API cho mọi model) — đơn giản nhất; dữ liệu cá nhân (ghi âm, tên tuổi người còn sống) đi qua thêm một bên trung gian, khó giải trình theo Nghị định 13/2023.

## Quyết định
Chọn 2.

## Lý do và hệ quả
- Một hàm trích xuất dùng chung, đổi nhà cung cấp/model bằng cấu hình, không đổi code: biến môi trường dạng `AI_EXTRACT_MODEL=anthropic:<model>` / `openai:<model>` / `google:<model>`, đặt riêng cho từng việc (đọc ảnh, đọc ghi âm). Tên model cụ thể chốt khi làm change `ai-sources-proposals`.
- Khóa API của cả ba chỉ nằm trong secrets của Edge Function, không bao giờ xuống app.
- Mỗi đề xuất lưu thêm `provider` và `model` đã sinh ra nó, để so tỷ lệ được nhận giữa các nhà cung cấp (KR ≥ 70%).
- Khả năng mỗi bên khác nhau, phải kiểm khi làm change (chưa xác nhận): Gemini và OpenAI nhận âm thanh trực tiếp; Claude có thể cần bước chuyển giọng nói thành chữ trước. Thiết kế giữ bước STT tách riêng để bên nào cũng dùng được.
- Bộ test đánh giá (ảnh phả, bia mộ, ghi âm thật cùng đáp án) chạy được trên cả ba để chọn mặc định bằng số liệu, không bằng cảm tính.
- Xem lại nếu AI SDK chậm cập nhật tính năng mới của một nhà cung cấp mà dự án cần; khi đó gọi SDK gốc riêng cho việc ấy.
