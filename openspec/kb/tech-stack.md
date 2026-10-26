# Tech stack

Hiện trạng sau change `bootstrap-core`. Lý do chọn: `openspec/decisions/0001`, `0002`, `0005`.

## Yêu cầu máy
- Node ≥ 20.19 (repo dùng 22, xem `.nvmrc`), pnpm 10 (`packageManager` trong `package.json`).
- Docker đang chạy — chỉ cần cho cơ sở dữ liệu local (Supabase). Test của `packages/core` không cần Docker.

## Cấu trúc
| Đường dẫn | Nội dung |
|---|---|
| `package.json`, `pnpm-workspace.yaml` | pnpm monorepo: `apps/*`, `packages/*` |
| `apps/app/` | Vite + React + TypeScript; hiện mới có trang thử hiện ngày âm hôm nay (`src/App.tsx`) |
| `packages/core/` | TypeScript thuần, dùng thẳng file `.ts` qua workspace (không có bước build); test bằng Vitest |
| `supabase/config.toml` | cấu hình Supabase CLI (`supabase init`) |
| `supabase/migrations/` | migration SQL, tên dạng `YYYYMMDDHHMMSS_ten.sql` theo yêu cầu của Supabase CLI |
| `supabase/tests/*.test.sql` | test pgTAP cho schema |

## Lệnh
| Lệnh | Việc |
|---|---|
| `pnpm install` | cài mọi package (gồm Supabase CLI ở `devDependencies` gốc) |
| `pnpm test` | `packages/core`: `tsc --noEmit` + Vitest; `apps/app`: `tsc -b` |
| `pnpm dev` | chạy app ở http://localhost:5173 |
| `pnpm db:start` | chạy riêng container Postgres của Supabase (bỏ các dịch vụ khác cho nhẹ) |
| `pnpm db:reset` | xoá DB local và chạy lại mọi migration |
| `pnpm db:test` | chạy test pgTAP trong `supabase/tests/` |
| `pnpm db:stop` | dừng container |

## `apps/app` (sau `tree-editing`)
| Đường dẫn | Nội dung |
|---|---|
| `src/App.tsx` | khung: danh sách cuốn hoặc một cuốn đang mở |
| `src/lib/store.ts` | `TreeStore` + bản `localStorage` (`kintree:index`, `kintree:doc:<id>`); `downloadBackup`, `downloadRaw` |
| `src/lib/messages.ts` | bảng dịch mọi mã lỗi sang tiếng Việt (kiểu `Record` buộc đủ mã) |
| `src/lib/actions.ts` | nút nào hiện cho một người (luật thật vẫn ở `core`) |
| `src/state/useTreeDoc.ts` | giữ `TreeDoc` trong bộ nhớ, `edit(op)` chạy thao tác của `core` rồi lưu |
| `src/components/TreeScreen.tsx` | màn hình một cuốn: thanh công cụ, tìm, thu gọn, xem riêng nhánh, hộp thoại |
| `src/components/TreeDiagram.tsx` | React Flow: vẽ theo `computeLayout`; nút quanh khung chỉ hiện khi trỏ chuột (thiết bị có hover) |
| `src/components/PersonPanel.tsx` | bảng thông tin: cạnh phải (desktop) / tấm trượt dưới (< 768 px) |
| `src/components/ActionDialogs.tsx`, `DateInput.tsx` | hộp thoại thêm con/vợ chồng/cha mẹ, gỡ, sắp thứ tự, hồ sơ; ô ngày ba ô có quy đổi âm/dương |

Lưu ý khi sửa giao diện sơ đồ: React Flow bật sẵn phóng to khi bấm đúp và nuốt sự kiện `dblclick` của khung; đã tắt bằng `zoomOnDoubleClick={false}` để bấm đúp mở được hồ sơ. Đừng refit sơ đồ khi mở bảng thông tin: khung dịch chuyển giữa hai lần bấm làm bấm đúp trượt.

## `packages/core`
| File | Nội dung |
|---|---|
| `src/lunar.ts` | đổi dương ↔ âm lịch Việt Nam (UTC+7), năm 1800–2199; lỗi `OUT_OF_RANGE`, `INVALID_LUNAR_DATE`, `INVALID_SOLAR_DATE` |
| `src/canchi.ts` | Can Chi năm, tháng, ngày |
| `src/dates.ts` | `PartialDate`, `isValidPartialDate`, `deathAnniversary` (tháng nhuận → tháng thường, ngày 30 → 29 khi tháng thiếu, tên kỳ giỗ) |
| `src/integrity.ts` | `checkParentLink`, `checkMarriage` — cùng luật với trigger trong migration |
| `src/tree/` | mô hình, thao tác sửa cây, tìm kiếm, lưu trữ, bố cục — xem `openspec/kb/modules/tree.md` |
| `test/fixtures/tet.json` | ngày Tết 1900–2100, nguồn ghi trong file |

## Lịch âm
- Viết độc lập từ công thức Meeus (*Astronomical Algorithms*) và ΔT của Espenak & Meeus; nguồn ghi ở đầu `src/lunar.ts`.
- Không dùng mã amlich của Hồ Ngọc Đức: file nguồn ghi rõ chỉ cho phép dùng cá nhân, phi thương mại (đã kiểm trên gói npm `amlich`, 2026-10-26).
- Kiểm: Tết 1900–2100 khớp bảng đối chiếu; đổi xuôi rồi ngược khớp mọi ngày 1900–2100.
- Đối chiếu từng ngày 1800–2199 với gói `amlich` (2026-10-26, script ngoài repo): 274 ngày lệch ở 14 năm. Ca lệch một ngày (1877, 1885, 2054, 2062) là `amlich` trả "ngày 0". Ca lệch cả tháng đều do điểm sóc rơi trong ±2 phút quanh nửa đêm; theo PyEphem, Kintree đúng 8/9 ca, sai ca tháng 7/1967 (sóc 00:00:03 ngày 8/7, Kintree đặt mùng 1 vào 7/7). Muốn sửa cần công thức kinh độ mặt trời/điểm sóc chính xác hơn; ở biên vài giây thì cần đối chiếu lịch chính thức.
- **Rủi ro chưa xử lý:** trước năm 1968 lịch âm Việt Nam (ít nhất ở miền Nam) tính theo UTC+8; code dùng UTC+7 cho mọi năm. Ví dụ Tết Mậu Thân 1968: lịch UTC+7 là 29/01, miền Nam ăn Tết 30/01. Ngày giỗ của người mất trước 1968 có thể lệch một ngày ở vài tháng.

## Lưu ý khi viết migration
- Supabase CLI 2.122 tách câu lệnh sai khi thân hàm plpgsql có biểu thức `case … end` (báo `syntax error at end of input`). Dùng `if … end if` trong plpgsql; hàm `language sql` thì không bị.
- Chạy `pnpm db:start` xong rồi mới `pnpm db:reset`; chạy chồng hai lệnh làm container bị dừng giữa chừng.
