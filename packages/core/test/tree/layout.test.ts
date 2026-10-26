import { describe, expect, test } from 'vitest';
import {
  addChild,
  addSpouse,
  computeLayout,
  removePerson,
  reorderSiblings,
  reorderSpouses,
  revealPerson,
  type Layout,
  type TreeDoc,
} from '../../src/tree/index.ts';
import { ok, sample } from './helpers.ts';
import { randomTree } from './random.ts';

const node = (l: Layout, id: string) => l.nodes.find((n) => n.id === id)!;
const cx = (l: Layout, id: string) => node(l, id).x + node(l, id).width / 2;

function overlaps(l: Layout): string[] {
  const bad: string[] = [];
  const sorted = [...l.nodes].sort((a, b) => a.y - b.y || a.x - b.x);
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]!;
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j]!;
      if (b.y !== a.y) break;
      if (b.x < a.x + a.width) bad.push(`${a.id}/${b.id}`);
    }
  }
  return bad;
}

describe('ba đời', () => {
  test('thuỷ tổ trên cùng, hai con cùng hàng theo thứ tự, cháu hàng thứ ba', () => {
    const { doc, ids } = sample();
    const l = computeLayout(doc);
    expect(l.rows.map((r) => r.generation)).toEqual([1, 2, 3]);
    expect(node(l, ids.ong!).generation).toBe(1);
    expect(node(l, ids.cha!).y).toBe(node(l, ids.chu!).y);
    expect(node(l, ids.cha!).y).toBeGreaterThan(node(l, ids.ong!).y);
    expect(node(l, ids.cha!).x).toBeLessThan(node(l, ids.chu!).x); // cha là con cả
    expect(node(l, ids.chau!).generation).toBe(3);
    expect(node(l, ids.chau!).y).toBeGreaterThan(node(l, ids.cha!).y);
  });

  test('vợ chồng cùng hàng, cạnh nhau', () => {
    const { doc, ids } = sample();
    const l = computeLayout(doc);
    expect(node(l, ids.ba!).y).toBe(node(l, ids.ong!).y);
    expect(node(l, ids.ba!).x).toBeGreaterThan(node(l, ids.ong!).x);
    expect(l.edges).toContainEqual({ id: `m:${ids.ong}:${ids.ba}`, type: 'marriage', from: ids.ong, to: ids.ba });
  });

  test('con hạ xuống từ giữa cặp cha mẹ', () => {
    const { doc, ids } = sample();
    const l = computeLayout(doc);
    const e = l.edges.find((x) => x.type === 'child' && x.to === ids.chau)!;
    const j = l.junctions.find((x) => x.id === e.from)!;
    expect(j.x).toBeCloseTo((cx(l, ids.cha!) + cx(l, ids.me!)) / 2);
    expect(cx(l, ids.chau!)).toBeCloseTo(j.x); // cháu là con duy nhất: nằm ngay dưới cặp
  });

  test('đổi thứ tự anh em đổi vị trí trái phải', () => {
    const { doc, ids } = sample();
    const r = ok(reorderSiblings(doc, ids.ong!, [ids.chu!, ids.cha!]));
    const l = computeLayout(r.doc);
    expect(node(l, ids.chu!).x).toBeLessThan(node(l, ids.cha!).x);
  });
});

test('đường nối mang loại quan hệ: ruột, nuôi, riêng', () => {
  const { doc, ids, newId } = sample();
  const adopted = ok(addChild(doc, { parentId: ids.cha!, person: { fullName: 'Nuôi', gender: 'female' }, kind: 'adopted' }, newId));
  const step = ok(addChild(adopted.doc, { parentId: ids.cha!, person: { fullName: 'Riêng', gender: 'male' }, kind: 'step' }, newId));
  const l = computeLayout(step.doc);
  const kindTo = (id: string) => l.edges.find((e) => e.type === 'child' && e.to === id);
  expect(kindTo(ids.chau!)).toMatchObject({ kind: 'biological' });
  expect(kindTo(adopted.id)).toMatchObject({ kind: 'adopted' });
  expect(kindTo(step.id)).toMatchObject({ kind: 'step' });
});

describe('nhiều vợ', () => {
  function twoWives() {
    const s = sample();
    const w2 = ok(addSpouse(s.doc, { personId: s.ids.chu!, person: { fullName: 'Thím Một' } }, s.newId));
    const w3 = ok(addSpouse(w2.doc, { personId: s.ids.chu!, person: { fullName: 'Thím Hai' } }, s.newId));
    const k1 = ok(addChild(w3.doc, { parentId: s.ids.chu!, other: w2.id, person: { fullName: 'Con bà một', gender: 'male' }, kind: 'biological' }, s.newId));
    const k2 = ok(addChild(k1.doc, { parentId: s.ids.chu!, other: w3.id, person: { fullName: 'Con bà hai', gender: 'female' }, kind: 'biological' }, s.newId));
    return { ...s, doc: k2.doc, w2: w2.id, w3: w3.id, k1: k1.id, k2: k2.id };
  }

  test('mỗi con hạ xuống từ đúng cặp cha mẹ', () => {
    const { doc, ids, w2, w3, k1, k2 } = twoWives();
    const l = computeLayout(doc);
    const from = (k: string) => l.edges.find((e) => e.type === 'child' && e.to === k)!.from;
    expect(from(k1)).toBe(`u:${ids.chu}:${w2}`);
    expect(from(k2)).toBe(`u:${ids.chu}:${w3}`);
    expect(overlaps(l)).toEqual([]);
  });

  test('thứ tự các bà ảnh hưởng chỗ đứng', () => {
    const { doc, ids, w2, w3 } = twoWives();
    expect(node(computeLayout(doc), w2).x).toBeLessThan(node(computeLayout(doc), w3).x);
    const swapped = ok(reorderSpouses(doc, ids.chu!, [w3, w2])).doc;
    const l = computeLayout(swapped);
    expect(node(l, w3).x).toBeLessThan(node(l, w2).x);
  });
});

describe('thu gọn và xem riêng một nhánh', () => {
  function wide() {
    const s = sample();
    let doc: TreeDoc = s.doc;
    const kids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = ok(addChild(doc, { parentId: s.ids.chu!, person: { fullName: `Cháu chú ${i}`, gender: 'male' }, kind: 'biological' }, s.newId));
      doc = r.doc;
      kids.push(r.id);
    }
    return { ...s, doc, kids };
  }

  test('thu gọn: ẩn 5 người, khung ghi 5 người đang ẩn', () => {
    const { doc, ids, kids } = wide();
    const l = computeLayout(doc, { collapsed: new Set([ids.chu!]) });
    for (const k of kids) expect(l.nodes.some((n) => n.id === k)).toBe(false);
    expect(node(l, ids.chu!)).toMatchObject({ collapsed: true, hiddenCount: 5 });
    expect(node(l, ids.cha!).collapsed).toBe(false);
  });

  test('số người ẩn tính cả vợ/chồng của con cháu', () => {
    const { doc, ids, kids, newId } = wide();
    const w = ok(addSpouse(doc, { personId: kids[0]!, person: { fullName: 'Dâu' } }, newId));
    expect(node(computeLayout(w.doc, { collapsed: new Set([ids.chu!]) }), ids.chu!).hiddenCount).toBe(6);
  });

  test('xem riêng nhánh: chỉ còn người ấy, vợ/chồng, con cháu; đời giữ số thật', () => {
    const { doc, ids } = sample();
    const l = computeLayout(doc, { focusId: ids.cha! });
    expect(l.nodes.map((n) => n.id).sort()).toEqual([ids.cha, ids.me, ids.chau].sort());
    expect(node(l, ids.cha!).generation).toBe(2);
    expect(l.rows.map((r) => r.generation)).toEqual([2, 3]);
    expect(node(l, ids.cha!).y).toBe(0);
  });

  test('xem riêng từ dâu thì lấy người trong họ', () => {
    const { doc, ids } = sample();
    const l = computeLayout(doc, { focusId: ids.me! });
    expect(l.nodes.map((n) => n.id).sort()).toEqual([ids.cha, ids.me, ids.chau].sort());
  });

  test('revealPerson mở các nhánh che người cần tìm', () => {
    const { doc, ids } = sample();
    const collapsed = new Set([ids.ong!, ids.cha!]);
    expect(computeLayout(doc, { collapsed }).nodes.some((n) => n.id === ids.chau)).toBe(false);
    const open = revealPerson(doc, collapsed, ids.chau!);
    expect(open.size).toBe(0);
    expect(computeLayout(doc, { collapsed: open }).nodes.some((n) => n.id === ids.chau)).toBe(true);
    // tìm dâu: mở nhánh của tổ tiên người trong họ, chính người trong họ vẫn hiện
    expect([...revealPerson(doc, new Set([ids.ong!, ids.cha!]), ids.me!)]).toEqual([ids.cha]);
    // không đụng tới nhánh khác
    expect(revealPerson(doc, new Set([ids.chu!]), ids.chau!).has(ids.chu!)).toBe(true);
  });
});

test('cuốn rỗng', () => {
  const empty: TreeDoc = { version: 1, meta: { id: 'x', name: 'x', region: 'north' }, persons: [], parents: [], marriages: [] };
  expect(computeLayout(empty).nodes).toEqual([]);
});

test('người đã gỡ không có trong sơ đồ', () => {
  const { doc, ids, newId } = sample();
  const r = ok(removePerson(doc, ids.chu!, 'now', newId));
  expect(computeLayout(r.doc).nodes.some((n) => n.id === ids.chu)).toBe(false);
});

describe('cây ngẫu nhiên', () => {
  test.each([1, 2, 3, 4, 5])('không chồng khung, con nằm dưới cha mẹ (hạt giống %i)', (seed) => {
    const { doc } = randomTree(150, seed);
    const l = computeLayout(doc);
    expect(l.nodes).toHaveLength(150);
    expect(overlaps(l)).toEqual([]);
    const byId = new Map(l.nodes.map((n) => [n.id, n]));
    for (const e of l.edges) {
      if (e.type !== 'child') continue;
      const j = l.junctions.find((x) => x.id === e.from)!;
      expect(byId.get(e.to)!.y).toBeGreaterThan(j.y);
    }
    for (const n of l.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x + n.width).toBeLessThanOrEqual(l.width + 1e-6);
    }
  });
});

test('bố cục 1.000 người dưới 1 giây', () => {
  const { doc } = randomTree(1000, 7);
  const t0 = performance.now();
  const l = computeLayout(doc);
  const ms = performance.now() - t0;
  console.log(`layout 1000 người: ${ms.toFixed(1)} ms, ${l.rows.length} đời, rộng ${Math.round(l.width)} px`);
  expect(l.nodes).toHaveLength(1000);
  expect(ms).toBeLessThan(1000);
}, 60_000);
