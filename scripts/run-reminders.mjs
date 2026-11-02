// Chạy bộ gửi nhắc giỗ NGAY (thử tay, không chờ 7:00): gọi function send-reminders của Supabase local bằng REMINDER_CRON_KEY trong supabase/.env.
// Chỉ gửi những giỗ rơi vào hôm nay, ngày mai hoặc 7 ngày nữa (giờ Việt Nam) cho người đã bật nhắc; mỗi mốc gửi một lần.
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const NL = String.fromCharCode(10)
const envFile = new URL('../supabase/.env', import.meta.url)
const key = process.env.REMINDER_CRON_KEY ?? (existsSync(envFile) ? (readFileSync(envFile, 'utf8').match(/^REMINDER_CRON_KEY=(.*)$/m)?.[1] ?? '').trim() : '')
const api = execSync('pnpm exec supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).match(/^API_URL="?(.*?)"?$/m)?.[1]
const res = await fetch(`${api}/functions/v1/send-reminders`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-key': key }, body: '{}' })
const body = await res.json()
console.log(res.status, JSON.stringify({ provider: body.provider, today: body.today, messages: body.messages, delivered: body.delivered, failed: body.failed, removed: body.removed, error: body.error }))
if (body.problems?.length) console.log(['Lỗi từ dịch vụ push:', ...body.problems].join(NL + '- '))
if (body.provider === 'mock') console.log('Đang ở chế độ giả lập: đặt PUSH_PROVIDER=webpush trong supabase/.env rồi db:stop/db:start.')
