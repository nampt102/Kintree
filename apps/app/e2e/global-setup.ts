import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

/**
 * Lấy địa chỉ và khoá của Supabase local MỘT lần, đặt vào biến môi trường cho các worker.
 * Khoá service_role chỉ nằm trong tiến trình test, không ghi ra tệp nào và không đưa vào app (design D7, R6).
 */
export default async function globalSetup() {
  let out: string
  try {
    out = execSync('pnpm exec supabase status -o env', { encoding: 'utf8', cwd: new URL('../../..', import.meta.url), stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    throw new Error('Không đọc được trạng thái Supabase. Hãy chạy `pnpm db:start` (cần Docker) rồi `pnpm db:env` trước khi chạy e2e.')
  }
  const get = (name: string) => out.match(new RegExp(`^${name}="?(.*?)"?$`, 'm'))?.[1]
  const url = get('API_URL')
  const anon = get('ANON_KEY')
  const service = get('SERVICE_ROLE_KEY')
  if (!url || !anon || !service) throw new Error('Thiếu API_URL/ANON_KEY/SERVICE_ROLE_KEY trong `supabase status`. Đã chạy `pnpm db:start` chưa?')
  // Kiểm Auth và API đang chạy bằng một lời gọi quản trị nhỏ.
  const probe = await createClient(url, service, { auth: { persistSession: false } }).auth.admin.listUsers({ page: 1, perPage: 1 })
  if (probe.error) throw new Error(`Auth của Supabase chưa chạy (${probe.error.message}). Chạy \`pnpm db:start\` (không dùng cờ loại gotrue).`)
  process.env.KT_API_URL = url
  process.env.KT_ANON_KEY = anon
  process.env.KT_SERVICE_KEY = service
  process.env.KT_MAIL_URL = (get('MAILPIT_URL') ?? get('INBUCKET_URL')) || 'http://127.0.0.1:54324'
}
