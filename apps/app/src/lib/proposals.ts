// Thông dịch đề xuất của AI thành thao tác của `core` (change ai-image-proposals, design D6).
// Hàm thuần: nhận cây, trả cây mới + việc phải ghi kèm (nguồn từng trường, quan hệ nhận chung, đề xuất con khi gộp) hoặc mã lỗi.
// AI không bao giờ ghi vào cây: mọi thay đổi đi qua đúng các luật của `core` như khi người gõ tay.
import {
  addChild,
  addMissingParent,
  addSpouse,
  findPerson,
  linkParent,
  updatePerson,
  type EditError,
  type Gender,
  type NewId,
  type ParentRole,
  type PartialDate,
  type PersonPatch,
  type TreeDoc,
} from '@kintree/core'
import type { Field } from '../../../../supabase/functions/_shared/schema.ts'
import { diffDocs, type Changes } from './cloudStore.ts'

export type Anchor = { x: number; y: number; w: number; h: number }
export type ProposalOp = 'add_person' | 'update_field' | 'add_relation'
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'superseded'

export type Proposal = {
  id: string
  source_id: string | null
  op: ProposalOp
  payload: Record<string, unknown>
  anchor: Anchor | null
  ref: string | null
  quote: string | null
  status: ProposalStatus
  provider: string | null
  model: string | null
  edited: boolean
  review_note: string | null
  result_person_id: string | null
  created_at: string
}

export type ProposalError = EditError | 'NEEDS_ATTACH' | 'NEEDS_PERSON' | 'UNSUPPORTED_RELATION'

export type FieldRecord = { person_id: string; field: Field; value: unknown; anchor: Anchor | null; accepted?: boolean; note?: string }
export type ChildProposal = { op: 'update_field'; payload: { personId: string; field: Field; value: unknown }; anchor: Anchor | null; quote: string | null }

export type Plan =
  | { ok: true; doc: TreeDoc; resultPersonId: string | null; fields: FieldRecord[]; also: string[]; children: ChildProposal[] }
  | { ok: false; error: ProposalError; pendingRef?: string }

/** Nơi gắn một người mới vào cây khi đề xuất không có quan hệ đi kèm (hoặc người duyệt chọn lại). */
export type Attach =
  | { kind: 'child'; parentId: string; other?: string | null; parentRole?: ParentRole }
  | { kind: 'parent'; childId: string }
  | { kind: 'spouse'; personId: string }

/** Giá trị người duyệt đã sửa ("Sửa rồi nhận"). */
export type Edits = { person?: Partial<Record<Exclude<Field, never>, unknown>>; value?: unknown; attach?: Attach }

const FIELD_KEYS: Field[] = ['birth', 'death', 'birthPlace', 'burialPlace', 'biography']

type Ref = { personId: string } | { ref: string }
const refOf = (v: unknown): Ref | null => {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (typeof o.personId === 'string') return { personId: o.personId }
  if (typeof o.ref === 'string') return { ref: o.ref }
  return null
}

/** Quan hệ chờ nối người trong đề xuất này (theo mã tạm) với một người đã có trong cây. */
export function relationsFor(doc: TreeDoc, p: Proposal, all: readonly Proposal[]): Proposal[] {
  if (!p.ref) return []
  return all.filter((r) => {
    if (r.status !== 'pending' || r.op !== 'add_relation' || r.source_id !== p.source_id) return false
    const from = refOf(r.payload.from)
    const to = refOf(r.payload.to)
    const mine = (x: Ref | null) => !!x && 'ref' in x && x.ref === p.ref
    const other = mine(from) ? to : mine(to) ? from : null
    return !!other && 'personId' in other && !!findPerson(doc, other.personId)
  })
}

function attachFrom(rel: Proposal, ref: string): Attach | null {
  const from = refOf(rel.payload.from)
  const to = refOf(rel.payload.to)
  if (!from || !to) return null
  const type = rel.payload.type
  const role = rel.payload.role === 'father' || rel.payload.role === 'mother' ? (rel.payload.role as ParentRole) : undefined
  const isRef = (x: Ref) => 'ref' in x && x.ref === ref
  if (type === 'parent') {
    if (isRef(to) && 'personId' in from) return { kind: 'child', parentId: from.personId, parentRole: role }
    if (isRef(from) && 'personId' in to) return { kind: 'parent', childId: to.personId }
  }
  if (type === 'spouse') {
    if (isRef(to) && 'personId' in from) return { kind: 'spouse', personId: from.personId }
    if (isRef(from) && 'personId' in to) return { kind: 'spouse', personId: to.personId }
  }
  return null
}

/** Phần hồ sơ của một đề xuất thêm người (đã chồng giá trị người duyệt sửa) ngoài họ tên và giới tính. */
function personData(p: Proposal, edits?: Edits): { fullName: string; gender: Gender; patch: PersonPatch; fields: FieldRecord[] } {
  const src = { ...p.payload, ...(edits?.person ?? {}) } as Record<string, unknown>
  const gender = (src.gender === 'male' || src.gender === 'female' ? src.gender : 'unknown') as Gender
  const patch: PersonPatch = {}
  const fields: FieldRecord[] = []
  const rec = (field: Field, value: unknown) => fields.push({ person_id: '', field, value, anchor: p.anchor })
  rec('fullName', src.fullName)
  if (gender !== 'unknown') rec('gender', gender)
  for (const k of FIELD_KEYS) {
    if (src[k] === undefined || src[k] === null) continue
    ;(patch as Record<string, unknown>)[k] = src[k]
    rec(k, src[k])
  }
  return { fullName: String(src.fullName ?? ''), gender, patch, fields }
}

const fail = (error: ProposalError, pendingRef?: string): Plan => ({ ok: false, error, ...(pendingRef ? { pendingRef } : {}) })

/** Kết quả nếu nhận đề xuất `p` (có thể kèm sửa). Lỗi ràng buộc của `core` thành mã lỗi để hàng chờ báo lý do. */
export function planAccept(doc: TreeDoc, p: Proposal, all: readonly Proposal[], newId: NewId, edits?: Edits): Plan {
  if (p.op === 'update_field') {
    const personId = String(p.payload.personId)
    const field = p.payload.field as Field
    const value = edits?.value !== undefined ? edits.value : p.payload.value
    const r = updatePerson(doc, personId, { [field]: value } as PersonPatch)
    if (!r.ok) return fail(r.error)
    return { ok: true, doc: r.doc, resultPersonId: null, fields: [{ person_id: personId, field, value, anchor: p.anchor }], also: [], children: [] }
  }

  if (p.op === 'add_person') {
    const data = personData(p, edits)
    let attach = edits?.attach ?? null
    let rel: Proposal | undefined
    if (!attach) {
      for (const r of relationsFor(doc, p, all)) {
        attach = attachFrom(r, p.ref ?? '')
        if (attach) {
          rel = r
          break
        }
      }
    }
    if (!attach) return fail('NEEDS_ATTACH')
    const person = { fullName: data.fullName, gender: data.gender === 'unknown' ? undefined : data.gender }
    const added =
      attach.kind === 'child'
        ? addChild(doc, { parentId: attach.parentId, person, kind: 'biological', ...(attach.other !== undefined ? { other: attach.other } : {}), ...(attach.parentRole ? { parentRole: attach.parentRole } : {}) }, newId)
        : attach.kind === 'parent'
          ? addMissingParent(doc, { childId: attach.childId, person }, newId)
          : addSpouse(doc, { personId: attach.personId, person }, newId)
    if (!added.ok) return fail(added.error)
    let next = added.doc
    if (Object.keys(data.patch).length > 0) {
      const u = updatePerson(next, added.id, data.patch)
      if (!u.ok) return fail(u.error)
      next = u.doc
    }
    return { ok: true, doc: next, resultPersonId: added.id, fields: data.fields.map((f) => ({ ...f, person_id: added.id })), also: rel ? [rel.id] : [], children: [] }
  }

  // add_relation giữa hai người đã có trong cây.
  const from = refOf(p.payload.from)
  const to = refOf(p.payload.to)
  if (!from || !to) return fail('NOT_FOUND')
  const pending = [from, to].find((x) => 'ref' in x)
  if (pending && 'ref' in pending) return fail('NEEDS_PERSON', pending.ref)
  if (p.payload.type !== 'parent') return fail('UNSUPPORTED_RELATION')
  const role = p.payload.role === 'father' || p.payload.role === 'mother' ? (p.payload.role as ParentRole) : undefined
  const linked = linkParent(doc, { parentId: (from as { personId: string }).personId, childId: (to as { personId: string }).personId, kind: 'biological', role })
  if (!linked.ok) return fail(linked.error)
  return { ok: true, doc: linked.doc, resultPersonId: null, fields: [], also: [], children: [] }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Gộp đề xuất thêm người vào người đã có `targetId` (design D6): trường X còn trống thì ghi luôn; trường đã có mà khác giá trị
 * thành đề xuất sửa trường mới chờ duyệt (không ghi đè); trùng giá trị thì bỏ qua. Không tạo người mới.
 */
export function planMerge(doc: TreeDoc, p: Proposal, targetId: string, edits?: Edits): Plan {
  if (p.op !== 'add_person') return fail('NOT_FOUND')
  const target = findPerson(doc, targetId)
  if (!target) return fail('NOT_FOUND')
  const data = personData(p, edits)
  const patch: PersonPatch = {}
  const fields: FieldRecord[] = []
  const children: ChildProposal[] = []
  const consider = (field: Field, incoming: unknown, current: unknown, apply: () => void) => {
    if (incoming === undefined || incoming === null) return
    if (current === undefined || current === '' || current === 'unknown') {
      apply()
      fields.push({ person_id: targetId, field, value: incoming, anchor: p.anchor })
    } else if (!same(incoming, current)) {
      children.push({ op: 'update_field', payload: { personId: targetId, field, value: incoming }, anchor: p.anchor, quote: p.quote })
    }
  }
  if (data.gender !== 'unknown') consider('gender', data.gender, target.gender, () => (patch.gender = data.gender))
  for (const k of FIELD_KEYS) {
    const incoming = (data.patch as Record<string, unknown>)[k]
    consider(k, incoming, (target as Record<string, unknown>)[k], () => ((patch as Record<string, unknown>)[k] = incoming as PartialDate | string))
  }
  let next = doc
  if (Object.keys(patch).length > 0) {
    const u = updatePerson(doc, targetId, patch)
    if (!u.ok) return fail(u.error)
    next = u.doc
  }
  return { ok: true, doc: next, resultPersonId: targetId, fields, also: [], children }
}

/** Nguồn không chọn khi bỏ một đề xuất sửa trường: còn đó để xem hai nguồn mâu thuẫn (spec "Nguồn của từng trường"). */
export function rejectFields(p: Proposal, note: string | null): FieldRecord[] {
  if (p.op !== 'update_field') return []
  return [{ person_id: String(p.payload.personId), field: p.payload.field as Field, value: p.payload.value, anchor: p.anchor, accepted: false, ...(note ? { note } : {}) }]
}

/** Dữ liệu gửi `review_proposal`: thay đổi cây (so bản đã xác nhận với bản mới) + đề xuất nhận chung. */
export function reviewChanges(prev: TreeDoc, plan: Extract<Plan, { ok: true }>): (Changes & { also: string[] }) | null {
  const changes = diffDocs(prev, plan.doc)
  if (!changes.tree && !changes.persons.length && !changes.parents.length && !changes.marriages.length && plan.also.length === 0) return null
  return { ...changes, also: plan.also }
}
