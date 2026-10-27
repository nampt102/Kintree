import { defineConfig } from '@playwright/test'

// Dùng Google Chrome đã cài trên máy (channel "chrome") thay cho Chromium tải về:
// mạng hiện tại chặn tải trình duyệt của Playwright (lỗi chứng chỉ TLS), xem openspec/kb/tech-stack.md.
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  workers: process.env.CI ? 2 : 4,
  use: {
    baseURL: 'http://localhost:5175',
    channel: process.env.PW_CHANNEL ?? 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec vite --port 5175 --strictPort',
    url: 'http://localhost:5175',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
