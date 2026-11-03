# Design

## Context
Lý do: `proposal.md`. Hành vi bắt buộc: `specs/anniversary-reminders`.

Hiện trạng đã đọc trong repo:
- Lõi lịch `packages/core/src/calendar.ts` là hàm thuần (`calendarEvents`, `upcomingEvents`); `calendarStore` đọc `persons` qua RLS.
- Edge Function chạy bằng Deno (`supabase/functions/extract-image`), mã dùng chung thuần TS ở `_shared`, Vitest import được; bí mật lấy từ `supabase/.env` qua `config.toml [edge_runtime.secrets]`.
- Chưa có service worker, manifest, bảng thông báo, hay lịch chạy ở máy chủ. Chưa kiểm: Supabase local có bật `pg_cron`/`pg_net` không; Deno chạy được thư viện Web Push nào; function import được `packages/core` không.

## Goals / Non-Goals
**Goals**
- Nhắc 7 ngày, 1 ngày, đúng ngày bằng Web Push cho người đã bật; không trùng; đúng quyền.
- Kiểm thử được trong e2e mà không gọi dịch vụ push thật.

**Non-Goals**
- FCM / iOS native (chờ Capacitor); nhắc sinh nhật; giờ tuỳ chỉnh; email; .ics.

## Decisions

### D1. Dữ liệu (migration mới)
- `push_subscriptions(id, user_id, endpoint unique, p256dh, auth, user_agent, created_at)`.
- `reminder_prefs(user_id, clan_id, enabled, primary key (user_id, clan_id))`.
- `reminder_log(user_id, person_id, event_date, lead_days, sent_at, primary key (user_id, person_id, event_date, lead_days))` làm khoá chống trùng.
- RLS: chủ dòng đọc/ghi dòng của mình (`user_id = auth.uid()`); `reminder_log` chỉ service role. Hàm nội bộ thu hồi quyền `execute` của `authenticated` (Supabase cấp mặc định).
- Đăng ký thiết bị theo (người dùng, endpoint); bật theo dòng họ nằm ở `reminder_prefs`, nên một thiết bị nhận cho mọi dòng họ đã bật.

### D2. Bộ gửi: Edge Function `send-reminders`
- Nhận lời gọi từ lịch (kèm khoá riêng do lịch giữ), không mở cho người dùng.
- Mỗi lần chạy: lấy các (người, dòng họ) đã bật → cuốn họ xem được → người có ngày → `calendarEvents` cho ngày +0, +1, +7 (giờ Việt Nam) → lọc theo `reminder_log` → gộp theo (người nhận, mốc) → gửi → ghi `reminder_log` sau khi gửi thành công.
- Tính sự kiện bằng mã `core` thuần. **Đã kiểm (2026-11-02):** container Edge Function chỉ gắn `supabase/functions`, nên không import ra `packages/core` được. Giải pháp: `pnpm sync:core` sao `lunar.ts`, `dates.ts`, `calendar.ts` vào `supabase/functions/_shared/core/`, và test `core/test/edge-copy.test.ts` báo lệch.
- Gửi qua bộ gửi trừu tượng: `webpush` thật hoặc `mock` (tiêu đề thử bắt đầu bằng `mock:` hoặc biến `PUSH_PROVIDER=mock` ghi vào bảng/response thay vì gọi mạng) để e2e kiểm nội dung mà không cần dịch vụ thật. **Đã kiểm:** `npm:web-push@3.6.7` chạy trong Edge Function (Deno 2.1): `generateRequestDetails` ký VAPID và mã hoá nội dung được; function tự `fetch` tới endpoint (để 404/410 xử lý được và chế độ mock không cần mạng). **Chưa kiểm:** gửi thật tới dịch vụ push của Chrome/Firefox/Apple.
- Dịch vụ push trả 404/410 → xoá đăng ký; lỗi khác → để `reminder_log` trống, lần chạy sau thử lại.

### D3. Lịch chạy
- Mỗi ngày 00:00 UTC (= 7:00 giờ Việt Nam) và thử lại 04:00 UTC (an toàn nhờ chống trùng). **Đã kiểm:** `pg_cron` và `pg_net` bật được ở Supabase local; DB gọi function qua `http://supabase_kong_kintree:8000/functions/v1/send-reminders` được. Đặt lịch bằng `supabase/schedule-reminders.sql` (`pnpm reminders:schedule` ở local), không để trong migration vì địa chỉ và khoá khác nhau theo môi trường. `db:reset` xoá lịch, chạy lại lệnh.
- Function đặt `verify_jwt = false` và tự kiểm header `x-cron-key` khi `PUSH_PROVIDER=webpush`; chế độ mock (mặc định, `PUSH_PROVIDER` trống) không gọi mạng nên không đòi khoá, cho phép đặt `now` (e2e). **Khi triển khai thật phải đặt `PUSH_PROVIDER=webpush`, `REMINDER_CRON_KEY`, các khoá VAPID.**
- Khoá gọi function lưu ở `supabase/.env`, không vào repo.

### D4. App (Web Push)
- `apps/app/public/sw.js`: nhận `push`, hiện thông báo, `notificationclick` mở `/#/…` màn Ngày giỗ của dòng họ (`App.tsx` đọc hash như link mời). `manifest.webmanifest` để iPhone thêm vào Màn hình chính.
- `lib/reminderStore.ts`: đăng ký/huỷ đăng ký (`pushManager.subscribe` với khoá công khai VAPID `VITE_VAPID_PUBLIC_KEY`), đọc/ghi `reminder_prefs`, liệt kê thiết bị.
- Giao diện: công tắc "Nhắc ngày giỗ" ở màn Ngày giỗ (đầu trang) kèm trạng thái, lý do khi bị từ chối, hướng dẫn thêm vào Màn hình chính cho iPhone, và danh sách thiết bị đang nhận (gỡ từng cái). Cần **bản mẫu giao diện được duyệt** trước khi code (như các change trước).
- Khoá VAPID: cặp sinh một lần; khoá riêng chỉ ở `supabase/.env`, khoá công khai ở `apps/app/.env.example`.

**Kết luận bản mẫu (đã duyệt 2026-11-02):** thẻ "Nhắc ngày giỗ" ở cột phải màn Ngày giỗ (trên "Sắp tới"; điện thoại nằm dưới lịch), danh sách thiết bị có "Gỡ" từng cái, hướng dẫn iPhone trong thẻ, nội dung thông báo như mục D. Khác bản mẫu: trạng thái bị chặn, không hỗ trợ và iPhone chưa cài ẩn công tắc (thay vì công tắc mờ); thêm nút "Nhận nhắc trên thiết bị này" khi dòng họ đã bật ở thiết bị khác. Cổng push của trình duyệt nằm sau `PushPort`; e2e thay bằng `window.__KT_PUSH__` vì trình duyệt thử không có dịch vụ push.

### D5. Kiểm thử
- Vitest: chọn người nhận và gộp theo mốc; lọc theo `reminder_log`; quy ngày theo giờ Việt Nam; không nhắc sinh nhật và người thiếu ngày mất.
- pgTAP: RLS ba bảng (chỉ chủ dòng; người ngoài không đọc; người bị gỡ khỏi dòng họ không được chọn làm người nhận).
- Playwright: bật nhắc (cấp quyền giả, trình duyệt thử), tắt, bị từ chối quyền; gọi function ở chế độ `mock` với đồng hồ cố định kiểm nội dung và chống trùng; bấm thông báo mở đúng màn (có thể kiểm bằng gọi tay `notificationclick`/URL).
- Không thử được: giao thật qua dịch vụ push của Chrome/Apple (cần thiết bị và mạng thật); ghi rõ là kiểm tay sau.

## Risks / Trade-offs
- **[iPhone]** Web Push chỉ khi thêm vào Màn hình chính, người dùng dễ bỏ sót. → Hướng dẫn trong màn bật; FCM chờ Capacitor.
- **[Giờ gửi]** Một giờ cố định không hợp mọi người ở nước ngoài. → Chấp nhận ở bản đầu.
- **[Lịch chạy lỡ]** Máy chủ tắt đúng 7:00 thì lỡ nhắc. → Lần thử lại trong ngày; mốc "đúng ngày" vẫn gửi muộn được vì khoá chống trùng theo ngày giỗ.
- **[Hai nguồn mã tính giỗ]** Nếu phải sao chép `core` vào function thì dễ lệch. → Test lệch hoặc import chung; xem D2.

## Migration Plan
Thêm bảng mới, không đụng dữ liệu cũ. Rollback: gỡ lịch chạy, tắt function, bỏ bảng (không có dữ liệu sống còn).

## Open Questions
- Gửi thật tới dịch vụ push (Chrome, Firefox, Apple) và triển khai lịch trên Supabase thật: kiểm tay sau.
