import type { SupabaseClient } from '@supabase/supabase-js'
import { mapError, type Outcome, type Role } from './cloudStore.ts'
import type { StoreError } from './messages.ts'

// Thành viên, lời mời và link mời của một dòng họ (change clan-invites, design D2, D5). Chỉ quản trị dòng họ gọi được.

export type Member = {
  kind: 'member' | 'invite'
  id: string
  email: string
  role: Role
  /** null = cả dòng họ. */
  treeId: string | null
  treeName: string | null
  isMe: boolean
}
export type InviteLink = { id: string; treeId: string | null; treeName: string | null; expiresAt: string; hasCode: boolean; acceptedCount: number; lockedUntil: string | null }
export type LinkStatus = 'ok' | 'invalid' | 'expired' | 'revoked' | 'locked' | 'wrong_code'
export type LinkPeek = { status: LinkStatus; clanId?: string; clanName?: string; treeName?: string | null; hasCode?: boolean }

/** Trạng thái link (trừ 'ok') → mã lỗi giao diện. */
export const LINK_ERROR: Record<Exclude<LinkStatus, 'ok'>, StoreError> = {
  invalid: 'LINK_INVALID',
  expired: 'LINK_EXPIRED',
  revoked: 'LINK_REVOKED',
  locked: 'LINK_LOCKED',
  wrong_code: 'WRONG_CODE',
}

const netError = (e: unknown) => ({ message: e instanceof Error ? e.message : 'network' })

export function memberStore(client: SupabaseClient) {
  const call = async <T>(fn: string, args: Record<string, unknown>, fallback: StoreError, map: (data: unknown) => T): Promise<Outcome<T>> => {
    try {
      const { data, error } = await client.rpc(fn, args)
      if (error) return { ok: false, error: mapError(error, fallback) }
      return { ok: true, value: map(data) }
    } catch (e) {
      return { ok: false, error: mapError(netError(e), fallback) }
    }
  }
  const none = () => null

  return {
    list: (clanId: string) =>
      call('member_list', { p_clan: clanId }, 'LOAD_FAILED', (data) =>
        ((data ?? []) as { kind: Member['kind']; id: string; email: string; role: Role; tree_id: string | null; tree_name: string | null; is_me: boolean }[]).map(
          (r): Member => ({ kind: r.kind, id: r.id, email: r.email, role: r.role, treeId: r.tree_id, treeName: r.tree_name, isMe: r.is_me }),
        ),
      ),
    /** 'added' = có quyền ngay; 'pending' = chờ người ấy đăng nhập lần đầu. */
    invite: (clanId: string, treeId: string | null, email: string, role: Role) =>
      call('member_invite', { p_clan: clanId, p_tree: treeId, p_email: email, p_role: role }, 'SAVE_FAILED', (data) => data as 'added' | 'pending'),
    setRole: (memberId: string, role: Role) => call('member_set_role', { p_member: memberId, p_role: role }, 'SAVE_FAILED', none),
    remove: (memberId: string) => call('member_remove', { p_member: memberId }, 'SAVE_FAILED', none),
    cancelInvite: (inviteId: string) => call('invite_cancel', { p_invite: inviteId }, 'SAVE_FAILED', none),

    links: (clanId: string) =>
      call('link_list', { p_clan: clanId }, 'LOAD_FAILED', (data) =>
        ((data ?? []) as { id: string; tree_id: string | null; tree_name: string | null; expires_at: string; has_code: boolean; accepted_count: number; locked_until: string | null }[]).map(
          (r): InviteLink => ({ id: r.id, treeId: r.tree_id, treeName: r.tree_name, expiresAt: r.expires_at, hasCode: r.has_code, acceptedCount: r.accepted_count, lockedUntil: r.locked_until }),
        ),
      ),
    /** Trả mã link; chỉ có một lần, máy chủ chỉ giữ bản băm. */
    createLink: (clanId: string, treeId: string | null, days: 1 | 7 | 30, code: string | null) =>
      call('link_create', { p_clan: clanId, p_tree: treeId, p_days: days, p_code: code }, 'SAVE_FAILED', (data) => data as string),
    revokeLink: (linkId: string) => call('link_revoke', { p_link: linkId }, 'SAVE_FAILED', none),

    peek: (token: string) =>
      call('link_peek', { p_token: token }, 'LOAD_FAILED', (data) => {
        const d = data as { status: LinkStatus; clan_id?: string; clan_name?: string; tree_name?: string | null; has_code?: boolean }
        return { status: d.status, clanId: d.clan_id, clanName: d.clan_name, treeName: d.tree_name, hasCode: d.has_code } satisfies LinkPeek
      }),
    /** Nhận link: thành công trả dòng họ (và cuốn nếu link chỉ cho một cuốn); link hỏng hay sai mã mời thành lỗi tương ứng. */
    accept: async (token: string, code: string | null): Promise<Outcome<{ clanId: string; treeId: string | null }>> => {
      const r = await call('link_accept', { p_token: token, p_code: code }, 'SAVE_FAILED', (data) => data as { status: LinkStatus; clan_id?: string; tree_id?: string | null })
      if (!r.ok) return r
      const { status, clan_id, tree_id } = r.value
      return status === 'ok' && clan_id ? { ok: true, value: { clanId: clan_id, treeId: tree_id ?? null } } : { ok: false, error: LINK_ERROR[status === 'ok' ? 'invalid' : status] }
    },
  }
}

export type MemberStore = ReturnType<typeof memberStore>

// ---------- Mang mã link qua bước đăng nhập (design D6) ----------

const KEY = 'kt-invite'
const PREFIX = '#invite='

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>

/** Khi app mở: có `#invite=<mã>` thì cất vào sessionStorage (còn qua chuyển hướng Google) và xoá khỏi địa chỉ. */
export function captureInvite(loc: Pick<Location, 'hash' | 'pathname' | 'search'>, store: Storage, hist: Pick<History, 'replaceState' | 'state'>): void {
  if (!loc.hash.startsWith(PREFIX)) return
  const token = decodeURIComponent(loc.hash.slice(PREFIX.length)).trim()
  try {
    if (token) store.setItem(KEY, token)
  } catch {
    // Trình duyệt chặn storage: bỏ qua, người dùng mở lại link sau khi đăng nhập.
  }
  hist.replaceState(hist.state, '', loc.pathname + loc.search)
}

export function pendingInvite(store: Storage): string | null {
  try {
    return store.getItem(KEY)
  } catch {
    return null
  }
}

export function clearInvite(store: Storage): void {
  try {
    store.removeItem(KEY)
  } catch {
    // như trên
  }
}

export const inviteUrl = (origin: string, token: string) => `${origin}/${PREFIX}${token}`
