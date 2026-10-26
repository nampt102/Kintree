# Tasks

## 1. Monorepo

- [x] 1.1 Tạo `package.json` gốc, `pnpm-workspace.yaml`, `.gitignore`, `.nvmrc` (Node 22), `tsconfig.base.json`; kiểm: `pnpm install` chạy không lỗi
- [x] 1.2 Tạo `packages/core` (TS thuần, Vitest, `src/index.ts`); kiểm: `pnpm --filter @kintree/core test` chạy được với một test mẫu
- [ ] 1.3 Tạo `apps/app` bằng Vite React TS, hiện ngày âm hôm nay lấy từ `@kintree/core`; kiểm: `pnpm dev` mở trang thấy ngày âm, `pnpm --filter app build` thành công
- [x] 1.4 Script gốc `pnpm test` chạy test mọi package; kiểm: lệnh trả mã 0

## 2. Lịch âm (`lunar-calendar`)

- [ ] 2.1 Thêm fixture Tết 1900–2100 từ hai nguồn đã công bố, ghi nguồn trong file; kiểm: fixture có đủ 201 năm
- [ ] 2.2 Viết `solarToLunar`, `lunarToSolar` (UTC+7) từ công thức thiên văn Meeus theo quy tắc lịch Việt Nam, không chép mã amlich, ghi nguồn công thức ở đầu file, và lỗi `OUT_OF_RANGE`, `INVALID_LUNAR_DATE`; kiểm: test Tết theo fixture, test vòng 1900–2100, test ví dụ 17/02/2007 và 26/10/1942, test tháng 6 nhuận 2025, test tháng nhuận/ngày 30 không tồn tại đều qua
- [ ] 2.3 Thêm Can Chi năm/tháng/ngày; kiểm: test 2026 = Bính Ngọ, năm chứa 17/02/2007 = Đinh Hợi, và một ngày Can Chi đối chiếu lịch vạn niên qua

## 3. Ngày giỗ (`death-anniversary`)

- [ ] 3.1 Thêm kiểu `PartialDate` và hàm kiểm hợp lệ (có ngày thì có tháng, có tháng thì có năm, ngày tồn tại theo dương/âm); kiểm: test các ca hợp lệ/không hợp lệ trong spec `family-tree-integrity` mục ngày tháng
- [ ] 3.2 Thêm `deathAnniversary(deathDate, lunarYear)` gồm tháng nhuận → tháng thường, ngày 30 → 29 khi tháng thiếu, lỗi `INCOMPLETE_DEATH_DATE`, tên kỳ giỗ; kiểm: mọi scenario trong spec `death-anniversary` có test tương ứng và qua

## 4. Toàn vẹn cây trong lõi (`family-tree-integrity`)

- [ ] 4.1 Thêm hàm kiểm một quan hệ mới trên cây đã tải (cha/mẹ thứ hai cùng loại, cha nuôi bên cạnh cha ruột được phép, sai giới tính vai trò, giới tính chưa rõ, nối vòng, thiếu loại, hai người ngoại tộc, khác cuốn), trả mã lỗi cố định; kiểm: test cho từng scenario trong spec qua

## 5. Schema Postgres

- [ ] 5.1 `supabase init`; viết `supabase/migrations/0001_init.sql` theo design D5 (bảng, `CHECK` ngày không đầy đủ, `UNIQUE (child_id, role, kind)`, `gender` có `unknown`, bật RLS không policy); kiểm: `supabase db reset` chạy không lỗi
- [ ] 5.2 Thêm trigger: vai trò khớp giới tính, cùng cuốn, không cả hai ngoại tộc, không nối vòng, kiểm ngày dương tồn tại; trigger `audit_log` cho `persons`, `parent_child`, `marriages`; kiểm: file `supabase/tests/integrity.sql` chứng minh mỗi câu ghi sai bị từ chối và mỗi thay đổi có dòng nhật ký
- [ ] 5.3 Viết `openspec/kb/data-model.md` mô tả bảng và ràng buộc, trỏ tới file migration; kiểm: mọi bảng trong migration có mặt trong KB

## 6. Tài liệu và kiểm tổng

- [ ] 6.1 Viết `openspec/kb/tech-stack.md` (phiên bản, lệnh cài, chạy, test, yêu cầu Docker cho Supabase local) và ghi rủi ro múi giờ trước 1968; kiểm: làm theo tài liệu trên máy sạch chạy được `pnpm install && pnpm test`
- [ ] 6.2 Chạy `openspec validate bootstrap-core --strict` và `pnpm test`; kiểm: cả hai qua

## Workflow follow-up

- Cập nhật `openspec/status.md` bằng skill `project-sync` khi xong.
- Hỏi người dùng trước khi archive change.
