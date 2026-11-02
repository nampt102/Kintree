# Proposal

## Why
"Hay quên ngày giỗ" là một trong ba nỗi đau chính của người dùng (PRD): ngày giỗ nhớ theo dương lịch nên lệch. Lõi tính ngày giỗ và đổi âm–dương đã có từ `bootstrap-core` (`deathAnniversary`, `solarToLunar`, `lunarToSolar`, spec `death-anniversary` và `lunar-calendar`) nhưng người dùng chưa thấy ở đâu trong app. Trang nhà dòng họ và thanh bên đã có chỗ dành cho mục "Ngày giỗ" từ bản mẫu `ui-polish`. Change này đưa lõi đó ra giao diện: lịch tháng âm–dương và danh sách giỗ sắp tới của cả dòng họ.

Đây là nửa đầu của mục F8/F11 trong PRD. Thông báo đẩy (7 ngày, 1 ngày, đúng ngày) cần Web Push (khoá VAPID, service worker) và FCM cho điện thoại, nên tách thành change riêng `anniversary-push` sau (chủ dự án chốt 2026-10-28).

## What Changes
- **Màn "Ngày giỗ" cấp dòng họ**, vào từ thanh bên (≥ 1200 px) và trang nhà dòng họ; mọi người có vai trò trong dòng họ (kể cả người xem) đều xem được:
  - **Lịch tháng** âm–dương: mỗi ô có ngày dương (lớn) và ngày âm (nhỏ; mùng 1 ghi rõ tháng âm, kể cả nhuận); đầu trang ghi tháng dương và tháng âm kèm năm can chi; chuyển tháng, về hôm nay.
  - **Sự kiện trong ô:** giỗ (kèm kỳ Giỗ đầu / Giỗ hết / Giỗ thường) và sinh nhật của người còn sống.
  - **Danh sách "Sắp tới"** trong 30 ngày: ngày dương và âm, tên người, kỳ giỗ, cuốn, "còn N ngày"; bấm một dòng mở người ấy trong cây.
  - **Lọc theo cuốn** (chi), gộp mọi cuốn mà người dùng có vai trò.
  - **Danh sách "Chưa tính được giỗ"** (quản trị thấy lối sửa): người đã mất nhưng thiếu ngày hoặc tháng mất.
- **Lõi tính toán** (`packages/core`): dựng lưới tháng, gom sự kiện của một tháng, liệt kê sắp tới; dùng lại `deathAnniversary`. Sinh nhật theo ngày sinh dương hoặc âm đúng như đã nhập; người mất không có sinh nhật.
- **Không đổi cơ sở dữ liệu:** đọc các cột ngày sinh/mất của `persons` qua RLS hiện có (người xem chỉ thấy cuốn của mình).
- **Bản mẫu HTML** (lịch tháng, danh sách sắp tới, điện thoại) phải được chủ dự án duyệt trước khi code giao diện.
- **Ngoài phạm vi:** thông báo đẩy (change `anniversary-push`); xuất lịch (.ics); tuỳ chỉnh nhắc từng người; ngày giỗ hay sinh nhật ngoài năm 1800–2199 (ngoài phạm vi lịch hỗ trợ); người chỉ có vai trò ở một cuốn (không có vai trò dòng họ) chưa có lối vào lịch.

## Capabilities

### New Capabilities
- `family-calendar`: lịch tháng âm–dương cấp dòng họ với giỗ và sinh nhật, danh sách sắp tới, lọc theo cuốn, danh sách người chưa đủ ngày mất, quyền xem theo vai trò.

### Modified Capabilities
<!-- Không có: `death-anniversary` và `lunar-calendar` đã đủ cho phần tính; change này chỉ thêm cách hiển thị. -->

## Impact
- **`packages/core`:** hàm mới cho lịch tháng và sự kiện (`monthGrid`, `calendarEvents`, `upcomingEvents`) cùng test (năm 1800–2199, tháng nhuận, ngày 30, tháng giao hai năm âm).
- **App:** `lib/calendarStore.ts` (đọc người có ngày của mọi cuốn trong dòng họ, phân trang 1.000 dòng); màn `CalendarScreen`; lối vào ở `AppRail` và `ClanScreen`; mở người từ lịch qua `App.tsx` và `TreeScreen`.
- **Test:** Vitest cho `core` và kho dữ liệu; Playwright cho lịch, lọc, mở người, quyền người xem, màn điện thoại.
- **Tài liệu:** KB `design-system.md`, `tech-stack.md`; `status.md`.
- **Không thêm thư viện.**
