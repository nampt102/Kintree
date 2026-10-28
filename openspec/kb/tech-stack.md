# Tech stack

Hiện trạng sau change `cloud-auth-storage`. Lý do chọn: `openspec/decisions/0001`, `0002`, `0005`.

## Yêu cầu máy
- Node ≥ 20.19 (repo dùng 22, xem `.nvmrc`), pnpm 10 (`packageManager` trong `package.json`).
- Docker đang chạy — cần cho Supabase local (Postgres + Auth + REST + Mailpit), cho `pnpm db:test` và cho e2e. Test của `packages/core` và Vitest của app không cần Docker.

## Cấu trúc
| Đường dẫn | Nội dung |
|---|---|
| `package.json`, `pnpm-workspace.yaml` | pnpm monorepo: `apps/*`, `packages/*` |
| `apps/app/` | Vite + React + TypeScript + Tailwind; app gia phả (đăng nhập, dòng họ, cuốn, cây) |
| `scripts/` | `db-env.mjs` (ghi `apps/app/.env.local`), `promote-platform-admin.mjs` (cấp quản trị nền tảng) |
| `packages/core/` | TypeScript thuần, dùng thẳng file `.ts` qua workspace (không có bước build); test bằng Vitest |
| `supabase/config.toml` | cấu hình Supabase CLI (`supabase init`) |
| `supabase/migrations/` | migration SQL, tên dạng `YYYYMMDDHHMMSS_ten.sql` theo yêu cầu của Supabase CLI |
| `supabase/tests/*.test.sql` | test pgTAP: toàn vẹn (`integrity`), quyền và hàm (`access`) |
| `supabase/templates/` | thư đăng nhập có mã 6 số (`magic_link`, `confirmation`): thư mặc định chỉ có liên kết |

## Lệnh
| Lệnh | Việc |
|---|---|
| `pnpm install` | cài mọi package (gồm Supabase CLI ở `devDependencies` gốc) |
| `pnpm test` | `packages/core`: `tsc --noEmit` + Vitest; `apps/app`: `tsc -b` |
| `pnpm dev` | chạy app ở http://localhost:5173 |
| `pnpm db:start` | chạy Supabase local: Postgres, Auth, Kong, REST, Mailpit (bỏ realtime, storage, studio… cho nhẹ). Đổi `config.toml` thì `db:stop` rồi `db:start` |
| `pnpm db:env` | ghi `apps/app/.env.local` (URL + khoá anon; không có khoá dịch vụ) từ `supabase status` |
| `pnpm admin:promote <email>` | cấp quản trị nền tảng (tạo người dùng nếu chưa có); dùng khoá `service_role` đọc từ `supabase status` hoặc biến `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` |
| `pnpm --filter app e2e` | Playwright; cần `db:start` (xem dưới) |
| `pnpm db:reset` | xoá DB local và chạy lại mọi migration |
| `pnpm db:test` | chạy test pgTAP trong `supabase/tests/` |
| `pnpm db:stop` | dừng container |

## `apps/app` (sau `cloud-auth-storage`)
| Đường dẫn | Nội dung |
|---|---|
| `src/App.tsx` | `AuthProvider` → `AuthGate` → `Home`: dòng họ → các cuốn → một cuốn, và màn quản trị nền tảng; `Home` theo `key` người dùng nên đăng xuất xoá sạch state |
| `src/auth.tsx` | phiên (`useAuth`), cổng đăng nhập, màn email → mã 6 số (gửi lại khoá 30 giây theo giờ thật), nút Google khi `VITE_AUTH_GOOGLE=1` |
| `src/lib/supabase.ts` | client dùng chung; thiếu cấu hình thì `supabase` = null và màn hình hướng dẫn chạy `pnpm db:env` |
| `src/lib/cloudStore.ts` | hàm thuần `rowsToDoc`/`docToRows`/`diffDocs`/`mapError`; `cloudStore(client, userId)` (danh bạ dòng họ+cuốn, tạo/sửa/xoá cuốn, `load` có phân trang 1.000 dòng, `save` qua `apply_tree_changes`) và `platformStore` |
| `src/lib/store.ts` | chỉ còn `backupFileName`, `downloadBackup` (không lưu cục bộ) |
| `src/lib/messages.ts` | bảng dịch mọi mã lỗi sang tiếng Việt (kiểu `Record` buộc đủ mã), gồm `NOT_SIGNED_IN`, `FORBIDDEN`, `OFFLINE`, `LOAD_FAILED`, `SAVE_FAILED`, `TREE_NOT_FOUND` |
| `src/ui/` | thành phần UI dựa trên shadcn/ui (`radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `sonner`), theo token đỏ trầm; xem `kb/design-system.md`, ADR 0010. Gói JS gzip ~282 KB, CSS ~11 KB (2026-10-28) |
| `src/lib/actions.ts` | nút nào hiện cho một người (luật thật vẫn ở `core`) |
| `src/state/saveQueue.ts` | hàng đợi ghi tuần tự; lỗi thì huỷ các lần chờ và hoàn về bản máy chủ đã xác nhận |
| `src/state/useTreeDoc.ts` | giữ `TreeDoc` + vai trò, `edit(op)` chạy thao tác của `core` rồi xếp hàng ghi; `reload()` |
| `src/components/ClanList.tsx`, `ClanScreen.tsx`, `PlatformScreen.tsx`, `AccountMenu.tsx`, `TreeManage.tsx` | danh sách dòng họ ("chưa được cấp quyền" khi chưa có), các cuốn (tạo/sửa/xoá theo vai trò), màn quản trị nền tảng, menu tài khoản, hộp thoại tạo/sửa/xoá cuốn (xoá phải gõ lại tên) |
| `src/components/TreeScreen.tsx` | màn một cuốn; người xem chỉ đọc (ẩn mọi nút sửa) |
| `src/components/TreeDiagram.tsx` | React Flow: vẽ theo `computeLayout`; nút quanh khung chỉ hiện khi trỏ chuột (thiết bị có hover) |
| `src/components/PersonPanel.tsx` | bảng thông tin: cạnh phải (desktop) / tấm trượt dưới (< 768 px); `readOnly` cho người xem |
| `src/components/ActionDialogs.tsx`, `DateInput.tsx` | hộp thoại thêm con/vợ chồng/cha mẹ, gỡ, sắp thứ tự, hồ sơ; ô ngày ba ô có quy đổi âm/dương |

## Supabase local và e2e
- **Storage và Edge Function (change `ai-image-proposals`):** `db:start` bật `storage-api` và `edge-runtime`. Function ở `supabase/functions/<tên>/` (Deno, `deno.json` ánh xạ `zod`, `@supabase/supabase-js`, `ai`, `@ai-sdk/*`); mã dùng chung ở `_shared/` (thuần TypeScript, Vitest của app import chính các file này). **Thêm function mới phải `pnpm db:stop` rồi `pnpm db:start`** (chỉ khởi động lại container thì danh sách function không đổi). Gói `npm:` tải được qua Sophos, không cần thêm chứng chỉ (đã thử 2026-10-28). `AI_IMAGE_MODEL` (mặc định `mock`) chọn nhà cung cấp; biến `AI_IMAGE_MODEL` và khoá (tên mặc định của SDK, vd. `ANTHROPIC_API_KEY`) đặt trong `supabase/.env` (cùng tệp với Google, SMTP), chuyển vào function qua `[edge_runtime.secrets]` của `config.toml`; biến trống = bộ giả lập. Nhánh nhà cung cấp thật **chưa chạy thử**.
- `db:start` rồi `db:env`; app đọc `apps/app/.env.local`. Hộp thư thử (Mailpit): http://127.0.0.1:54324 (API `/api/v1/messages`).
- **Tệp khoá duy nhất: `supabase/.env`** (Google, SMTP, AI; mẫu `supabase/.env.example`). `apps/app/.env.local` do `pnpm db:env` sinh (giữ các dòng khác như `VITE_AUTH_GOOGLE=1`; mẫu `apps/app/.env.example`). Không có `.env` ở thư mục gốc.
- Đăng nhập Google: đặt `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`/`SECRET` trong `supabase/.env`, đổi `[auth.external.google] enabled = true` trong `supabase/config.toml`, đặt `VITE_AUTH_GOOGLE=1`. Đã thử đăng nhập thật 2026-10-27.
- Mạng có tường lửa giải mã SSL (máy này: Sophos) làm container Auth báo `x509: certificate signed by unknown authority` khi gọi Google/SMTP. Xuất chứng chỉ gốc (PEM, công khai) vào `supabase/certs/corp-ca.crt` (đã ignore) rồi chạy `pnpm db:trust-ca` **sau mỗi lần `db:start`** (container bị tạo lại). Đã thử 2026-10-27: Gmail SMTP gửi được, Google chuyển hướng tới accounts.google.com.
- Gửi thư thật: `[auth.email.smtp] enabled = true` (Gmail, biến `SMTP_*` trong `supabase/.env`); khi đó thư không vào Mailpit nên e2e đọc OTP sẽ hỏng, đổi lại `false` trước khi chạy e2e.
- `config.toml` chỉ cho máy phát triển: `email_sent = 100`, các giới hạn đăng nhập 1.000 (e2e đăng nhập hàng loạt). Production phải đặt lại.
- Thư đăng nhập dùng mẫu `supabase/templates/*.html` (có `{{ .Token }}`); mẫu mặc định chỉ có liên kết nên không có mã 6 số.
- e2e (`apps/app/e2e`): `global-setup.ts` đọc khoá từ `supabase status` một lần và đặt vào biến môi trường của worker (khoá `service_role` không ghi tệp nào, không vào app; có test kiểm). `backend.ts` tạo người dùng/dòng họ/cuốn bằng `service_role`; phiên lấy không mật khẩu (`generateLink` + `verifyOtp`) rồi đưa vào `localStorage` (khoá `sb-<nhãn đầu của host>-auth-token`), mỗi test một dòng họ riêng nên chạy song song; 4 worker, dọn dữ liệu cuối mỗi test. Bộ chạy 67 test (1 bỏ qua: máy gập).
- Đã gặp: `INSERT … RETURNING` trên `trees` bị RLS chặn (xem `data-model.md`); `postgres` trả `removed_at` dạng `…+00:00`, `rowsToDoc` chuẩn hoá về ISO `…Z`; Auth local giới hạn 30 lần verify OTP / 5 phút nên e2e cần nâng giới hạn.

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
