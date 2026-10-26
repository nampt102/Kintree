import { expect, test } from 'vitest';
import { checkMarriage, checkParentLink, type Person, type TreeData } from '../src/integrity.ts';

const p = (id: string, gender: Person['gender'], extra: Partial<Person> = {}): Person => ({
  id, treeId: 't1', gender, isOutsider: false, ...extra,
});

// ong → cha → chau (cha ruột), dâu là ngoại tộc.
const tree: TreeData = {
  persons: [
    p('ong', 'male'), p('cha', 'male'), p('chau', 'male'), p('chu', 'male'),
    p('ba', 'female'), p('chuaro', 'unknown'),
    p('dau', 'female', { isOutsider: true }), p('re', 'male', { isOutsider: true }),
    p('khac', 'male', { treeId: 't2' }),
  ],
  parents: [
    { parentId: 'ong', childId: 'cha', role: 'father', kind: 'biological' },
    { parentId: 'cha', childId: 'chau', role: 'father', kind: 'biological' },
  ],
};

test('cha ruột thứ hai bị từ chối', () => {
  expect(checkParentLink(tree, { parentId: 'chu', childId: 'chau', role: 'father', kind: 'biological' })).toBe('DUPLICATE_PARENT');
});

test('cha nuôi bên cạnh cha ruột được phép', () => {
  expect(checkParentLink(tree, { parentId: 'chu', childId: 'chau', role: 'father', kind: 'adopted' })).toBeNull();
});

test('ông thành con của cháu nội: tạo vòng', () => {
  expect(checkParentLink(tree, { parentId: 'chau', childId: 'ong', role: 'father', kind: 'biological' })).toBe('CYCLE');
});

test('làm cha của chính mình: tạo vòng', () => {
  expect(checkParentLink(tree, { parentId: 'chu', childId: 'chu', role: 'father', kind: 'adopted' })).toBe('CYCLE');
});

test('giới tính chưa rõ làm cha được', () => {
  expect(checkParentLink(tree, { parentId: 'chuaro', childId: 'chu', role: 'father', kind: 'biological' })).toBeNull();
});

test('nữ làm cha: sai vai trò', () => {
  expect(checkParentLink(tree, { parentId: 'ba', childId: 'chu', role: 'father', kind: 'biological' })).toBe('ROLE_GENDER_MISMATCH');
});

test('thiếu loại quan hệ', () => {
  expect(checkParentLink(tree, { parentId: 'ba', childId: 'chu', role: 'mother' })).toBe('MISSING_KIND');
});

test('hai người ngoại tộc', () => {
  expect(checkMarriage(tree, { husbandId: 're', wifeId: 'dau' })).toBe('BOTH_OUTSIDERS');
  expect(checkParentLink(tree, { parentId: 'dau', childId: 're', role: 'mother', kind: 'step' })).toBe('BOTH_OUTSIDERS');
});

test('nối sang cuốn gia phả khác', () => {
  expect(checkParentLink(tree, { parentId: 'khac', childId: 'chu', role: 'father', kind: 'biological' })).toBe('DIFFERENT_TREE');
});

test('quan hệ hợp lệ', () => {
  expect(checkParentLink(tree, { parentId: 'ba', childId: 'cha', role: 'mother', kind: 'biological' })).toBeNull();
  expect(checkMarriage(tree, { husbandId: 'cha', wifeId: 'dau' })).toBeNull();
});
