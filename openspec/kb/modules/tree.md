# Module: cây gia phả (`packages/core/src/tree/`)

Hiện trạng sau change `tree-editing`. Hành vi quy định ở `openspec/specs/` (sau khi archive; trước đó ở `openspec/changes/tree-editing/specs/`); lý do thiết kế ở `design.md` của change. Test: `packages/core/test/tree/`.

## Mô hình (`model.ts`)
- `TreeDoc` = `{ version: 1, meta, persons, parents, marriages }`. `meta` = `{ id, name, description?, region }` (`region`: `north`/`central`/`south`).
- `TreePerson`: `id`, `fullName`, `gender` (`male`/`female`/`unknown`), `isOutsider` (dâu/rể), `isRoot` (thuỷ tổ), `birth`/`death` (`PartialDate`), `birthPlace`, `burialPlace`, `biography`, `note`, `siblingOrder`.
- `TreeParentLink` = `{ parentId, childId, role, kind }`; `TreeMarriage` = `{ id, husbandId, wifeId, wifeOrder }`.
- **Gỡ = đánh dấu:** người, quan hệ cha/mẹ–con và vợ chồng có thể mang `removedAt` (ISO) và `removalId` (chung cho cả nhánh gỡ cùng lúc). Dữ liệu vẫn nằm trong `TreeDoc` và bản xuất JSON.
- `Result<T>` = `{ ok: true, doc, ...T } | { ok: false, error }`; `fail(error)`; `NewId` = hàm sinh id (test truyền bộ đếm).

## Truy vấn (`queries.ts`)
`activeView` (bỏ phần tử đã gỡ), `toTreeData` (cho `checkParentLink`/`checkMarriage`), `findPerson`, `marriagesOf`, `spouseIdsOf`, `parentLinksOf`, `childrenOf` (theo `siblingOrder`), `rootOf`, `generations` (thuỷ tổ = đời 1, vợ/chồng cùng đời), `descendantIds`.

## Thao tác (`ops.ts`)
Hàm thuần, không đổi `doc` đầu vào, lỗi thì trả `{ ok: false, error }` và cây giữ nguyên.

| Hàm | Việc |
|---|---|
| `createTree` | tạo cuốn rỗng; tên bắt buộc, vùng mặc định `north` |
| `addRoot` | thêm thuỷ tổ vào cuốn trống |
| `addChild` | thêm con (`biological`/`adopted`/`step`); cha/mẹ kia tự chọn nếu chỉ có một vợ/chồng, bắt chọn nếu nhiều; `step` = con ruột của cha/mẹ kia, con riêng của người đang thêm |
| `addSpouse` | thêm vợ/chồng ngoại tộc, giới tính đối lập, xếp cuối thứ tự |
| `addMissingParent` | thêm mẹ cho người chỉ có cha (hoặc ngược lại) |
| `branchSize` | số người sẽ bị gỡ nếu gỡ cả nhánh (cho hộp xác nhận) |
| `removePerson` | gỡ người không có con (kèm vợ/chồng ngoại tộc mồ côi) |
| `removeBranch` | gỡ người, con cháu và vợ/chồng ngoại tộc chỉ gắn với nhánh |
| `reorderSiblings` | đặt lại thứ tự con của một người (đánh lại 1..n) |
| `reorderSpouses` | đặt lại thứ tự các vợ/chồng |
| `updatePerson` | sửa hồ sơ; từ chối ngày không hợp lệ, họ tên trống, đổi giới tính làm sai vai trò |

### Mã lỗi (`EditError`)
Mã của `IntegrityError` (`MISSING_KIND`, `UNKNOWN_PERSON`, `DIFFERENT_TREE`, `ROLE_GENDER_MISMATCH`, `DUPLICATE_PARENT`, `BOTH_OUTSIDERS`, `CYCLE`) cộng:

| Mã | Khi nào |
|---|---|
| `MISSING_NAME`, `MISSING_GENDER`, `MISSING_ROLE` | thiếu họ tên / giới tính / vai trò cha-mẹ (khi giới tính cha/mẹ chưa rõ) |
| `TREE_NOT_EMPTY` | thêm thuỷ tổ vào cuốn đã có người |
| `ROOT_LOCKED` | gỡ thuỷ tổ; thêm cha mẹ cho thuỷ tổ hoặc vợ/chồng thuỷ tổ |
| `HAS_CHILDREN` | gỡ thường một người đang có con |
| `SPOUSE_LIMIT` | thêm vợ/chồng thứ hai cho người ngoại tộc |
| `OUTSIDER_CANNOT_PARENT` | thêm con từ người ngoại tộc |
| `NOT_SPOUSE` | chọn cha/mẹ kia không phải vợ/chồng |
| `OTHER_PARENT_REQUIRED` | nhiều vợ/chồng mà không chọn; con riêng không có cha/mẹ kia |
| `NO_PARENT`, `ALREADY_HAS_PARENT`, `PARENT_ALREADY_MARRIED` | thêm cha/mẹ còn thiếu không hợp lệ |
| `GENDER_UNKNOWN` | thêm vợ/chồng cho người chưa rõ giới tính |
| `INVALID_DATE` | ngày không hợp lệ |
| `INVALID_ORDER` | danh sách thứ tự không đúng tập người hiện có |
| `NOT_FOUND` | người không tồn tại hoặc đã gỡ |

## Tìm kiếm và lọc (`search.ts`)
`normalizeName` (chữ thường, bỏ dấu, `đ`→`d`), `matchesQuery` (mọi từ gõ phải có trong tên), `searchPersons`, `filterPersons`, `PERSON_FILTERS` (`all`, `male`, `female`, `deceased`, `outsider`, `married`, `unmarried`). "Đã mất" = có ghi ngày mất, kể cả chỉ năm.

## Lưu trữ (`storage.ts`)
`serialize`, `deserialize` (không bao giờ ném lỗi; trả `CORRUPT` hoặc `UNSUPPORTED_VERSION`), `DOC_VERSION` = 1.

## Bố cục (`layout.ts`)
`computeLayout(doc, { collapsed, focusId, cardWidth, cardHeight, gapX, spouseGap, gapY })` trả `{ nodes, junctions, edges, width, height, rows }`; `revealPerson` bỏ khỏi `collapsed` mọi tổ tiên của một người để người ấy hiện ra.
- Một đơn vị = người trong họ + vợ/chồng nối tiếp sang phải theo thứ tự; con hạ xuống từ "điểm nối" (`junction`) nằm giữa cặp cha mẹ; mỗi cặp có một điểm nối, con không có cha/mẹ kia dùng điểm nối ngay dưới người cha/mẹ.
- Rộng một nhánh = max(rộng đơn vị, tổng rộng các nhánh con) nên các nhánh không chồng nhau (có test với cây ngẫu nhiên).
- `focusId` là dâu/rể thì lấy người trong họ của họ. Đời giữ số thật khi xem riêng một nhánh.
- Đo (2026-10-26, máy dev): 1.000 người (cây ngẫu nhiên hạt giống 7, 14 đời) tính trong ~3 ms. Cây ngẫu nhiên này rất rộng (~103.000 px), gia phả thật hẹp hơn; giao diện cần thu gọn nhánh và chỉ vẽ khung trong vùng nhìn.
