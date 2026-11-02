import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// Edge Function nhắc giỗ dùng bản sao của lịch (container chỉ gắn supabase/functions). Lệch thì chạy: pnpm sync:core
test.each(['lunar.ts', 'dates.ts', 'calendar.ts'])('supabase/functions/_shared/core/%s khớp packages/core/src', (f) => {
  const a = readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
  const b = readFileSync(new URL(`../../../supabase/functions/_shared/core/${f}`, import.meta.url), 'utf8')
  expect(b).toBe(a)
})
