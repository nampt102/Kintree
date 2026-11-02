import { lunarToSolar } from '@kintree/core'
import { admin, must, type World } from './backend.ts'
import { expect, test } from './fixtures.ts'

// Edge Function send-reminders ở chế độ mock (PUSH_PROVIDER trống): không gọi mạng, trả nội dung thông báo.
// Nhân vật mẫu: Nguyễn Văn Cả mất 5/3 âm 1968; giỗ năm 2026 rơi vào 21/4/2026.
const DUE = lunarToSolar({ year: 2026, month: 3, day: 5, leap: false })

type Preview = { userId: string; clanId: string; leadDays: number; devices: number; title: string; body: string; url: string }

/** Giờ Việt Nam 9:00 của ngày dương đã cho (UTC+7), là lúc lịch chạy. */
const at = (day: number) => new Date(Date.UTC(2026, DUE.month - 1, day, 2)).toISOString()

async function run(now: string): Promise<{ preview: Preview[]; delivered: number }> {
  const res = await fetch(`${process.env.KT_API_URL}/functions/v1/send-reminders`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ now }) })
  expect(res.status).toBe(200)
  return res.json()
}

async function subscribe(world: World, userId: string, enabled = true) {
  const db = admin()
  must(await db.from('push_subscriptions').insert({ user_id: userId, endpoint: `https://push.test/${crypto.randomUUID()}`, p256dh: 'k', auth: 'a' }))
  must(await db.from('reminder_prefs').insert({ user_id: userId, clan_id: world.clanId, enabled }))
}

const mine = (r: { preview: Preview[] }, userId: string) => r.preview.filter((p) => p.userId === userId)

// Function xử lý mọi người đã bật nhắc của mọi dòng họ, nên các ca của file này chạy lần lượt (không song song).
test.describe.configure({ mode: 'serial' })

test.describe('send-reminders (mock)', () => {
  test('nhắc 7 ngày, 1 ngày, đúng ngày; chạy lại không gửi trùng', async ({ world }) => {
    await subscribe(world, world.viewer.id)

    const d7 = mine(await run(at(DUE.day - 7)), world.viewer.id)
    expect(d7).toHaveLength(1)
    expect(d7[0]).toMatchObject({ leadDays: 7, devices: 1, title: 'Giỗ sau 7 ngày nữa', url: `/#calendar/${world.clanId}` })
    expect(d7[0]!.body).toBe(`Nguyễn Văn Cả · Giỗ thường · ${DUE.day}/${DUE.month} (âm 5/3)`)

    // Chạy lại cùng ngày: không còn gì cho người này.
    expect(mine(await run(at(DUE.day - 7)), world.viewer.id)).toHaveLength(0)

    expect(mine(await run(at(DUE.day - 1)), world.viewer.id).map((p) => p.title)).toEqual(['Giỗ ngày mai'])
    expect(mine(await run(at(DUE.day)), world.viewer.id).map((p) => p.title)).toEqual(['Giỗ hôm nay'])
    // Ngày không có mốc nào.
    expect(mine(await run(at(DUE.day - 3)), world.viewer.id)).toHaveLength(0)
  })

  test('chỉ người đã bật và còn vai trò trong dòng họ', async ({ world }) => {
    await subscribe(world, world.viewer.id, false)
    await subscribe(world, world.admin.id)
    const r = await run(at(DUE.day))
    expect(mine(r, world.viewer.id)).toHaveLength(0)
    expect(mine(r, world.admin.id)).toHaveLength(1)

    // Bật nhắc cho người xem rồi gỡ họ khỏi dòng họ: không nhận nữa (quản trị vẫn nhận mốc kế).
    must(await admin().from('reminder_prefs').update({ enabled: true }).eq('user_id', world.viewer.id))
    must(await admin().from('memberships').delete().eq('user_id', world.viewer.id).eq('clan_id', world.clanId))
    const next = await run(at(DUE.day - 1))
    expect(mine(next, world.viewer.id)).toHaveLength(0)
    expect(mine(next, world.admin.id)).toHaveLength(1)
  })

  test('chỉ có thông báo khi bật nhắc: không ai bật thì không gửi gì cho dòng họ này', async ({ world }) => {
    const r = await run(at(DUE.day))
    expect(r.preview.filter((p) => p.clanId === world.clanId)).toHaveLength(0)
  })
})
