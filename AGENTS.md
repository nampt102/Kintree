# AGENTS.md

Quy trình làm việc chung cho **mọi AI tool** (Claude Code, Codex, Cursor, Copilot...) và người trong dự án này.
Nguồn sự thật nằm trong file markdown của repo, không nằm trong memory riêng của từng tool.

## Bắt đầu mỗi phiên (bắt buộc)
1. Đọc `openspec/status.md`: phase hiện tại, bước đang làm, việc bị chặn, bước tiếp theo.
2. Đọc `openspec/config.yaml` (bối cảnh, quy ước) và các file `openspec/kb/` liên quan đến việc sắp làm.
3. Chạy `openspec list` để biết các change đang mở; đọc `proposal.md`/`tasks.md` của change liên quan.
4. Nếu việc sắp làm mâu thuẫn với một quyết định trong `openspec/decisions/`, dừng và hỏi.

## Khi làm việc
- Thay đổi hành vi, kiến trúc, schema, API: tạo **change proposal** bằng OpenSpec (`/opsx:propose` hoặc tương đương của tool), **chờ duyệt** rồi mới code.
- Sửa lỗi nhỏ, chính tả, cấu hình, test cho hành vi đã có: làm trực tiếp, không cần proposal.
- Không đoán hành vi của hệ thống hay thư viện: đọc code, ghi rõ chỗ "chưa xác nhận".
- Có quyết định mới (chọn công nghệ, đổi hướng, chấp nhận đánh đổi): ghi 1 file trong `openspec/decisions/`.

## Kết thúc mỗi bước hoặc phiên (bắt buộc)
1. Cập nhật `openspec/status.md` (trạng thái bước, việc bị chặn, bước tiếp theo, mục "Gần đây").
2. Cập nhật `openspec/kb/` nếu kiến thức đã đổi (kiến trúc, data model, thuật ngữ...); không để KB lệch với code.
3. Tick `tasks.md` của change đang làm; khi xong và đã deploy, hỏi người dùng rồi mới `/opsx:archive`.
4. Thêm ADR vào `openspec/decisions/` nếu có quyết định mới.
- Claude Code: dùng skill `project-sync` để làm các bước trên. Tool khác: làm theo đúng danh sách này.

## Quy ước chung
- Tài liệu: tiếng Việt, thuật ngữ kỹ thuật giữ tiếng Anh. Mỗi file KB nên dưới ~300 dòng; lớn hơn thì tách theo module.
- Không ghi bí mật (mật khẩu, token, khóa API) vào repo; dùng biến môi trường và `.env.example`.
- Không dùng chỗ nào khác ngoài repo làm nguồn sự thật cho tiến độ hay quyết định.
