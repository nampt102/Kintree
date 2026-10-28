import type { TreeDoc, TreePerson } from './model.ts';
import { activeView, marriagesOf } from './queries.ts';

/** Chữ thường, bỏ dấu tiếng Việt (đ → d), gộp khoảng trắng. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Mọi từ gõ vào phải có mặt trong tên (không cần đúng thứ tự). Ô trống khớp mọi người. */
export function matchesQuery(person: Pick<TreePerson, 'fullName'>, query: string): boolean {
  const terms = normalizeName(query).split(' ').filter(Boolean);
  if (terms.length === 0) return true;
  const name = normalizeName(person.fullName);
  return terms.every((t) => name.includes(t));
}

export function searchPersons(doc: TreeDoc, query: string): TreePerson[] {
  if (!normalizeName(query)) return [];
  return activeView(doc).persons.filter((p) => matchesQuery(p, query));
}

/**
 * Người có thể trùng với một người mới được đề xuất: cùng họ tên (bỏ dấu, hoa thường, khoảng trắng thừa) và năm sinh
 * lệch không quá `tolerance` năm; thiếu năm sinh ở một bên thì vẫn coi là có thể trùng. Gần nhất xếp trước.
 */
export function findSimilarPersons(doc: TreeDoc, input: { fullName: string; birthYear?: number }, tolerance = 2): TreePerson[] {
  const name = normalizeName(input.fullName);
  if (!name) return [];
  const gap = (p: TreePerson) => (input.birthYear === undefined || p.birth === undefined ? 0 : Math.abs(p.birth.year - input.birthYear));
  return activeView(doc)
    .persons.filter((p) => normalizeName(p.fullName) === name && gap(p) <= tolerance)
    .sort((a, b) => gap(a) - gap(b));
}

export type PersonFilter = 'all' | 'male' | 'female' | 'deceased' | 'outsider' | 'married' | 'unmarried';

export const PERSON_FILTERS: PersonFilter[] = ['all', 'male', 'female', 'deceased', 'outsider', 'married', 'unmarried'];

/** "Đã mất" = có ghi ngày mất (kể cả chỉ năm). */
export function filterPersons(doc: TreeDoc, filter: PersonFilter, query = ''): TreePerson[] {
  const v = activeView(doc);
  return v.persons.filter((p) => {
    if (!matchesQuery(p, query)) return false;
    switch (filter) {
      case 'all':
        return true;
      case 'male':
      case 'female':
        return p.gender === filter;
      case 'deceased':
        return p.death !== undefined;
      case 'outsider':
        return p.isOutsider;
      case 'married':
        return marriagesOf(v, p.id).length > 0;
      case 'unmarried':
        return marriagesOf(v, p.id).length === 0;
    }
  });
}
