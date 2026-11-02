# Proposal

## Why
Lịch ngày giỗ (`lunar-calendar-view`) đã cho thấy giỗ và sinh nhật, nhưng người dùng vẫn phải mở app mới biết. "Hay quên ngày giỗ" là nỗi đau chính trong PRD, và F11 yêu cầu nhắc trước 7 ngày, 1 ngày và đúng ngày. Change này gửi nhắc giỗ đến thiết bị của từng người.

## What Changes
- **Bật nhắc trên trình duyệt (Web Push):** người dùng bật "Nhắc ngày giỗ" cho từng dòng họ (mặc định tắt); trình duyệt hỏi quyền thông báo; thiết bị được lưu để nhận nhắc. Tắt được bất cứ lúc nào; thấy được các thiết bị đang nhận.
- **Lịch nhắc:** mỗi ngày 7:00 giờ Việt Nam, máy chủ tìm giỗ rơi vào ngày +7, +1 và hôm nay (dùng đúng lõi `packages/core` của lịch), gửi một thông báo cho mỗi người đã bật, mỗi giỗ mỗi mốc một lần (không gửi trùng khi chạy lại).
- **Nội dung thông báo:** tên người, kỳ giỗ, ngày dương và âm, tên cuốn khi có từ hai cuốn; bấm thông báo mở lịch giỗ của dòng họ.
- **Người nhận:** mọi người có vai trò trong dòng họ (quản trị và người xem) đã bật nhắc; chỉ giỗ của các cuốn họ có quyền xem.
- **Ngoài phạm vi (xem Open Questions):** FCM cho iOS/Android (cần bọc Capacitor, bước 9 trong kế hoạch); nhắc sinh nhật; giờ nhắc tuỳ chỉnh; xuất .ics; email nhắc.

## Capabilities

### New Capabilities
- `anniversary-reminders`: bật/tắt nhắc giỗ theo dòng họ, đăng ký thiết bị, gửi nhắc 7 ngày, 1 ngày và đúng ngày, không gửi trùng, chỉ gửi giỗ trong phạm vi quyền xem.

### Modified Capabilities
<!-- Không có: lịch giỗ giữ nguyên; change này chỉ thêm cách báo. -->

## Impact
- **Cơ sở dữ liệu (migration):** bảng đăng ký thiết bị, tuỳ chọn nhắc theo (người, dòng họ), nhật ký đã gửi; RLS chỉ cho chủ dòng của mình; lịch chạy hằng ngày (pg_cron + pg_net hoặc tương đương, chưa xác nhận chạy được ở Supabase local).
- **Edge Function** `send-reminders`: tính sự kiện bằng mã `core` thuần (cách import mã ngoài thư mục function chưa xác nhận), gửi Web Push.
- **App:** service worker và manifest (`apps/app/public`), màn bật nhắc ở trang nhà dòng họ hoặc lịch, khoá công khai VAPID trong `apps/app/.env.example`.
- **Bí mật:** khoá riêng VAPID chỉ ở `supabase/.env` (như khoá AI), không vào repo.
- **Thư viện mới:** thư viện Web Push cho Deno (chưa chọn, cần kiểm chạy được).
- **Test:** Vitest cho chọn người nhận và chống gửi trùng; pgTAP cho RLS; Playwright cho bật/tắt nhắc với bộ gửi giả lập (như `mock:` của AI).
- **Tài liệu:** ADR mới (chọn Web Push trước, FCM sau), KB, `status.md`.

## Quyết định đã chốt (chủ dự án, 2026-11-02)
1. **Web Push trước, FCM sau** khi bọc Capacitor (bước 9).
2. **Mặc định tắt**, người dùng tự bật.
3. **Giờ nhắc cố định 7:00 giờ Việt Nam** ở bản đầu (đề xuất, chưa bị phản đối).
4. **Chỉ nhắc giỗ**, không nhắc sinh nhật.
5. **iPhone:** chấp nhận chỉ nhận push khi thêm app vào Màn hình chính; ghi hướng dẫn trong màn bật nhắc (chi tiết phiên bản iOS chưa xác nhận).
