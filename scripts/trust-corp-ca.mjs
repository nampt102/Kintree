// Cho container Auth và Edge Function của Supabase local tin CA của mạng công ty (tường lửa giải mã SSL, vd. Sophos).
// Dùng khi gửi mail/Google bị lỗi "x509: certificate signed by unknown authority".
// Đặt chứng chỉ gốc (PEM, chỉ phần công khai) ở supabase/certs/corp-ca.crt rồi chạy: pnpm db:trust-ca
// Container bị tạo lại mỗi lần `db:start`, nên chạy lại lệnh này sau đó.
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ca = new URL('../supabase/certs/corp-ca.crt', import.meta.url)
const containers = ['supabase_auth_kintree', 'supabase_edge_runtime_kintree']
const bundle = '/etc/ssl/certs/ca-certificates.crt'

if (!existsSync(ca)) {
  console.error('Không có supabase/certs/corp-ca.crt (chứng chỉ gốc PEM của mạng công ty).')
  process.exit(1)
}
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' })
const pem = readFileSync(ca, 'utf8')

for (const container of containers) {
  const dir = mkdtempSync(join(tmpdir(), 'kt-ca-'))
  const local = join(dir, 'ca-certificates.crt')
  try {
    docker('cp', `${container}:${bundle}`, local)
  } catch {
    console.log(`Bỏ qua ${container} (chưa chạy).`)
    continue
  }
  if (readFileSync(local, 'utf8').includes(pem.trim())) {
    console.log(`${container}: đã tin CA này.`)
    continue
  }
  appendFileSync(local, `
${pem}
`)
  docker('cp', local, `${container}:${bundle}`)
  // Auth đọc bộ chứng chỉ lúc khởi động; function đọc lúc gửi nên không cần khởi động lại.
  if (container.includes('auth')) docker('restart', container)
  console.log(`${container}: đã thêm CA.`)
}
