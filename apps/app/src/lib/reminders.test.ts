import { describe, expect, it } from 'vitest'
import { lunarToSolar } from '../../../../supabase/functions/_shared/core/lunar.ts'
import { addDays, logKey, planReminders, vnToday, type ReminderPerson, type Target } from '../../../../supabase/functions/_shared/reminders.ts'

// Ngày giỗ 5/3 âm lịch rơi vào 21/4/2026; hôm nay cố định theo từng ca.
const CA: ReminderPerson = { id: 'ca', treeId: 't1', fullName: 'Nguyễn Văn Cả', death: { year: 1968, month: 3, day: 5, lunar: true } }
const target = (user: string, sub = `s-${user}`, clan = 'c1'): Target => ({ userId: user, clanId: clan, subscriptionId: sub, endpoint: `https://push.test/${sub}`, p256dh: 'k', auth: 'a' })
const base = { treeNames: new Map([['t1', 'Chi trưởng'], ['t2', 'Chi hai']]), clanTrees: new Map([['c1', ['t1']]]), sent: new Set<string>() }
const run = (today: { year: number; month: number; day: number }, targets: Target[], people: ReminderPerson[], extra: Partial<typeof base> = {}) =>
  planReminders({ today, targets, people: new Map([['c1', people]]), ...base, ...extra })

describe('vnToday', () => {
  it('đổi sang giờ Việt Nam (UTC+7) dù máy chủ ở UTC', () => {
    expect(vnToday(new Date('2026-04-14T17:30:00Z'))).toEqual({ year: 2026, month: 4, day: 15 })
    expect(vnToday(new Date('2026-04-14T16:59:00Z'))).toEqual({ year: 2026, month: 4, day: 14 })
  })
})

describe('planReminders', () => {
  it('nhắc 7 ngày, 1 ngày và đúng ngày', () => {
    const m7 = run({ year: 2026, month: 4, day: 14 }, [target('u1')], [CA])
    expect(m7.map((m) => m.leadDays)).toEqual([7])
    expect(m7[0]!.payload.title).toBe('Giỗ sau 7 ngày nữa')
    expect(m7[0]!.payload.body).toBe('Nguyễn Văn Cả · Giỗ thường · 21/4 (âm 5/3)')
    expect(run({ year: 2026, month: 4, day: 20 }, [target('u1')], [CA])[0]!.payload.title).toBe('Giỗ ngày mai')
    expect(run({ year: 2026, month: 4, day: 21 }, [target('u1')], [CA])[0]!.payload.title).toBe('Giỗ hôm nay')
    expect(run({ year: 2026, month: 4, day: 15 }, [target('u1')], [CA])).toEqual([])
  })

  it('mốc 7 ngày qua ranh tháng và năm', () => {
    expect(addDays({ year: 2026, month: 12, day: 28 }, 7)).toEqual({ year: 2027, month: 1, day: 4 })
    // 25/11 âm lịch năm Bính Ngọ rơi vào đầu tháng 1/2027 (dương).
    const p: ReminderPerson = { id: 'x', treeId: 't1', fullName: 'Cụ X', death: { year: 1990, month: 11, day: 25, lunar: true } }
    const due = lunarToSolar({ year: 2026, month: 11, day: 25, leap: false })
    expect(due.year).toBe(2027)
    const m = run(addDays(due, -7), [target('u1')], [p])
    expect(m.map((x) => x.leadDays)).toEqual([7])
    expect(m[0]!.items[0]!.date).toEqual(due)
  })

  it('không nhắc sinh nhật và người thiếu ngày/tháng mất', () => {
    const alive: ReminderPerson = { id: 'a', treeId: 't1', fullName: 'Em', birth: { year: 1975, month: 4, day: 21, lunar: false } }
    const yearOnly: ReminderPerson = { id: 'k', treeId: 't1', fullName: 'Khoa', death: { year: 1950, lunar: false } }
    expect(run({ year: 2026, month: 4, day: 21 }, [target('u1')], [alive, yearOnly])).toEqual([])
  })

  it('gộp nhiều giỗ cùng mốc thành một thông báo và gom thiết bị của cùng người', () => {
    const two: ReminderPerson = { ...CA, id: 'ca2', fullName: 'Trần Thị Bình' }
    const m = run({ year: 2026, month: 4, day: 21 }, [target('u1', 'd1'), target('u1', 'd2'), target('u2')], [CA, two])
    expect(m.length).toBe(2)
    const u1 = m.find((x) => x.userId === 'u1')!
    expect(u1.items.length).toBe(2)
    expect(u1.payload.title).toBe('2 ngày giỗ hôm nay')
    expect(u1.subscriptions.map((s) => s.subscriptionId)).toEqual(['d1', 'd2'])
  })

  it('bỏ cặp đã có trong nhật ký (không gửi trùng)', () => {
    const date = { year: 2026, month: 4, day: 21 }
    const sent = new Set([logKey('u1', 'ca', date, 0)])
    const m = run(date, [target('u1'), target('u2')], [CA], { sent })
    expect(m.map((x) => x.userId)).toEqual(['u2'])
  })

  it('ghi tên cuốn khi dòng họ có từ hai cuốn', () => {
    const m = run({ year: 2026, month: 4, day: 21 }, [target('u1')], [CA], { clanTrees: new Map([['c1', ['t1', 't2']]]) })
    expect(m[0]!.payload.body).toBe('Nguyễn Văn Cả · Giỗ thường · 21/4 (âm 5/3) · Chi trưởng')
    expect(m[0]!.payload.url).toBe('/#calendar/c1')
  })

  it('dòng họ không có người nhận hoặc không có giỗ thì không có gì', () => {
    expect(run({ year: 2026, month: 4, day: 21 }, [], [CA])).toEqual([])
  })
})
