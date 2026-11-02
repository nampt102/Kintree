import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { calendarStore, rowToEntry } from './calendarStore.ts'

const row = (over: Record<string, unknown> = {}) => ({
  id: 'p1', tree_id: 't1', full_name: 'Nguyễn Văn Cả',
  birth_year: null, birth_month: null, birth_day: null, birth_lunar: false, birth_leap: false,
  death_year: null, death_month: null, death_day: null, death_lunar: false, death_leap: false,
  ...over,
})

describe('rowToEntry', () => {
  it('chuyển cột ngày thành PartialDate, giữ cuốn', () => {
    expect(rowToEntry(row({ death_year: 1968, death_month: 3, death_day: 5, death_lunar: true }))).toEqual({
      id: 'p1', treeId: 't1', fullName: 'Nguyễn Văn Cả', death: { year: 1968, month: 3, day: 5, lunar: true },
    })
    expect(rowToEntry(row({ birth_year: 1975, birth_month: 9, birth_lunar: false }))?.birth).toEqual({ year: 1975, month: 9, lunar: false })
  })

  it('ghi cờ nhuận khi có; năm không tháng thì chỉ có năm', () => {
    expect(rowToEntry(row({ death_year: 2025, death_month: 6, death_day: 10, death_lunar: true, death_leap: true }))?.death).toEqual({ year: 2025, month: 6, day: 10, lunar: true, leap: true })
    expect(rowToEntry(row({ death_year: 1950 }))?.death).toEqual({ year: 1950, lunar: false })
  })

  it('không có ngày sinh lẫn ngày mất thì bỏ', () => {
    expect(rowToEntry(row())).toBeNull()
  })
})

/** Client giả: `persons` trả `rows` theo trang như PostgREST (range inclusive). */
function fake(rows: unknown[], capture: { url?: string[] } = {}) {
  const builder = {
    select: () => builder,
    in: (_c: string, ids: string[]) => ((capture.url = ids), builder),
    is: () => builder,
    or: () => builder,
    order: () => builder,
    range: (a: number, b: number) => Promise.resolve({ data: rows.slice(a, b + 1), error: null }),
  }
  return { from: () => builder } as unknown as SupabaseClient
}

describe('calendarStore.people', () => {
  it('không có cuốn thì không gọi mạng', async () => {
    const r = await calendarStore({ from: () => { throw new Error('không được gọi') } } as unknown as SupabaseClient).people([])
    expect(r).toEqual({ ok: true, value: [] })
  })

  it('phân trang qua 1.000 dòng và bỏ người không có ngày', async () => {
    const rows = Array.from({ length: 2300 }, (_, i) => row({ id: `p${i}`, death_year: i % 10 === 0 ? null : 1950, death_month: 1, death_day: 1 }))
    const r = await calendarStore(fake(rows)).people(['t1'])
    expect(r.ok && r.value.length).toBe(2300 - 230)
  })

  it('lỗi mạng thành mã lỗi của giao diện', async () => {
    const failing = { from: () => ({ select: () => ({ in: () => ({ is: () => ({ or: () => ({ order: () => ({ range: () => Promise.reject(new Error('Failed to fetch')) }) }) }) }) }) }) } as unknown as SupabaseClient
    expect(await calendarStore(failing).people(['t1'])).toEqual({ ok: false, error: 'OFFLINE' })
  })
})
