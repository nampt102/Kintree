import { addChild, updatePerson, type TreeDoc } from '@kintree/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, test } from 'vitest'
import { cloudStore, diffDocs, docToRows, isEmptyChange, mapError, rowsToDoc } from './cloudStore.ts'
import { idGen, ok, richDoc } from './testDocs.ts'

const roundTrip = (doc: TreeDoc) => {
  const r = docToRows(doc)
  return rowsToDoc(r.tree, r.persons, r.parents, r.marriages)
}

describe('hàng ↔ TreeDoc', () => {
  test('vòng đổi qua lại giữ mọi trường: ngày không đủ, âm lịch nhuận, người đã gỡ', () => {
    const doc = richDoc()
    const back = roundTrip(doc)
    expect(back).toEqual(doc)
    expect(back.persons.some((p) => p.removedAt)).toBe(true)
    expect(back.persons.find((p) => p.isRoot)?.birth).toEqual({ year: 2025, month: 6, lunar: true, leap: true })
    expect(back.persons.find((p) => p.isRoot)?.death).toEqual({ year: 2030, month: 5, day: 3, lunar: true })
  })

  test('thứ tự anh chị em và thứ tự vợ/chồng được giữ', () => {
    const doc = richDoc()
    const back = roundTrip(doc)
    expect(back.persons.map((p) => p.siblingOrder)).toEqual(doc.persons.map((p) => p.siblingOrder))
    expect(back.marriages.map((m) => m.wifeOrder)).toEqual(doc.marriages.map((m) => m.wifeOrder))
  })

  test('cột rỗng của cơ sở dữ liệu thành trường vắng, không phải chuỗi rỗng', () => {
    const r = docToRows(richDoc())
    const kid = r.persons.find((p) => p.full_name === 'Con một')!
    expect(kid.birth_year).toBeNull()
    expect(kid.removed_at).toBeNull()
    const back = rowsToDoc(r.tree, r.persons, r.parents, r.marriages)
    expect('birth' in back.persons.find((p) => p.id === kid.id)! && back.persons.find((p) => p.id === kid.id)!.birth).toBeFalsy()
  })
})

describe('diffDocs', () => {
  test('không đổi thì không có gì để gửi', () => {
    const doc = richDoc()
    expect(isEmptyChange(diffDocs(doc, doc))).toBe(true)
  })

  test('sửa một người chỉ gửi đúng dòng của người ấy', () => {
    const doc = richDoc()
    const kid = doc.persons.find((p) => p.fullName === 'Con một')!
    const next = ok(updatePerson(doc, kid.id, { birth: { year: 1930, lunar: false } })).doc
    const c = diffDocs(doc, next)
    expect(c.persons.map((p) => p.id)).toEqual([kid.id])
    expect(c.persons[0]!.birth_year).toBe(1930)
    expect(c.parents).toEqual([])
    expect(c.marriages).toEqual([])
    expect(c.tree).toBeNull()
  })

  test('thêm con: một người và hai quan hệ cha/mẹ', () => {
    const doc = richDoc()
    const root = doc.persons.find((p) => p.isRoot)!
    const wife = doc.persons.find((p) => p.fullName === 'Cụ Bà')!
    const next = ok(addChild(doc, { parentId: root.id, other: wife.id, person: { fullName: 'Con ba', gender: 'male' }, kind: 'biological' }, idGen())).doc
    const c = diffDocs(doc, next)
    expect(c.persons).toHaveLength(1)
    expect(c.parents).toHaveLength(2)
  })

  test('đổi tên cuốn gửi kèm thông tin cuốn', () => {
    const doc = richDoc()
    const c = diffDocs(doc, { ...doc, meta: { ...doc.meta, name: 'Tên mới' } })
    expect(c.tree?.name).toBe('Tên mới')
    expect(c.persons).toEqual([])
  })
})

describe('mapError', () => {
  test.each([
    [{ message: 'JWT expired', status: 401 }, 'NOT_SIGNED_IN'],
    [{ message: 'permission denied', code: '42501' }, 'FORBIDDEN'],
    [{ message: 'TypeError: Failed to fetch' }, 'OFFLINE'],
    [{ message: 'duplicate key', code: '23505' }, 'SAVE_FAILED'],
  ] as const)('%j → %s', (e, expected) => {
    expect(mapError(e, 'SAVE_FAILED')).toBe(expected)
  })
})

describe('cloudStore.save với client giả', () => {
  const fake = (rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: unknown }>) => ({ rpc }) as unknown as SupabaseClient

  test('gọi apply_tree_changes đúng một lần với các dòng đổi', async () => {
    const calls: { name: string; args: Record<string, unknown> }[] = []
    const store = cloudStore(fake(async (name, args) => (calls.push({ name, args }), { error: null })), 'u1')
    const doc = richDoc()
    const kid = doc.persons.find((p) => p.fullName === 'Con một')!
    const next = ok(updatePerson(doc, kid.id, { note: 'ghi chú' })).doc
    expect(await store.save(doc, next)).toEqual({ ok: true })
    expect(calls).toHaveLength(1)
    expect(calls[0]!.name).toBe('apply_tree_changes')
    expect((calls[0]!.args.p_persons as unknown[]).length).toBe(1)
  })

  test('không đổi gì thì không gọi mạng', async () => {
    let n = 0
    const store = cloudStore(fake(async () => (n++, { error: null })), 'u1')
    const doc = richDoc()
    expect(await store.save(doc, doc)).toEqual({ ok: true })
    expect(n).toBe(0)
  })

  test.each([
    [{ message: 'denied', code: '42501' }, 'FORBIDDEN'],
    [{ message: 'JWT expired', status: 401 }, 'NOT_SIGNED_IN'],
  ] as const)('lỗi %j → %s', async (error, expected) => {
    const store = cloudStore(fake(async () => ({ error })), 'u1')
    const doc = richDoc()
    const next = ok(updatePerson(doc, doc.persons[0]!.id, { note: 'x' })).doc
    expect(await store.save(doc, next)).toEqual({ ok: false, error: expected })
  })

  test('mất mạng (fetch ném lỗi) → OFFLINE', async () => {
    const store = cloudStore(fake(async () => { throw new TypeError('Failed to fetch') }), 'u1')
    const doc = richDoc()
    const next = ok(updatePerson(doc, doc.persons[0]!.id, { note: 'x' })).doc
    expect(await store.save(doc, next)).toEqual({ ok: false, error: 'OFFLINE' })
  })
})
