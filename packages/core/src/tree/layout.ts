// Bố cục sơ đồ gia phả theo đời (design D4). Không phụ thuộc DOM: giao diện chỉ việc vẽ các toạ độ này.
//
// Mỗi người trong họ cùng các vợ/chồng của họ tạo thành một "đơn vị" nằm trên một hàng; con cháu của đơn vị
// xếp thành các đơn vị con ở hàng dưới theo thứ tự anh chị em. Chiều rộng của một nhánh = max(rộng đơn vị,
// tổng rộng các nhánh con), nên các nhánh không bao giờ chồng lên nhau.
import type { ChildKind } from '../integrity.ts';
import type { TreeDoc, TreePerson } from './model.ts';
import { activeView, rootOf } from './queries.ts';

export type LayoutOptions = {
  cardWidth?: number;
  cardHeight?: number;
  /** Khoảng trống ngang giữa hai nhánh anh em. */
  gapX?: number;
  /** Khoảng trống ngang giữa hai vợ chồng. */
  spouseGap?: number;
  /** Khoảng trống dọc giữa hai đời. */
  gapY?: number;
  /** Người có con cháu bị thu gọn (ẩn). */
  collapsed?: ReadonlySet<string>;
  /** Chỉ xem nhánh con cháu của người này (và vợ/chồng). Đời vẫn giữ số thật. */
  focusId?: string | null;
};

export type LayoutNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  generation: number;
  collapsed: boolean;
  /** Số người đang bị ẩn do thu gọn người này (0 nếu không thu gọn). */
  hiddenCount: number;
};

/** Điểm nối nằm dưới cặp vợ chồng, nơi các đường xuống con xuất phát. */
export type LayoutJunction = { id: string; x: number; y: number };

export type LayoutEdge =
  | { id: string; type: 'marriage'; from: string; to: string }
  | { id: string; type: 'child'; from: string; to: string; kind: ChildKind };

export type Layout = {
  nodes: LayoutNode[];
  junctions: LayoutJunction[];
  edges: LayoutEdge[];
  width: number;
  height: number;
  /** Mỗi hàng đời: để vẽ nhãn "Đời N" ở lề. */
  rows: { generation: number; y: number }[];
};

const EMPTY: Layout = { nodes: [], junctions: [], edges: [], width: 0, height: 0, rows: [] };

type Index = {
  byId: Map<string, TreePerson>;
  spouses: Map<string, string[]>;
  children: Map<string, TreePerson[]>;
  /** Liên kết cha/mẹ → con, khoá `${parentId}>${childId}`. */
  linkKind: Map<string, ChildKind>;
  parentsOf: Map<string, string[]>;
};

function buildIndex(v: TreeDoc): Index {
  const byId = new Map(v.persons.map((p) => [p.id, p]));
  const spouses = new Map<string, string[]>();
  for (const m of [...v.marriages].sort((a, b) => a.wifeOrder - b.wifeOrder)) {
    (spouses.get(m.husbandId) ?? spouses.set(m.husbandId, []).get(m.husbandId)!).push(m.wifeId);
    (spouses.get(m.wifeId) ?? spouses.set(m.wifeId, []).get(m.wifeId)!).push(m.husbandId);
  }
  const children = new Map<string, TreePerson[]>();
  const linkKind = new Map<string, ChildKind>();
  const parentsOf = new Map<string, string[]>();
  for (const l of v.parents) {
    const c = byId.get(l.childId);
    if (!c) continue;
    linkKind.set(`${l.parentId}>${l.childId}`, l.kind);
    (parentsOf.get(l.childId) ?? parentsOf.set(l.childId, []).get(l.childId)!).push(l.parentId);
    const list = children.get(l.parentId) ?? children.set(l.parentId, []).get(l.parentId)!;
    if (!list.includes(c)) list.push(c);
  }
  for (const list of children.values()) list.sort((a, b) => a.siblingOrder - b.siblingOrder);
  return { byId, spouses, children, linkKind, parentsOf };
}

function generationMap(ix: Index, rootId: string): Map<string, number> {
  const gen = new Map<string, number>([[rootId, 1]]);
  const queue = [rootId];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]!;
    const g = gen.get(id)!;
    for (const s of ix.spouses.get(id) ?? []) if (!gen.has(s)) (gen.set(s, g), queue.push(s));
    for (const c of ix.children.get(id) ?? []) if (!gen.has(c.id)) (gen.set(c.id, g + 1), queue.push(c.id));
  }
  return gen;
}

type Unit = { id: string; members: string[]; kids: Unit[]; width: number; unitWidth: number; collapsed: boolean };

export function computeLayout(doc: TreeDoc, options: LayoutOptions = {}): Layout {
  const W = options.cardWidth ?? 180;
  const H = options.cardHeight ?? 72;
  const gapX = options.gapX ?? 24;
  const spouseGap = options.spouseGap ?? 16;
  const gapY = options.gapY ?? 72;

  const v = activeView(doc);
  const root = rootOf(v);
  if (!root) return EMPTY;
  const ix = buildIndex(v);
  const gen = generationMap(ix, root.id);

  let start = root;
  if (options.focusId) {
    let f = ix.byId.get(options.focusId);
    if (f?.isOutsider) f = ix.byId.get(ix.spouses.get(f.id)?.[0] ?? '');
    if (f && gen.has(f.id)) start = f;
  }

  const seen = new Set<string>();
  const measure = (p: TreePerson): Unit => {
    seen.add(p.id);
    const members = [p.id, ...(ix.spouses.get(p.id) ?? [])];
    members.forEach((m) => seen.add(m));
    const unitWidth = members.length * W + (members.length - 1) * spouseGap;
    const collapsed = !!options.collapsed?.has(p.id) && (ix.children.get(p.id)?.length ?? 0) > 0;
    const kids = collapsed
      ? []
      : (ix.children.get(p.id) ?? []).filter((c) => !seen.has(c.id)).map(measure);
    const kidsWidth = kids.reduce((s, k) => s + k.width, 0) + gapX * Math.max(0, kids.length - 1);
    return { id: p.id, members, kids, width: Math.max(unitWidth, kidsWidth), unitWidth, collapsed };
  };

  const hiddenBelow = (id: string): number => {
    let n = 0;
    for (const c of ix.children.get(id) ?? []) n += 1 + (ix.spouses.get(c.id)?.length ?? 0) + hiddenBelow(c.id);
    return n;
  };

  const genBase = gen.get(start.id)!;
  const nodes: LayoutNode[] = [];
  const junctions = new Map<string, LayoutJunction>();
  const edges: LayoutEdge[] = [];
  const centerX = new Map<string, number>();

  const place = (u: Unit, left: number) => {
    const g = gen.get(u.id)!;
    const y = (g - genBase) * (H + gapY);
    const unitLeft = left + (u.width - u.unitWidth) / 2;
    u.members.forEach((m, i) => {
      const x = unitLeft + i * (W + spouseGap);
      centerX.set(m, x + W / 2);
      nodes.push({
        id: m,
        x,
        y,
        width: W,
        height: H,
        generation: g,
        collapsed: m === u.id && u.collapsed,
        hiddenCount: m === u.id && u.collapsed ? hiddenBelow(u.id) : 0,
      });
      if (i > 0) edges.push({ id: `m:${u.id}:${m}`, type: 'marriage', from: u.id, to: m });
    });

    const junctionFor = (otherId: string | null) => {
      const jid = `u:${u.id}:${otherId ?? 'none'}`;
      if (!junctions.has(jid)) {
        const px = centerX.get(u.id)!;
        junctions.set(jid, { id: jid, x: otherId ? (px + centerX.get(otherId)!) / 2 : px, y: y + H });
      }
      return jid;
    };

    const kidsWidth = u.kids.reduce((s, k) => s + k.width, 0) + gapX * Math.max(0, u.kids.length - 1);
    let x = left + (u.width - kidsWidth) / 2;
    for (const k of u.kids) {
      place(k, x);
      x += k.width + gapX;
      const parents = ix.parentsOf.get(k.id) ?? [];
      const other = parents.find((pid) => pid !== u.id && u.members.includes(pid)) ?? null;
      const kind = ix.linkKind.get(`${u.id}>${k.id}`) ?? 'biological';
      edges.push({ id: `c:${u.id}:${k.id}`, type: 'child', from: junctionFor(other), to: k.id, kind });
    }
  };

  const tree = measure(start);
  place(tree, 0);

  const maxGen = Math.max(...nodes.map((n) => n.generation));
  const rows = Array.from({ length: maxGen - genBase + 1 }, (_, i) => ({ generation: genBase + i, y: i * (H + gapY) }));
  return {
    nodes,
    junctions: [...junctions.values()],
    edges,
    width: tree.width,
    height: rows.length * (H + gapY) - gapY,
    rows,
  };
}

/** Bỏ khỏi `collapsed` mọi tổ tiên của `id` để người ấy hiện ra. */
export function revealPerson(doc: TreeDoc, collapsed: ReadonlySet<string>, id: string): Set<string> {
  const v = activeView(doc);
  const ix = buildIndex(v);
  const next = new Set(collapsed);
  // Dâu/rể hiện cùng người trong họ của họ, nên đi lên từ người trong họ.
  const base = ix.byId.get(id)?.isOutsider ? (ix.spouses.get(id) ?? []) : [id];
  const stack = base.flatMap((b) => ix.parentsOf.get(b) ?? []);
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    next.delete(cur);
    for (const p of ix.parentsOf.get(cur) ?? []) stack.push(p);
  }
  return next;
}
