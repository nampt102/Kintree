# Design

## Context

Đã có (đọc từ repo, 2026-10-26): `packages/core` với lịch âm, `PartialDate`/`isValidPartialDate`, `checkParentLink`/`checkMarriage` (kiểu `Person`, `ParentLink`, `TreeData` trong `src/integrity.ts`); `apps/app` mới có một trang thử; schema Postgres có RLS bật nhưng chưa policy, nên trình duyệt chưa đọc ghi được DB. Đăng nhập và policy thuộc change `auth-invite-roles`, xếp sau change này theo `openspec/status.md`. Lý do làm change này: xem `proposal.md`.

## Goals / Non-Goals

**Goals:**
- Mọi luật sửa cây nằm ở `packages/core` dưới dạng hàm thuần, để web, app Capacitor và Edge Function (đề xuất AI) dùng chung và test không cần trình duyệt.
- Giao diện chỉ gọi hàm trong `core`, không tự kiểm luật.
- Cùng một mã chạy tốt ở màn hình 375 px và 1.440 px.

**Non-Goals:**
- Ghi vào Supabase, đăng nhập, quyền, nhiều người cùng sửa.
- Hoàn tác (undo), nhật ký thay đổi, phiên bản.
- Hình quạt, tỏa tròn, niên biểu, bản đồ, xưng hô, ảnh đại diện, GEDCOM.
- Đổi cha/mẹ của thuỷ tổ (cần thao tác "Thay đổi cha/mẹ" trong hồ sơ, để change sau).

## Decisions

### D1. Làm trước phần dữ liệu cục bộ, nối Supabase ở change sau
Đây là điều chỉnh so với thứ tự trong `status.md` mà tôi đã giả định, vì thứ tự ấy bắt trình dựng cây phải chờ đăng nhập. Cây lưu trong `localStorage` qua giao diện:
```ts
interface TreeStore {
  list(): Promise<TreeMeta[]>;
  load(treeId: string): Promise<TreeDoc>;
  save(doc: TreeDoc): Promise<void>;
}
```
`TreeDoc` = `{ version: 1, meta, persons, parents, marriages }`. Change `auth-invite-roles` thêm bản cài đặt Supabase; giao diện và `core` không đổi.
- Thay vì dựng policy RLS tạm cho trình duyệt ẩn danh: tạo ra một lỗ hổng phải nhớ gỡ. Thay vì bỏ qua lưu trữ: không thử được gì qua tải lại trang.
- Đánh đổi: dữ liệu nhập ở change này nằm trên một máy; cần nút xuất tệp JSON để không mất khi xoá dữ liệu trình duyệt (spec "Dữ liệu hỏng" cũng dùng nút này). Không có nhập lại từ tệp trong change này (GEDCOM làm sau).
- Thứ tự này đã được chủ dự án xác nhận (2026-10-26).

### D2. Mô hình và thao tác trong `packages/core/src/tree/`
- Kiểu `TreePerson` mở rộng `Person` của `integrity.ts` bằng: `fullName`, ngày sinh/mất (`PartialDate`), `birthPlace`, `burialPlace`, `biography`, `note`, `siblingOrder`, `isRoot`. Khớp cột của bảng `persons` để nối Supabase sau không phải đổi tên.
- Quan hệ giữ như DB: `parents: ParentLink[]` (có `kind`), `marriages: { id, husbandId, wifeId, wifeOrder }[]`.
- Mỗi thao tác: `(doc, input) => { ok: true, doc, ... } | { ok: false, error: EditError }`. `EditError` gồm các mã của `IntegrityError` cộng mã riêng (`MISSING_NAME`, `MISSING_GENDER`, `ROOT_LOCKED`, `HAS_CHILDREN`, `SPOUSE_LIMIT`, `OUTSIDER_CANNOT_PARENT`, `NOT_SPOUSE`, `INVALID_DATE`, `ROLE_GENDER_MISMATCH`…). Giao diện dịch mã thành câu tiếng Việt ở một bảng duy nhất trong `apps/app`.
- **Gỡ người = đánh dấu, không xoá** (theo lựa chọn của chủ dự án): người, quan hệ cha/mẹ–con và vợ chồng liên quan có `removedAt` (ISO) và, với gỡ cả nhánh, cùng một `removalId`. Mọi hàm thao tác, bố cục, tìm kiếm, lọc và kiểm toàn vẹn bỏ qua phần tử đã gỡ; tệp lưu và bản xuất JSON giữ nguyên chúng. Khôi phục để change sau (nhật ký/phiên bản) làm; hiện chưa có giao diện khôi phục. Bảng `persons`/`parent_child`/`marriages` trong Postgres chưa có cột `removed_at`/`removal_id`; migration thêm cột làm cùng change nối Supabase.
- Hàm thuần, không đổi `doc` đầu vào, nên "thao tác lỗi không làm đổi cây" đúng theo cấu trúc, không phải nhờ rollback.
- Thay vì class có trạng thái bên trong: khó test, khó dùng chung với Edge Function.
- ID người, quan hệ: `crypto.randomUUID()` truyền vào qua tham số `newId` để test ra kết quả cố định.

### D3. Thứ tự anh chị em và các bà
- `siblingOrder` lưu trên người (cột `sibling_order` đã có), đánh lại 1..n cho cả nhóm mỗi lần đổi chỗ để không có khe hở hay trùng. Nhóm anh chị em = những người có cùng tập cha mẹ ruột/nuôi/riêng.
- `wifeOrder` lưu trên `marriages` (cột `wife_order` đã có), tính riêng cho từng người trong họ.

### D4. Bố cục sơ đồ tự viết, vẽ bằng React Flow
- React Flow (`@xyflow/react`) lo kéo, phóng to, minimap, chỉ vẽ khung trong vùng nhìn (`onlyRenderVisibleElements`) và cảm ứng; vị trí khung do `packages/core/src/tree/layout.ts` tính, vì thư viện không biết đời, thứ tự các bà, cặp cha mẹ.
- Thuật toán: đời của một người = đời cha/mẹ trong họ + 1 (thuỷ tổ = 1; vợ/chồng cùng đời với người trong họ). Mỗi "đơn vị" = người trong họ cùng các vợ/chồng theo thứ tự. Đơn vị rộng bằng tổng chiều rộng khung vợ/chồng hoặc bằng tổng chiều rộng các nhóm con, lấy số lớn hơn; nhóm con xếp theo từng cặp cha mẹ rồi theo `siblingOrder`, căn giữa dưới cặp. Duyệt một lượt từ gốc xuống (độ phức tạp tuyến tính).
- Thu gọn và xem riêng một nhánh được xử lý trước khi tính bố cục (lọc tập người), nên bố cục chỉ nhận danh sách người cần vẽ.
- Thay vì dagre/elk: vẫn phải thêm lớp xử lý vợ/chồng và thứ tự, và thêm phụ thuộc nặng; thay vì d3-hierarchy: chỉ lo cây một cha, không có cặp đôi.
- Giới hạn đã biết: người trong họ có hai vợ thì con của hai bà nằm hai nhóm dưới cặp tương ứng; hai nhánh khác nhau không thể "gặp lại" (cây, không phải đồ thị) vì ràng buộc ngoại tộc không cho nối hai dòng trong họ.

### D5. Tìm kiếm và lọc ở `core`
- Chuẩn hoá tên: chữ thường, `normalize('NFD')`, bỏ dấu kết hợp, `đ` → `d`. Khớp theo từng từ gõ (mọi từ phải có mặt trong tên), không cần thứ tự.
- Bộ lọc danh sách là hàm thuần `filterPersons(doc, filter, query)`.

### D6. Giao diện
- Một màn hình, chuyển Cây/Danh sách ngay tại chỗ, không đổi trang (đã chốt ở `docs/PRD.md` mục 7, theo cách nhìn của Hậu trường Gia Phả Số); chưa cần router cho đến change đăng nhập.
- Tailwind v4 qua `@tailwindcss/vite`; chưa thêm shadcn/ui, tự viết vài thành phần nhỏ (nút, hộp thoại, biểu mẫu) đủ dùng rồi gom lại khi nào các màn hình sau cần hơn.
- Chữ gốc 18 px, vùng chạm ≥ 44 px (PRD: nhiều người dùng lớn tuổi). Hướng hình ảnh dùng `ui-ux-pro-max` theo ADR 0004; không dùng hallmark cho màn hình app.
- Nút quanh khung trên máy tính (trỏ chuột), bảng thông tin trên điện thoại: cùng một bảng thao tác, hai cách mở.
- Ô ngày tháng: ba ô số + chọn Dương/Âm + ô Nhuận chỉ hiện khi chọn Âm; hiện ngay ngày quy đổi và Can Chi bên dưới khi đủ ngày (dùng `core/lunar`, `core/canchi`).
- Thao tác gỡ nhánh và gỡ người luôn có hộp xác nhận nêu rõ số người sẽ mất.

### D7. Kiểm thử
- Thao tác, bố cục, tìm kiếm, bộ lọc: test Vitest thuần trong `packages/core/test/tree/`, mỗi scenario trong hai spec có ít nhất một test.
- Bố cục: kiểm không chồng khung, con nằm dưới cặp cha mẹ, thứ tự đúng, và đo thời gian cho cuốn 1.000 người được sinh ngẫu nhiên có hạt giống cố định.
- Giao diện: kiểm bằng cách chạy app và thao tác thật trong trình duyệt ở 375 px và 1.440 px (chưa dựng bộ test giao diện tự động; ghi ở Risks).

## Risks / Trade-offs

- **R1.** Dữ liệu chỉ ở một trình duyệt, xoá dữ liệu trình duyệt là mất. → Nút "Tải bản sao" xuất JSON; ghi rõ trong giao diện; bản nối Supabase ở change sau.
- **R2.** `localStorage` giới hạn khoảng 5 MB; cuốn 1.000 người vài trăm KB nên đủ, nhiều cuốn lớn thì có thể đầy. → Bắt lỗi khi ghi và báo; đổi sang IndexedDB nếu cần (giao diện `TreeStore` không đổi).
- **R3.** Không có test giao diện tự động nên lỗi cảm ứng/điện thoại dễ lọt. → Kiểm tay ở hai kích thước theo `tasks.md`; thêm Playwright ở change sau nếu lỗi lặp lại.
- **R4.** Bố cục tự viết có thể xấu hoặc chồng khung với kiểu gia đình lạ (rất nhiều vợ, nhánh rộng). → Test thuộc tính (property test nhỏ) cho "không chồng khung"; người dùng thu gọn/xem riêng nhánh để xử lý nhánh quá rộng.
- **R5.** Tên mã lỗi và câu tiếng Việt đi lệch nhau theo thời gian. → Một bảng dịch duy nhất; test kiểm mọi mã đều có câu.
- **R6.** Dữ liệu đã gỡ vẫn nằm trong `localStorage` và bản xuất JSON, kể cả thông tin cá nhân của người đã gỡ; chưa có cách xoá hẳn. → Ghi rõ trong giao diện xuất tệp; thêm thao tác xoá hẳn khi có yêu cầu quyền riêng tư (xem Nghị định 13/2023 trong rủi ro mở của dự án).

## Open Questions

- Cách khôi phục người/nhánh đã gỡ (giao diện, ai được khôi phục): để change nhật ký thay đổi và phiên bản quyết định; dữ liệu đã đủ (`removedAt`, `removalId`) nên không đổi thiết kế ở đây.
