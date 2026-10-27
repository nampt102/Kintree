// Cấp quyền quản trị nền tảng cho một email: node scripts/promote-platform-admin.mjs <email>
// Dùng khoá service_role (từ SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, hoặc `supabase status` ở máy local).
// Chỉ chạy bởi nhà vận hành; không bao giờ đưa khoá này vào app hay repo.
import { execSync } from 'node:child_process'

const email = process.argv[2]?.trim().toLowerCase()
if (!email?.includes('@')) {
  console.error('Dùng: pnpm admin:promote <email>')
  process.exit(1)
}

let url = process.env.SUPABASE_URL
let key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  const out = execSync('pnpm exec supabase status -o env', { encoding: 'utf8' })
  const get = (n) => out.match(new RegExp(`^${n}="?(.*?)"?$`, 'm'))?.[1]
  url ??= get('API_URL')
  key ??= get('SERVICE_ROLE_KEY')
}
if (!url || !key) {
  console.error('Không tìm thấy URL/khoá. Đã chạy `pnpm db:start` chưa?')
  process.exit(1)
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
const call = async (path, init) => {
  const r = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...init?.headers } })
  return { status: r.status, body: await r.json().catch(() => null) }
}

async function findUserId() {
  for (let page = 1; ; page++) {
    const { body } = await call(`/auth/v1/admin/users?page=${page}&per_page=200`)
    const hit = body?.users?.find((u) => u.email?.toLowerCase() === email)
    if (hit) return hit.id
    if (!body?.users?.length) return null
  }
}

let id = await findUserId()
if (!id) {
  const created = await call('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, email_confirm: true }),
  })
  id = created.body?.id
  if (!id) {
    console.error('Không tạo được người dùng:', created.status, created.body?.msg ?? created.body)
    process.exit(1)
  }
}
const r = await call('/rest/v1/platform_admins', {
  method: 'POST',
  headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
  body: JSON.stringify({ user_id: id }),
})
if (r.status >= 300) {
  console.error('Không ghi được platform_admins:', r.status, r.body)
  process.exit(1)
}
console.log(`${email} là quản trị nền tảng.`)
