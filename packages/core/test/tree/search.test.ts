import { describe, expect, test } from 'vitest';
import { createTree, filterPersons, matchesQuery, normalizeName, removePerson, searchPersons, updatePerson } from '../../src/tree/index.ts';
import { counter, ok, sample } from './helpers.ts';

describe('chuẩn hoá và tìm kiếm', () => {
  test.each([
    ['Nguyễn Văn An', 'nguyen van an'],
    ['Đặng  Thị   Bình', 'dang thi binh'],
    ['  ÔNG  ', 'ong'],
  ])('normalizeName %j', (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });

  test('gõ không dấu', () => {
    expect(matchesQuery({ fullName: 'Nguyễn Văn An' }, 'nguyen van')).toBe(true);
    expect(matchesQuery({ fullName: 'Đặng Thị Bình' }, 'dang')).toBe(true);
    expect(matchesQuery({ fullName: 'Nguyễn Văn An' }, 'an van')).toBe(true); // không cần đúng thứ tự
    expect(matchesQuery({ fullName: 'Nguyễn Văn An' }, 'tran')).toBe(false);
  });

  test('searchPersons chỉ trả người đang hiện, ô trống không trả gì', () => {
    const { doc, ids, newId } = sample();
    expect(searchPersons(doc, 'nguyen van').map((p) => p.id).sort()).toEqual([ids.ong, ids.cha, ids.chu, ids.chau].sort());
    expect(searchPersons(doc, '')).toEqual([]);
    const removed = ok(removePerson(doc, ids.chu!, '2026-01-01', newId)).doc;
    expect(searchPersons(removed, 'chu').map((p) => p.id)).toEqual([]);
  });
});

describe('bộ lọc danh sách', () => {
  function tree() {
    const s = sample();
    const doc = ok(updatePerson(s.doc, s.ids.ong!, { death: { year: 1968, lunar: false } })).doc;
    return { ...s, doc };
  }

  test('đã mất', () => {
    const { doc, ids } = tree();
    expect(filterPersons(doc, 'deceased').map((p) => p.id)).toEqual([ids.ong]);
  });

  test('dâu rể', () => {
    const { doc, ids } = tree();
    expect(filterPersons(doc, 'outsider').map((p) => p.id).sort()).toEqual([ids.ba, ids.me].sort());
  });

  test('nam, nữ', () => {
    const { doc } = tree();
    expect(filterPersons(doc, 'female').map((p) => p.fullName).sort()).toEqual(['Lê Thị Mẹ', 'Trần Thị Bà']);
    expect(filterPersons(doc, 'male')).toHaveLength(4);
  });

  test('đã kết hôn, chưa kết hôn', () => {
    const { doc, ids } = tree();
    expect(filterPersons(doc, 'married').map((p) => p.id).sort()).toEqual([ids.ong, ids.ba, ids.cha, ids.me].sort());
    expect(filterPersons(doc, 'unmarried').map((p) => p.id).sort()).toEqual([ids.chu, ids.chau].sort());
  });

  test('kết hợp bộ lọc và ô tìm', () => {
    const { doc, ids } = tree();
    expect(filterPersons(doc, 'male', 'chu').map((p) => p.id)).toEqual([ids.chu]);
    expect(filterPersons(doc, 'all', '')).toHaveLength(6);
  });

  test('cuốn rỗng', () => {
    const doc = ok(createTree({ name: 'A' }, counter())).doc;
    expect(filterPersons(doc, 'all')).toEqual([]);
  });
});
