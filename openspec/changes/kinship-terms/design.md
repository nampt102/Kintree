# Design

## Context
Lý do: `proposal.md`. Hành vi bắt buộc: `specs/kinship-terms`.

Hiện trạng đã đọc trong repo:
- `TreeDoc` có `persons` (`gender`, `isOutsider`, `siblingOrder`, `birth`), `parents` (cha/mẹ, `kind` ruột/nuôi/riêng), `marriages` (`husbandId`, `wifeId`, `wifeOrder`); `meta.region` = `north` | `central` | `south`.
- `packages/core/src/tree/queries.ts` có `parentLinksOf`, `childrenOf` (xếp theo `siblingOrder`), `spouseIdsOf`, `generations`.
- RLS: người có vai trò ở cuốn (`tree_role`) đọc được người của cuốn. Chưa có chỗ lưu người dùng là ai trong cây.

## Goals / Non-Goals
**Goals**
- Từ gọi đúng cho các quan hệ gần, khác nhau theo ba miền; ngoài phạm vi thì nói rõ là "họ hàng xa" và tả đường quan hệ, không đoán từ gọi.
- Hàm thuần trong `core`, test bằng bảng ca; cả hai chiều ("tôi gọi" và "người ấy gọi tôi").

**Non-Goals**
- Phương ngữ chi tiết hơn ba miền, gọi theo thứ (Chú Ba, Cô Tư kiểu miền Nam), tuỳ chỉnh từ gọi theo dòng họ, xác minh "Tôi là ai".

## Decisions

### D1. Lõi: `packages/core/src/kinship.ts`
```ts
type Step = 'father' | 'mother' | 'child' | 'spouse'               // một bước trên đồ thị
type Relation = {
  path: Step[]               // đường ngắn nhất từ A tới B (BFS, ưu tiên đường không qua vợ/chồng)
  up: number; down: number   // số đời đi lên tới tổ chung, rồi đi xuống
  side?: 'paternal' | 'maternal'   // nhánh nội/ngoại khi đi lên qua cha hay mẹ
  senior?: 'older' | 'younger' | 'unknown'  // vai của nhánh B so với nhánh A tại chỗ rẽ
  viaSpouse?: 'start' | 'end'      // quan hệ thông gia: một bước vợ/chồng ở đầu hoặc cuối
}
relationBetween(doc, aId, bId): Relation | null
kinshipTerm(rel: Relation, b: TreePerson, region: Region): { term: string; known: boolean }   // A gọi B
describePath(rel, doc): string    // "anh trai của cha", "con của em gái mẹ"
```
- **Đường quan hệ:** BFS qua cha/mẹ (mọi `kind`: ruột, nuôi, riêng) và vợ/chồng còn hiệu lực (không tính phần tử đã gỡ). Tối đa một bước vợ/chồng, và chỉ ở đầu hoặc cuối đường; đường khác thì `known = false`, term = "họ hàng xa".
- **Vai (trên/dưới) tại chỗ rẽ:** hai anh chị em ở chỗ rẽ so bằng `siblingOrder` nếu cùng cha hoặc mẹ; không so được thì so năm sinh; vẫn không được thì `unknown` → từ gọi trung tính (vd. "Bác/Chú").
- **Anh chị em họ:** vai theo nhánh, không theo tuổi ("con chú con bác": con của nhánh trên là anh/chị dù ít tuổi hơn).
- **Giới tính chưa rõ:** từ trung tính ("Anh/Chị", "Ông/Bà", "Cô/Chú").
- **Con nuôi, con riêng:** gọi như con ruột; `describePath` ghi "con nuôi", "con riêng".
- Chiều ngược ("B gọi A") là `kinshipTerm(relationBetween(doc, b, a), a, region)`.

### D2. Bảng từ gọi (A gọi B) — **cần chủ dự án duyệt**
Đời: +1 = đời trên A một bậc. "Trên/dưới" = vai so với cha/mẹ của A.

| Quan hệ của B với A | Bắc | Trung | Nam |
|---|---|---|---|
| Cha / Mẹ | Bố / Mẹ | Ba / Mạ | Ba / Má |
| Ông bà bên cha | Ông nội / Bà nội | Ông nội / Bà nội | Ông nội / Bà nội |
| Ông bà bên mẹ | Ông ngoại / Bà ngoại | Ông ngoại / Bà ngoại | Ông ngoại / Bà ngoại |
| Đời +3 | Cụ ông / Cụ bà | Cố ông / Cố bà | Ông cố / Bà cố |
| Đời +4 | Kỵ ông / Kỵ bà | Kỵ ông / Kỵ bà | Ông sơ / Bà sơ |
| Đời +5 | Tổ ông / Tổ bà | Tổ ông / Tổ bà | Ông tổ / Bà tổ |
| Anh trai của cha | Bác | Bác | Bác |
| Vợ anh trai của cha | Bác | Bác | Bác |
| Em trai của cha | Chú | Chú | Chú |
| Vợ em trai của cha | Thím | Thím | Thím |
| Chị gái của cha | Bác | O | Cô |
| Chồng chị gái của cha | Bác | Dượng | Dượng |
| Em gái của cha | Cô | O | Cô |
| Chồng em gái của cha | Chú | Dượng | Dượng |
| Anh trai của mẹ | Bác | Cậu | Cậu |
| Vợ anh trai của mẹ | Bác | Mợ | Mợ |
| Em trai của mẹ | Cậu | Cậu | Cậu |
| Vợ em trai của mẹ | Mợ | Mợ | Mợ |
| Chị gái của mẹ | Bác | Dì | Dì |
| Chồng chị gái của mẹ | Bác | Dượng | Dượng |
| Em gái của mẹ | Dì | Dì | Dì |
| Chồng em gái của mẹ | Chú | Dượng | Dượng |
| Anh em của ông bà (đời +2) | Ông (bác/chú/cậu) / Bà (bác/cô/dì) | như Bắc | như Bắc |
| Anh / chị (ruột) | Anh / Chị | Anh / Chị | Anh / Chị |
| Em (ruột) | Em | Em | Em |
| Anh / chị / em họ (cùng đời, vai theo nhánh) | Anh họ / Chị họ / Em họ | như Bắc | như Bắc |
| Con | Con | Con | Con |
| Đời −2 / −3 / −4 | Cháu / Chắt / Chút | như Bắc | như Bắc |
| Con của anh chị em, của anh chị em họ (đời −1) | Cháu | Cháu | Cháu |
| Vợ / chồng | Vợ / Chồng | Vợ / Chồng | Vợ / Chồng |
| Cha mẹ của vợ/chồng | Bố/Mẹ chồng, Bố/Mẹ vợ | Ba/Mạ chồng, Ba/Mạ vợ | Ba/Má chồng, Ba/Má vợ |
| Vợ/chồng của con | Con dâu / Con rể | như Bắc | như Bắc |
| Vợ/chồng của anh chị | Chị dâu / Anh rể | như Bắc | như Bắc |
| Vợ/chồng của em | Em dâu / Em rể | như Bắc | như Bắc |
| Anh chị em của vợ/chồng | Anh/Chị/Em chồng, Anh/Chị/Em vợ | như Bắc | như Bắc |

**Chiều ngược (B gọi A), dùng cho "người ấy gọi tôi":** đời dưới gọi bằng bảng trên; đời trên gọi đời dưới là "Con" (con, con dâu, con rể), "Cháu" (cháu, cháu họ, con của anh chị em), "Chắt", "Chút"; anh chị gọi em là "Em"; vợ chồng gọi nhau "Vợ"/"Chồng" (hiển thị như quan hệ, không phải cách xưng thân mật).

**Chưa xác nhận (xin chủ dự án chốt):** từ miền Trung cho cha mẹ (Ba/Mạ hay Bọ/Mệ, Cha/Mẹ), ông bà (Ôn/Mệ ở Huế), vợ của bác ở miền Trung ("Bá"?), đời +4/+5 các miền. Dự án dùng một bộ từ phổ biến cho mỗi miền; muốn khác thì đổi bảng, không đổi thuật toán.

**Kết luận (chủ dự án duyệt 2026-11-04):** dùng bảng trên như đề xuất, kể cả các từ còn ghi "chưa xác nhận" (Trung: Ba/Mạ, Ông/Bà, vợ của bác là "Bác"; đời +4/+5 như bảng). Đổi sau thì chỉ sửa bảng.

### D3. Lưu "Tôi là ai"
- Bảng `tree_self(user_id, tree_id, person_id, updated_at, primary key (user_id, tree_id))`; RLS: chỉ đọc/ghi dòng của mình, và chỉ khi có vai trò xem cuốn (`tree_role(tree_id) is not null`), người phải thuộc cuốn đó. Nhiều người dùng có thể chọn cùng một người (tự khai, chỉ ảnh hưởng hiển thị của họ).
- Người được chọn bị gỡ khỏi cây → coi như chưa chọn (app nhắc chọn lại).

### D4. Giao diện (chờ bản mẫu duyệt)
- **Chọn "Tôi là ai":** nút trong bảng người ("Đây là tôi"), và thẻ nhắc trên thanh công cụ cây khi chưa chọn ("Bạn là ai trong cây này?" → tìm tên). Đổi/bỏ ở cùng chỗ.
- **Trên khung người:** một nhãn nhỏ "tôi gọi: Bác" (cắt gọn, đủ ở `title`); khung của chính mình ghi "Tôi". Có công tắc ẩn/hiện nhãn trong thanh công cụ.
- **Bảng người:** dòng "Bạn gọi: Bác · Người ấy gọi bạn: Cháu" và "Quan hệ: anh trai của cha".
- **Tra quan hệ:** hộp thoại chọn hai người (tìm tên), hiện đường quan hệ và từ gọi hai chiều; điện thoại toàn màn (D1 của `ui-components`).

**Kết luận bản mẫu (chủ dự án duyệt 2026-11-04):** nhãn đen nhỏ ở góc khung, thẻ nhắc "Bạn là ai trong cây này?", khối "Xưng hô" trong bảng người, "Tra quan hệ" không cần chọn "Tôi là ai". Khác bản mẫu: "Tra quan hệ", "Tôi là ai" và công tắc hiện/ẩn nhãn nằm trong menu "Thêm" của thanh trên (thanh đã đủ chỗ cho chế độ xem, tìm và Đề xuất); thẻ nhắc ở cỡ gọn nằm phía dưới (không che cây), ở máy tính nằm dưới thanh trên và tự ẩn khi đang chọn một người hoặc có thanh thông báo khác; danh sách người hiện từ gọi bằng nhãn đen ở cuối dòng.

### D5. Kiểm thử
- Vitest: bảng ca theo D2 cho cả ba miền (gồm "chị gái của cha: Bác / O / Cô", "anh trai của mẹ: Bác / Cậu / Cậu"), vai theo nhánh của anh chị em họ (con của bác nhỏ tuổi hơn vẫn là anh/chị), vai không rõ → từ trung tính, con nuôi, giới tính chưa rõ, quan hệ ngoài phạm vi → "họ hàng xa", chiều ngược, người đã gỡ không tính.
- pgTAP: RLS `tree_self`.
- Playwright: chọn "Tôi là ai", nhãn đúng trên vài khung, đổi vùng miền cuốn thì nhãn đổi, tra quan hệ, người xem dùng được, điện thoại 375 px.

## Risks / Trade-offs
- **[Từ gọi khác theo địa phương]** Một bộ từ cho mỗi miền sẽ không đúng ý mọi gia đình. → Bảng nằm một chỗ, đổi dễ; sau này có thể cho dòng họ tuỳ chỉnh.
- **[Vai khi thiếu thứ tự]** Dữ liệu cũ thiếu `siblingOrder`/năm sinh → không biết bác hay chú. → Từ trung tính "Bác/Chú" và gợi ý bổ sung thứ tự.
- **[Cây lớn]** BFS mỗi khung người với ~1.000 người: tính một lần từ "tôi" tới mọi người (một lần BFS), không tính từng cặp.

## Migration Plan
Thêm một bảng; không đổi dữ liệu cũ. Rollback: bỏ bảng, gỡ giao diện.

## Open Questions
- Các từ "chưa xác nhận" ở D2.
