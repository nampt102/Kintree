import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Chỉ test đơn vị trong src/; e2e/ do Playwright chạy (pnpm --filter app e2e).
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
})
