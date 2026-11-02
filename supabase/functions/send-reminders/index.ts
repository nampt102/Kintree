// Edge Function: gửi nhắc giỗ qua Web Push (change anniversary-push, design D2–D3). Lịch (pg_cron) gọi mỗi ngày 7:00 giờ Việt Nam.
// PUSH_PROVIDER = webpush | mock; trống = mock (không gọi mạng, trả danh sách thông báo; cho phép đặt `now` để e2e cố định ngày).
// Mock chỉ ghi reminder_log khi có `now` (chế độ thử); chạy tay không `now` là xem thử, không ghi.
// Bản webpush đòi REMINDER_CRON_KEY ở header x-cron-key; bản mock không gửi gì ra ngoài nên không đòi.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import type { PartialDate } from '../_shared/core/dates.ts'
import { addDays, logKey, planReminders, vnToday, type Message, type ReminderPerson, type Target } from '../_shared/reminders.ts'

const PAGE = 1000
const reply = (status: number, body: unknown) => Response.json(body, { status })

type Db = SupabaseClient

/** Đọc hết một truy vấn phân trang (PostgREST giới hạn 1.000 dòng mỗi lần). */
async function all<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if ((data?.length ?? 0) < PAGE) return rows
  }
}

type PersonRow = { id: string; tree_id: string; full_name: string; death_year: number | null; death_month: number | null; death_day: number | null; death_lunar: boolean; death_leap: boolean }

function deathOf(r: PersonRow): PartialDate | undefined {
  if (r.death_year === null) return undefined
  return {
    year: r.death_year,
    ...(r.death_month !== null ? { month: r.death_month } : {}),
    ...(r.death_day !== null ? { day: r.death_day } : {}),
    lunar: r.death_lunar,
    ...(r.death_leap ? { leap: true } : {}),
  }
}

async function load(db: Db, targets: Target[], today: ReturnType<typeof vnToday>) {
  const clanIds = [...new Set(targets.map((t) => t.clanId))]
  const trees = await all<{ id: string; clan_id: string; name: string }>((a, b) => db.from('trees').select('id, clan_id, name').in('clan_id', clanIds).is('removed_at', null).order('id').range(a, b))
  const treeIds = trees.map((t) => t.id)
  const persons = treeIds.length
    ? await all<PersonRow>((a, b) =>
        db.from('persons').select('id, tree_id, full_name, death_year, death_month, death_day, death_lunar, death_leap').in('tree_id', treeIds).is('removed_at', null).not('death_year', 'is', null).order('id').range(a, b),
      )
    : []
  const clanOfTree = new Map(trees.map((t) => [t.id, t.clan_id]))
  const people = new Map<string, ReminderPerson[]>()
  for (const p of persons) {
    const clan = clanOfTree.get(p.tree_id)!
    const death = deathOf(p)
    if (death) people.set(clan, [...(people.get(clan) ?? []), { id: p.id, treeId: p.tree_id, fullName: p.full_name, death }])
  }
  const clanTrees = new Map<string, string[]>()
  for (const t of trees) clanTrees.set(t.clan_id, [...(clanTrees.get(t.clan_id) ?? []), t.id])

  const day = (d: ReturnType<typeof vnToday>) => `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
  const logs = await all<{ user_id: string; person_id: string; event_date: string; lead_days: number }>((a, b) =>
    db.from('reminder_log').select('user_id, person_id, event_date, lead_days').gte('event_date', day(today)).lte('event_date', day(addDays(today, 7))).order('person_id').range(a, b),
  )
  const sent = new Set(logs.map((l) => `${l.user_id}|${l.person_id}|${l.event_date}|${l.lead_days}`))
  return { people, clanTrees, treeNames: new Map(trees.map((t) => [t.id, t.name])), sent }
}

type Outcome = 'ok' | 'gone' | 'error'
/** Lý do gửi lỗi (mã HTTP và đầu lời nhắn của dịch vụ push, hoặc lỗi mạng/ký); không chứa dữ liệu người dùng. */
const problems: string[] = []

function makeSender(provider: string): (sub: Message['subscriptions'][number], payload: Message['payload']) => Promise<Outcome> {
  if (provider !== 'webpush') return async () => 'ok'
  // VAPID_SUBJECT phải là `mailto:` hoặc https; điền email trần thì tự thêm `mailto:`.
  const rawSubject = (Deno.env.get('VAPID_SUBJECT') ?? '').trim()
  const subject = /^(mailto:|https?:)/i.test(rawSubject) ? rawSubject : `mailto:${rawSubject}`
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
  return async (sub, payload) => {
    try {
      const d = webpush.generateRequestDetails({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), {
        vapidDetails: { subject, publicKey, privateKey },
        TTL: 86400,
      })
      const init = { method: d.method, headers: d.headers as Record<string, string>, body: d.body as Uint8Array }
      const res = await fetch(d.endpoint, init)
      if (res.ok) return 'ok'
      problems.push(`${new URL(sub.endpoint).host} ${res.status} ${(await res.text()).slice(0, 160)}`)
      return res.status === 404 || res.status === 410 ? 'gone' : 'error'
    } catch (e) {
      const cause = e instanceof Error ? `${e.message} ${String((e as { cause?: unknown }).cause ?? '')}` : 'lỗi mạng'
      // Bỏ địa chỉ endpoint (có mã riêng của thiết bị) khỏi lời báo.
      problems.push(`${new URL(sub.endpoint).host} ${cause.replace(/https?:\/\/\S+/g, '<url>').slice(0, 300)}`)
      return 'error'
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { error: 'METHOD_NOT_ALLOWED' })
  const provider = (Deno.env.get('PUSH_PROVIDER') ?? '') === 'webpush' ? 'webpush' : 'mock'
  if (provider === 'webpush') {
    const key = Deno.env.get('REMINDER_CRON_KEY') ?? ''
    if (!key || !Deno.env.get('VAPID_PRIVATE_KEY') || !Deno.env.get('VAPID_PUBLIC_KEY') || !Deno.env.get('VAPID_SUBJECT')) return reply(500, { error: 'NOT_CONFIGURED' })
    if (req.headers.get('x-cron-key') !== key) return reply(401, { error: 'UNAUTHORIZED' })
  }

  let body: { now?: string } = {}
  try {
    body = await req.json()
  } catch {
    // Không có thân: dùng giờ hiện tại.
  }
  const now = provider === 'mock' && body.now ? new Date(body.now) : new Date()
  if (Number.isNaN(now.getTime())) return reply(400, { error: 'BAD_REQUEST' })

  problems.length = 0
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  try {
    const rpc = await db.rpc('reminder_targets')
    if (rpc.error) throw new Error(rpc.error.message)
    const targets: Target[] = (rpc.data as { user_id: string; clan_id: string; subscription_id: string; endpoint: string; p256dh: string; auth: string }[]).map((r) => ({
      userId: r.user_id,
      clanId: r.clan_id,
      subscriptionId: r.subscription_id,
      endpoint: r.endpoint,
      p256dh: r.p256dh,
      auth: r.auth,
    }))
    const today = vnToday(now)
    if (targets.length === 0) return reply(200, { provider, today, messages: 0, delivered: 0, removed: 0, failed: 0, preview: [] })

    const messages = planReminders({ today, targets, ...(await load(db, targets, today)) })
    const send = makeSender(provider)
    let delivered = 0
    let failed = 0
    const gone = new Set<string>()
    for (const m of messages) {
      const results = await Promise.all(m.subscriptions.map((s) => send(s, m.payload)))
      results.forEach((r, i) => r === 'gone' && gone.add(m.subscriptions[i]!.subscriptionId))
      if (results.includes('ok')) {
        delivered++
        // Bản mock chạy tay (không đặt `now`) chỉ xem thử: không ghi nhật ký, kẻo lần chạy thật bị coi là gửi trùng.
        if (provider === 'mock' && !body.now) continue
        // Ghi nhật ký sau khi gửi được; gửi lỗi thì để trống để lần chạy sau thử lại.
        const rows = m.items.map((i) => ({ user_id: m.userId, person_id: i.personId, event_date: logKey(m.userId, i.personId, i.date, m.leadDays).split('|')[2], lead_days: m.leadDays }))
        const { error } = await db.from('reminder_log').upsert(rows, { onConflict: 'user_id,person_id,event_date,lead_days', ignoreDuplicates: true })
        if (error) throw new Error(error.message)
      } else failed++
    }
    if (gone.size) await db.from('push_subscriptions').delete().in('id', [...gone])
    return reply(200, {
      provider,
      today,
      messages: messages.length,
      delivered,
      removed: gone.size,
      failed,
      problems: [...new Set(problems)],
      // Bản mock trả nội dung để e2e kiểm; bản thật không trả (tránh lộ tên người).
      preview: provider === 'mock' ? messages.map((m) => ({ userId: m.userId, clanId: m.clanId, leadDays: m.leadDays, devices: m.subscriptions.length, ...m.payload })) : [],
    })
  } catch (e) {
    return reply(500, { error: 'FAILED', message: e instanceof Error ? e.message : 'unknown' })
  }
})
