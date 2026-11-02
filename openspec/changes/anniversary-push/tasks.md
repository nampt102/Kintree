# Tasks

## 1. Dữ liệu
- [x] 1.1 Migration `push_subscriptions`, `reminder_prefs`, `reminder_log` kèm RLS và thu hồi quyền hàm nội bộ. Kiểm: pgTAP (chỉ chủ dòng đọc/ghi; người ngoài không đọc; `reminder_log` không mở cho người dùng).

## 2. Bộ gửi
- [x] 2.1 Thử cách đưa mã `core` và thư viện Web Push vào Edge Function (Deno); ghi kết quả vào `design.md` D2. Kiểm: function nhỏ chạy ở `db:start` ký được VAPID và tính được một ngày giỗ.
- [x] 2.2 Lõi chọn người nhận (`_shared/reminders.ts`, hàm thuần): mốc 7/1/0 ngày theo giờ Việt Nam, gộp theo (người nhận, mốc), lọc `reminder_log`, bỏ sinh nhật và người thiếu ngày mất. Kiểm: Vitest.
- [x] 2.3 Function `send-reminders` với bộ gửi `webpush` và `mock`, xoá đăng ký hết hạn, ghi `reminder_log` sau khi gửi. Kiểm: Playwright/gọi trực tiếp với `mock`, đồng hồ cố định (đúng nội dung, không trùng khi chạy hai lần).
- [x] 2.4 Lịch chạy hằng ngày 7:00 giờ Việt Nam và cách đặt khi triển khai; khoá gọi ở `supabase/.env`. Kiểm: chạy thử một lần ở local; tài liệu hoá.

## 3. Bản mẫu giao diện (chờ duyệt)
- [x] 3.1 `mockup.html` bằng skill `ui-ux-pro-max`, theo token hiện có (nền trắng, ADR 0012): công tắc "Nhắc ngày giỗ" ở màn Ngày giỗ, trạng thái đang bật/đang tắt/bị từ chối, hướng dẫn iPhone, danh sách thiết bị, mẫu thông báo. Kiểm: chủ dự án xem.
- [x] 3.2 Sửa theo góp ý đến khi duyệt; ghi kết luận vào `design.md`.

## 4. Giao diện (chỉ làm sau 3.2)
- [x] 4.1 `sw.js`, `manifest.webmanifest`, `lib/reminderStore.ts`, khoá VAPID (`VITE_VAPID_PUBLIC_KEY` ở `apps/app/.env.example`). Kiểm: Vitest cho kho; trình duyệt thử đăng ký được.
- [x] 4.2 Công tắc và danh sách thiết bị ở màn Ngày giỗ; mở màn Ngày giỗ từ hash của thông báo. Kiểm: Playwright (bật, tắt, bị từ chối quyền, mở từ thông báo), `layout.spec.ts` (vùng chạm ≥ 44 px, không cuộn ngang 320–1440 px).

## 5. Hoàn tất
- [x] 5.1 ADR (Web Push trước, FCM sau), KB `tech-stack.md`, `status.md`. Kiểm: Vitest, pgTAP, Playwright, build, `openspec validate --strict` qua.

## Workflow follow-up
- Kiểm tay trên thiết bị thật (Chrome máy tính, Android, iPhone đã thêm vào Màn hình chính); chủ dự án duyệt, rồi commit, push và `/opsx:archive anniversary-push`.
