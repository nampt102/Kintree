import { addChild, addRoot, addSpouse, createTree, removeBranch, updatePerson, type Result, type TreeDoc } from '@kintree/core'

/** Dữ liệu dùng chung cho các test của lớp lưu (không đưa vào bản build: chỉ test nhập). */
export const idGen = () => {
  let n = 0
  return () => `id${++n}`
}

export function ok<T extends object>(r: Result<T>): Extract<Result<T>, { ok: true }> {
  if (!r.ok) throw new Error(r.error)
  return r
}

/** Cụ Tổ (có ngày sinh âm lịch nhuận không đủ ngày), một vợ, hai con; một con bị gỡ. */
export function richDoc(): TreeDoc {
  const newId = idGen()
  let doc = ok(createTree({ name: 'Chi trưởng', region: 'south', description: 'Mô tả' }, newId)).doc
  const root = ok(addRoot(doc, { fullName: 'Cụ Tổ', gender: 'male' }, newId))
  doc = ok(updatePerson(root.doc, root.id, { birth: { year: 2025, month: 6, lunar: true, leap: true }, death: { year: 2030, month: 5, day: 3, lunar: true }, birthPlace: 'Huế', biography: 'Tiểu sử' })).doc
  const wife = ok(addSpouse(doc, { personId: root.id, person: { fullName: 'Cụ Bà', gender: 'female' } }, newId))
  const kid1 = ok(addChild(wife.doc, { parentId: root.id, other: wife.id, person: { fullName: 'Con một', gender: 'male' }, kind: 'biological' }, newId))
  const kid2 = ok(addChild(kid1.doc, { parentId: root.id, other: wife.id, person: { fullName: 'Con hai', gender: 'female' }, kind: 'biological' }, newId))
  doc = ok(removeBranch(kid2.doc, kid2.id, '2026-10-26T01:02:03.000Z', newId)).doc
  return doc
}

export function smallDoc(): TreeDoc {
  const newId = idGen()
  let doc = ok(createTree({ name: 'Chi trưởng', region: 'south' }, newId)).doc
  const root = ok(addRoot(doc, { fullName: 'Cụ Tổ', gender: 'male' }, newId))
  doc = root.doc
  return ok(addChild(doc, { parentId: root.id, person: { fullName: 'Con', gender: 'male' }, kind: 'biological' }, newId)).doc
}
