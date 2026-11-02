# Tasks

## 1. Lõi lịch (`packages/core`)

- [x] 1.1 Viết `calendar.ts`: `monthGrid`, `calendarEvents`, `upcomingEvents`, `incompleteDeaths` theo design D1, xuất ra từ `index.ts`. Kiểm: Vitest `core` (lưới tháng thứ Hai đầu tuần; Tết 2026; tháng nhuận; Giỗ đầu/hết/thường; ngày 30 tháng thiếu; tháng 2/2026 giao hai năm âm; sinh nhật dương, âm, 29/2; người mất không có sinh nhật; ngày ngoài 1800–2199 bị bỏ qua; `upcomingEvents` qua ranh tháng và năm; thiếu ngày/tháng mất vào `incompleteDeaths`).

## 2. Lớp dữ liệu app

- [x] 2.1 `lib/calendarStore.ts`: đọc người có ngày của các cuốn trong dòng họ (phân trang), chuyển thành `CalendarPerson` kèm cuốn; xuất `fetchAll` và hàm chuyển ngày từ `cloudStore.ts`. Kiểm: Vitest (chuyển dòng cột → `PartialDate`, phân trang qua 1.000 dòng, bỏ người không có ngày).

## 3. Bản mẫu giao diện (chờ duyệt)

- [x] 3.1 `openspec/changes/lunar-calendar-view/mockup.html` bằng skill `ui-ux-pro-max`, token và thành phần đã có: lịch tháng máy tính (ô giỗ/sinh nhật, ngày hôm nay, mùng 1 ghi tháng âm, tháng nhuận), danh sách sắp tới, lọc cuốn, mục "Chưa tính được giỗ", thẻ "Ngày giỗ sắp tới" trên trang nhà dòng họ, mục "Ngày giỗ" ở thanh bên; điện thoại 375 px (lưới gọn, chạm ngày xem sự kiện). Kiểm: chủ dự án xem.
- [x] 3.2 Sửa theo góp ý đến khi duyệt; ghi kết luận vào `design.md`. Kiểm: chủ dự án ghi "duyệt".

## 4. Giao diện (chỉ làm sau 3.2)

- [x] 4.1 `CalendarScreen` (lịch tháng, chuyển tháng, hôm nay, lọc cuốn, sắp tới, chưa tính được giỗ) và điều hướng trong `App.tsx`; mở người từ lịch (`focusPersonId` ở `TreeScreen`). Kiểm: e2e `calendar.spec.ts` với đồng hồ cố định: giỗ và sinh nhật đúng ô, lọc cuốn, sắp tới và mở người, mục chưa tính được giỗ.
- [x] 4.2 Lối vào: mục "Ngày giỗ" ở `AppRail` (số sự kiện 7 ngày tới) và thẻ sắp tới ở `ClanScreen`. Kiểm: e2e (người xem vào được, không có nút sửa; người ngoài không thấy dữ liệu lịch).
- [x] 4.3 Màn 375 px và `layout.spec.ts`/`visual.spec.ts` thêm màn lịch. Kiểm: vùng chạm ≥ 44 px, không cuộn ngang ở 320–1440 px; Playwright toàn bộ qua.

## 5. Hoàn tất

- [ ] 5.1 Cập nhật KB `design-system.md`, `tech-stack.md`, `status.md` (tách `anniversary-push` thành bước riêng). Kiểm: Vitest, Playwright, build, `openspec validate --strict` qua.

## Workflow follow-up

- Chủ dự án duyệt app chạy thật, rồi commit, push và `/opsx:archive lunar-calendar-view`.
