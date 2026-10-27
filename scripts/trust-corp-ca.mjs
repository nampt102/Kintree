// Cho container Auth của Supabase local tin CA của mạng công ty (tường lửa giải mã SSL, vd. Sophos).
// Dùng khi gửi mail/Google bị lỗi "x509: certificate signed by unknown authority".
// Đặt chứng chỉ gốc (PEM, chỉ phần công khai) ở supabase/certs/corp-ca.crt rồi chạy: pnpm db:trust-ca
// Container bị tạo lại mỗi lần `db:start`, nên chạy lại lệnh này sau đó.
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ca = new URL('../supabase/certs/corp-ca.crt', import.meta.url)
const container = 'supabase_auth_kintree'
const bundle = '/etc/ssl/certs/ca-certificates.crt'

if (!existsSync(ca)) {
  console.error('Không có supabase/certs/corp-ca.crt (chứng chỉ gốc PEM của mạng công ty).')
  process.exit(1)
}
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' })

const dir = mkdtempSync(join(tmpdir(), 'kt-ca-'))
const local = join(dir, 'ca-certificates.crt')
docker('cp', `${container}:${bundle}`, local)
const pem = readFileSync(ca, 'utf8')
if (readFileSync(local, 'utf8').includes(pem.trim())) {
  console.log('Container đã tin CA này.')
} else {
  appendFileSync(local, `\n${pem}\n`)
  docker('cp', local, `${container}:${bundle}`)
  docker('restart', container)
  console.log('Đã thêm CA vào container Auth và khởi động lại nó.')
}
