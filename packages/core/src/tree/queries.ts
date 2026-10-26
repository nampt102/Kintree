import type { TreeData } from '../integrity.ts';
import type { TreeDoc, TreeMarriage, TreeParentLink, TreePerson } from './model.ts';

/** Bản chỉ gồm phần tử chưa bị gỡ. Mọi thao tác, bố cục, tìm kiếm dùng bản này. */
export function activeView(doc: TreeDoc): TreeDoc {
  const persons = doc.persons.filter((p) => !p.removedAt);
  const ids = new Set(persons.map((p) => p.id));
  return {
    ...doc,
    persons,
    parents: doc.parents.filter((l) => !l.removedAt && ids.has(l.parentId) && ids.has(l.childId)),
    marriages: doc.marriages.filter((m) => !m.removedAt && ids.has(m.husbandId) && ids.has(m.wifeId)),
  };
}

/** Dữ liệu cho `checkParentLink`/`checkMarriage` trong integrity.ts. */
export function toTreeData(doc: TreeDoc): TreeData {
  const v = activeView(doc);
  return {
    persons: v.persons.map((p) => ({ id: p.id, treeId: v.meta.id, gender: p.gender, isOutsider: p.isOutsider })),
    parents: v.parents.map((l) => ({ parentId: l.parentId, childId: l.childId, role: l.role, kind: l.kind })),
  };
}

export const findPerson = (doc: TreeDoc, id: string): TreePerson | undefined =>
  doc.persons.find((p) => p.id === id && !p.removedAt);

/** Các hôn nhân đang hiện của một người, theo thứ tự đã đặt. */
export function marriagesOf(doc: TreeDoc, personId: string): TreeMarriage[] {
  return doc.marriages
    .filter((m) => !m.removedAt && (m.husbandId === personId || m.wifeId === personId))
    .sort((a, b) => a.wifeOrder - b.wifeOrder);
}

export const spouseIdsOf = (doc: TreeDoc, personId: string): string[] =>
  marriagesOf(doc, personId).map((m) => (m.husbandId === personId ? m.wifeId : m.husbandId));

export const parentLinksOf = (doc: TreeDoc, childId: string): TreeParentLink[] =>
  doc.parents.filter((l) => !l.removedAt && l.childId === childId);

/** Con đang hiện của một người, theo thứ tự anh chị em. */
export function childrenOf(doc: TreeDoc, parentId: string): TreePerson[] {
  const byId = new Map(doc.persons.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const out: TreePerson[] = [];
  for (const l of doc.parents) {
    if (l.removedAt || l.parentId !== parentId || seen.has(l.childId)) continue;
    const c = byId.get(l.childId);
    if (c && !c.removedAt) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out.sort((a, b) => a.siblingOrder - b.siblingOrder);
}

export const rootOf = (doc: TreeDoc): TreePerson | undefined => doc.persons.find((p) => p.isRoot && !p.removedAt);

/** Đời của mỗi người đang hiện: thuỷ tổ = 1, con = đời cha/mẹ + 1, vợ/chồng cùng đời với người ấy. */
export function generations(doc: TreeDoc): Map<string, number> {
  const gen = new Map<string, number>();
  const root = rootOf(doc);
  if (!root) return gen;
  gen.set(root.id, 1);
  const queue = [root.id];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]!;
    const g = gen.get(id)!;
    for (const s of spouseIdsOf(doc, id)) {
      if (!gen.has(s)) {
        gen.set(s, g);
        queue.push(s);
      }
    }
    for (const c of childrenOf(doc, id)) {
      if (!gen.has(c.id)) {
        gen.set(c.id, g + 1);
        queue.push(c.id);
      }
    }
  }
  return gen;
}

/** Tất cả con cháu (không kể chính người ấy). */
export function descendantIds(doc: TreeDoc, id: string): Set<string> {
  const out = new Set<string>();
  const stack = [id];
  while (stack.length) {
    for (const c of childrenOf(doc, stack.pop()!)) {
      if (!out.has(c.id)) {
        out.add(c.id);
        stack.push(c.id);
      }
    }
  }
  return out;
}
