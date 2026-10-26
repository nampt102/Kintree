import { activeView, type TreeDoc, type TreePerson } from '@kintree/core'

/**
 * Nút nào nên hiện cho từng người. Chỉ để ẩn nút hiển nhiên không dùng được:
 * luật thật nằm ở `packages/core`, thao tác sai vẫn bị core từ chối và báo lỗi.
 *
 * Dựng chỉ mục một lần cho cả cuốn rồi tra từng người O(1); tính riêng từng người
 * làm mỗi lần bấm chọn mất ~0,5 giây ở cuốn 1.000 người.
 */
export function buildActions(doc: TreeDoc) {
  const v = activeView(doc)
  const byId = new Map(v.persons.map((p) => [p.id, p]))
  const kidCount = new Map<string, number>()
  const bioParentCount = new Map<string, number>()
  const bloodParent = new Map<string, TreePerson>()
  const spouseCount = new Map<string, number>()
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1)

  for (const l of v.parents) {
    bump(kidCount, l.parentId)
    if (l.kind === 'biological') bump(bioParentCount, l.childId)
    const parent = byId.get(l.parentId)
    if (parent && !parent.isOutsider && !bloodParent.has(l.childId)) bloodParent.set(l.childId, parent)
  }
  for (const m of v.marriages) {
    bump(spouseCount, m.husbandId)
    bump(spouseCount, m.wifeId)
  }

  return (p: TreePerson) => {
    const kids = kidCount.get(p.id) ?? 0
    const blood = bloodParent.get(p.id)
    return {
      // Thu gọn gắn với người trong họ (đơn vị gồm họ và vợ/chồng), nên dâu/rể không có nút thu gọn.
      hasChildren: !p.isOutsider && kids > 0,
      canAddChild: !p.isOutsider,
      canAddSpouse: !p.isOutsider && p.gender !== 'unknown',
      canAddParent: !p.isRoot && !p.isOutsider && (bioParentCount.get(p.id) ?? 0) === 1,
      canRemove: !p.isRoot && kids === 0,
      canRemoveBranch: !p.isRoot && !p.isOutsider && kids > 0,
      canReorderChildren: kids > 1,
      canReorderSpouses: !p.isOutsider && (spouseCount.get(p.id) ?? 0) > 1,
      canReorderSiblings: !!blood && (kidCount.get(blood.id) ?? 0) > 1,
    }
  }
}

export type PersonActions = ReturnType<ReturnType<typeof buildActions>>

/** Người trong họ là cha/mẹ của `p` (nhánh để sắp thứ tự anh chị em). */
export function bloodParentOf(doc: TreeDoc, p: TreePerson): TreePerson | undefined {
  const v = activeView(doc)
  const byId = new Map(v.persons.map((x) => [x.id, x]))
  for (const l of v.parents) {
    if (l.childId !== p.id) continue
    const parent = byId.get(l.parentId)
    if (parent && !parent.isOutsider) return parent
  }
  return undefined
}
