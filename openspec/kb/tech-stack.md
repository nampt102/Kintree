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

## `packages/core`
| File | Nội dung |
|---|---|
| `src/lunar.ts` | đổi dương ↔ âm lịch Việt Nam (UTC+7), năm 1800–2199; lỗi `OUT_OF_RANGE`, `INVALID_LUNAR_DATE`, `INVALID_SOLAR_DATE` |
| `src/canchi.ts` | Can Chi năm, tháng, ngày |
| `src/dates.ts` | `PartialDate`, `isValidPartialDate`, `deathAnniversary` (tháng nhuận → tháng thường, ngày 30 → 29 khi tháng thiếu, tên kỳ giỗ) |
| `src/integrity.ts` | `checkParentLink`, `checkMarriage` — cùng luật với trigger trong migration |
| `test/fixtures/tet.json` | ngày Tết 1900–2100, nguồn ghi trong file |

## Lịch âm
- Viết độc lập từ công thức Meeus (*Astronomical Algorithms*) và ΔT của Espenak & Meeus; nguồn ghi ở đầu `src/lunar.ts`.
- Không dùng mã amlich của Hồ Ngọc Đức: file nguồn ghi rõ chỉ cho phép dùng cá nhân, phi thương mại (đã kiểm trên gói npm `amlich`, 2026-10-26).
- Kiểm: Tết 1900–2100 khớp bảng đối chiếu; đổi xuôi rồi ngược khớp mọi ngày 1900–2100.
- **Rủi ro chưa xử lý:** trước năm 1968 lịch âm Việt Nam (ít nhất ở miền Nam) tính theo UTC+8; code dùng UTC+7 cho mọi năm. Ví dụ Tết Mậu Thân 1968: lịch UTC+7 là 29/01, miền Nam ăn Tết 30/01. Ngày giỗ của người mất trước 1968 có thể lệch một ngày ở vài tháng.

## Lưu ý khi viết migration
- Supabase CLI 2.122 tách câu lệnh sai khi thân hàm plpgsql có biểu thức `case … end` (báo `syntax error at end of input`). Dùng `if … end if` trong plpgsql; hàm `language sql` thì không bị.
- Chạy `pnpm db:start` xong rồi mới `pnpm db:reset`; chạy chồng hai lệnh làm container bị dừng giữa chừng.
