// Ghi apps/app/.env.local từ `supabase status`. Chỉ khoá anon; KHÔNG ghi service_role.
// Chỉ thay hai dòng VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, giữ nguyên các dòng khác (vd. VITE_AUTH_GOOGLE=1).
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const out = execSync('pnpm exec supabase status -o env', { encoding: 'utf8' })
const env = Object.fromEntries(
  out.split(/\r?\n/).flatMap((l) => {
    const m = l.match(/^([A-Z_]+)="?(.*?)"?$/)
    return m ? [[m[1], m[2]]] : []
  }),
)
if (!env.API_URL || !env.ANON_KEY) {
  console.error('Không đọc được API_URL/ANON_KEY. Đã chạy `pnpm db:start` chưa?')
  process.exit(1)
}
const file = new URL('../apps/app/.env.local', import.meta.url)
const managed = { VITE_SUPABASE_URL: env.API_URL, VITE_SUPABASE_ANON_KEY: env.ANON_KEY }
const kept = existsSync(file)
  ? readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.trim() !== '' && !Object.keys(managed).some((k) => l.startsWith(`${k}=`)))
  : []
writeFileSync(file, [...Object.entries(managed).map(([k, v]) => `${k}=${v}`), ...kept].join('\n') + '\n')
console.log('Đã ghi apps/app/.env.local')
