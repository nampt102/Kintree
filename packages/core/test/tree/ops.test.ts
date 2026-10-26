import { describe, expect, test } from 'vitest';
import {
  activeView,
  addChild,
  addMissingParent,
  addRoot,
  addSpouse,
  branchSize,
  childrenOf,
  createTree,
  generations,
  marriagesOf,
  removeBranch,
  removePerson,
  reorderSiblings,
  reorderSpouses,
  spouseIdsOf,
  updatePerson,
  type TreeDoc,
} from '../../src/tree/index.ts';
import { counter, err, ok, sample } from './helpers.ts';

const NOW = '2026-10-26T00:00:00.000Z';

describe('tạo cuốn gia phả', () => {
  test('tạo cuốn vùng Nam, chưa có ai', () => {
    const r = ok(createTree({ name: ' Chi trưởng ', region: 'south' }, counter()));
    expect(r.doc.meta).toMatchObject({ name: 'Chi trưởng', region: 'south' });
    expect(r.doc.persons).toEqual([]);
  });

  test('vùng mặc định là Bắc', () => {
    expect(ok(createTree({ name: 'A' }, counter())).doc.meta.region).toBe('north');
  });

  test.each(['', '   '])('thiếu tên %j', (name) => {
    expect(err(createTree({ name }, counter()))).toBe('MISSING_NAME');
  });
});

describe('thêm người', () => {
  test('người đầu tiên là thuỷ tổ ở đời 1', () => {
    const newId = counter();
    const doc = ok(createTree({ name: 'A' }, newId)).doc;
    const r = ok(addRoot(doc, { fullName: 'Cụ Tổ', gender: 'male' }, newId));
    expect(r.doc.persons[0]).toMatchObject({ isRoot: true, fullName: 'Cụ Tổ' });
    expect(generations(r.doc).get(r.id)).toBe(1);
  });

  test('thiếu giới tính', () => {
    const newId = counter();
    const doc = ok(createTree({ name: 'A' }, newId)).doc;
    expect(err(addRoot(doc, { fullName: 'Cụ Tổ' }, newId))).toBe('MISSING_GENDER');
  });

  test('cuốn đã có người thì không thêm thuỷ tổ nữa', () => {
    const { doc, newId } = sample();
    expect(err(addRoot(doc, { fullName: 'X', gender: 'male' }, newId))).toBe('TREE_NOT_EMPTY');
  });
});

describe('thêm con', () => {
  test('con ruột chung với vợ, nối cả hai và đứng cuối', () => {
    const { doc, ids } = sample();
    const kids = childrenOf(doc, ids.ong!).map((c) => c.id);
    expect(kids).toEqual([ids.cha, ids.chu]);
    // cháu nối cả cha lẫn mẹ
    const links = doc.parents.filter((l) => l.childId === ids.chau);
    expect(links.map((l) => [l.parentId, l.role, l.kind]).sort()).toEqual(
      [[ids.cha, 'father', 'biological'], [ids.me, 'mother', 'biological']].sort(),
    );
    expect(generations(doc).get(ids.chau!)).toBe(3);
  });

  test('chọn cha/mẹ kia không phải vợ chồng', () => {
    const { doc, ids, newId } = sample();
    expect(err(addChild(doc, { parentId: ids.cha!, other: ids.ba!, person: { fullName: 'X', gender: 'male' }, kind: 'biological' }, newId))).toBe('NOT_SPOUSE');
  });

  test('nhiều vợ thì bắt chọn cha/mẹ kia', () => {
    const { doc, ids, newId } = sample();
    const two = ok(addSpouse(doc, { personId: ids.ong!, person: { fullName: 'Bà Hai' } }, newId));
    expect(err(addChild(two.doc, { parentId: ids.ong!, person: { fullName: 'X', gender: 'male' }, kind: 'biological' }, newId))).toBe('OTHER_PARENT_REQUIRED');
    const okc = ok(addChild(two.doc, { parentId: ids.ong!, other: two.id, person: { fullName: 'X', gender: 'male' }, kind: 'biological' }, newId));
    expect(okc.doc.parents.some((l) => l.parentId === two.id && l.childId === okc.id)).toBe(true);
  });

  test('con nuôi, con riêng', () => {
    const { doc, ids, newId } = sample();
    const adopted = ok(addChild(doc, { parentId: ids.cha!, person: { fullName: 'Nuôi', gender: 'female' }, kind: 'adopted' }, newId));
    expect(adopted.doc.parents.filter((l) => l.childId === adopted.id).every((l) => l.kind === 'adopted')).toBe(true);
    const step = ok(addChild(doc, { parentId: ids.cha!, person: { fullName: 'Riêng', gender: 'male' }, kind: 'step' }, newId));
    const kinds = Object.fromEntries(step.doc.parents.filter((l) => l.childId === step.id).map((l) => [l.parentId, l.kind]));
    expect(kinds).toEqual({ [ids.cha!]: 'step', [ids.me!]: 'biological' });
  });

  test('con riêng cần cha/mẹ kia', () => {
    const { doc, ids, newId } = sample();
    expect(err(addChild(doc, { parentId: ids.chu!, person: { fullName: 'X', gender: 'male' }, kind: 'step' }, newId))).toBe('OTHER_PARENT_REQUIRED');
  });

  test('thiếu tên, thiếu giới tính', () => {
    const { doc, ids, newId } = sample();
    expect(err(addChild(doc, { parentId: ids.cha!, person: { fullName: ' ', gender: 'male' }, kind: 'biological' }, newId))).toBe('MISSING_NAME');
    expect(err(addChild(doc, { parentId: ids.cha!, person: { fullName: 'X' }, kind: 'biological' }, newId))).toBe('MISSING_GENDER');
  });

  test('dâu rể không tự thêm con', () => {
    const { doc, ids, newId } = sample();
    expect(err(addChild(doc, { parentId: ids.me!, person: { fullName: 'X', gender: 'male' }, kind: 'biological' }, newId))).toBe('OUTSIDER_CANNOT_PARENT');
  });

  test('giới tính chưa rõ cần vai trò', () => {
    const { doc, ids, newId } = sample();
    const unknown = ok(updatePerson(doc, ids.chu!, { gender: 'unknown' })).doc;
    expect(err(addChild(unknown, { parentId: ids.chu!, person: { fullName: 'X', gender: 'male' }, kind: 'biological' }, newId))).toBe('MISSING_ROLE');
    ok(addChild(unknown, { parentId: ids.chu!, parentRole: 'father', person: { fullName: 'X', gender: 'male' }, kind: 'biological' }, newId));
  });
});

describe('thêm vợ/chồng', () => {
  test('cụ ông có hai bà: ngoại tộc, cùng đời, đứng sau', () => {
    const { doc, ids, newId } = sample();
    const two = ok(addSpouse(doc, { personId: ids.ong!, person: { fullName: 'Bà Hai' } }, newId));
    expect(spouseIdsOf(two.doc, ids.ong!)).toEqual([ids.ba, two.id]);
    expect(two.doc.persons.find((p) => p.id === two.id)).toMatchObject({ isOutsider: true, gender: 'female' });
    expect(generations(two.doc).get(two.id)).toBe(1);
  });

  test('con gái trong họ lấy chồng', () => {
    const { doc, ids, newId } = sample();
    const girl = ok(addChild(doc, { parentId: ids.cha!, person: { fullName: 'Cô', gender: 'female' }, kind: 'biological' }, newId));
    const husband = ok(addSpouse(girl.doc, { personId: girl.id, person: { fullName: 'Chồng' } }, newId));
    const m = husband.doc.marriages.find((x) => x.wifeId === girl.id)!;
    expect(m.husbandId).toBe(husband.id);
  });

  test('dâu thêm chồng thứ hai', () => {
    const { doc, ids, newId } = sample();
    expect(err(addSpouse(doc, { personId: ids.ba!, person: { fullName: 'X' } }, newId))).toBe('SPOUSE_LIMIT');
  });

  test('giới tính trùng, giới tính chưa rõ', () => {
    const { doc, ids, newId } = sample();
    expect(err(addSpouse(doc, { personId: ids.chu!, person: { fullName: 'X', gender: 'male' } }, newId))).toBe('ROLE_GENDER_MISMATCH');
    const unknown = ok(updatePerson(doc, ids.chu!, { gender: 'unknown' })).doc;
    expect(err(addSpouse(unknown, { personId: ids.chu!, person: { fullName: 'X' } }, newId))).toBe('GENDER_UNKNOWN');
  });
});

describe('thêm cha/mẹ còn thiếu', () => {
  function onlyFather() {
    const s = sample();
    const kid = ok(addChild(s.doc, { parentId: s.ids.chu!, person: { fullName: 'Con của chú', gender: 'male' }, kind: 'biological' }, s.newId));
    return { ...s, doc: kid.doc, kid: kid.id };
  }

  test('thêm mẹ cho người chỉ có cha, cha chưa có vợ', () => {
    const { doc, ids, kid, newId } = onlyFather();
    const r = ok(addMissingParent(doc, { childId: kid, person: { fullName: 'Mẹ mới' } }, newId));
    const mother = r.doc.persons.find((p) => p.id === r.id)!;
    expect(mother).toMatchObject({ isOutsider: true, gender: 'female' });
    expect(spouseIdsOf(r.doc, ids.chu!)).toEqual([r.id]);
    expect(r.doc.parents.some((l) => l.parentId === r.id && l.childId === kid && l.role === 'mother')).toBe(true);
  });

  test('cha đã có vợ', () => {
    const { doc, ids, kid, newId } = onlyFather();
    const married = ok(addSpouse(doc, { personId: ids.chu!, person: { fullName: 'Thím' } }, newId)).doc;
    expect(err(addMissingParent(married, { childId: kid, person: { fullName: 'X' } }, newId))).toBe('PARENT_ALREADY_MARRIED');
  });

  test('thuỷ tổ, vợ thuỷ tổ, người đã đủ cha mẹ, người chưa có cha mẹ nào', () => {
    const { doc, ids, newId } = sample();
    expect(err(addMissingParent(doc, { childId: ids.ong!, person: { fullName: 'X' } }, newId))).toBe('ROOT_LOCKED');
    expect(err(addMissingParent(doc, { childId: ids.ba!, person: { fullName: 'X' } }, newId))).toBe('ROOT_LOCKED');
    expect(err(addMissingParent(doc, { childId: ids.chau!, person: { fullName: 'X' } }, newId))).toBe('ALREADY_HAS_PARENT');
    expect(err(addMissingParent(doc, { childId: ids.me!, person: { fullName: 'X' } }, newId))).toBe('NO_PARENT');
  });
});

describe('gỡ người (đánh dấu, giữ dữ liệu)', () => {
  test('gỡ người không có con: biến khỏi cây nhưng dữ liệu còn', () => {
    const { doc, ids, newId } = sample();
    const r = ok(removePerson(doc, ids.chu!, NOW, newId));
    const v = activeView(r.doc);
    expect(v.persons.some((p) => p.id === ids.chu)).toBe(false);
    expect(childrenOf(r.doc, ids.ong!).map((c) => c.id)).toEqual([ids.cha]);
    const kept = r.doc.persons.find((p) => p.id === ids.chu)!;
    expect(kept).toMatchObject({ fullName: 'Nguyễn Văn Chú', removedAt: NOW });
    expect(r.doc.parents.filter((l) => l.childId === ids.chu).every((l) => l.removedAt === NOW)).toBe(true);
  });

  test('gỡ người có con bị từ chối', () => {
    const { doc, ids, newId } = sample();
    expect(err(removePerson(doc, ids.cha!, NOW, newId))).toBe('HAS_CHILDREN');
  });

  test('gỡ người cuối cùng của họ kéo theo vợ/chồng ngoại tộc mồ côi', () => {
    const { doc, ids, newId } = sample();
    const withWife = ok(addSpouse(doc, { personId: ids.chu!, person: { fullName: 'Thím' } }, newId));
    const r = ok(removePerson(withWife.doc, ids.chu!, NOW, newId));
    expect(activeView(r.doc).persons.some((p) => p.id === withWife.id)).toBe(false);
    expect(marriagesOf(r.doc, ids.chu!)).toEqual([]);
  });

  test('gỡ cả nhánh: con cháu, vợ chồng ngoại tộc, chung removalId', () => {
    const { doc, ids, newId } = sample();
    expect(branchSize(doc, ids.cha!)).toBe(3); // cha, me, chau
    const r = ok(removeBranch(doc, ids.cha!, NOW, newId));
    expect(r.count).toBe(3);
    const v = activeView(r.doc);
    expect(v.persons.map((p) => p.id).sort()).toEqual([ids.ong, ids.ba, ids.chu].sort());
    const stamps = r.doc.persons.filter((p) => p.removedAt).map((p) => p.removalId);
    expect(new Set(stamps).size).toBe(1);
    expect(stamps).toHaveLength(3);
  });

  test('thuỷ tổ không gỡ được', () => {
    const { doc, ids, newId } = sample();
    expect(err(removePerson(doc, ids.ong!, NOW, newId))).toBe('ROOT_LOCKED');
    expect(err(removeBranch(doc, ids.ong!, NOW, newId))).toBe('ROOT_LOCKED');
  });

  test('bản xuất vẫn chứa nhánh đã gỡ', () => {
    const { doc, ids, newId } = sample();
    const r = ok(removeBranch(doc, ids.cha!, NOW, newId));
    const exported = JSON.parse(JSON.stringify(r.doc)) as TreeDoc;
    expect(exported.persons.filter((p) => p.removedAt)).toHaveLength(3);
    expect(exported.parents.some((l) => l.removedAt)).toBe(true);
  });

  test('người đã gỡ không còn tính vào luật: thêm lại cha ruột được', () => {
    const { doc, ids, newId } = sample();
    const kid = ok(addChild(doc, { parentId: ids.chu!, person: { fullName: 'Con', gender: 'male' }, kind: 'biological' }, newId));
    const removed = ok(removePerson(kid.doc, kid.id, NOW, newId));
    expect(err(removePerson(removed.doc, kid.id, NOW, newId))).toBe('NOT_FOUND');
  });
});

describe('thứ tự', () => {
  test('đổi chỗ hai anh em', () => {
    const { doc, ids, newId } = sample();
    const third = ok(addChild(doc, { parentId: ids.ong!, person: { fullName: 'Út', gender: 'male' }, kind: 'biological' }, newId));
    const r = ok(reorderSiblings(third.doc, ids.ong!, [third.id, ids.cha!, ids.chu!]));
    expect(childrenOf(r.doc, ids.ong!).map((c) => c.id)).toEqual([third.id, ids.cha, ids.chu]);
    expect(childrenOf(r.doc, ids.ong!).map((c) => c.siblingOrder)).toEqual([1, 2, 3]);
  });

  test('tập không khớp', () => {
    const { doc, ids } = sample();
    expect(err(reorderSiblings(doc, ids.ong!, [ids.cha!]))).toBe('INVALID_ORDER');
    expect(err(reorderSiblings(doc, ids.ong!, [ids.cha!, ids.cha!]))).toBe('INVALID_ORDER');
  });

  test('thứ tự các bà', () => {
    const { doc, ids, newId } = sample();
    const two = ok(addSpouse(doc, { personId: ids.ong!, person: { fullName: 'Bà Hai' } }, newId));
    const r = ok(reorderSpouses(two.doc, ids.ong!, [two.id, ids.ba!]));
    expect(spouseIdsOf(r.doc, ids.ong!)).toEqual([two.id, ids.ba]);
  });
});

describe('sửa hồ sơ', () => {
  test('chỉ nhớ năm', () => {
    const { doc, ids } = sample();
    const r = ok(updatePerson(doc, ids.ong!, { birth: { year: 1890, lunar: false } }));
    expect(r.doc.persons.find((p) => p.id === ids.ong)!.birth).toEqual({ year: 1890, lunar: false });
  });

  test('ngày không hợp lệ không lưu', () => {
    const { doc, ids } = sample();
    expect(err(updatePerson(doc, ids.ong!, { birth: { year: 1960, month: 2, day: 30, lunar: false } }))).toBe('INVALID_DATE');
  });

  test('xoá ngày bằng null', () => {
    const { doc, ids } = sample();
    const set = ok(updatePerson(doc, ids.ong!, { death: { year: 1968, lunar: false } })).doc;
    const cleared = ok(updatePerson(set, ids.ong!, { death: null }));
    expect(cleared.doc.persons.find((p) => p.id === ids.ong)!.death).toBeUndefined();
  });

  test('đổi giới tính làm sai vai trò', () => {
    const { doc, ids } = sample();
    expect(err(updatePerson(doc, ids.cha!, { gender: 'female' }))).toBe('ROLE_GENDER_MISMATCH'); // đang là cha của cháu
    expect(err(updatePerson(doc, ids.ong!, { gender: 'female' }))).toBe('ROLE_GENDER_MISMATCH'); // đang là chồng
    expect(err(updatePerson(doc, ids.chu!, { fullName: '  ' }))).toBe('MISSING_NAME');
  });

  test('đổi giới tính người không ràng buộc', () => {
    const { doc, ids } = sample();
    expect(ok(updatePerson(doc, ids.chu!, { gender: 'female' })).doc.persons.find((p) => p.id === ids.chu)!.gender).toBe('female');
  });
});

describe('thao tác lỗi không làm đổi cây', () => {
  test('mọi thao tác bị từ chối giữ nguyên doc', () => {
    const { doc, ids, newId } = sample();
    const before = JSON.stringify(doc);
    const attempts = [
      addRoot(doc, { fullName: 'X', gender: 'male' }, newId),
      addChild(doc, { parentId: ids.me!, person: { fullName: 'X', gender: 'male' }, kind: 'biological' }, newId),
      addChild(doc, { parentId: ids.cha!, other: ids.ba!, person: { fullName: 'X', gender: 'male' }, kind: 'biological' }, newId),
      addSpouse(doc, { personId: ids.ba!, person: { fullName: 'X' } }, newId),
      addMissingParent(doc, { childId: ids.ong!, person: { fullName: 'X' } }, newId),
      removePerson(doc, ids.cha!, NOW, newId),
      removeBranch(doc, ids.ong!, NOW, newId),
      reorderSiblings(doc, ids.ong!, [ids.cha!]),
      reorderSpouses(doc, ids.ong!, []),
      updatePerson(doc, ids.cha!, { gender: 'female' }),
      updatePerson(doc, ids.cha!, { birth: { year: 1700, lunar: false } }),
    ];
    for (const r of attempts) expect(r.ok).toBe(false);
    expect(JSON.stringify(doc)).toBe(before);
  });

  test('thao tác thành công cũng không sửa doc đầu vào', () => {
    const { doc, ids, newId } = sample();
    const before = JSON.stringify(doc);
    ok(addChild(doc, { parentId: ids.cha!, person: { fullName: 'X', gender: 'male' }, kind: 'biological' }, newId));
    ok(removeBranch(doc, ids.cha!, NOW, newId));
    ok(updatePerson(doc, ids.cha!, { fullName: 'Khác' }));
    expect(JSON.stringify(doc)).toBe(before);
  });
});
