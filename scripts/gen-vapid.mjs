// Sinh khoá VAPID cho Web Push nhắc giỗ và đặt vào đúng chỗ (change anniversary-push):
//  - khoá riêng + subject + khoá gọi lịch → supabase/.env (chỉ thêm tên còn thiếu, không in giá trị, không ghi đè);
//  - khoá công khai → apps/app/.env.local (VITE_VAPID_PUBLIC_KEY), vì app cần biết khoá công khai.
// Sau khi chạy: đặt PUSH_PROVIDER=webpush trong supabase/.env để gửi thật, rồi `pnpm db:stop && pnpm db:start`.
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'

const b64url = (b) => Buffer.from(b).toString('base64url')
const has = (text, name) => new RegExp(`^${name}=.+`, 'm').test(text)

const envPath = new URL('../supabase/.env', import.meta.url)
const appEnvPath = new URL('../apps/app/.env.local', import.meta.url)
const env = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
const appEnv = existsSync(appEnvPath) ? readFileSync(appEnvPath, 'utf8') : ''

let pub
if (has(env, 'VAPID_PRIVATE_KEY') && has(env, 'VAPID_PUBLIC_KEY')) {
  pub = env.match(/^VAPID_PUBLIC_KEY=(.+)$/m)[1].trim()
  console.log('supabase/.env đã có khoá VAPID, giữ nguyên.')
} else {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const x = publicKey.export({ format: 'jwk' })
  const d = privateKey.export({ format: 'jwk' }).d
  pub = b64url(Buffer.concat([Buffer.from([4]), Buffer.from(x.x, 'base64url'), Buffer.from(x.y, 'base64url')]))
  const lines = [`VAPID_PUBLIC_KEY=${pub}`, `VAPID_PRIVATE_KEY=${d}`]
  if (!has(env, 'VAPID_SUBJECT')) lines.push('VAPID_SUBJECT=mailto:admin@kintree.local')
  appendFileSync(envPath, `${env.endsWith('\n') || env === '' ? '' : '\n'}# Nhắc giỗ qua Web Push (pnpm vapid:gen)\n${lines.join('\n')}\n`)
  console.log('Đã thêm khoá VAPID vào supabase/.env.')
}
if (!has(env, 'REMINDER_CRON_KEY')) {
  appendFileSync(envPath, `REMINDER_CRON_KEY=${randomBytes(24).toString('base64url')}\n`)
  console.log('Đã thêm REMINDER_CRON_KEY vào supabase/.env.')
}
if (!has(appEnv, 'VITE_VAPID_PUBLIC_KEY')) {
  writeFileSync(appEnvPath, `${appEnv}${appEnv.endsWith('\n') || appEnv === '' ? '' : '\n'}VITE_VAPID_PUBLIC_KEY=${pub}\n`)
  console.log('Đã thêm VITE_VAPID_PUBLIC_KEY vào apps/app/.env.local.')
}
