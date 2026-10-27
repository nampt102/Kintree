import { updatePerson, type TreeDoc } from '@kintree/core'
import { describe, expect, test } from 'vitest'
import type { SaveResult } from '../lib/cloudStore.ts'
import type { StoreError } from '../lib/messages.ts'
import { ok, richDoc } from '../lib/testDocs.ts'
import { createSaveQueue } from './saveQueue.ts'

const note = (doc: TreeDoc, text: string) => ok(updatePerson(doc, doc.persons[0]!.id, { note: text })).doc

function harness(results: SaveResult[]) {
  const saves: { prev: TreeDoc; next: TreeDoc }[] = []
  const events: string[] = []
  const store = {
    save: async (prev: TreeDoc, next: TreeDoc) => {
      saves.push({ prev, next })
      await Promise.resolve()
      return results.shift() ?? { ok: true as const }
    },
  }
  const base = richDoc()
  const rolled: { doc: TreeDoc; error: StoreError }[] = []
  const q = createSaveQueue(store, base, { saved: () => events.push('saved'), rollback: (doc, error) => (rolled.push({ doc, error }), events.push('rollback')) })
  return { q, base, saves, events, rolled }
}

describe('hàng đợi ghi', () => {
  test('hai thao tác liền nhau: ghi đúng thứ tự, lần sau dựa trên lần trước', async () => {
    const { q, base, saves } = harness([])
    const one = note(base, 'một')
    const two = note(one, 'hai')
    q.push(one)
    q.push(two)
    await q.idle()
    expect(saves).toHaveLength(2)
    expect(saves[0]!.prev).toBe(base)
    expect(saves[0]!.next).toBe(one)
    expect(saves[1]!.prev).toBe(one)
    expect(saves[1]!.next).toBe(two)
    expect(q.confirmed()).toBe(two)
  })

  test('ghi lỗi: hoàn về bản đã xác nhận, lần sau đang chờ bị huỷ (không ghi trên nền sai)', async () => {
    const { q, base, saves, rolled } = harness([{ ok: false, error: 'OFFLINE' }])
    const one = note(base, 'một')
    const two = note(one, 'hai')
    q.push(one)
    q.push(two)
    await q.idle()
    expect(saves).toHaveLength(1)
    expect(rolled).toEqual([{ doc: base, error: 'OFFLINE' }])
    expect(q.confirmed()).toBe(base)
  })

  test('sau khi hoàn lại, thao tác mới ghi bình thường trên bản đã xác nhận', async () => {
    const { q, base, saves } = harness([{ ok: false, error: 'FORBIDDEN' }])
    q.push(note(base, 'một'))
    await q.idle()
    const again = note(base, 'ba')
    q.push(again)
    await q.idle()
    expect(saves).toHaveLength(2)
    expect(saves[1]!.prev).toBe(base)
    expect(q.confirmed()).toBe(again)
  })

  test('cancel bỏ các lần ghi đang chờ', async () => {
    const { q, base, saves } = harness([])
    q.push(note(base, 'một'))
    q.cancel()
    await q.idle()
    expect(saves).toHaveLength(0)
  })
})
