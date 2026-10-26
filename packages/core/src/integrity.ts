// Ràng buộc giữ cây gia phả hợp lệ. Cơ sở dữ liệu kiểm lại cùng các luật này
// (supabase/migrations/0001_init.sql), nên sửa ở đây thì sửa cả ở đó.

export type Gender = 'male' | 'female' | 'unknown';
export type ParentRole = 'father' | 'mother';
export type ChildKind = 'biological' | 'adopted' | 'step';

export type Person = { id: string; treeId: string; gender: Gender; isOutsider: boolean };
export type ParentLink = { parentId: string; childId: string; role: ParentRole; kind?: ChildKind };
export type Marriage = { husbandId: string; wifeId: string };
export type TreeData = { persons: Person[]; parents: ParentLink[] };

export type IntegrityError =
  | 'MISSING_KIND'
  | 'UNKNOWN_PERSON'
  | 'DIFFERENT_TREE'
  | 'ROLE_GENDER_MISMATCH'
  | 'DUPLICATE_PARENT'
  | 'BOTH_OUTSIDERS'
  | 'CYCLE';

const roleGender: Record<ParentRole, Gender> = { father: 'male', mother: 'female' };

function pair(
  tree: TreeData,
  aId: string,
  bId: string,
): { ok: false; error: IntegrityError } | { ok: true; a: Person; b: Person } {
  const byId = new Map(tree.persons.map((p) => [p.id, p]));
  const a = byId.get(aId);
  const b = byId.get(bId);
  if (!a || !b) return { ok: false, error: 'UNKNOWN_PERSON' };
  if (a.treeId !== b.treeId) return { ok: false, error: 'DIFFERENT_TREE' };
  if (a.isOutsider && b.isOutsider) return { ok: false, error: 'BOTH_OUTSIDERS' };
  return { ok: true, a, b };
}

/** `ancestorId` có phải tổ tiên (hoặc chính) `personId` không. */
function isAncestor(tree: TreeData, ancestorId: string, personId: string): boolean {
  const seen = new Set<string>();
  const stack = [personId];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === ancestorId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const l of tree.parents) if (l.childId === id) stack.push(l.parentId);
  }
  return false;
}

/** Kiểm một quan hệ cha/mẹ–con trước khi ghi; trả null nếu hợp lệ. */
export function checkParentLink(tree: TreeData, link: ParentLink): IntegrityError | null {
  if (!link.kind) return 'MISSING_KIND';
  const r = pair(tree, link.parentId, link.childId);
  if (!r.ok) return r.error;
  if (r.a.gender !== 'unknown' && r.a.gender !== roleGender[link.role]) return 'ROLE_GENDER_MISMATCH';
  if (tree.parents.some((l) => l.childId === link.childId && l.role === link.role && l.kind === link.kind)) {
    return 'DUPLICATE_PARENT';
  }
  if (isAncestor(tree, link.childId, link.parentId)) return 'CYCLE';
  return null;
}

/** Kiểm một quan hệ vợ chồng trước khi ghi; trả null nếu hợp lệ. */
export function checkMarriage(tree: TreeData, m: Marriage): IntegrityError | null {
  const r = pair(tree, m.husbandId, m.wifeId);
  return r.ok ? null : r.error;
}
