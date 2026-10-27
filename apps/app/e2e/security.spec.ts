import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from './fixtures.ts'

function files(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? files(p) : [p]
  })
}

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

test('Khoá dịch vụ không có trong mã nguồn app và bản build', () => {
  const service = process.env.KT_SERVICE_KEY!
  const scanned = [...files(join(root, 'src')), ...files(join(root, 'dist'))].filter((f) => !/\.(png|ico|woff2?|svg)$/.test(f))
  expect(scanned.length).toBeGreaterThan(10)
  for (const f of scanned) {
    const text = readFileSync(f, 'utf8')
    expect(text.includes('service_role'), `${f} nhắc service_role`).toBe(false)
    expect(text.includes(service), `${f} chứa khoá dịch vụ`).toBe(false)
  }
})

test('.env.local của app không chứa khoá dịch vụ', () => {
  const env = join(root, '.env.local')
  test.skip(!existsSync(env), 'Chưa có apps/app/.env.local')
  const text = readFileSync(env, 'utf8')
  expect(text).not.toContain(process.env.KT_SERVICE_KEY!)
  expect(text).not.toMatch(/service/i)
})
