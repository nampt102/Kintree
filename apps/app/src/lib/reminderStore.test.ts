import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { deviceLabel, reminderStore, type PushPort } from './reminderStore.ts'

const port = (over: Partial<PushPort> = {}): PushPort & { calls: string[] } => {
  const calls: string[] = []
  return {
    calls,
    support: () => 'ok',
    permission: () => 'granted',
    requestPermission: async () => 'granted',
    current: async () => ({ endpoint: 'https://push.test/me' }),
    subscribe: async () => ({ endpoint: 'https://push.test/me', p256dh: 'k', auth: 'a' }),
    unsubscribe: async () => void calls.push('unsubscribe'),
    ...over,
  }
}

/** Client giả ghi lại các lời gọi; mọi truy vấn trả `result`. */
function fakeClient(opts: { count?: number; rpcError?: { message: string; code?: string } } = {}) {
  const log: string[] = []
  const chain = (name: string, result: unknown = { error: null }) => {
    const b: Record<string, unknown> = {}
    for (const m of ['eq', 'select', 'update', 'delete', 'upsert']) b[m] = (...a: unknown[]) => (log.push(`${name}.${m}${m === 'upsert' ? JSON.stringify(a[0]) : ''}`), b)
    b.then = (res: (v: unknown) => unknown) => res(result)
    return b
  }
  const client = {
    rpc: async (fn: string) => (log.push(`rpc.${fn}`), { error: opts.rpcError ?? null }),
    from: (t: string) => chain(t, t === 'reminder_prefs' ? { error: null, count: opts.count ?? 0 } : { error: null }),
  }
  return { client: client as unknown as SupabaseClient, log }
}

describe('deviceLabel', () => {
  it('đọc trình duyệt và hệ điều hành từ user-agent', () => {
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36')).toBe('Chrome · Windows')
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0')).toBe('Edge · Windows')
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1')).toBe('Safari · iPhone')
    expect(deviceLabel(null)).toBe('Thiết bị không rõ')
  })
})

describe('reminderStore.enable', () => {
  it('trình duyệt không hỗ trợ', async () => {
    const { client } = fakeClient()
    expect(await reminderStore(client, 'u1', port({ support: () => 'unsupported' }), 'KEY').enable('c1')).toEqual({ ok: false, error: 'PUSH_UNSUPPORTED' })
  })

  it('xin quyền, bị từ chối thì không đăng ký gì', async () => {
    const { client, log } = fakeClient()
    const p = port({ permission: () => 'default', requestPermission: async () => 'denied' })
    expect(await reminderStore(client, 'u1', p, 'KEY').enable('c1')).toEqual({ ok: false, error: 'PUSH_DENIED' })
    expect(log).toEqual([])
  })

  it('thiếu khoá VAPID', async () => {
    const { client } = fakeClient()
    const p = port({ subscribe: async () => Promise.reject(new Error('NO_KEY')) })
    expect(await reminderStore(client, 'u1', p, '').enable('c1')).toEqual({ ok: false, error: 'PUSH_NOT_CONFIGURED' })
  })

  it('đăng ký thiết bị rồi bật nhắc cho dòng họ', async () => {
    const { client, log } = fakeClient()
    const r = await reminderStore(client, 'u1', port(), 'KEY').enable('c1')
    expect(r.ok).toBe(true)
    expect(log[0]).toBe('rpc.register_push')
    expect(log.some((l) => l.startsWith('reminder_prefs.upsert') && l.includes('"clan_id":"c1"') && l.includes('"enabled":true'))).toBe(true)
  })

  it('máy chủ từ chối đăng ký thì báo lỗi, không bật nhắc', async () => {
    const { client, log } = fakeClient({ rpcError: { message: 'INVALID_SUBSCRIPTION', code: '22023' } })
    const r = await reminderStore(client, 'u1', port(), 'KEY').enable('c1')
    expect(r).toEqual({ ok: false, error: 'PUSH_FAILED' })
    expect(log.some((l) => l.startsWith('reminder_prefs.upsert'))).toBe(false)
  })
})

describe('reminderStore.disable', () => {
  it('còn dòng họ khác bật thì giữ thiết bị', async () => {
    const { client, log } = fakeClient({ count: 1 })
    const p = port()
    expect((await reminderStore(client, 'u1', p, 'KEY').disable('c1')).ok).toBe(true)
    expect(log.some((l) => l.startsWith('push_subscriptions'))).toBe(false)
    expect(p.calls).toEqual([])
  })

  it('hết dòng họ nào bật thì gỡ thiết bị này', async () => {
    const { client, log } = fakeClient({ count: 0 })
    const p = port()
    expect((await reminderStore(client, 'u1', p, 'KEY').disable('c1')).ok).toBe(true)
    expect(log).toContain('push_subscriptions.delete')
    expect(p.calls).toEqual(['unsubscribe'])
  })
})
