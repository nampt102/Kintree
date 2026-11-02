import type { CalendarPerson, SolarDate } from '@kintree/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { dateFrom, fetchAll, mapError, type Outcome } from './cloudStore.ts'

// Người có ngày sinh hoặc ngày mất của các cuốn trong một dòng họ, cho lịch giỗ và sinh nhật (change lunar-calendar-view, design D2).
// RLS: người xem chỉ nhận người của cuốn mình có quyền; cuốn đã xoá không trả dòng nào.

export type CalendarEntry = CalendarPerson & { treeId: string }

/** Hôm nay theo giờ thiết bị (design D3). */
export function todaySolar(): SolarDate {
  const n = new Date()
  return { year: n.getFullYear(), month: n.getMonth() + 1, day: n.getDate() }
}

type Row = {
  id: string
  tree_id: string
  full_name: string
  birth_year: number | null
  birth_month: number | null
  birth_day: number | null
  birth_lunar: boolean
  birth_leap: boolean
  death_year: number | null
  death_month: number | null
  death_day: number | null
  death_lunar: boolean
  death_leap: boolean
}

const COLUMNS = 'id, tree_id, full_name, birth_year, birth_month, birth_day, birth_lunar, birth_leap, death_year, death_month, death_day, death_lunar, death_leap'

/** Dòng cột → người của lịch; người không có ngày sinh lẫn ngày mất bị bỏ (không có gì để hiện). */
export function rowToEntry(r: Row): CalendarEntry | null {
  const birth = dateFrom(r.birth_year, r.birth_month, r.birth_day, r.birth_lunar, r.birth_leap)
  const death = dateFrom(r.death_year, r.death_month, r.death_day, r.death_lunar, r.death_leap)
  if (!birth && !death) return null
  return { id: r.id, treeId: r.tree_id, fullName: r.full_name, ...(birth ? { birth } : {}), ...(death ? { death } : {}) }
}

export function calendarStore(client: SupabaseClient) {
  return {
    /** Mọi người có ngày của các cuốn `treeIds` (phân trang 1.000 dòng). */
    people: async (treeIds: string[]): Promise<Outcome<CalendarEntry[]>> => {
      if (treeIds.length === 0) return { ok: true, value: [] }
      try {
        const r = await fetchAll<Row>((a, b) =>
          client.from('persons').select(COLUMNS).in('tree_id', treeIds).is('removed_at', null).or('birth_year.not.is.null,death_year.not.is.null').order('id').range(a, b),
        )
        if ('error' in r) return { ok: false, error: mapError(r.error, 'LOAD_FAILED') }
        return { ok: true, value: r.data.flatMap((row) => rowToEntry(row) ?? []) }
      } catch (e) {
        return { ok: false, error: mapError({ message: e instanceof Error ? e.message : 'network' }, 'LOAD_FAILED') }
      }
    },
  }
}

export type CalendarStore = ReturnType<typeof calendarStore>
