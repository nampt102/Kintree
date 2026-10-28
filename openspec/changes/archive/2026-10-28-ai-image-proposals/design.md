# Design

## Context
Lý do làm: `proposal.md`. Hành vi bắt buộc: `specs/ai-sources`, `specs/proposal-review`.

Hiện trạng:
- `sources`, `proposals`, `field_sources` đã có (migration `init`) nhưng không có policy, không được cấp quyền cho `authenticated` (migration `auth_access` thu hồi hết, chỉ cấp lại bảng cây). `sources` gắn `clan_id`, chưa có `tree_id`; `proposals.status` chỉ có `pending/accepted/rejected`; `field_sources` chỉ có khoá `(person_id, field, source_id)` và `proposal_id`.
- `pnpm db:start` đang loại trừ `storage-api` và `edge-runtime`; chưa có thư mục `supabase/functions/`.
- Ghi cây đi qua `useTreeDoc.edit(op)` → `diffDocs` → hàng đợi ghi tuần tự `saveQueue` → RPC `apply_tree_changes` (security invoker, RLS áp dụng). Lỗi thì hàng đợi hoàn về bản máy chủ.
- Máy này sau tường lửa Sophos: container auth từng lỗi x509 khi gọi ra ngoài, phải chạy `pnpm db:trust-ca` (ADR 0007 / KB `tech-stack.md`).
- Realtime bị loại trừ khỏi `db:start`, nên app không nhận được đẩy từ máy chủ.

## Goals / Non-Goals

**Goals**
- Lát dọc chạy hết đường thật: ảnh → Storage → Edge Function → (bộ giả lập) → đề xuất → hàng chờ → nhận → cây + nguồn, kiểm được bằng e2e mà không cần khoá AI.
- Mọi quyền ở cơ sở dữ liệu; kết quả AI coi là dữ liệu không tin cậy.
- Cắm nhà cung cấp thật chỉ bằng biến môi trường.

**Non-Goals**
- Ghi âm, chuyển giọng nói; bộ đánh giá độ chính xác; chọn model mặc định; nhiều ảnh một lần; Realtime.

## Decisions

### D1. Dữ liệu
Migration mới `20261029000000_ai_image_proposals.sql`:
- `sources`: thêm `tree_id` (tư liệu đưa vào từ một cuốn), `image_kind` (`grave`, `page`, `altar`, `other`), `status` (`processing`, `done`, `failed`), `status_at`, `error`. `storage_path` = `<clan_id>/<tree_id>/<source_id>.jpg`.
- `proposals`:
  - `status` thêm `superseded` (bị thay khi đọc lại) và cột `edited boolean` (nhận có sửa).
  - `ref text`: mã tạm của người trong lô đọc (vd. `p1`) để đề xuất quan hệ trỏ tới người chưa nhận.
  - `quote text`: chữ AI đọc được ở vùng ảnh (vd. "mất ngày 5 tháng 3 năm Quý Tỵ") để người duyệt so cạnh ảnh.
  - `result_person_id`: người trong cây mà đề xuất thêm người đã thành (khi nhận hoặc gộp).
- `field_sources`: thêm `value jsonb` (giá trị nguồn đưa ra), `anchor jsonb`, `accepted boolean`, `note text`, `reviewed_by`, `reviewed_at`. Ghi cả khi **bỏ** một đề xuất sửa trường của người đã có (`accepted = false`), để spec "Hai nguồn mâu thuẫn" có dữ liệu. Khoá chính đổi thành `(person_id, field, proposal_id)` vì một ảnh có thể đề xuất cùng trường hai lần qua hai lần đọc.
- Trường hợp lệ (enum dùng chung cho schema AI, `field_sources.field` và giao diện): `fullName`, `gender`, `birth`, `death`, `birthPlace`, `burialPlace`, `biography`. Quan hệ không có nguồn từng trường ở lát này.

### D2. Quyền
- `sources`: select khi `tree_role(tree_id)` không null; insert/update chỉ `tree_role(tree_id) = 'admin'`.
- `proposals`: select và update chỉ admin của cuốn (người xem không thấy hàng chờ); không insert từ client (chỉ Edge Function bằng khoá máy chủ).
- `field_sources`: select cho mọi người có vai trò ở cuốn của người đó; insert chỉ admin. Đây là đường người xem đọc nguồn: `value`, `anchor`, `note` nằm ngay ở đây, không cần đọc `proposals`.
- Storage bucket `sources` riêng tư; policy trên `storage.objects` dùng `storage.foldername(name)`: insert khi `tree_role(<tree_id>) = 'admin'` và `clan_id` khớp cuốn; select khi `tree_role` không null. App xem ảnh bằng địa chỉ ký có hạn (signed URL). Quản trị nền tảng không có policy riêng.
- Như bài học ở `clan-invites`: Supabase cấp `execute` cho `authenticated` trên hàm mới; hàm nội bộ phải `revoke`.

### D3. Edge Function `extract-image`
- Thư mục `supabase/functions/extract-image/index.ts` và `supabase/functions/_shared/` (schema, bộ giả lập, kiểm tra). Tự đứng riêng: không nhập từ `packages/core` (máy chủ local chỉ gắn thư mục `functions`). `deno.json` ánh xạ `zod`, `ai`, `@ai-sdk/*` sang `npm:`.
- Luồng:
  1. App gọi `functions.invoke('extract-image', { source_id })` kèm JWT người dùng.
  2. Function tạo client bằng JWT đó, kiểm `tree_role = 'admin'` qua RPC.
  3. **Giành quyền xử lý:** `update sources set status='processing', status_at=now() where id=$1 and (status <> 'processing' or status_at < now() - interval '5 minutes') returning *`. Không giành được thì trả 409.
  4. Trả 202 ngay; phần còn lại chạy bằng `EdgeRuntime.waitUntil`.
  5. Tải ảnh bằng khoá máy chủ, lấy danh sách người của cuốn (id, họ tên, giới tính, năm sinh/mất, là thuỷ tổ).
  6. Gọi nhà cung cấp theo `AI_IMAGE_MODEL` (D4) → JSON.
  7. **Kiểm** (D5). Hỏng thì `status='failed'`, `error` ngắn, không ghi đề xuất.
  8. Đúng thì trong một giao dịch (RPC nội bộ `ingest_proposals`, security definer, chỉ `service_role`): đánh dấu đề xuất `pending` cũ của tư liệu này là `superseded`, chèn đề xuất mới, `status='done'`.
- App **thăm dò** trạng thái tư liệu mỗi 2 giây khi có tư liệu `processing` (không có Realtime); `processing` quá 5 phút hiện như "Đọc lỗi" để đọc lại.

### D4. Nhà cung cấp
- `AI_IMAGE_MODEL` = `mock` (mặc định khi trống) | `anthropic:<model>` | `openai:<model>` | `google:<model>`. Gọi bằng Vercel AI SDK `generateObject` với cùng schema zod (ADR 0005). Khoá đặt theo tên mặc định của SDK trong `supabase/.env` (cùng tệp với Google, SMTP; chuyển vào function qua `[edge_runtime.secrets]` trong `config.toml`); `supabase/.env.example` chỉ ghi tên biến, để trống. Code không nhắc tên khoá.
- **Bộ giả lập** tất định, không gọi mạng, dựa trên danh sách người truyền vào để chạy với mọi cuốn (e2e mỗi test một dòng họ):
  - thêm người `p1` "<họ của thuỷ tổ> Văn Thử", nam, sinh 1901, mất 5/3 âm lịch năm 1953, kèm `quote`;
  - quan hệ: `p1` là con của thuỷ tổ;
  - sửa trường `burialPlace` của thuỷ tổ thành "Nghĩa trang làng";
  - thêm người trùng thuỷ tổ (cùng họ tên, cùng năm sinh) để thử gợi ý gộp.
  - Tiêu đề tư liệu bắt đầu bằng `mock:fail` thì trả kết quả sai schema (để test "Đọc lỗi"; không dùng biến môi trường vì e2e không đổi được biến của máy chủ theo từng test).

### D5. Kết quả AI là dữ liệu không tin cậy
Chữ trong ảnh có thể lái model. Máy chủ từ chối **cả lần đọc** nếu:
- không khớp schema zod (loại, trường thuộc enum D1, ngày không đầy đủ hợp lệ, `anchor` có `x,y,w,h` trong 0–1 và `x+w ≤ 1`, `y+h ≤ 1`);
- `person_id` không thuộc danh sách người của **đúng cuốn** đó;
- `ref` của quan hệ không có trong lô hoặc trùng;
- quá 50 đề xuất một ảnh.
Năm can chi (vd. "Quý Tỵ") lặp mỗi 60 năm: AI được yêu cầu trả năm dương nếu suy ra được, kèm `quote`; không chắc thì để trống năm và người duyệt điền khi "Sửa rồi nhận".

### D6. Nhận / bỏ trên app
- Thông dịch đề xuất thành thao tác của `core` (thuần, test bằng Vitest): thêm người → `addChild`/`addSpouse`/`addRoot` tuỳ quan hệ đi kèm hoặc người tự do; sửa trường → `updatePerson`; quan hệ → thao tác nối tương ứng. Lỗi ràng buộc của `core` (`CYCLE`, `ROLE_GENDER_MISMATCH`…) → nút Nhận tắt + câu `messages.ts` (spec "Đề xuất vi phạm ràng buộc cây"); kiểm trước khi hiện bằng cách chạy thử thao tác trên bản sao `TreeDoc`.
  - Cây chỉ có một thuỷ tổ và mọi người khác phải nối vào cây, nên Nhận một người = thêm người **và** áp dụng quan hệ đi kèm của nó trong cùng một lần (`p_changes.also` ghi các đề xuất quan hệ nhận chung); người không có quan hệ đi kèm chỉ nhận được qua "Sửa rồi nhận" (chọn nơi gắn). Quan hệ giữa hai người đã có trong cây dùng `linkParent` mới của `core`; nối vợ/chồng giữa hai người đã có chưa hỗ trợ (báo `UNSUPPORTED_RELATION`).
- **Nhận nguyên tử:** RPC `review_proposal(p_proposal, p_decision, p_edited, p_note, p_tree, p_persons, p_parents, p_marriages, p_fields jsonb, p_result_person)` **security invoker**: gọi lại `apply_tree_changes`, cập nhật đề xuất, chèn `field_sources`, đặt `result_person_id`, tự bỏ các quan hệ phụ thuộc khi bỏ người. Chạy qua `saveQueue` (thêm loại việc "RPC tuỳ ý" vào hàng đợi) để không chạy song song với các lần sửa đang chờ và giữ hoàn tác khi lỗi.
- **Gộp:** tìm người trùng bằng hàm mới ở `core` (`findSimilarPersons`: họ tên chuẩn hoá bỏ khoảng trắng thừa, không phân biệt hoa thường; năm sinh lệch ≤ 2 hoặc thiếu). Gộp = ghi các trường X còn trống ngay trong cùng giao dịch; mỗi trường X đã có mà khác thì sinh đề xuất `update_field` mới cho X (chèn qua RPC `review_proposal` với danh sách đề xuất con), đặt `result_person_id = X`.

### D7. Giao diện (chờ bản mẫu duyệt)
- Thanh nổi trên của cuốn: nút "Đề xuất N" (chỉ quản trị) và mục "Đưa ảnh vào" trong menu "Thêm" và trong ngăn đề xuất.
- Ngăn đề xuất (thay ngăn thông tin người ở cột phải trên máy tính; toàn màn trên điện thoại): danh sách tư liệu với trạng thái; chọn tư liệu → ảnh + các đề xuất; chọn đề xuất → ảnh tô khung vùng, `quote`, nội dung cũ → mới, Nhận / Sửa rồi nhận / Bỏ.
- Bảng thông tin người: dấu "nguồn" (biểu tượng + chữ cho trình đọc màn hình) cạnh trường có `field_sources`; bấm mở hộp nguồn (ảnh cắt theo vùng, giá trị từng nguồn, nguồn được chọn, ghi chú).
- Theo `kb/design-system.md` và skill `ui-ux-pro-max`; dùng thành phần shadcn đã có (ADR 0010).

### D8. Kiểm thử
- pgTAP: quyền ba bảng và Storage; `review_proposal` nguyên tử (lỗi trigger cây → không đổi trạng thái đề xuất); `ingest_proposals` chỉ `service_role`; `superseded` khi đọc lại.
- Vitest: schema + kiểm D5 (gồm `person_id` lạ, `anchor` ngoài khoảng, `ref` treo) chạy trên chính file `_shared` (không có import Deno); thông dịch đề xuất → thao tác `core`; `findSimilarPersons`.
- Playwright đi **đường thật**: đưa ảnh → function (bộ giả lập) → hàng chờ → nhận / sửa rồi nhận / bỏ / gộp → cây + nguồn; người xem xem nguồn; tư liệu lỗi rồi đọc lại.

## Risks / Trade-offs
- **[Sophos chặn tải gói `npm:` trong container edge-runtime]** → Việc đầu tiên là thử một function "hello" nhập `npm:zod`; lỗi x509 thì mở rộng `db:trust-ca` cho container edge-runtime, không tắt kiểm chứng chỉ.
- **[Model bị chữ trong ảnh lái]** → D5, và AI không bao giờ ghi thẳng vào cây.
- **[Đọc sai Hán Nôm]** → Chưa đo (cần ảnh thật + khoá). Ghi rủi ro mở; lát này chỉ chứng minh luồng.
- **[Gửi dữ liệu cá nhân ra nhà cung cấp AI]** (Nghị định 13/2023) → Bộ giả lập không gửi gì; trước khi bật nhà cung cấp thật ở môi trường thật phải có chính sách và đồng ý.
- **[Thăm dò mỗi 2 giây]** → Chỉ khi có tư liệu đang đọc; dừng khi rời cuốn.
- **[Change lớn: 13 yêu cầu]** → Làm theo lát dọc trước (ảnh → nhận một đề xuất), rồi gộp và nguồn; không bỏ phần nào mà không hỏi.

## Migration Plan
1. `db:start` bật `storage-api`, `edge-runtime` (lần đầu tải thêm hai image Docker).
2. Migration mới; dữ liệu cũ của ba bảng đang trống nên không cần chuyển.
3. Rollback: revert commit + `db:reset`.

## Open Questions
- Model mặc định cho đọc ảnh: chọn khi có khoá và bộ đánh giá (không đổi spec).

## Kết luận duyệt bản mẫu (2026-10-28)
- Chủ dự án duyệt `mockup.html` (A–F) không sửa, giữ các lựa chọn mặc định: hàng chờ chia đôi ảnh | đề xuất toàn màn trên máy tính; Nhận người kèm quan hệ trong một lần; giữ cảnh báo "Đang chạy bộ giả lập" trên môi trường thử; "Đề xuất" và "Tư liệu" là hai tab trong một ngăn.
