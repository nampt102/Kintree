import { addChild, addRoot, createTree, removeBranch, serialize, type EditError, type Result, type TreeDoc } from '@kintree/core'
import { describe, expect, test } from 'vitest'
import { MESSAGES, messageFor } from './messages.ts'
import { backupFileName, localStorageStore } from './store.ts'

function fakeStorage(limit = Infinity) {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      const size = [...data.entries()].reduce((s, [key, val]) => s + (key === k ? 0 : key.length + val.length), 0) + k.length + v.length
      if (size > limit) throw new DOMException('full', 'QuotaExceededError')
      data.set(k, v)
    },
  }
}

const idGen = () => {
  let n = 0
  return () => `id${++n}`
}

function ok<T extends object>(r: Result<T>): Extract<Result<T>, { ok: true }> {
  if (!r.ok) throw new Error(r.error)
  return r
}

function smallDoc(): TreeDoc {
  const newId = idGen()
  let doc = ok(createTree({ name: 'Chi trưởng', region: 'south' }, newId)).doc
  const root = ok(addRoot(doc, { fullName: 'Cụ Tổ', gender: 'male' }, newId))
  doc = root.doc
  doc = ok(addChild(doc, { parentId: root.id, person: { fullName: 'Con', gender: 'male' }, kind: 'biological' }, newId)).doc
  return doc
}

describe('TreeStore bằng localStorage', () => {
  test('ghi rồi đọc giữ nguyên, danh sách có cuốn vừa lưu', async () => {
    const store = localStorageStore(fakeStorage(), () => '2026-10-26T00:00:00.000Z')
    const doc = smallDoc()
    expect(await store.save(doc)).toEqual({ ok: true })
    expect(await store.list()).toEqual([{ id: doc.meta.id, name: 'Chi trưởng', region: 'south', updatedAt: '2026-10-26T00:00:00.000Z' }])
    const loaded = await store.load(doc.meta.id)
    expect(loaded.ok && loaded.doc).toEqual(doc)
  })

  test('lưu lại không nhân đôi danh sách; cuốn thứ hai tách riêng', async () => {
    const store = localStorageStore(fakeStorage())
    const a = smallDoc()
    const b = { ...smallDoc(), meta: { ...smallDoc().meta, id: 'khac', name: 'Chi hai' } }
    await store.save(a)
    await store.save(a)
    await store.save(b)
    expect((await store.list()).map((t) => t.name).sort()).toEqual(['Chi hai', 'Chi trưởng'])
  })

  test('nhánh đã gỡ vẫn còn trong dữ liệu lưu', async () => {
    const store = localStorageStore(fakeStorage())
    const doc = smallDoc()
    const child = doc.persons.find((p) => !p.isRoot)!
    const removed = ok(removeBranch(doc, child.id, '2026-10-26T00:00:00.000Z', idGen())).doc
    await store.save(removed)
    const loaded = await store.load(doc.meta.id)
    expect(loaded.ok && loaded.doc.persons.some((p) => p.removedAt)).toBe(true)
  })

  test('dữ liệu hỏng: báo lỗi và không xoá', async () => {
    const kv = fakeStorage()
    kv.setItem('kintree:doc:x', '{{{ hỏng')
    const store = localStorageStore(kv)
    expect(await store.load('x')).toEqual({ ok: false, error: 'CORRUPT' })
    expect(kv.getItem('kintree:doc:x')).toBe('{{{ hỏng')
  })

  test('không có cuốn', async () => {
    expect(await localStorageStore(fakeStorage()).load('nope')).toEqual({ ok: false, error: 'NOT_FOUND' })
  })

  test('đầy bộ nhớ: báo STORAGE_FULL, bản cũ còn nguyên', async () => {
    const doc = smallDoc()
    const kv = fakeStorage(serialize(doc).length + 400)
    const store = localStorageStore(kv)
    await store.save(doc)
    const before = kv.getItem(`kintree:doc:${doc.meta.id}`)
    const bigger = { ...doc, persons: [...doc.persons, ...Array.from({ length: 200 }, (_, i) => ({ ...doc.persons[0]!, id: `p${i}`, isRoot: false }))] }
    expect(await store.save(bigger)).toEqual({ ok: false, error: 'STORAGE_FULL' })
    expect(kv.getItem(`kintree:doc:${doc.meta.id}`)).toBe(before)
  })

  test('tên tệp bản sao', () => {
    expect(backupFileName(smallDoc(), new Date('2026-10-26T10:00:00Z'))).toBe('chi-truong-2026-10-26.json')
  })
})

describe('bảng dịch mã lỗi', () => {
  test('mọi mã đều có câu tiếng Việt không rỗng', () => {
    for (const [code, text] of Object.entries(MESSAGES)) expect(text.trim().length, code).toBeGreaterThan(10)
  })

  test('mã lỗi của core đều có mặt', () => {
    const sample: EditError = 'HAS_CHILDREN'
    expect(messageFor(sample)).toContain('gỡ')
  })
})
