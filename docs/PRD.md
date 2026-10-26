## Product Requirements Document: Kintree — Cây gia phả chép bằng AI

**Author**: jamesphan
**Date**: 2026-10-26
**Status**: Draft

> Các chỗ ghi **[Giả định]** là đề xuất chưa được xác nhận — cần chốt trước khi bắt đầu Phase 1.

---

### 1. Summary

Kintree là ứng dụng web và di động (iOS/Android) giúp dòng họ Việt lập và giữ gia phả. Khác với các phần mềm hiện có bắt người dùng gõ tay từng người, Kintree cho phép **ghi âm lời kể của các cụ** và **chụp ảnh phả cũ, bia mộ** — AI đọc, rút ra người và quan hệ, rồi đưa vào **hàng chờ duyệt**. Mỗi thông tin trong cây đều gắn **nguồn chứng cứ** (ai kể, bia nào, trang phả nào). Phase 1 nhắm tới việc dựng được khung gia phả 3–5 đời nhanh hơn hẳn nhập tay, kèm các nền tảng bắt buộc: lịch âm, ngày giỗ, xưng hô ba miền, phân quyền.

### 2. Contacts

| Vai trò | Người |
|---|---|
| Product owner | jamesphan |
| Engineering / Design | Chưa xác định |

### 3. Background

**Vấn đề.** Chuyện của một dòng họ nằm rải rác: sổ phả chép tay ở nhà trưởng họ (thường chữ Hán/Nôm), ngày giỗ trong trí nhớ từng nhà, ảnh trong điện thoại từng người. Người còn nhớ rõ thì mỗi năm một ít — ghi được câu nào giữ được câu ấy.

**Đối thủ chính — Gia Phả Số (giaphaso.id.vn).** Sản phẩm trưởng thành, miễn phí phần lõi, có web + Android + iOS: cây 6 lối xem, lịch âm chuẩn (tháng nhuận, ngày 30), xưng hô 3 miền, bảng tin, quỹ họ, sách gia phả in, GEDCOM, phân quyền 2 tầng, lịch sử & phiên bản. Thu phí theo dung lượng ảnh.

**Khoảng trống.** Mọi dữ liệu vẫn nhập tay qua biểu mẫu. Chính hướng dẫn của Gia Phả Số khuyên “ghi âm buổi nói chuyện với các cụ, về nhà nghe lại” và “chụp ảnh toàn bộ phả cũ” — tức người dùng đã có sẵn tư liệu ở dạng ghi âm và ảnh, nhưng phải tự chép lại. Họ cũng không lưu nguồn cho từng thông tin, trong khi gia phả hay có hai chi chép khác nhau.

**Vì sao bây giờ.** Mô hình AI đa phương thức (Claude, GPT, Gemini) đã đọc được ảnh chữ viết tay/Hán Nôm và trích xuất dữ liệu có cấu trúc; nhận dạng giọng nói tiếng Việt đủ dùng. Chi phí đủ thấp cho quy mô một dòng họ.

### 4. Objective

**Mục tiêu:** Một người trong họ dựng được khung gia phả có nguồn rõ ràng từ tư liệu sẵn có (ghi âm, ảnh) mà không phải gõ tay phần lớn dữ liệu.

**Key results (90 ngày sau ra mắt Phase 1) — [Giả định, cần chốt]:**

| KR | Chỉ tiêu |
|---|---|
| Dòng họ hoạt động (≥ 30 người trong cây, ≥ 2 người cùng sửa) | 50 dòng họ |
| Tỷ lệ người trong cây được tạo qua đề xuất AI | ≥ 50% |
| Tỷ lệ đề xuất AI được nhận (có hoặc không chỉnh sửa) | ≥ 70% |
| Thời gian từ tạo dòng họ đến cây 30 người (trung vị) | < 60 phút |
| Lời mời được nhận trong 7 ngày | ≥ 40% |
| Ngày giỗ tính sai được báo cáo | 0 |

### 5. Market Segment(s)

1. **Người chép phả** — trưởng họ, trưởng chi, hoặc con cháu được giao việc lập gia phả (thường 40–65 tuổi). Có sổ phả cũ, có các cụ để hỏi, nhưng thiếu thời gian và không đọc được chữ Hán. Cách làm hiện tại: chép tay, Excel, hoặc nhập tay vào Gia Phả Số.
2. **Con cháu đi xa** (25–45 tuổi) — muốn biết gốc gác, gọi đúng vai vế, không quên ngày giỗ; sẵn sàng ghi âm ông bà mình. Cách làm hiện tại: hỏi bố mẹ, nhóm Zalo của họ.

Ràng buộc chung: người dùng lớn tuổi đông → chữ to, ít màn hình, đăng nhập không mật khẩu.

### 6. Value Proposition(s)

**VP1 — Người chép phả**

| Phần | Nội dung |
|---|---|
| Who | Người được giao lập gia phả cho dòng họ hoặc một chi |
| Why | Các cụ già đi, phả cũ mục nát; chép tay hàng trăm người rất lâu |
| What before | Ngồi nghe lại ghi âm, nhờ người đọc chữ Hán, gõ từng người vào biểu mẫu; hai chi chép lệch nhau không biết theo bên nào |
| How | Tải ghi âm / chụp ảnh → AI đề xuất người, quan hệ, ngày tháng → duyệt từng đề xuất; mỗi thông tin giữ nguồn |
| What after | Khung gia phả dựng trong một buổi; khi có mâu thuẫn thấy ngay ai nói gì, nguồn nào |
| Alternatives | Gia Phả Số (nhập tay), Excel, sổ giấy, thuê người chép phả |

**VP2 — Con cháu đi xa**

| Phần | Nội dung |
|---|---|
| Who | Con cháu ở xa quê, ít về họ |
| Why | Không biết gọi họ hàng là gì, hay quên ngày giỗ, muốn giữ giọng kể của ông bà |
| What before | Hỏi bố mẹ mỗi lần về quê; ngày giỗ nhớ theo dương lịch nên lệch |
| How | Nhận link mời → chọn “Tôi là ai” → cây hiện cách gọi từng người; nhận thông báo trước ngày giỗ; ghi âm ông bà mình để bổ sung |
| What after | Biết vai vế ngay trên điện thoại, không lỡ giỗ, đóng góp được phần nhà mình |
| Alternatives | Nhóm Zalo dòng họ, lịch âm trên điện thoại, Gia Phả Số |

### 7. Solution

#### 7.1 Luồng chính

1. Đăng nhập (Google/Apple) → tạo dòng họ → tạo cuốn gia phả (chi), chọn vùng miền xưng hô.
2. **Thêm tư liệu**: tải/ghi âm trực tiếp, hoặc chụp/tải ảnh (phả cũ, bia mộ, bài vị).
3. AI xử lý nền → sinh **đề xuất**: thêm người, sửa trường, thêm quan hệ — mỗi đề xuất trỏ về đoạn ghi âm (mốc thời gian) hoặc vùng ảnh.
4. **Hàng chờ duyệt**: xem đề xuất cạnh nguồn, Nhận / Sửa rồi nhận / Bỏ. Chỉ người có quyền sửa duyệt được. AI không bao giờ ghi thẳng vào cây.
5. Cây cập nhật; trường nào cũng hiện nguồn khi bấm vào. Hai nguồn mâu thuẫn → hiện cả hai, người duyệt chọn và ghi lý do.
6. Mời con cháu qua link → chọn “Tôi là ai” → nhãn xưng hô trên cây; push nhắc giỗ.

#### 7.2 Tính năng Phase 1

| # | Tính năng | Ghi chú |
|---|---|---|
| F1 | Dòng họ → nhiều cuốn gia phả (chi) | 2 tầng như Gia Phả Số |
| F2 | Sơ đồ cây theo đời; thêm cha mẹ / con / vợ chồng trên sơ đồ; thu gọn nhánh; tìm người; chế độ danh sách | Web và app cùng một mã |
| F3 | Hồ sơ người: ngày tháng không đầy đủ (năm / năm-tháng / đủ), âm hoặc dương; tiểu sử rich text; nơi sinh, nơi an táng | |
| F4 | Ràng buộc cứng: ≤ 1 cha + 1 mẹ mỗi loại (ruột/nuôi/riêng), không nối vòng, khoá cha mẹ của thuỷ tổ; con ruột / nuôi / riêng; thứ tự anh em và các bà; dâu rể (ngoại tộc) | Báo lỗi, không lưu |
| F5 | **Tư liệu ghi âm → đề xuất** | Ghi âm trong app hoặc tải file; xin đồng ý người được ghi âm |
| F6 | **Tư liệu ảnh → đề xuất** | Phả cũ (gồm Hán Nôm), bia mộ, bài vị |
| F7 | **Hàng chờ duyệt + nguồn chứng cứ theo từng trường** | Điểm khác biệt cốt lõi |
| F8 | Lịch âm Việt Nam (UTC+7), ngày giỗ tự tính (tháng nhuận, ngày 30), lịch tháng âm–dương | Kiểm thử 1900–2100 |
| F9 | Xưng hô Bắc/Trung/Nam; “Tôi là ai”; tra quan hệ giữa hai người | |
| F10 | Mời qua link (hạn, mật khẩu tùy chọn, thu hồi); vai trò Quản trị / Biên tập / Xem ở cấp dòng họ và cấp cuốn | Postgres RLS |
| F11 | Push nhắc giỗ (trước 7 ngày, 1 ngày, đúng ngày) | FCM + Web Push |
| F12 | Nhật ký thay đổi (ai, lúc nào, giá trị cũ/mới) | Khôi phục từng trường |
| F13 | Xuất poster cây ra PDF; nhập/xuất GEDCOM | |

#### 7.3 Kỹ thuật (đã chốt)

- **App**: Vite + React + TypeScript, bọc bằng Capacitor cho iOS/Android (camera, ghi âm, push).
- **Backend**: Supabase — Postgres + RLS, Auth, Storage (ghi âm, ảnh), Edge Functions (gọi AI, giữ khóa API), pg_cron (nhắc giỗ).
- **Lõi nghiệp vụ** `packages/core` (TypeScript thuần, có test): lịch âm, ngày giỗ, xưng hô, xếp cây, GEDCOM, kiểm tra ràng buộc.
- **AI**: gọi được OpenAI, Claude và Gemini qua Vercel AI SDK (`generateObject` + schema zod), chọn nhà cung cấp/model bằng cấu hình cho từng việc; STT tiếng Việt tách bước riêng. Chọn mặc định bằng bộ test đánh giá trên tư liệu thật (ADR 0005).
- **CSDL đồ thị**: không dùng. Cây ≤ 1.000 người/cuốn → Postgres + `WITH RECURSIVE`, xưng hô tính ở client.

#### 7.4 Giả định và câu hỏi mở

| # | Nội dung | Cách kiểm |
|---|---|---|
| A1 | AI đọc đúng ≥ 80% tên/ngày trên ảnh phả Hán Nôm và bia mộ thực tế | Thử 30 trang phả + 30 bia mộ thật trước khi build F6 |
| A2 | STT nhận được giọng các cụ (giọng địa phương, nói chậm, nhiều tạp âm) | Thử 10 ghi âm thật, nhiều miền |
| A3 | Chi phí AI mỗi dòng họ đủ thấp để giữ bản miễn phí | Đo chi phí / giờ ghi âm và / trang ảnh ở bước thử A1–A2 |
| A4 | Người dùng chịu duyệt từng đề xuất thay vì nhập tay | Phỏng vấn 5 người chép phả với bản mẫu |
| Q1 | Mô hình thu phí: theo số giờ AI xử lý, theo dung lượng, hay theo dòng họ/năm? | Chốt trước khi ra mắt công khai |
| Q2 | Đặt server ở Singapore → cần hồ sơ chuyển dữ liệu ra nước ngoài theo Nghị định 13/2023 | Hỏi tư vấn pháp lý |
| Q3 | Apple có duyệt app Capacitor (Guideline 4.2)? | Giảm rủi ro bằng tính năng native: camera, ghi âm, push, xem offline |
| Q4 | Đăng nhập Zalo có bắt buộc cho người lớn tuổi không? | Phỏng vấn ở bước A4 |

### 8. Release

**Phase 0 — Kiểm chứng (trước khi viết sản phẩm):** chạy thử A1–A3 bằng script với tư liệu thật. Nếu độ chính xác thấp hơn ngưỡng → thu hẹp F6 về bia mộ (chữ quốc ngữ) trước, Hán Nôm để sau.

**Phase 1 — MVP:** F1–F13. Ra web trước, sau đó lên Google Play và App Store.

**Phase 2 (khi có người dùng đòi):** lối xem hình quạt / niên biểu; lịch việc họ lặp lại; bảng tin; album ảnh; sách gia phả A4 đầy đủ; phiên bản (snapshot cả cây); đăng nhập Zalo; xem offline đầy đủ.

**Không làm ở Phase 1:**
- Quỹ họ, danh bạ, bản đồ dòng họ.
- Nối cây giữa các dòng họ, mã QR trên bia mộ.
- AI tự ghi thẳng vào cây không qua duyệt.
- Gói trả phí và thanh toán.
- Mã hoá riêng theo từng dòng họ (dùng mã hoá mặc định của Supabase).
