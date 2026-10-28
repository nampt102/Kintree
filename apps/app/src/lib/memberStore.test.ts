import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { mapError } from './cloudStore.ts'
import { captureInvite, clearInvite, inviteUrl, memberStore, pendingInvite } from './memberStore.ts'
import { MESSAGES } from './messages.ts'

const memory = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}

describe('mang mã link qua bước đăng nhập', () => {
  it('cất mã, xoá hash, giữ đường dẫn và query', () => {
    const store = memory()
    const hist = { state: { kt: 1 }, replaceState: vi.fn() }
    captureInvite({ hash: '#invite=abc-_123', pathname: '/', search: '?x=1' }, store, hist)
    expect(pendingInvite(store)).toBe('abc-_123')
    expect(hist.replaceState).toHaveBeenCalledWith({ kt: 1 }, '', '/?x=1')
    clearInvite(store)
    expect(pendingInvite(store)).toBeNull()
  })

  it('hash khác thì không đụng gì (ví dụ hash của đăng nhập)', () => {
    const store = memory()
    const hist = { state: null, replaceState: vi.fn() }
    captureInvite({ hash: '#access=x', pathname: '/', search: '' }, store, hist)
    expect(pendingInvite(store)).toBeNull()
    expect(hist.replaceState).not.toHaveBeenCalled()
  })

  it('storage bị chặn: không ném lỗi', () => {
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') }, removeItem: () => { throw new Error('denied') } }
    expect(() => captureInvite({ hash: '#invite=a', pathname: '/', search: '' }, broken, { state: null, replaceState: () => {} })).not.toThrow()
    expect(pendingInvite(broken)).toBeNull()
  })

  it('dựng link mời', () => {
    expect(inviteUrl('https://app.kintree.vn', 'tok')).toBe('https://app.kintree.vn/#invite=tok')
  })
})

describe('memberStore.accept: trạng thái link → lỗi giao diện', () => {
  const store = (data: unknown) => memberStore({ rpc: async () => ({ data, error: null }) } as unknown as SupabaseClient)

  it.each([
    ['invalid', 'LINK_INVALID'],
    ['expired', 'LINK_EXPIRED'],
    ['revoked', 'LINK_REVOKED'],
    ['locked', 'LINK_LOCKED'],
    ['wrong_code', 'WRONG_CODE'],
  ])('%s → %s', async (status, error) => {
    expect(await store({ status }).accept('t', null)).toEqual({ ok: false, error })
  })

  it('ok → mã dòng họ và cuốn', async () => {
    expect(await store({ status: 'ok', clan_id: 'c1' }).accept('t', '1945')).toEqual({ ok: true, value: { clanId: 'c1', treeId: null } })
    expect(await store({ status: 'ok', clan_id: 'c1', tree_id: 't1' }).accept('t', null)).toEqual({ ok: true, value: { clanId: 'c1', treeId: 't1' } })
  })

  it('mọi mã lỗi đều có câu tiếng Việt', () => {
    for (const code of ['LINK_INVALID', 'LINK_EXPIRED', 'LINK_REVOKED', 'LINK_LOCKED', 'WRONG_CODE', 'LAST_ADMIN'] as const) expect(MESSAGES[code]).toBeTruthy()
  })
})

describe('mapError cho lỗi có tên', () => {
  it.each([
    ['LAST_ADMIN', 'LAST_ADMIN'],
    ['EMAIL_INVALID', 'EMAIL_INVALID'],
    ['CODE_TOO_SHORT', 'CODE_TOO_SHORT'],
  ])('%s', (message, expected) => {
    expect(mapError({ code: '23514', message }, 'SAVE_FAILED')).toBe(expected)
  })

  it('FORBIDDEN vẫn theo mã 42501', () => {
    expect(mapError({ code: '42501', message: 'FORBIDDEN' }, 'SAVE_FAILED')).toBe('FORBIDDEN')
  })
})
