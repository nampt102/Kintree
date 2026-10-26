# 0001. Một codebase React cho web và mobile (Vite + React + Capacitor)

- **Ngày:** 2026-10-26
- **Trạng thái:** đã chốt
- **Người quyết định:** jamesphan

## Bối cảnh
Kintree cần chạy trên web, iOS và Android. Phần khó nhất là sơ đồ cây, file in poster/sách và luồng duyệt đề xuất AI; muốn mỗi phần chỉ viết một lần. Người dùng phần đông lớn tuổi.

## Các lựa chọn
1. Vite + React + TypeScript, bọc bằng Capacitor — một UI cho mọi nền tảng; có rủi ro Apple Guideline 4.2.
2. Expo (React Native) + Expo Router web — cảm giác native tốt hơn; hai bộ UI, sơ đồ cây và in ấn khó dùng chung.
3. Flutter — web in ấn yếu, không dùng lại được mã TypeScript.
4. Next.js + Capacitor — SSR không cần (app bắt đăng nhập), export tĩnh cho Capacitor vướng.

## Quyết định
Chọn 1. Landing page/SEO tách riêng bằng Astro.

## Lý do và hệ quả
- Sơ đồ cây (React Flow), poster/sách (HTML + CSS khổ in) và hàng chờ duyệt viết một lần.
- Phải có tính năng native thật (camera, ghi âm, push, xem offline) để giảm rủi ro bị Apple từ chối.
- Xem lại nếu app bị từ chối trên App Store hoặc hiệu năng WebView không đủ cho cây ~1.000 người.
