import { addChild, addRoot, addSpouse, createTree, findPerson, updatePerson, type Result, type TreeDoc } from '@kintree/core'
import { describe, expect, it } from 'vitest'
import { mockExtract } from '../../../../supabase/functions/_shared/mock.ts'
import { validateOutput } from '../../../../supabase/functions/_shared/schema.ts'
import { planAccept, planMerge, rejectFields, relationsFor, reviewChanges, type Proposal } from './proposals.ts'
import { effectiveStatus, fitSize, isAcceptedImage } from './sourceStore.ts'

const ok = <T extends object>(r: Result<T>): Extract<Result<T>, { ok: true }> => {
  if (!r.ok) throw new Error(r.error)
  return r
}
const counter = () => {
  let n = 0
  return () => `00000000-0000-0000-0000-${String(++n).padStart(12, '0')}`
}

/** Cuốn nhỏ: Cả (thuỷ tổ, sinh 1890) + Bình (vợ), con An. */
function tree() {
  const newId = counter()
  let doc: TreeDoc = ok(createTree({ name: 'Chi trưởng', region: 'north' }, newId)).doc
  const root = ok(addRoot(doc, { fullName: 'Nguyễn Văn Cả', gender: 'male' }, newId))
  doc = ok(updatePerson(root.doc, root.id, { birth: { year: 1890, lunar: false } })).doc
  const wife = ok(addSpouse(doc, { personId: root.id, person: { fullName: 'Trần Thị Bình' } }, newId))
  const son = ok(addChild(wife.doc, { parentId: root.id, person: { fullName: 'Nguyễn Văn An', gender: 'male' }, kind: 'biological' }, newId))
  return { doc: son.doc, root: root.id, wife: wife.id, son: son.id, newId }
}

/** Đề xuất của bộ giả lập đã qua kiểm, thành bản ghi như máy chủ ghi. */
function mockProposals(doc: TreeDoc, rootId: string): Proposal[] {
  const people = doc.persons.map((p) => ({ id: p.id, fullName: p.fullName, gender: p.gender, birthYear: p.birth?.year, isRoot: p.isRoot }))
  const checked = validateOutput(mockExtract(people), people)
  if (!checked.ok) throw new Error(checked.error)
  void rootId
  return checked.rows.map((r, i) => ({
    id: `pr${i}`, source_id: 's1', op: r.op, payload: r.payload, anchor: r.anchor as Proposal['anchor'], ref: r.ref, quote: r.quote, status: 'pending', provider: 'mock', model: 'mock-1', edited: false, review_note: null, result_person_id: null, created_at: '',
  }))
}

describe('nhận đề xuất sửa trường', () => {
  it('ghi giá trị và nguồn của trường', () => {
    const t = tree()
    const all = mockProposals(t.doc, t.root)
    const p = all.find((x) => x.op === 'update_field')!
    const plan = planAccept(t.doc, p, all, t.newId)
    expect(plan.ok).toBe(true)
    if (plan.ok) {
      expect(findPerson(plan.doc, t.root)?.burialPlace).toBe('Nghĩa trang làng')
      expect(plan.fields).toEqual([{ person_id: t.root, field: 'burialPlace', value: 'Nghĩa trang làng', anchor: p.anchor }])
    }
  })

  it('sửa rồi nhận: dùng giá trị người duyệt nhập', () => {
    const t = tree()
    const all = mockProposals(t.doc, t.root)
    const p = all.find((x) => x.op === 'update_field')!
    const plan = planAccept(t.doc, p, all, t.newId, { value: 'Nghĩa địa họ' })
    expect(plan.ok && findPerson(plan.doc, t.root)?.burialPlace).toBe('Nghĩa địa họ')
  })

  it('giá trị không hợp lệ thành lỗi của core', () => {
    const t = tree()
    const all = mockProposals(t.doc, t.root)
    const p = { ...all.find((x) => x.op === 'update_field')!, payload: { personId: t.root, field: 'birth', value: { year: 1700, lunar: false } } }
    const plan = planAccept(t.doc, p, all, t.newId)
    expect(plan).toEqual({ ok: false, error: 'INVALID_DATE' })
  })
})

describe('nhận đề xuất thêm người', () => {
  it('nhận kèm quan hệ gắn vào cây: người mới là con của thuỷ tổ, ngày âm lịch được ghi', () => {
    const t = tree()
    const all = mockProposals(t.doc, t.root)
    const p = all.find((x) => x.ref === 'p1')!
    const plan = planAccept(t.doc, p, all, t.newId)
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const created = findPerson(plan.doc, plan.resultPersonId!)!
    expect(created.fullName).toBe('Nguyễn Văn Thử')
    expect(created.death).toEqual({ year: 1953, month: 3, day: 5, lunar: true })
    expect(plan.doc.parents.some((l) => l.childId === created.id && l.parentId === t.root)).toBe(true)
    expect(plan.also).toEqual([all.find((x) => x.op === 'add_relation')!.id])
    expect(plan.fields.map((f) => f.field)).toEqual(['fullName', 'gender', 'birth', 'death'])
    expect(plan.fields.every((f) => f.person_id === created.id)).toBe(true)
  })

  it('người không có quan hệ đi kèm: cần gắn vào cây; sửa rồi nhận chọn nơi gắn', () => {
    const t = tree()
    const all = mockProposals(t.doc, t.root)
    const p = all.find((x) => x.ref === 'p2')!
    expect(planAccept(t.doc, p, all, t.newId)).toEqual({ ok: false, error: 'NEEDS_ATTACH' })
    const plan = planAccept(t.doc, p, all, t.newId, { attach: { kind: 'child', parentId: t.son, other: null } })
    expect(plan.ok).toBe(true)
  })

  it('quan hệ chờ người chưa nhận: cần nhận người trước', () => {
    const t = tree()
    const all = mockProposals(t.doc, t.root)
    const rel = all.find((x) => x.op === 'add_relation')!
    expect(planAccept(t.doc, rel, all, t.newId)).toEqual({ ok: false, error: 'NEEDS_PERSON', pendingRef: 'p1' })
  })

  it('lỗi ràng buộc của cây được báo (dâu/rể không tự thêm con)', () => {
    const t = tree()
    const all = mockProposals(t.doc, t.root)
    const p = all.find((x) => x.ref === 'p2')!
    const plan = planAccept(t.doc, p, all, t.newId, { attach: { kind: 'child', parentId: t.wife } })
    expect(plan).toEqual({ ok: false, error: 'OUTSIDER_CANNOT_PARENT' })
  })

  it('relationsFor chỉ lấy quan hệ nối người này với người đã có', () => {
    const t = tree()
    const all = mockProposals(t.doc, t.root)
    expect(relationsFor(t.doc, all.find((x) => x.ref === 'p1')!, all)).toHaveLength(1)
    expect(relationsFor(t.doc, all.find((x) => x.ref === 'p2')!, all)).toHaveLength(0)
  })
})

describe('gộp vào người đã có', () => {
  it('trường còn trống ghi luôn, trường khác giá trị thành đề xuất mới, không tạo người', () => {
    const t = tree()
    const all = mockProposals(t.doc, t.root)
    const p = all.find((x) => x.ref === 'p2')!
    // Thuỷ tổ đã có họ tên và năm sinh giống; nơi sinh còn trống → ghi; thêm giá trị khác ở sinh để sinh đề xuất con.
    const withPlace = { ...p, payload: { ...p.payload, birth: { year: 1891, lunar: false } } }
    const plan = planMerge(t.doc, withPlace, t.root)
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.doc.persons).toHaveLength(t.doc.persons.length)
    expect(findPerson(plan.doc, t.root)?.birthPlace).toBe('Làng Cổ')
    expect(plan.fields.map((f) => f.field)).toEqual(['birthPlace'])
    expect(plan.children).toEqual([{ op: 'update_field', payload: { personId: t.root, field: 'birth', value: { year: 1891, lunar: false } }, anchor: p.anchor, quote: p.quote }])
    expect(plan.resultPersonId).toBe(t.root)
  })

  it('trùng giá trị thì không làm gì thêm', () => {
    const t = tree()
    const all = mockProposals(t.doc, t.root)
    const p = { ...all.find((x) => x.ref === 'p2')!, payload: { ref: 'p2', fullName: 'Nguyễn Văn Cả', gender: 'male', birth: { year: 1890, lunar: false } } }
    const plan = planMerge(t.doc, p, t.root)
    expect(plan.ok && plan.fields).toEqual([])
    expect(plan.ok && plan.children).toEqual([])
  })
})

describe('bỏ và ghi lên máy chủ', () => {
  it('bỏ đề xuất sửa trường vẫn lưu nguồn không chọn kèm ghi chú', () => {
    const t = tree()
    const all = mockProposals(t.doc, t.root)
    const p = all.find((x) => x.op === 'update_field')!
    expect(rejectFields(p, 'đọc nhầm')).toEqual([{ person_id: t.root, field: 'burialPlace', value: 'Nghĩa trang làng', anchor: p.anchor, accepted: false, note: 'đọc nhầm' }])
    expect(rejectFields(all.find((x) => x.op === 'add_person')!, null)).toEqual([])
  })

  it('reviewChanges chỉ gửi các dòng đã đổi và danh sách đề xuất nhận chung', () => {
    const t = tree()
    const all = mockProposals(t.doc, t.root)
    const plan = planAccept(t.doc, all.find((x) => x.ref === 'p1')!, all, t.newId)
    if (!plan.ok) throw new Error('plan')
    const c = reviewChanges(t.doc, plan)!
    expect(c.persons).toHaveLength(1)
    expect(c.parents).toHaveLength(2) // cha (thuỷ tổ) và mẹ (vợ của thuỷ tổ)
    expect(c.also).toEqual(['pr1'])
  })
})

describe('ảnh tư liệu', () => {
  it('fitSize: cạnh dài tối đa 2048, giữ tỉ lệ, không phóng to', () => {
    expect(fitSize(4000, 3000)).toEqual({ width: 2048, height: 1536 })
    expect(fitSize(3000, 4000)).toEqual({ width: 1536, height: 2048 })
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('chỉ nhận JPEG, PNG, WebP', () => {
    expect(['image/jpeg', 'image/png', 'image/webp'].every(isAcceptedImage)).toBe(true)
    expect(isAcceptedImage('application/pdf')).toBe(false)
    expect(isAcceptedImage('image/gif')).toBe(false)
  })

  it('đang đọc quá 5 phút thì coi là lỗi để đọc lại', () => {
    const now = Date.parse('2026-10-28T10:10:00Z')
    expect(effectiveStatus({ status: 'processing', statusAt: '2026-10-28T10:08:00Z' }, now)).toBe('processing')
    expect(effectiveStatus({ status: 'processing', statusAt: '2026-10-28T10:00:00Z' }, now)).toBe('failed')
    expect(effectiveStatus({ status: 'done', statusAt: '2026-10-28T09:00:00Z' }, now)).toBe('done')
  })
})
