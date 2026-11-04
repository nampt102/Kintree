import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { selfStore } from './selfStore.ts'

/** Client giả ghi lại lời gọi; mọi truy vấn trả `result`. */
function fake(result: unknown) {
  const log: string[] = []
  const chain = () => {
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'delete', 'maybeSingle']) b[m] = () => (log.push(m), b)
    b.upsert = (row: unknown) => (log.push(`upsert ${JSON.stringify(row)}`), b)
    b.then = (res: (v: unknown) => unknown) => res(result)
    return b
  }
  return { client: { from: () => chain() } as unknown as SupabaseClient, log }
}

describe('selfStore', () => {
  it('đọc người đã chọn, hoặc null khi chưa chọn', async () => {
    expect(await selfStore(fake({ data: { person_id: 'p1' }, error: null }).client, 'u1').get('t1')).toEqual({ ok: true, value: 'p1' })
    expect(await selfStore(fake({ data: null, error: null }).client, 'u1').get('t1')).toEqual({ ok: true, value: null })
  })

  it('chọn mình ghi (người dùng, cuốn, người)', async () => {
    const { client, log } = fake({ error: null })
    expect((await selfStore(client, 'u1').set('t1', 'p2')).ok).toBe(true)
    expect(log[0]).toContain('"user_id":"u1"')
    expect(log[0]).toContain('"tree_id":"t1"')
    expect(log[0]).toContain('"person_id":"p2"')
  })

  it('bỏ lựa chọn', async () => {
    const { client, log } = fake({ error: null })
    expect((await selfStore(client, 'u1').clear('t1')).ok).toBe(true)
    expect(log).toContain('delete')
  })

  it('từ chối quyền thành FORBIDDEN, mạng hỏng thành OFFLINE', async () => {
    expect(await selfStore(fake({ error: { message: 'denied', code: '42501' } }).client, 'u1').set('t1', 'p9')).toEqual({ ok: false, error: 'FORBIDDEN' })
    const down = { from: () => { throw new Error('Failed to fetch') } } as unknown as SupabaseClient
    expect(await selfStore(down, 'u1').get('t1')).toEqual({ ok: false, error: 'OFFLINE' })
  })
})
