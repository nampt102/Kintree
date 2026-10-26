# Proposal

## Why

Mọi tính năng của Kintree (cây, ngày giỗ, nhắc giỗ, AI đề xuất) đều dựa trên ba thứ chưa có: một repo chạy được, phép đổi lịch âm–dương đúng chuẩn Việt Nam, và một schema dữ liệu giữ được cây không bị hỏng. Ngày giỗ tính sai là mất lòng tin ngay (KR “0 lỗi ngày giỗ” trong `docs/PRD.md`), nên phần lịch âm phải làm và kiểm thử trước khi có UI.

## What Changes

- Dựng pnpm monorepo: `apps/app` (Vite + React + TypeScript, chưa có tính năng, chỉ trang khởi động gọi được `packages/core`) và `packages/core` (TypeScript thuần, Vitest).
- Thêm vào `packages/core`: đổi ngày dương ↔ âm theo lịch Việt Nam (UTC+7), tính Can Chi, tính ngày giỗ dương lịch của một năm từ ngày mất (xử lý tháng nhuận, ngày 30, ngày tháng không đầy đủ).
- Thêm migration Postgres đầu tiên cho Supabase: dòng họ, cuốn gia phả, người, quan hệ, thành viên/vai trò, nguồn, đề xuất, nhật ký thay đổi; kèm constraint giữ toàn vẹn cây. Chưa bật RLS chi tiết (thuộc change `auth-invite-roles`), nhưng bật RLS mặc định từ chối trên mọi bảng.
- Chưa có: Capacitor, UI cây, đăng nhập, gọi AI.

## Capabilities

### New Capabilities
- `lunar-calendar`: đổi ngày dương ↔ âm lịch Việt Nam và tính Can Chi.
- `death-anniversary`: tính ngày giỗ dương lịch cho một năm bất kỳ từ ngày mất.
- `family-tree-integrity`: các ràng buộc dữ liệu giữ cây gia phả hợp lệ (cha mẹ, nối vòng, ngày tháng không đầy đủ, quan hệ ngoại tộc).

### Modified Capabilities
<!-- Không có: dự án chưa có spec nào. -->

## Impact

- Code mới: `package.json`, `pnpm-workspace.yaml`, `apps/app/`, `packages/core/`, `supabase/migrations/`.
- Phụ thuộc mới: pnpm workspaces, Vite, React, TypeScript, Vitest, Supabase CLI (chạy Postgres local qua Docker).
- Tài liệu: `openspec/kb/tech-stack.md`, `openspec/kb/data-model.md`.
