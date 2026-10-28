// Thao tác sửa cây. Mỗi hàm là hàm thuần: nhận `doc`, trả `doc` mới hoặc mã lỗi; `doc` đầu vào không bao giờ bị đổi,
// nên "thao tác lỗi không làm đổi cây" đúng theo cấu trúc.
import { isValidPartialDate, type PartialDate } from '../dates.ts';
import { checkMarriage, checkParentLink, type ChildKind, type Gender, type ParentRole } from '../integrity.ts';
import {
  fail,
  type EditError,
  type NewId,
  type Region,
  type Result,
  type TreeDoc,
  type TreeMarriage,
  type TreeParentLink,
  type TreePerson,
} from './model.ts';
import {
  activeView,
  childrenOf,
  descendantIds,
  findPerson,
  marriagesOf,
  parentLinksOf,
  spouseIdsOf,
  toTreeData,
} from './queries.ts';

export type PersonInput = { fullName: string; gender?: Gender };

const roleFor: Record<'male' | 'female', ParentRole> = { male: 'father', female: 'mother' };
const genderFor: Record<ParentRole, Gender> = { father: 'male', mother: 'female' };

function cleanName(name: string): string | null {
  const n = name.trim().replace(/\s+/g, ' ');
  return n ? n : null;
}

function newPerson(id: string, name: string, gender: Gender, extra: Partial<TreePerson> = {}): TreePerson {
  return { id, fullName: name, gender, isOutsider: false, isRoot: false, siblingOrder: 1, ...extra };
}

/** Tạo cuốn gia phả rỗng. */
export function createTree(
  input: { name: string; region?: Region; description?: string },
  newId: NewId,
): Result {
  const name = cleanName(input.name);
  if (!name) return fail('MISSING_NAME');
  const doc: TreeDoc = {
    version: 1,
    meta: { id: newId(), name, region: input.region ?? 'north', ...(input.description ? { description: input.description } : {}) },
    persons: [],
    parents: [],
    marriages: [],
  };
  return { ok: true, doc };
}

/** Thêm thuỷ tổ vào cuốn còn trống. */
export function addRoot(doc: TreeDoc, input: PersonInput, newId: NewId): Result<{ id: string }> {
  if (activeView(doc).persons.length > 0) return fail('TREE_NOT_EMPTY');
  const name = cleanName(input.fullName);
  if (!name) return fail('MISSING_NAME');
  if (!input.gender) return fail('MISSING_GENDER');
  const id = newId();
  return { ok: true, id, doc: { ...doc, persons: [...doc.persons, newPerson(id, name, input.gender, { isRoot: true })] } };
}

export type AddChildInput = {
  parentId: string;
  person: PersonInput;
  kind: ChildKind;
  /** Cha/mẹ kia: bỏ trống = tự chọn nếu chỉ có một vợ/chồng; `null` = không có. */
  other?: string | null;
  /** Vai trò của `parentId` khi giới tính chưa rõ. */
  parentRole?: ParentRole;
};

export function addChild(doc: TreeDoc, input: AddChildInput, newId: NewId): Result<{ id: string }> {
  const parent = findPerson(doc, input.parentId);
  if (!parent) return fail('NOT_FOUND');
  if (parent.isOutsider) return fail('OUTSIDER_CANNOT_PARENT');
  const name = cleanName(input.person.fullName);
  if (!name) return fail('MISSING_NAME');
  if (!input.person.gender) return fail('MISSING_GENDER');

  const parentRole = parent.gender === 'unknown' ? input.parentRole : roleFor[parent.gender];
  if (!parentRole) return fail('MISSING_ROLE');

  const spouses = spouseIdsOf(doc, parent.id);
  let otherId: string | null;
  if (input.other === undefined) {
    if (spouses.length > 1) return fail('OTHER_PARENT_REQUIRED');
    otherId = spouses[0] ?? null;
  } else {
    otherId = input.other;
  }
  if (otherId !== null && !spouses.includes(otherId)) return fail('NOT_SPOUSE');
  if (input.kind === 'step' && otherId === null) return fail('OTHER_PARENT_REQUIRED');

  const otherRole: ParentRole = parentRole === 'father' ? 'mother' : 'father';
  const childId = newId();
  const child = newPerson(childId, name, input.person.gender, {
    siblingOrder: childrenOf(doc, parent.id).reduce((m, c) => Math.max(m, c.siblingOrder), 0) + 1,
  });

  // Con riêng: là con ruột của người vợ/chồng kia, con riêng của người đang thêm (design D2).
  const links: TreeParentLink[] = [
    { parentId: parent.id, childId, role: parentRole, kind: input.kind },
    ...(otherId !== null
      ? [{ parentId: otherId, childId, role: otherRole, kind: input.kind === 'step' ? ('biological' as const) : input.kind }]
      : []),
  ];

  let probe: TreeDoc = { ...doc, persons: [...doc.persons, child] };
  for (const l of links) {
    const err = checkParentLink(toTreeData(probe), l);
    if (err) return fail(err);
    probe = { ...probe, parents: [...probe.parents, l] };
  }
  return { ok: true, id: childId, doc: probe };
}

export function addSpouse(doc: TreeDoc, input: { personId: string; person: PersonInput }, newId: NewId): Result<{ id: string }> {
  const person = findPerson(doc, input.personId);
  if (!person) return fail('NOT_FOUND');
  if (person.isOutsider) return fail('SPOUSE_LIMIT');
  if (person.gender === 'unknown') return fail('GENDER_UNKNOWN');
  const name = cleanName(input.person.fullName);
  if (!name) return fail('MISSING_NAME');
  const spouseGender: Gender = person.gender === 'male' ? 'female' : 'male';
  if (input.person.gender && input.person.gender !== spouseGender) return fail('ROLE_GENDER_MISMATCH');

  const id = newId();
  const spouse = newPerson(id, name, spouseGender, { isOutsider: true });
  const order = marriagesOf(doc, person.id).reduce((m, x) => Math.max(m, x.wifeOrder), 0) + 1;
  const marriage: TreeMarriage =
    person.gender === 'male'
      ? { id: newId(), husbandId: person.id, wifeId: id, wifeOrder: order }
      : { id: newId(), husbandId: id, wifeId: person.id, wifeOrder: order };

  const probe: TreeDoc = { ...doc, persons: [...doc.persons, spouse] };
  const err = checkMarriage(toTreeData(probe), marriage);
  if (err) return fail(err);
  return { ok: true, id, doc: { ...probe, marriages: [...probe.marriages, marriage] } };
}

/** Thêm mẹ cho người chỉ mới có cha (hoặc ngược lại) bằng cách tạo người ngoại tộc làm vợ/chồng của cha/mẹ đã có. */
export function addMissingParent(doc: TreeDoc, input: { childId: string; person: PersonInput }, newId: NewId): Result<{ id: string }> {
  const child = findPerson(doc, input.childId);
  if (!child) return fail('NOT_FOUND');
  if (child.isRoot) return fail('ROOT_LOCKED');
  const root = doc.persons.find((x) => x.isRoot && !x.removedAt);
  if (root && spouseIdsOf(doc, child.id).includes(root.id)) return fail('ROOT_LOCKED');

  const bio = parentLinksOf(doc, child.id).filter((l) => l.kind === 'biological');
  if (bio.length === 0) return fail('NO_PARENT');
  if (bio.length >= 2) return fail('ALREADY_HAS_PARENT');

  const existing = bio[0]!;
  const role: ParentRole = existing.role === 'father' ? 'mother' : 'father';
  const name = cleanName(input.person.fullName);
  if (!name) return fail('MISSING_NAME');
  if (input.person.gender && input.person.gender !== genderFor[role]) return fail('ROLE_GENDER_MISMATCH');
  if (marriagesOf(doc, existing.parentId).length > 0) return fail('PARENT_ALREADY_MARRIED');

  const id = newId();
  const parent = newPerson(id, name, genderFor[role], { isOutsider: true });
  const existingPerson = findPerson(doc, existing.parentId)!;
  const marriage: TreeMarriage =
    role === 'mother'
      ? { id: newId(), husbandId: existingPerson.id, wifeId: id, wifeOrder: 1 }
      : { id: newId(), husbandId: id, wifeId: existingPerson.id, wifeOrder: 1 };
  const link: TreeParentLink = { parentId: id, childId: child.id, role, kind: 'biological' };

  const probe: TreeDoc = { ...doc, persons: [...doc.persons, parent] };
  const mErr = checkMarriage(toTreeData(probe), marriage);
  if (mErr) return fail(mErr);
  const lErr = checkParentLink(toTreeData(probe), link);
  if (lErr) return fail(lErr);
  return { ok: true, id, doc: { ...probe, marriages: [...probe.marriages, marriage], parents: [...probe.parents, link] } };
}

// ---- Gỡ người (đánh dấu, không xoá) ----

/** Số người sẽ bị gỡ nếu gỡ cả nhánh của `id` (để hộp xác nhận nêu số). */
export function branchSize(doc: TreeDoc, id: string): number {
  return branchToRemove(activeView(doc), id).size;
}

function branchToRemove(v: TreeDoc, id: string): Set<string> {
  const removed = new Set<string>([id, ...descendantIds(v, id)]);
  // Vợ/chồng ngoại tộc chỉ liên hệ với những người bị gỡ cũng bị gỡ.
  for (const p of v.persons) {
    if (!p.isOutsider || removed.has(p.id)) continue;
    const spouses = spouseIdsOf(v, p.id);
    const kids = childrenOf(v, p.id);
    const all = [...spouses, ...kids.map((c) => c.id)];
    if (all.length > 0 && all.every((x) => removed.has(x))) removed.add(p.id);
  }
  return removed;
}

function markRemoved(doc: TreeDoc, ids: Set<string>, now: string, removalId: string): TreeDoc {
  const stamp = { removedAt: now, removalId };
  return {
    ...doc,
    persons: doc.persons.map((p) => (ids.has(p.id) && !p.removedAt ? { ...p, ...stamp } : p)),
    parents: doc.parents.map((l) => ((ids.has(l.parentId) || ids.has(l.childId)) && !l.removedAt ? { ...l, ...stamp } : l)),
    marriages: doc.marriages.map((m) => ((ids.has(m.husbandId) || ids.has(m.wifeId)) && !m.removedAt ? { ...m, ...stamp } : m)),
  };
}

/** Gỡ một người không có con. Thuỷ tổ không gỡ được. */
export function removePerson(doc: TreeDoc, id: string, now: string, newId: NewId): Result {
  const v = activeView(doc);
  const p = findPerson(v, id);
  if (!p) return fail('NOT_FOUND');
  if (p.isRoot) return fail('ROOT_LOCKED');
  if (childrenOf(v, id).length > 0) return fail('HAS_CHILDREN');
  const ids = new Set<string>([id]);
  // Vợ/chồng ngoại tộc không còn liên hệ nào cũng đi theo.
  for (const s of spouseIdsOf(v, id)) {
    const sp = findPerson(v, s)!;
    if (sp.isOutsider && spouseIdsOf(v, s).length === 1 && childrenOf(v, s).length === 0) ids.add(s);
  }
  return { ok: true, doc: markRemoved(doc, ids, now, newId()) };
}

/** Gỡ người, mọi con cháu và vợ/chồng ngoại tộc chỉ gắn với nhánh ấy; cả nhánh chung một `removalId`. */
export function removeBranch(doc: TreeDoc, id: string, now: string, newId: NewId): Result<{ count: number }> {
  const v = activeView(doc);
  const p = findPerson(v, id);
  if (!p) return fail('NOT_FOUND');
  if (p.isRoot) return fail('ROOT_LOCKED');
  const ids = branchToRemove(v, id);
  return { ok: true, count: ids.size, doc: markRemoved(doc, ids, now, newId()) };
}

// ---- Thứ tự ----

const sameSet = (a: string[], b: string[]) => a.length === b.length && new Set(b).size === b.length && a.every((x) => b.includes(x));

/** Đặt lại thứ tự con của một người; `orderedIds` phải đúng là tập con đang hiện của người ấy. */
export function reorderSiblings(doc: TreeDoc, parentId: string, orderedIds: string[]): Result {
  if (!findPerson(doc, parentId)) return fail('NOT_FOUND');
  const current = childrenOf(doc, parentId).map((c) => c.id);
  if (!sameSet(current, orderedIds)) return fail('INVALID_ORDER');
  const pos = new Map(orderedIds.map((id, i) => [id, i + 1]));
  return { ok: true, doc: { ...doc, persons: doc.persons.map((p) => (pos.has(p.id) ? { ...p, siblingOrder: pos.get(p.id)! } : p)) } };
}

/** Đặt lại thứ tự các vợ/chồng của một người. */
export function reorderSpouses(doc: TreeDoc, personId: string, orderedSpouseIds: string[]): Result {
  if (!findPerson(doc, personId)) return fail('NOT_FOUND');
  if (!sameSet(spouseIdsOf(doc, personId), orderedSpouseIds)) return fail('INVALID_ORDER');
  const pos = new Map(orderedSpouseIds.map((id, i) => [id, i + 1]));
  return {
    ok: true,
    doc: {
      ...doc,
      marriages: doc.marriages.map((m) => {
        if (m.removedAt) return m;
        const other = m.husbandId === personId ? m.wifeId : m.wifeId === personId ? m.husbandId : null;
        return other && pos.has(other) ? { ...m, wifeOrder: pos.get(other)! } : m;
      }),
    },
  };
}

/**
 * Nối một người cha/mẹ đã có với một người con đã có (đề xuất quan hệ giữa hai người sẵn trong cuốn).
 * Vai trò theo giới tính của cha/mẹ; giới tính chưa rõ thì phải nói `role`. Luật toàn vẹn như mọi quan hệ khác.
 */
export function linkParent(doc: TreeDoc, input: { parentId: string; childId: string; kind: ChildKind; role?: ParentRole }): Result {
  const parent = findPerson(doc, input.parentId);
  const child = findPerson(doc, input.childId);
  if (!parent || !child) return fail('NOT_FOUND');
  const role = parent.gender === 'unknown' ? input.role : roleFor[parent.gender];
  if (!role) return fail('MISSING_ROLE');
  const link: TreeParentLink = { parentId: parent.id, childId: child.id, role, kind: input.kind };
  const err = checkParentLink(toTreeData(doc), link);
  if (err) return fail(err);
  return { ok: true, doc: { ...doc, parents: [...doc.parents, link] } };
}

// ---- Hồ sơ ----

export type PersonPatch = {
  fullName?: string;
  gender?: Gender;
  birth?: PartialDate | null;
  death?: PartialDate | null;
  birthPlace?: string;
  burialPlace?: string;
  biography?: string;
  note?: string;
};

export function updatePerson(doc: TreeDoc, id: string, patch: PersonPatch): Result {
  const v = activeView(doc);
  const p = findPerson(v, id);
  if (!p) return fail('NOT_FOUND');
  const next: TreePerson = { ...p };

  if (patch.fullName !== undefined) {
    const n = cleanName(patch.fullName);
    if (!n) return fail('MISSING_NAME');
    next.fullName = n;
  }
  if (patch.gender !== undefined && patch.gender !== p.gender) {
    const g = patch.gender;
    const asParent = v.parents.filter((l) => l.parentId === id).some((l) => g !== 'unknown' && genderFor[l.role] !== g);
    const asSpouse = v.marriages.some((m) => (m.husbandId === id && g === 'female') || (m.wifeId === id && g === 'male'));
    if (asParent || asSpouse) return fail('ROLE_GENDER_MISMATCH');
    next.gender = g;
  }
  for (const key of ['birth', 'death'] as const) {
    const d = patch[key];
    if (d === undefined) continue;
    if (d === null) delete next[key];
    else if (!isValidPartialDate(d)) return fail('INVALID_DATE');
    else next[key] = d;
  }
  for (const key of ['birthPlace', 'burialPlace', 'biography', 'note'] as const) {
    if (patch[key] !== undefined) next[key] = patch[key];
  }
  return { ok: true, doc: { ...doc, persons: doc.persons.map((x) => (x.id === id ? next : x)) } };
}

export type { EditError };
