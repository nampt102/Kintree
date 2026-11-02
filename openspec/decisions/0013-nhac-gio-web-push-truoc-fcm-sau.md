# 0013. Nhắc giỗ bằng Web Push trước, FCM sau

- **Ngày:** 2026-11-02
- **Trạng thái:** đã chốt (áp dụng ở change `anniversary-push`)
- **Người quyết định:** jamesphan

## Bối cảnh
PRD F11 cần nhắc giỗ trước 7 ngày, 1 ngày và đúng ngày. App hiện chạy trên web; bọc Capacitor (iOS/Android) là bước 9. FCM chỉ dùng được khi có app native.

## Các lựa chọn
1. **Web Push (VAPID) trước, FCM khi bọc Capacitor.**
2. **Cả hai ngay:** phải dựng app native và Firebase trước khi có nhắc.
3. **Email nhắc thay push:** ít phụ thuộc trình duyệt nhưng ít bị chú ý và cần dịch vụ gửi thư.

## Quyết định
Chọn (1). Mặc định tắt, bật theo từng dòng họ; chỉ nhắc giỗ (không nhắc sinh nhật); 7:00 giờ Việt Nam, thử lại 11:00.
- Bộ gửi là Edge Function `send-reminders`, lịch bằng `pg_cron` + `pg_net` (đặt bằng `supabase/schedule-reminders.sql`, không nằm trong migration vì địa chỉ và khoá khác theo môi trường).
- Mã lịch của `packages/core` được sao vào `supabase/functions/_shared/core` bằng `pnpm sync:core` (container chỉ gắn `supabase/functions`); test báo lệch.
- Thư viện `web-push` chạy trong Deno; function dựng yêu cầu bằng `generateRequestDetails` rồi tự `fetch` để xử lý 404/410 (xoá đăng ký) và để chế độ giả lập không cần mạng.
- Khoá VAPID: khoá riêng và `REMINDER_CRON_KEY` ở `supabase/.env`, khoá công khai ở `apps/app/.env.local` (`pnpm vapid:gen`). Chế độ gửi chọn bằng `PUSH_PROVIDER` (`webpush`; trống = giả lập).

## Lý do và hệ quả
- Có nhắc ngay trên trình duyệt, không chờ app native; FCM thêm sau như một bộ gửi nữa.
- iPhone chỉ nhận Web Push khi thêm app vào Màn hình chính (chi tiết phiên bản iOS chưa xác nhận): app có `manifest.webmanifest` và hướng dẫn ngay trong thẻ nhắc.
- Chống gửi trùng bằng khoá chính của `reminder_log` (người nhận, người có giỗ, ngày giỗ, mốc), nên lịch chạy lại hay thử lại đều an toàn.
- **Chưa kiểm:** gửi thật tới dịch vụ push của Chrome, Firefox, Apple; lịch trên Supabase thật.
- Xem lại khi: bọc Capacitor (thêm FCM), cần giờ nhắc theo múi giờ người dùng, hoặc muốn nhắc sinh nhật.
