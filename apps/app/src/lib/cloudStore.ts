import type { PartialDate, Region, TreeDoc, TreeMarriage, TreeParentLink, TreePerson } from '@kintree/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { StoreError } from './messages.ts'

// ---------- Hàng cơ sở dữ liệu ----------

export type Role = 'admin' | 'viewer'

export type PersonRow = {
  id: string
  tree_id: string
  full_name: string
  gender: string
  is_outsider: boolean
  is_root: boolean
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
  birth_place: string | null
  burial_place: string | null
  biography: string | null
  note: string | null
  sibling_order: number | null
  removed_at: string | null
  removal_id: string | null
}
export type ParentRow = { parent_id: string; child_id: string; role: string; kind: string; removed_at: string | null; removal_id: string | null }
export type MarriageRow = { id: string; husband_id: string; wife_id: string; wife_order: number; removed_at: string | null; removal_id: string | null }
export type TreeRow = { id: string; clan_id?: string; name: string; description: string | null; region: string }

/** Các dòng đã đổi, gửi cho `apply_tree_changes`. `tree` là null khi thông tin cuốn không đổi. */
export type Changes = { tree: TreeRow | null; persons: PersonRow[]; parents: ParentRow[]; marriages: MarriageRow[] }

// ---------- Hàm thuần: hàng ↔ TreeDoc (không đụng mạng) ----------

const orUndef = <T>(v: T | null | undefined): T | undefined => v ?? undefined

function dateFrom(year: number | null, month: number | null, day: number | null, lunar: boolean, leap: boolean): PartialDate | undefined {
  if (year === null) return undefined
  const d: PartialDate = { year, lunar }
  if (month !== null) d.month = month
  if (day !== null) d.day = day
  if (leap) d.leap = true
  return d
}

function removal(r: { removed_at: string | null; removal_id: string | null }): { removedAt?: string; removalId?: string } {
  const out: { removedAt?: string; removalId?: string } = {}
  // Postgres trả `2026-10-26T01:02:03+00:00`; chuẩn hoá về dạng ISO của core để so sánh và tải bản sao không lệch chuỗi.
  if (r.removed_at !== null) out.removedAt = new Date(r.removed_at).toISOString()
  if (r.removal_id !== null) out.removalId = r.removal_id
  return out
}

export function rowsToDoc(tree: TreeRow, persons: PersonRow[], parents: ParentRow[], marriages: MarriageRow[]): TreeDoc {
  return {
    version: 1,
    meta: {
      id: tree.id,
      name: tree.name,
      ...(tree.description !== null ? { description: tree.description } : {}),
      region: tree.region as Region,
    },
    persons: persons.map((r): TreePerson => ({
      id: r.id,
      fullName: r.full_name,
      gender: r.gender as TreePerson['gender'],
      isOutsider: r.is_outsider,
      isRoot: r.is_root,
      birth: dateFrom(r.birth_year, r.birth_month, r.birth_day, r.birth_lunar, r.birth_leap),
      death: dateFrom(r.death_year, r.death_month, r.death_day, r.death_lunar, r.death_leap),
      birthPlace: orUndef(r.birth_place),
      burialPlace: orUndef(r.burial_place),
      biography: orUndef(r.biography),
      note: orUndef(r.note),
      siblingOrder: r.sibling_order ?? 0,
      ...removal(r),
    })),
    parents: parents.map((r): TreeParentLink => ({
      parentId: r.parent_id,
      childId: r.child_id,
      role: r.role as TreeParentLink['role'],
      kind: r.kind as TreeParentLink['kind'],
      ...removal(r),
    })),
    marriages: marriages.map((r): TreeMarriage => ({
      id: r.id,
      husbandId: r.husband_id,
      wifeId: r.wife_id,
      wifeOrder: r.wife_order,
      ...removal(r),
    })),
  }
}

const toRemoval = (r: { removedAt?: string; removalId?: string }) => ({ removed_at: r.removedAt ?? null, removal_id: r.removalId ?? null })

export function personRow(treeId: string, p: TreePerson): PersonRow {
  return {
    id: p.id,
    tree_id: treeId,
    full_name: p.fullName,
    gender: p.gender,
    is_outsider: p.isOutsider,
    is_root: p.isRoot,
    birth_year: p.birth?.year ?? null,
    birth_month: p.birth?.month ?? null,
    birth_day: p.birth?.day ?? null,
    birth_lunar: p.birth?.lunar ?? false,
    birth_leap: p.birth?.leap ?? false,
    death_year: p.death?.year ?? null,
    death_month: p.death?.month ?? null,
    death_day: p.death?.day ?? null,
    death_lunar: p.death?.lunar ?? false,
    death_leap: p.death?.leap ?? false,
    birth_place: p.birthPlace ?? null,
    burial_place: p.burialPlace ?? null,
    biography: p.biography ?? null,
    note: p.note ?? null,
    sibling_order: p.siblingOrder,
    ...toRemoval(p),
  }
}

export const parentRow = (l: TreeParentLink): ParentRow => ({ parent_id: l.parentId, child_id: l.childId, role: l.role, kind: l.kind, ...toRemoval(l) })
export const marriageRow = (m: TreeMarriage): MarriageRow => ({ id: m.id, husband_id: m.husbandId, wife_id: m.wifeId, wife_order: m.wifeOrder, ...toRemoval(m) })
export const treeRow = (doc: TreeDoc): TreeRow => ({ id: doc.meta.id, name: doc.meta.name, description: doc.meta.description ?? null, region: doc.meta.region })

export function docToRows(doc: TreeDoc): { tree: TreeRow; persons: PersonRow[]; parents: ParentRow[]; marriages: MarriageRow[] } {
  return {
    tree: treeRow(doc),
    persons: doc.persons.map((p) => personRow(doc.meta.id, p)),
    parents: doc.parents.map(parentRow),
    marriages: doc.marriages.map(marriageRow),
  }
}

function changedRows<T>(prev: T[], next: T[], key: (r: T) => string): T[] {
  const before = new Map(prev.map((r) => [key(r), JSON.stringify(r)]))
  return next.filter((r) => before.get(key(r)) !== JSON.stringify(r))
}

/** Chỉ những dòng khác bản đã lưu (hoặc mới). Core không xoá hẳn dòng nào nên không có phần "đã xoá". */
export function diffDocs(prev: TreeDoc, next: TreeDoc): Changes {
  const a = docToRows(prev)
  const b = docToRows(next)
  return {
    tree: JSON.stringify(a.tree) === JSON.stringify(b.tree) ? null : b.tree,
    persons: changedRows(a.persons, b.persons, (r) => r.id),
    parents: changedRows(a.parents, b.parents, (r) => `${r.parent_id}:${r.child_id}`),
    marriages: changedRows(a.marriages, b.marriages, (r) => r.id),
  }
}

export const isEmptyChange = (c: Changes): boolean => !c.tree && !c.persons.length && !c.parents.length && !c.marriages.length

// ---------- Lỗi ----------

type DbError = { message?: string; code?: string; status?: number } | null

/** Đổi lỗi PostgREST/fetch sang mã của giao diện (design D4). `fallback` là mã khi không rõ nguyên nhân. */
export function mapError(e: NonNullable<DbError>, fallback: StoreError): StoreError {
  if (e.status === 401 || e.code === 'PGRST301' || /jwt/i.test(e.message ?? '')) return 'NOT_SIGNED_IN'
  // Lỗi có tên do hàm trong cơ sở dữ liệu raise (migration clan_invites).
  const named = /\b(LAST_ADMIN|EMAIL_INVALID|CODE_TOO_SHORT|TREE_NOT_FOUND|NOT_PENDING)\b/.exec(e.message ?? '')
  if (named) return named[1] as StoreError
  if (e.code === '42501' || e.status === 403) return 'FORBIDDEN'
  if (!e.code && /fetch|network|load failed/i.test(e.message ?? '')) return 'OFFLINE'
  return fallback
}

// ---------- Phần gọi mạng ----------

/** `memberCount` chỉ có khi người dùng là quản trị dòng họ (người xem chỉ đọc được vai trò của mình). */
export type ClanInfo = { id: string; name: string; role: Role; memberCount?: number }
export type TreeInfo = { id: string; clanId: string; name: string; region: Region; description?: string; role: Role; personCount: number }
export type Directory = { clans: ClanInfo[]; trees: TreeInfo[] }

export type LoadResult = { ok: true; doc: TreeDoc; role: Role } | { ok: false; error: StoreError }
export type SaveResult = { ok: true } | { ok: false; error: StoreError }
export type Outcome<T> = { ok: true; value: T } | { ok: false; error: StoreError }

const PAGE = 1000
const higher = (a: Role | undefined, b: Role | undefined): Role | undefined => (a === 'admin' || b === 'admin' ? 'admin' : (a ?? b))

/** Đọc hết một bảng, từng trang 1.000 dòng (PostgREST giới hạn `max_rows`). */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: DbError }>): Promise<{ data: T[] } | { error: NonNullable<DbError> }> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) return { error }
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) return { data: out }
  }
}

const netError = (e: unknown): NonNullable<DbError> => ({ message: e instanceof Error ? e.message : 'network' })

export function cloudStore(client: SupabaseClient, userId: string) {
  const guard = async <T>(fn: () => Promise<Outcome<T>>, fallback: StoreError): Promise<Outcome<T>> => {
    try {
      return await fn()
    } catch (e) {
      return { ok: false, error: mapError(netError(e), fallback) }
    }
  }
  const fail = (e: NonNullable<DbError>, fallback: StoreError): { ok: false; error: StoreError } => ({ ok: false, error: mapError(e, fallback) })

  return {
    /** Dòng họ và cuốn người dùng thấy được, kèm vai trò (mức cao hơn của hai tầng). */
    directory: (): Promise<Outcome<Directory>> =>
      guard(async () => {
        const [mem, clans, trees] = await Promise.all([
          client.from('memberships').select('clan_id, tree_id, role').eq('user_id', userId),
          client.from('clans').select('id, name').order('name'),
          client.from('trees').select('id, clan_id, name, region, description').order('name'),
        ])
        const err = mem.error ?? clans.error ?? trees.error
        if (err) return fail(err, 'LOAD_FAILED')
        const clanRole = new Map<string, Role>()
        const treeRole = new Map<string, Role>()
        for (const m of mem.data ?? []) {
          if (m.clan_id) clanRole.set(m.clan_id, higher(clanRole.get(m.clan_id), m.role) as Role)
          if (m.tree_id) treeRole.set(m.tree_id, higher(treeRole.get(m.tree_id), m.role) as Role)
        }
        // Đếm (không tải dòng): số người còn hiện mỗi cuốn; số thành viên mỗi dòng họ mình quản trị.
        const countOf = async (q: PromiseLike<{ count: number | null; error: DbError }>) => {
          const r = await q
          if (r.error) throw Object.assign(new Error(r.error.message ?? 'count'), { db: r.error })
          return r.count ?? 0
        }
        const treeRows = trees.data ?? []
        const clanRows = clans.data ?? []
        let personCounts: number[]
        let memberCounts: (number | undefined)[]
        try {
          ;[personCounts, memberCounts] = await Promise.all([
            Promise.all(treeRows.map((t) => countOf(client.from('persons').select('id', { count: 'exact', head: true }).eq('tree_id', t.id).is('removed_at', null)))),
            Promise.all(
              clanRows.map((c) =>
                clanRole.get(c.id) === 'admin' ? countOf(client.from('memberships').select('id', { count: 'exact', head: true }).eq('clan_id', c.id)) : Promise.resolve(undefined),
              ),
            ),
          ])
        } catch (e) {
          return fail((e as { db?: NonNullable<DbError> }).db ?? netError(e), 'LOAD_FAILED')
        }
        return {
          ok: true,
          value: {
            clans: clanRows.map((c, i) => ({ id: c.id, name: c.name, role: clanRole.get(c.id) ?? 'viewer', ...(memberCounts[i] !== undefined ? { memberCount: memberCounts[i] } : {}) })),
            trees: treeRows.map((t, i) => ({
              id: t.id,
              clanId: t.clan_id,
              name: t.name,
              region: t.region as Region,
              ...(t.description ? { description: t.description } : {}),
              role: higher(clanRole.get(t.clan_id), treeRole.get(t.id)) ?? 'viewer',
              personCount: personCounts[i] ?? 0,
            })),
          },
        }
      }, 'LOAD_FAILED'),

    createTree: (clanId: string, name: string, region: Region, description?: string): Promise<Outcome<string>> =>
      guard(async () => {
        const { data, error } = await client.rpc('create_tree', { p_clan: clanId, p_name: name, p_region: region, p_description: description ?? null })
        if (error) return fail(error, 'SAVE_FAILED')
        return { ok: true, value: (data as { id: string }).id }
      }, 'SAVE_FAILED'),

    /** Sửa tên, vùng, mô tả của cuốn (chỉ quản trị; RLS cưỡng chế). */
    updateTreeInfo: (treeId: string, info: { name: string; region: Region; description?: string }): Promise<Outcome<null>> =>
      guard(async () => {
        const { data, error } = await client
          .from('trees')
          .update({ name: info.name, region: info.region, description: info.description?.trim() || null })
          .eq('id', treeId)
          .select('id')
        if (error) return fail(error, 'SAVE_FAILED')
        // RLS chặn thì không lỗi mà không có dòng nào đổi.
        if (!data?.length) return { ok: false, error: 'FORBIDDEN' }
        return { ok: true, value: null }
      }, 'SAVE_FAILED'),

    /** Xoá = đánh dấu `removed_at`; dữ liệu vẫn nằm trên máy chủ (không `.select()` vì sau khi xoá dòng không còn đọc được). */
    removeTree: (treeId: string): Promise<Outcome<null>> =>
      guard(async () => {
        const { error, count } = await client.from('trees').update({ removed_at: new Date().toISOString() }, { count: 'exact' }).eq('id', treeId)
        if (error) return fail(error, 'SAVE_FAILED')
        if (!count) return { ok: false, error: 'FORBIDDEN' }
        return { ok: true, value: null }
      }, 'SAVE_FAILED'),

    load: async (treeId: string): Promise<LoadResult> => {
      try {
        const tree = await client.from('trees').select('id, clan_id, name, description, region').eq('id', treeId).maybeSingle()
        if (tree.error) return fail(tree.error, 'LOAD_FAILED')
        if (!tree.data) return { ok: false, error: 'TREE_NOT_FOUND' }
        const persons = await fetchAll<PersonRow>((a, b) => client.from('persons').select('*').eq('tree_id', treeId).order('id').range(a, b))
        if ('error' in persons) return fail(persons.error, 'LOAD_FAILED')
        const parents = await fetchAll<ParentRow & { persons?: unknown }>((a, b) =>
          client.from('parent_child').select('parent_id, child_id, role, kind, removed_at, removal_id, persons!parent_child_child_id_fkey!inner(tree_id)').eq('persons.tree_id', treeId).order('child_id').order('parent_id').range(a, b),
        )
        if ('error' in parents) return fail(parents.error, 'LOAD_FAILED')
        const marriages = await fetchAll<MarriageRow & { persons?: unknown }>((a, b) =>
          client.from('marriages').select('id, husband_id, wife_id, wife_order, removed_at, removal_id, persons!marriages_husband_id_fkey!inner(tree_id)').eq('persons.tree_id', treeId).order('id').range(a, b),
        )
        if ('error' in marriages) return fail(marriages.error, 'LOAD_FAILED')
        const mem = await client.from('memberships').select('clan_id, tree_id, role').eq('user_id', userId)
        if (mem.error) return fail(mem.error, 'LOAD_FAILED')
        let role: Role | undefined
        for (const m of mem.data ?? []) if (m.clan_id === tree.data.clan_id || m.tree_id === treeId) role = higher(role, m.role)
        const strip = <T extends { persons?: unknown }>({ persons: _p, ...rest }: T) => rest
        return { ok: true, doc: rowsToDoc(tree.data, persons.data, parents.data.map(strip) as ParentRow[], marriages.data.map(strip) as MarriageRow[]), role: role ?? 'viewer' }
      } catch (e) {
        return { ok: false, error: mapError(netError(e), 'LOAD_FAILED') }
      }
    },

    /** Ghi các dòng đã đổi trong một giao dịch (`apply_tree_changes`). */
    save: async (prev: TreeDoc, next: TreeDoc): Promise<SaveResult> => {
      const c = diffDocs(prev, next)
      if (isEmptyChange(c)) return { ok: true }
      try {
        const { error } = await client.rpc('apply_tree_changes', { p_tree: c.tree, p_persons: c.persons, p_parents: c.parents, p_marriages: c.marriages })
        return error ? fail(error, 'SAVE_FAILED') : { ok: true }
      } catch (e) {
        return { ok: false, error: mapError(netError(e), 'SAVE_FAILED') }
      }
    },
  }
}

export type CloudStore = ReturnType<typeof cloudStore>
/** Giao diện `useTreeDoc` cần từ kho. */
export type TreeStore = Pick<CloudStore, 'load' | 'save'>

// ---------- Quản trị nền tảng ----------

export type PlatformClan = { id: string; name: string; slug: string; createdAt: string; adminEmails: string[] }

export function platformStore(client: SupabaseClient) {
  return {
    isPlatformAdmin: async (): Promise<boolean> => {
      try {
        const { data, error } = await client.rpc('is_platform_admin')
        return !error && data === true
      } catch {
        return false
      }
    },
    listClans: async (): Promise<Outcome<PlatformClan[]>> => {
      try {
        const { data, error } = await client.rpc('platform_list_clans')
        if (error) return { ok: false, error: mapError(error, 'LOAD_FAILED') }
        const rows = (data ?? []) as { id: string; name: string; slug: string; created_at: string; admin_emails: string[] }[]
        return { ok: true, value: rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug, createdAt: r.created_at, adminEmails: r.admin_emails })) }
      } catch (e) {
        return { ok: false, error: mapError(netError(e), 'LOAD_FAILED') }
      }
    },
    createClan: async (name: string, adminEmail: string): Promise<Outcome<null> | { ok: false; error: 'NAME_REQUIRED' | 'EMAIL_INVALID' }> => {
      try {
        const { error } = await client.rpc('platform_create_clan', { p_name: name, p_admin_email: adminEmail })
        if (!error) return { ok: true, value: null }
        if (/NAME_REQUIRED/.test(error.message)) return { ok: false, error: 'NAME_REQUIRED' }
        if (/EMAIL_INVALID/.test(error.message)) return { ok: false, error: 'EMAIL_INVALID' }
        return { ok: false, error: mapError(error, 'SAVE_FAILED') }
      } catch (e) {
        return { ok: false, error: mapError(netError(e), 'SAVE_FAILED') }
      }
    },
    /** Chỉ quản trị cấp dòng họ (đã vào và đang chờ); không có người xem (design D3). */
    listClanAdmins: async (clanId: string): Promise<Outcome<PlatformClanAdmin[]>> => {
      try {
        const { data, error } = await client.rpc('platform_list_clan_admins', { p_clan: clanId })
        if (error) return { ok: false, error: mapError(error, 'LOAD_FAILED') }
        return { ok: true, value: (data ?? []) as PlatformClanAdmin[] }
      } catch (e) {
        return { ok: false, error: mapError(netError(e), 'LOAD_FAILED') }
      }
    },
    addClanAdmin: async (clanId: string, email: string): Promise<Outcome<'added' | 'pending'>> => {
      try {
        const { data, error } = await client.rpc('platform_add_clan_admin', { p_clan: clanId, p_email: email })
        if (error) return { ok: false, error: mapError(error, 'SAVE_FAILED') }
        return { ok: true, value: data as 'added' | 'pending' }
      } catch (e) {
        return { ok: false, error: mapError(netError(e), 'SAVE_FAILED') }
      }
    },
    removeClanAdmin: async (admin: Pick<PlatformClanAdmin, 'kind' | 'id'>): Promise<Outcome<null>> => {
      try {
        const { error } = await client.rpc('platform_remove_clan_admin', { p_kind: admin.kind, p_id: admin.id })
        if (error) return { ok: false, error: mapError(error, 'SAVE_FAILED') }
        return { ok: true, value: null }
      } catch (e) {
        return { ok: false, error: mapError(netError(e), 'SAVE_FAILED') }
      }
    },
  }
}

export type PlatformClanAdmin = { kind: 'member' | 'invite'; id: string; email: string }

export type PlatformStore = ReturnType<typeof platformStore>
