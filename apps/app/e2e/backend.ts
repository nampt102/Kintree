import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import type { TreeDoc } from '@kintree/core'
import { randomUUID } from 'node:crypto'
import { docToRows } from '../src/lib/cloudStore.ts'

/** Phía máy chủ của test: tạo người dùng, dòng họ, cuốn bằng khoá service_role (người dùng thường không có đường tạo). */
const cfg = () => ({ url: process.env.KT_API_URL!, anon: process.env.KT_ANON_KEY!, service: process.env.KT_SERVICE_KEY! })
const NO_SESSION = { auth: { persistSession: false, autoRefreshToken: false } }

let adminClient: SupabaseClient | undefined
export const admin = (): SupabaseClient => (adminClient ??= createClient(cfg().url, cfg().service, NO_SESSION))

/** Tài khoản thử. Không có mật khẩu: phiên lấy bằng mã đăng nhập một lần do API quản trị sinh ra (xem signIn). */
export type TestUser = { id: string; email: string }

export async function createUser(prefix: string): Promise<TestUser> {
  const email = `${prefix}-${randomUUID().slice(0, 8)}@example.com`
  const { data, error } = await admin().auth.admin.createUser({ email, email_confirm: true })
  if (error) throw error
  return { id: data.user.id, email }
}

/** Mỗi lần gọi cho một phiên mới (một "thiết bị" mới): API quản trị sinh mã một lần, rồi đổi mã lấy phiên như app làm. */
export async function signIn(user: TestUser): Promise<Session> {
  const link = await admin().auth.admin.generateLink({ type: 'magiclink', email: user.email })
  if (link.error) throw link.error
  const c = createClient(cfg().url, cfg().anon, NO_SESSION)
  const { data, error } = await c.auth.verifyOtp({ email: user.email, token: link.data.properties.email_otp, type: 'email' })
  if (error || !data.session) throw error ?? new Error('Không lấy được phiên')
  return data.session
}

/** Khoá localStorage mà SDK dùng để giữ phiên (sb-<nhãn đầu của host>-auth-token). */
export const sessionKey = () => `sb-${new URL(cfg().url).hostname.split('.')[0]}-auth-token`

export const must = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message)
  return r.data
}

export type World = {
  clanId: string
  clanName: string
  treeId: string | null
  doc: TreeDoc | null
  admin: TestUser
  viewer: TestUser
  dispose: () => Promise<void>
}

/** Một dòng họ riêng cho mỗi test (id ngẫu nhiên) nên chạy song song không đụng nhau. */
export async function makeWorld(doc: TreeDoc | null): Promise<World> {
  const [adminUser, viewer] = await Promise.all([createUser('admin'), createUser('viewer')])
  const clanName = `Họ Thử ${randomUUID().slice(0, 6)}`
  const db = admin()
  const clan = must(await db.from('clans').insert({ name: clanName, slug: `thu-${randomUUID().slice(0, 10)}` }).select('id').single())!
  must(
    await db.from('memberships').insert([
      { user_id: adminUser.id, clan_id: clan.id, role: 'admin' },
      { user_id: viewer.id, clan_id: clan.id, role: 'viewer' },
    ]),
  )
  if (doc) await seedTree(clan.id, doc)
  return {
    clanId: clan.id,
    clanName,
    treeId: doc?.meta.id ?? null,
    doc,
    admin: adminUser,
    viewer,
    dispose: async () => {
      await db.from('clans').delete().eq('id', clan.id)
      await Promise.all([adminUser, viewer].map((u) => db.auth.admin.deleteUser(u.id)))
    },
  }
}

export async function seedTree(clanId: string, doc: TreeDoc): Promise<void> {
  const r = docToRows(doc)
  const db = admin()
  must(await db.from('trees').insert({ id: r.tree.id, clan_id: clanId, name: r.tree.name, description: r.tree.description, region: r.tree.region }))
  if (r.persons.length) must(await db.from('persons').insert(r.persons))
  if (r.parents.length) must(await db.from('parent_child').insert(r.parents))
  if (r.marriages.length) must(await db.from('marriages').insert(r.marriages))
}

/** Mã 6 số trong thư mới nhất gửi tới `email` (Mailpit của Supabase local). Chờ tới khi có ít nhất `count` thư. */
export async function latestOtp(email: string, count = 1): Promise<string> {
  const base = process.env.KT_MAIL_URL!
  for (let i = 0; i < 40; i++) {
    const found = (await (await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json()) as { messages: { ID: string }[] }
    if (found.messages.length >= count) {
      const msg = (await (await fetch(`${base}/api/v1/message/${found.messages[0]!.ID}`)).json()) as { Text: string }
      const code = msg.Text.match(/\b(\d{6})\b/)?.[1]
      if (code) return code
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Không thấy thư mã đăng nhập gửi tới ${email}`)
}

/** Client đã đăng nhập như một người dùng (khoá anon + phiên của họ): đúng quyền mà trình duyệt có. */
export async function clientAs(user: TestUser): Promise<SupabaseClient> {
  const session = await signIn(user)
  const c = createClient(cfg().url, cfg().anon, NO_SESSION)
  await c.auth.setSession(session)
  return c
}

export async function makePlatformAdmin(): Promise<TestUser> {
  const u = await createUser('ops')
  must(await admin().from('platform_admins').insert({ user_id: u.id }))
  return u
}
