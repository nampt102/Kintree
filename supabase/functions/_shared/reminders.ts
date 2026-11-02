// Chọn người nhận và soạn thông báo nhắc giỗ (change anniversary-push, design D2). Hàm thuần: không gọi mạng, không đọc đồng hồ.
// Mã lịch ở ./core là bản sao của packages/core (pnpm sync:core), vì container Edge Function chỉ gắn supabase/functions.
import { calendarEvents, type CalendarPerson } from './core/calendar.ts'
import { fromJdn, jdn, type SolarDate } from './core/lunar.ts'

export const LEAD_DAYS = [7, 1, 0] as const
export type LeadDays = (typeof LEAD_DAYS)[number]

export type ReminderPerson = CalendarPerson & { treeId: string }
export type Target = { userId: string; clanId: string; subscriptionId: string; endpoint: string; p256dh: string; auth: string }
export type Item = { personId: string; treeId: string; fullName: string; anniversary: string; date: SolarDate; lunar: string }
export type Payload = { title: string; body: string; url: string; tag: string }
export type Message = {
  userId: string
  clanId: string
  leadDays: LeadDays
  items: Item[]
  payload: Payload
  /** Thiết bị của người nhận (một thông báo gửi tới từng thiết bị). */
  subscriptions: Pick<Target, 'subscriptionId' | 'endpoint' | 'p256dh' | 'auth'>[]
}

/** Khoá nhật ký đã gửi: (người nhận, người có giỗ, ngày giỗ, mốc), khớp khoá chính của `reminder_log`. */
export const logKey = (userId: string, personId: string, date: SolarDate, leadDays: number) =>
  `${userId}|${personId}|${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}|${leadDays}`

/** Hôm nay theo giờ Việt Nam (UTC+7), dù máy chủ ở múi giờ nào. */
export function vnToday(now: Date): SolarDate {
  const d = new Date(now.getTime() + 7 * 3600_000)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

export const addDays = (d: SolarDate, n: number): SolarDate => fromJdn(jdn(d) + n)

const WHEN: Record<LeadDays, string> = { 0: 'hôm nay', 1: 'ngày mai', 7: 'sau 7 ngày nữa' }

export function reminderUrl(clanId: string) {
  return `/#calendar/${clanId}`
}

/**
 * Các thông báo cần gửi hôm nay: mỗi (người nhận, dòng họ, mốc) một thông báo gộp mọi giỗ rơi đúng ngày mốc,
 * bỏ sinh nhật, bỏ cặp (người, giỗ, ngày, mốc) đã có trong `sent`. Thiết bị của cùng người được gom vào một thông báo.
 */
export function planReminders(args: {
  today: SolarDate
  targets: Target[]
  /** Người có ngày của từng dòng họ (đã loại người và cuốn đã xoá). */
  people: ReadonlyMap<string, ReminderPerson[]>
  /** Tên cuốn; chỉ ghi vào thông báo khi dòng họ có từ hai cuốn. */
  treeNames: ReadonlyMap<string, string>
  clanTrees: ReadonlyMap<string, string[]>
  sent: ReadonlySet<string>
}): Message[] {
  const { today, targets, people, treeNames, clanTrees, sent } = args
  // Giỗ từng mốc của từng dòng họ, tính một lần.
  const dueCache = new Map<string, Item[]>()
  const due = (clanId: string, lead: LeadDays): Item[] => {
    const key = `${clanId}|${lead}`
    const hit = dueCache.get(key)
    if (hit) return hit
    const date = addDays(today, lead)
    const items = calendarEvents(people.get(clanId) ?? [], date.year, date.month, today)
      .filter((e) => e.kind === 'death' && e.date.day === date.day)
      .map((e) => ({
        personId: e.person.id,
        treeId: e.person.treeId,
        fullName: e.person.fullName,
        anniversary: e.anniversary ?? 'Giỗ',
        date: e.date,
        lunar: `${e.lunar.day}/${e.lunar.month}${e.lunar.leap ? ' nhuận' : ''}`,
      }))
    dueCache.set(key, items)
    return items
  }

  // Gom thiết bị theo (người, dòng họ).
  const byRecipient = new Map<string, { userId: string; clanId: string; subscriptions: Message['subscriptions'] }>()
  for (const t of targets) {
    const key = `${t.userId}|${t.clanId}`
    const r = byRecipient.get(key) ?? { userId: t.userId, clanId: t.clanId, subscriptions: [] }
    if (!r.subscriptions.some((s) => s.subscriptionId === t.subscriptionId)) r.subscriptions.push({ subscriptionId: t.subscriptionId, endpoint: t.endpoint, p256dh: t.p256dh, auth: t.auth })
    byRecipient.set(key, r)
  }

  const out: Message[] = []
  for (const r of byRecipient.values()) {
    const showTree = (clanTrees.get(r.clanId)?.length ?? 0) >= 2
    for (const lead of LEAD_DAYS) {
      const items = due(r.clanId, lead).filter((i) => !sent.has(logKey(r.userId, i.personId, i.date, lead)))
      if (items.length === 0) continue
      const lines = items.map((i) => `${i.fullName} · ${i.anniversary} · ${i.date.day}/${i.date.month} (âm ${i.lunar})${showTree ? ` · ${treeNames.get(i.treeId) ?? ''}` : ''}`)
      out.push({
        userId: r.userId,
        clanId: r.clanId,
        leadDays: lead,
        items,
        subscriptions: r.subscriptions,
        payload: {
          title: items.length === 1 ? `Giỗ ${WHEN[lead]}` : `${items.length} ngày giỗ ${WHEN[lead]}`,
          body: lines.join('\n'),
          url: reminderUrl(r.clanId),
          tag: `giỗ-${r.clanId}-${lead}`,
        },
      })
    }
  }
  return out
}
