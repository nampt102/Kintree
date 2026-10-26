import { expect } from 'vitest';
import { addChild, addRoot, addSpouse, createTree, type AddChildInput, type Result, type TreeDoc } from '../../src/tree/index.ts';

export const counter = () => {
  let n = 0;
  return () => `id${++n}`;
};

export function ok<T extends object>(r: Result<T>): Extract<Result<T>, { ok: true }> {
  if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
  return r;
}

export const err = (r: Result<object>) => {
  expect(r.ok).toBe(false);
  return r.ok ? null : r.error;
};

/** Cây mẫu: ong (thuỷ tổ) + ba (vợ), con: cha (cả), chu (thứ); cha + me (vợ) có con chau. */
export function sample() {
  const newId = counter();
  let doc: TreeDoc = ok(createTree({ name: 'Chi trưởng' }, newId)).doc;
  const ids: Record<string, string> = {};
  const add = <T extends object>(name: string, r: Result<T & { id: string }>) => {
    const x = ok(r);
    ids[name] = x.id;
    doc = x.doc;
  };
  add('ong', addRoot(doc, { fullName: 'Nguyễn Văn Ông', gender: 'male' }, newId));
  add('ba', addSpouse(doc, { personId: ids.ong!, person: { fullName: 'Trần Thị Bà' } }, newId));
  const child = (name: string, full: string, extra: Partial<AddChildInput> = {}) =>
    add(name, addChild(doc, { parentId: ids.ong!, person: { fullName: full, gender: 'male' }, kind: 'biological', ...extra }, newId));
  child('cha', 'Nguyễn Văn Cha');
  child('chu', 'Nguyễn Văn Chú');
  add('me', addSpouse(doc, { personId: ids.cha!, person: { fullName: 'Lê Thị Mẹ' } }, newId));
  add('chau', addChild(doc, { parentId: ids.cha!, person: { fullName: 'Nguyễn Văn Cháu', gender: 'male' }, kind: 'biological' }, newId));
  return { doc, ids, newId };
}
