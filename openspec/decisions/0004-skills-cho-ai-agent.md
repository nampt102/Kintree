# 0004. Bộ skill cho AI agent trong dự án

- **Ngày:** 2026-10-26
- **Trạng thái:** đã chốt
- **Người quyết định:** jamesphan

## Bối cảnh
Dự án làm chủ yếu với AI agent (Claude Code, Codex, Cursor). Cần chốt mỗi việc dùng skill nào, để các tool làm giống nhau và không chồng chéo (hai skill thiết kế cùng chỉ đạo một trang sẽ ra kết quả lẫn lộn).

## Các lựa chọn
1. Không quy định, mỗi phiên tự chọn — linh hoạt, nhưng giao diện và quy trình không đồng nhất.
2. Quy định một skill chính cho mỗi loại việc (bảng dưới) — đồng nhất; phải cài thêm một số skill.

## Quyết định
Chọn 2.

| Việc | Skill chính | Đã có sẵn? | Ghi chú | Tool dùng được |
|---|---|---|---|---|
| Tiến độ, KB, ADR | `project-sync` | có (project-kit) | đầu và cuối mỗi phiên | mọi tool (repo) |
| Đề xuất / làm / đóng change | `openspec-propose`, `openspec-apply-change`, `openspec-archive-change` | có | `/opsx:propose`, `/opsx:apply`, `/opsx:archive` | mọi tool (repo) |
| User stories, kịch bản test | `pm-execution:write-stories`, `pm-execution:test-scenarios` | có (plugin PM) | khi mở change mới | chỉ Claude (plugin máy cá nhân) |
| Landing page (Astro), hướng hình ảnh, audit giao diện | **`hallmark`** (nutlope/hallmark) | có, cài vào repo `.claude/skills/hallmark` (2026-10-26) | `/hallmark` chế độ custom cho landing; `/hallmark audit` cho màn hình app trước khi ra bản | mọi tool, nếu cài vào repo |
| Màn hình và component trong app (React, Tailwind, shadcn) | `ui-ux-pro-max` | có | theo design tokens đã chốt, không tự đổi hướng hình ảnh | chỉ Claude (máy cá nhân) |
| Gọi AI (trích xuất ghi âm/ảnh) | `claude-api` cho phần Claude; tài liệu AI SDK cho lớp chung | có (built-in) | lớp chung theo ADR 0005 | chỉ Claude (built-in) |
| Review code | `code-review`, `simplify` | có (built-in) | trước mỗi lần merge | chỉ Claude (built-in) |
| Bảo mật (RLS, Edge Function, dữ liệu cá nhân) | `security-review`; `pm-ai-shipping:security-audit-static` trước khi ra bản | có | | chỉ Claude |
| Chạy và xem app | `run` | có (built-in) | kiểm thay đổi trên app thật | chỉ Claude (built-in) |

## Lý do và hệ quả
- Một skill thiết kế chính cho phần “hướng hình ảnh” (hallmark) và một cho phần “component trong app” (ui-ux-pro-max); không bật `taste-skill` song song để tránh hai hướng chồng nhau.
- Hallmark sinh trang HTML/CSS tự chứa, hợp với landing page; với app React chỉ dùng chế độ `audit` (và `redesign` khi cần), không dùng để dựng app.
- Hallmark đã cài vào repo bằng `npx skills add nutlope/hallmark --agent claude-code` (khoá phiên bản ở `skills-lock.json`). Chỉ Claude Code đang có bản này; Codex/Cursor cần chạy lại lệnh với `--agent` tương ứng. Đã đọc qua các script: chỉ gọi `npm root -g` và chạy script của chính nó. `scripts/imagegen.mjs` (sinh ảnh) chưa kiểm, chưa dùng.
- Bước kiểm bằng trình duyệt của hallmark cần thêm `npm i -g puppeteer-core` + Chrome (chưa cài).
- Phần lớn skill là skill cá nhân của Claude Code trên máy jamesphan; Codex/Cursor chỉ có các skill nằm trong repo (`.agents/`, `.cursor/`). Muốn đồng nhất thật thì cài skill vào repo thay vì `-g`.
- Xem lại khi thêm Capacitor (có thể cần skill riêng cho build iOS/Android) hoặc khi một skill không còn được duy trì.
