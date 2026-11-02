// Sao mã lịch của packages/core vào Edge Function (container chỉ gắn supabase/functions nên không import ra ngoài được).
// Test `core/test/edge-copy.test.ts` báo lệch nếu quên chạy: pnpm sync:core
import { copyFileSync } from 'node:fs'

for (const f of ['lunar.ts', 'dates.ts', 'calendar.ts']) {
  copyFileSync(new URL(`../packages/core/src/${f}`, import.meta.url), new URL(`../supabase/functions/_shared/core/${f}`, import.meta.url))
}
console.log('Đã sao lunar.ts, dates.ts, calendar.ts vào supabase/functions/_shared/core')
