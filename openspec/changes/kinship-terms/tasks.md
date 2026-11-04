# Tasks

## 1. Bảng từ gọi (chờ duyệt)
- [x] 1.1 Chủ dự án duyệt bảng D2 trong `design.md`, chốt các từ "chưa xác nhận"; ghi kết luận vào `design.md`. Kiểm: chủ dự án ghi "duyệt".

## 2. Lõi (`packages/core`)
- [x] 2.1 `kinship.ts`: `relationBetween`, `kinshipTerm`, `describePath`, và hàm tính một lần từ một người tới mọi người trong cuốn; xuất ra từ `index.ts`. Kiểm: Vitest bảng ca theo D5 (ba miền, vai theo nhánh, vai không rõ, con nuôi, giới tính chưa rõ, quan hệ xa, chiều ngược, người đã gỡ).

## 3. Dữ liệu
- [x] 3.1 Migration `tree_self` kèm RLS; kho `lib/selfStore.ts` (đọc/đặt/bỏ). Kiểm: pgTAP (chỉ chủ dòng, phải có quyền xem cuốn, người phải thuộc cuốn); Vitest cho kho.

## 4. Bản mẫu giao diện (chờ duyệt)
- [x] 4.1 `mockup.html` bằng skill `ui-ux-pro-max`, theo token hiện có: nhãn trên khung người, khung "Tôi", thẻ nhắc chọn "Tôi là ai", dòng xưng hô trong bảng người, hộp "Tra quan hệ", điện thoại 375 px. Kiểm: chủ dự án xem.
- [x] 4.2 Sửa theo góp ý đến khi duyệt; ghi kết luận vào `design.md`.

## 5. Giao diện (chỉ làm sau 4.2)
- [x] 5.1 Chọn/đổi/bỏ "Tôi là ai", nhãn trên `TreeDiagram`, công tắc ẩn/hiện nhãn, dòng xưng hô trong `PersonPanel`. Kiểm: Playwright (chọn mình, nhãn đúng, đổi vùng miền thì nhãn đổi, người xem dùng được).
- [x] 5.2 Hộp "Tra quan hệ". Kiểm: Playwright (tra hai người, điện thoại toàn màn), `layout.spec.ts` (vùng chạm ≥ 44 px, không cuộn ngang 320–1440 px).

## 6. Hoàn tất
- [x] 6.1 KB (`data-model.md`, `glossary` nếu có), ADR nếu có quyết định mới, `status.md`. Kiểm: Vitest, pgTAP, Playwright, build, `openspec validate --strict` qua.

## Workflow follow-up
- Chủ dự án duyệt app chạy thật, rồi commit, push và `/opsx:archive kinship-terms`.
