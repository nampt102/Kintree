import { describe, expect, test } from 'vitest';
import { addChild, findSimilarPersons, linkParent, removePerson, updatePerson } from '../../src/tree/index.ts';
import { err, ok, sample } from './helpers.ts';

describe('findSimilarPersons', () => {
  test('cùng họ tên không phân biệt dấu, hoa thường, khoảng trắng', () => {
    const { doc, ids } = sample();
    expect(findSimilarPersons(doc, { fullName: '  nguyen VAN ông ' }).map((p) => p.id)).toEqual([ids.ong]);
    expect(findSimilarPersons(doc, { fullName: 'Nguyễn Văn Khác' })).toEqual([]);
    expect(findSimilarPersons(doc, { fullName: '   ' })).toEqual([]);
  });

  test('năm sinh lệch không quá 2 năm, thiếu năm sinh ở một bên vẫn có thể trùng', () => {
    const s = sample();
    const doc = ok(updatePerson(s.doc, s.ids.ong!, { birth: { year: 1890, lunar: false } })).doc;
    const name = 'Nguyễn Văn Ông';
    expect(findSimilarPersons(doc, { fullName: name, birthYear: 1892 })).toHaveLength(1);
    expect(findSimilarPersons(doc, { fullName: name, birthYear: 1893 })).toHaveLength(0);
    expect(findSimilarPersons(doc, { fullName: name })).toHaveLength(1);
    expect(findSimilarPersons(s.doc, { fullName: name, birthYear: 1950 })).toHaveLength(1); // người đã có không ghi năm sinh
  });

  test('bỏ qua người đã gỡ', () => {
    const s = sample();
    const removed = ok(removePerson(s.doc, s.ids.chau!, '2026-01-01', s.newId)).doc;
    expect(findSimilarPersons(removed, { fullName: 'Nguyễn Văn Chau' })).toEqual([]);
  });
});

describe('linkParent', () => {
  test('nối cha đã có với con đã có theo giới tính của cha', () => {
    const { doc, ids } = sample();
    // chau đã có cha là cha: nối thêm một cha nữa cùng loại quan hệ thì trùng.
    expect(err(linkParent(doc, { parentId: ids.chu!, childId: ids.chau!, kind: 'biological' }))).toBe('DUPLICATE_PARENT');
  });

  test('nối được người mẹ còn thiếu: vai trò theo giới tính', () => {
    const { doc, ids, newId } = sample();
    // Con của ong không ghi mẹ, rồi nối bà (vợ của ong) làm mẹ.
    const added = ok(addChild(doc, { parentId: ids.ong!, person: { fullName: 'Con Mới', gender: 'male' }, kind: 'biological', other: null }, newId));
    const linked = ok(linkParent(added.doc, { parentId: ids.ba!, childId: added.id, kind: 'biological' }));
    expect(linked.doc.parents.find((l) => l.childId === added.id && l.parentId === ids.ba)?.role).toBe('mother');
    expect(err(linkParent(linked.doc, { parentId: ids.ba!, childId: added.id, kind: 'biological' }))).toBe('DUPLICATE_PARENT');
  });

  test('không nối vòng tổ tiên', () => {
    const { doc, ids } = sample();
    expect(err(linkParent(doc, { parentId: ids.chau!, childId: ids.ong!, kind: 'biological' }))).toBe('CYCLE');
  });

  test('không biết người', () => {
    const { doc, ids } = sample();
    expect(err(linkParent(doc, { parentId: 'khong-co', childId: ids.chau!, kind: 'biological' }))).toBe('NOT_FOUND');
  });
});
