# Design

## Context
Lý do làm: `proposal.md`. Hành vi bắt buộc: `specs/family-calendar`.

Hiện trạng:
- `packages/core` đã có `solarToLunar`, `lunarToSolar`, `lunarMonthLength`, `canChiYear/Month/Day` và `deathAnniversary(death, lunarYear)` (xử lý tháng nhuận, ngày 30, Giỗ đầu/hết/thường). Phạm vi năm 1800–2199. Chưa có gì dựng lịch tháng hay sinh nhật.
- Dữ liệu ngày nằm ở các cột `birth_*`, `death_*` của `persons` (`year/month/day/lunar/leap`). RLS: người có vai trò dòng họ hoặc cuốn đọc được người của cuốn (`tree_role`), cuốn đã xoá không thấy. Không cần migration.
- `cloudStore.directory()` đã cho danh sách dòng họ và cuốn của người dùng; trang nhà dòng họ (`ClanScreen`) và thanh bên (`AppRail`) là nơi đặt lối vào; bản mẫu `ui-polish` đã chừa mục "Ngày giỗ".
- App điều hướng bằng state ở `App.tsx` (giống mục Thành viên); `TreeScreen` hiện chưa nhận người cần chọn sẵn từ bên ngoài.

## Goals / Non-Goals

**Goals**
- Lịch tháng âm–dương và danh sách sắp tới tính đúng bằng lõi đã kiểm, dùng chung mọi nơi (sau này cả thông báo đẩy).
- Người xem cũng dùng được; không đổi cơ sở dữ liệu.

**Non-Goals**
- Thông báo đẩy, xuất .ics, nhắc tuỳ chỉnh từng người (change `anniversary-push` và sau).
- Lối vào lịch cho người chỉ có vai trò ở một cuốn (không có vai trò dòng họ).

## Decisions

### D1. Lõi: `packages/core/src/calendar.ts` (hàm thuần)
```ts
type CalendarPerson = { id: string; fullName: string; birth?: PartialDate; death?: PartialDate }
type CalendarEvent<P> = { date: SolarDate; lunar: LunarDate; kind: 'death' | 'birthday'; anniversary?: AnniversaryKind; person: P }
monthGrid(year, month): { cells: GridCell[] }              // 6 hàng × 7 cột, thứ Hai đầu tuần
calendarEvents<P extends CalendarPerson>(people: P[], year, month, today: SolarDate): CalendarEvent<P>[]
upcomingEvents<P extends CalendarPerson>(people: P[], from: SolarDate, days = 30): CalendarEvent<P>[]
incompleteDeaths<P extends CalendarPerson>(people: P[]): P[]   // có ghi mất nhưng thiếu ngày hoặc tháng
```
- **Giỗ:** một tháng dương nằm trong tối đa hai năm âm lịch (năm âm của ngày đầu và của ngày cuối tháng); gọi `deathAnniversary` cho từng năm ứng viên và giữ kết quả rơi trong tháng. Nhờ vậy tháng giao hai năm âm vẫn đủ giỗ.
- **Sinh nhật:** chỉ người không có `death` và `birth` đủ ngày, tháng, sinh trong 100 năm (`today.year − birth.year ≤ 100`). Ngày sinh dương: ngày/tháng dương mỗi năm (29/2 → 28/2 năm không nhuận). Ngày sinh âm: `lunarToSolar` cho từng năm âm ứng viên, ngày 30 → `lunarMonthLength` như quy tắc giỗ, tháng nhuận → tháng thường.
- Người có ngày ngoài 1800–2199 hoặc không hợp lệ: bỏ qua, không ném lỗi (lịch chỉ hiện cái tính được).
- Lưới tháng dùng `jdn`/`fromJdn` để đi từng ngày; mỗi ô giữ `lunar` để hiện "mùng 1 tháng X".

*Phương án đã cân nhắc:* tính sự kiện ở Postgres (hàm SQL) để một lần truy vấn ra lịch. Bỏ: phải nhân đôi thuật toán lịch âm ở hai nơi (đã có test ở `core`), và thông báo đẩy sau này cần cùng logic ở Edge Function (chạy được mã `core`/`_shared` thuần).

### D2. Dữ liệu: `lib/calendarStore.ts`
- `people(treeIds)`: đọc `persons` (chỉ cột cần: id, tree_id, full_name, các cột ngày sinh/mất) với `tree_id in (…)`, `removed_at is null` và có ngày sinh hoặc ngày mất; phân trang 1.000 dòng bằng `fetchAll` (xuất ra từ `cloudStore.ts`). Chuyển dòng thành `PartialDate` bằng hàm sẵn có của `cloudStore`.
- Một dòng họ lớn (hàng nghìn người) tải một lần khi mở màn, giữ trong bộ nhớ đến khi rời màn; không cache lâu hơn (dữ liệu có thể đổi).
- Cuốn lấy từ `directory()` (đã loại cuốn xoá), nên cuốn xoá không vào lịch.

### D3. "Hôm nay"
Ngày theo múi giờ của thiết bị (`new Date()` cục bộ); quy ước UTC+7 của dự án áp dụng cho tính lịch âm (đã ở `core`). Test e2e cố định giờ bằng `page.clock`.

### D4. Giao diện (chờ bản mẫu duyệt)
- **Màn "Ngày giỗ"** (`CalendarScreen`): máy tính chia hai: lịch tháng (trái), "Sắp tới 30 ngày" (phải, 340 px); đầu trang: tên màn, chuyển tháng, "Hôm nay", lọc cuốn bằng `Segmented wrap`. Ô lịch: ngày dương lớn, ngày âm nhỏ (mùng 1 ghi "1/Giêng"), tối đa hai nhãn sự kiện + "+N"; ô hôm nay có viền đỏ và chữ "Hôm nay" ẩn cho trình đọc màn hình. Phía dưới: mục "Chưa tính được giỗ" (thu gọn).
- **Điện thoại:** lưới gọn (chấm số sự kiện), chạm một ngày thì hiện sự kiện của ngày ở dưới lưới; "Sắp tới" dưới cùng.
- **Lối vào:** mục "Ngày giỗ" trong thanh bên (có số sự kiện trong 7 ngày tới) và một thẻ "Ngày giỗ sắp tới" (3 dòng + "Xem lịch") trên trang nhà dòng họ.
- **Mở người:** `App.tsx` giữ `{treeId, personId}`; `TreeScreen` nhận `focusPersonId` và gọi `goTo` khi cuốn tải xong.
- Theo `kb/design-system.md`, `ui-ux-pro-max` (ADR 0004) và thành phần shadcn đã có (ADR 0010).

**Kết luận bản mẫu (đã duyệt 2026-11-02):** giữ bố cục lịch trái + "Sắp tới" phải, tối đa 2 chip rồi "+N nữa", thẻ sắp tới trên trang nhà dòng họ, điện thoại chạm ngày xem sự kiện dưới lưới. Nền theo ADR 0012 (trắng); thêm token `ok`/`ok-soft` cho sinh nhật.

### D5. Kiểm thử
- Vitest `core`: lưới tháng (thứ Hai đầu tuần, 6 hàng), Tết 2026, tháng nhuận, giỗ đầu/hết/thường, ngày 30 tháng thiếu, tháng 2/2026 giao hai năm âm, sinh nhật dương/âm/29-2, người mất không có sinh nhật, ngày ngoài phạm vi, `upcomingEvents` qua ranh tháng và năm, dữ liệu thiếu ngày.
- Vitest app: chuyển dòng cột → `PartialDate`; ghép cuốn.
- Playwright (đồng hồ cố định): lịch hiện giỗ đúng ô, lọc cuốn, danh sách sắp tới và mở người, người xem xem được không có nút sửa, mục "Chưa tính được giỗ", màn 375 px (vùng chạm, không cuộn ngang).

## Risks / Trade-offs
- **[Dòng họ rất lớn → tải chậm]** Tải một lần cả người có ngày. → Phân trang, chỉ cột cần; đo ở cuốn thử 1.000 người (đã có bộ sinh dữ liệu); nếu chậm thì tách theo tháng bằng truy vấn khoảng ngày dương (giỗ dương chỉ gần đúng nên cần giữ tính ở `core`).
- **[Sinh nhật "còn sống" là suy đoán]** Không có cờ "còn sống". → Quy tắc 100 năm ghi rõ trong spec; người quản trị ghi ngày mất thì sinh nhật biến mất.
- **[Người ngoại tộc/dâu rể]** Vẫn có giỗ và sinh nhật như mọi người; không lọc.
- **[Múi giờ thiết bị]** Người dùng ở nước ngoài thấy "hôm nay" theo giờ máy. → Chấp nhận; ngày âm vẫn tính theo UTC+7 (quy ước dự án).

## Migration Plan
Không đổi dữ liệu. Rollback: revert commit.

## Open Questions
- Mục "Ngày giỗ" cho người chỉ có vai trò một cuốn: thêm khi có nhu cầu (không đổi spec hiện tại).
