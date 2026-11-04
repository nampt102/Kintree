// Quan hệ và từ gọi (xưng hô) ba miền giữa hai người trong một cuốn (change kinship-terms, design D1–D2). Hàm thuần.
import type { Gender } from './integrity.ts';
import type { Region, TreeDoc, TreePerson } from './tree/model.ts';
import { activeView } from './tree/queries.ts';

export type Step = 'father' | 'mother' | 'child';
export type Seniority = 'older' | 'younger' | 'unknown';

/** Quan hệ huyết thống từ A tới B: đi lên `up` đời tới tổ chung gần nhất rồi xuống `down` đời. */
export type BloodPath = {
  /** Từ A đi lên (cha hoặc mẹ), mỗi bước kèm người tới được. */
  upIds: string[];
  upSteps: ('father' | 'mother')[];
  /** Từ tổ chung đi xuống tới B (không gồm tổ chung). */
  downIds: string[];
};

export type Relation =
  | { kind: 'self' }
  | { kind: 'blood'; path: BloodPath; up: number; down: number; side?: 'paternal' | 'maternal'; senior?: Seniority }
  /** B là vợ/chồng của X; X là người có quan hệ huyết thống `rel` với A (gồm X = A). */
  | { kind: 'spouseOf'; spouseId: string; rel: Extract<Relation, { kind: 'blood' | 'self' }> }
  /** B là người có quan hệ huyết thống `rel` với S; S là vợ/chồng của A. */
  | { kind: 'ofSpouse'; spouseId: string; rel: Extract<Relation, { kind: 'blood' }> };

export type Term = { term: string; known: boolean };

export const FAR = 'Họ hàng xa';
const MAX_GEN = 5;

type Graph = {
  person: Map<string, TreePerson>;
  /** con → các link cha/mẹ */
  parents: Map<string, { id: string; role: 'father' | 'mother'; kind: string }[]>;
  spouses: Map<string, string[]>;
  childKind: Map<string, string>;
};

const graphCache = new WeakMap<TreeDoc, Graph>();

function graphOf(doc: TreeDoc): Graph {
  const hit = graphCache.get(doc);
  if (hit) return hit;
  const v = activeView(doc);
  const g: Graph = { person: new Map(v.persons.map((p) => [p.id, p])), parents: new Map(), spouses: new Map(), childKind: new Map() };
  for (const l of v.parents) {
    g.parents.set(l.childId, [...(g.parents.get(l.childId) ?? []), { id: l.parentId, role: l.role, kind: l.kind }]);
    g.childKind.set(`${l.parentId}>${l.childId}`, l.kind);
  }
  for (const m of v.marriages) {
    g.spouses.set(m.husbandId, [...(g.spouses.get(m.husbandId) ?? []), m.wifeId]);
    g.spouses.set(m.wifeId, [...(g.spouses.get(m.wifeId) ?? []), m.husbandId]);
  }
  graphCache.set(doc, g);
  return g;
}

/** Tổ tiên của một người (gồm chính họ ở khoảng cách 0) kèm đường đi ngắn nhất. */
function ancestors(g: Graph, id: string): Map<string, { ids: string[]; steps: ('father' | 'mother')[] }> {
  const out = new Map<string, { ids: string[]; steps: ('father' | 'mother')[] }>([[id, { ids: [], steps: [] }]]);
  let frontier = [id];
  for (let d = 0; d < MAX_GEN + 2 && frontier.length; d++) {
    const next: string[] = [];
    for (const cur of frontier) {
      const base = out.get(cur)!;
      for (const p of g.parents.get(cur) ?? []) {
        if (out.has(p.id)) continue;
        out.set(p.id, { ids: [...base.ids, p.id], steps: [...base.steps, p.role] });
        next.push(p.id);
      }
    }
    frontier = next;
  }
  return out;
}

/** Vai của b so với a (hai người cùng đời ở chỗ rẽ): thứ tự anh chị em nếu chung cha/mẹ, không thì năm sinh. */
function seniority(g: Graph, aId: string, bId: string): Seniority {
  const a = g.person.get(aId)!;
  const b = g.person.get(bId)!;
  const pa = new Set((g.parents.get(aId) ?? []).map((p) => p.id));
  const shared = (g.parents.get(bId) ?? []).some((p) => pa.has(p.id));
  if (shared && a.siblingOrder !== b.siblingOrder) return b.siblingOrder < a.siblingOrder ? 'older' : 'younger';
  if (a.birth?.year !== undefined && b.birth?.year !== undefined && a.birth.year !== b.birth.year) return b.birth.year < a.birth.year ? 'older' : 'younger';
  return 'unknown';
}

function blood(g: Graph, aId: string, bId: string, ancA = ancestors(g, aId)): Extract<Relation, { kind: 'blood' | 'self' }> | null {
  if (aId === bId) return { kind: 'self' };
  const ancB = ancestors(g, bId);
  let best: { lca: string; up: number; down: number } | null = null;
  for (const [id, pa] of ancA) {
    const pb = ancB.get(id);
    if (!pb) continue;
    const up = pa.ids.length;
    const down = pb.ids.length;
    if (!best || up + down < best.up + best.down) best = { lca: id, up, down };
  }
  if (!best) return null;
  const pa = ancA.get(best.lca)!;
  const pb = ancB.get(best.lca)!;
  // Đường xuống từ tổ chung tới B = đường lên của B đảo ngược, bỏ tổ chung, thêm B.
  const downIds = [...pb.ids.slice(0, -1).reverse(), bId];
  const path: BloodPath = { upIds: pa.ids, upSteps: pa.steps, downIds };
  const rel: Extract<Relation, { kind: 'blood' }> = { kind: 'blood', path, up: best.up, down: best.down };
  if (best.up >= 1) rel.side = pa.steps[0] === 'father' ? 'paternal' : 'maternal';
  if (best.up >= 1 && best.down >= 1) {
    // Hai người cùng đời ngay dưới tổ chung: nhánh của A và nhánh của B.
    const a1 = best.up === 1 ? aId : pa.ids[best.up - 2]!;
    const b1 = downIds[0]!;
    rel.senior = seniority(g, a1, b1);
  }
  return rel;
}

/** Quan hệ từ A tới B: huyết thống trước, rồi thông gia một bước vợ/chồng ở đầu hoặc cuối. null = không có đường. */
export function relationBetween(doc: TreeDoc, aId: string, bId: string): Relation | null {
  const g = graphOf(doc);
  if (!g.person.has(aId) || !g.person.has(bId)) return null;
  const ancA = ancestors(g, aId);
  const direct = blood(g, aId, bId, ancA);
  if (direct) return direct;
  const size = (r: Extract<Relation, { kind: 'blood' | 'self' }>) => (r.kind === 'self' ? 0 : r.up + r.down);
  let best: Relation | null = null;
  let bestSize = Infinity;
  for (const x of g.spouses.get(bId) ?? []) {
    const r = blood(g, aId, x, ancA);
    if (r && size(r) < bestSize) {
      best = { kind: 'spouseOf', spouseId: x, rel: r };
      bestSize = size(r);
    }
  }
  for (const s of g.spouses.get(aId) ?? []) {
    const r = blood(g, s, bId);
    if (r && r.kind === 'blood' && size(r) < bestSize) {
      best = { kind: 'ofSpouse', spouseId: s, rel: r };
      bestSize = size(r);
    }
  }
  return best;
}

// ---------- Từ gọi ----------

type R = Region;
const by = (region: R, north: string, central: string, south: string) => (region === 'north' ? north : region === 'central' ? central : south);
const pick = (gender: Gender, male: string, female: string, unknown: string) => (gender === 'male' ? male : gender === 'female' ? female : unknown);
const either = (s: Seniority, older: string, younger: string) => (s === 'older' ? older : s === 'younger' ? younger : older === younger ? older : `${older}/${younger}`);

function parentTerm(gender: Gender, region: R) {
  return pick(gender, by(region, 'Bố', 'Ba', 'Ba'), by(region, 'Mẹ', 'Mạ', 'Má'), by(region, 'Bố/Mẹ', 'Ba/Mạ', 'Ba/Má'));
}

function ancestorTerm(gen: number, gender: Gender, side: 'paternal' | 'maternal' | undefined, region: R): string | null {
  if (gen === 1) return parentTerm(gender, region);
  if (gen === 2) return `${pick(gender, 'Ông', 'Bà', 'Ông/Bà')} ${side === 'maternal' ? 'ngoại' : 'nội'}`;
  const male = (n: string) => (region === 'south' ? `Ông ${n.toLowerCase()}` : `${n} ông`);
  const female = (n: string) => (region === 'south' ? `Bà ${n.toLowerCase()}` : `${n} bà`);
  const name = gen === 3 ? by(region, 'Cụ', 'Cố', 'Cố') : gen === 4 ? by(region, 'Kỵ', 'Kỵ', 'Sơ') : gen === 5 ? 'Tổ' : null;
  if (!name) return null;
  return pick(gender, male(name), female(name), `${male(name)}/${female(name)}`);
}

const DESCENDANT = ['Con', 'Cháu', 'Chắt', 'Chút', 'Chít'];

/** Anh chị em của cha/mẹ (bên `side`), vai `senior` so với cha/mẹ. */
function uncleTerm(gender: Gender, side: 'paternal' | 'maternal', senior: Seniority, region: R): string {
  if (side === 'paternal') {
    if (gender === 'male') return either(senior, 'Bác', 'Chú');
    if (gender === 'female') return region === 'north' ? either(senior, 'Bác', 'Cô') : by(region, '', 'O', 'Cô');
    return either(senior, 'Bác', region === 'central' ? 'Chú/O' : 'Chú/Cô');
  }
  if (gender === 'male') return region === 'north' ? either(senior, 'Bác', 'Cậu') : 'Cậu';
  if (gender === 'female') return region === 'north' ? either(senior, 'Bác', 'Dì') : 'Dì';
  return region === 'north' ? either(senior, 'Bác', 'Cậu/Dì') : 'Cậu/Dì';
}

/** Vợ/chồng của anh chị em cha/mẹ; `x` là người có huyết thống (bác, chú, cô…). */
function uncleSpouseTerm(xGender: Gender, side: 'paternal' | 'maternal', senior: Seniority, region: R): string {
  if (side === 'paternal') {
    if (xGender === 'male') return either(senior, 'Bác', 'Thím');
    return region === 'north' ? either(senior, 'Bác', 'Chú') : 'Dượng';
  }
  if (xGender === 'male') return region === 'north' ? either(senior, 'Bác', 'Mợ') : 'Mợ';
  return region === 'north' ? either(senior, 'Bác', 'Chú') : 'Dượng';
}

function bloodTerm(rel: Extract<Relation, { kind: 'blood' }>, g: Graph, b: TreePerson, region: R): Term {
  const { up, down, side } = rel;
  const senior = rel.senior ?? 'unknown';
  if (up > MAX_GEN || down > MAX_GEN) return { term: FAR, known: false };
  if (down === 0) {
    const t = ancestorTerm(up, b.gender, side, region);
    return t ? { term: t, known: true } : { term: FAR, known: false };
  }
  if (up === 0) return { term: DESCENDANT[down - 1] ?? FAR, known: down <= DESCENDANT.length };
  const gap = up - down;
  if (gap === 0) {
    if (up === 1) return { term: pick(b.gender, either(senior, 'Anh', 'Em'), either(senior, 'Chị', 'Em'), either(senior, 'Anh/Chị', 'Em')), known: true };
    const base = pick(b.gender, either(senior, 'Anh', 'Em'), either(senior, 'Chị', 'Em'), either(senior, 'Anh/Chị', 'Em'));
    return { term: `${base} họ`, known: true };
  }
  if (gap < 0) {
    // Đời dưới A ở nhánh khác: con của anh chị em là "Cháu", rồi như đời dưới trực hệ.
    const t = DESCENDANT[Math.max(1, -gap - 1)];
    return t ? { term: t, known: true } : { term: FAR, known: false };
  }
  if (gap === 1) {
    const t = uncleTerm(b.gender, side!, senior, region);
    return { term: down === 1 ? t : `${t} họ`, known: true };
  }
  if (gap === 2) {
    // Anh chị em của ông bà: "Ông bác", "Bà cô"…; vai và bên lấy theo ông/bà ở nhánh của A.
    const a1 = g.person.get(rel.path.upIds[up - 2]!)!;
    const inner = uncleTerm(b.gender, a1.gender === 'female' ? 'maternal' : 'paternal', senior, region).toLowerCase();
    const head = pick(b.gender, 'Ông', 'Bà', 'Ông/Bà');
    return { term: down === 1 ? `${head} ${inner}` : `${head} họ`, known: true };
  }
  return { term: FAR, known: false };
}

/** Từ A dùng để gọi B, theo vùng miền của cuốn. */
export function kinshipTerm(doc: TreeDoc, rel: Relation | null, bId: string): Term {
  const g = graphOf(doc);
  const b = g.person.get(bId);
  const region = doc.meta.region;
  if (!rel || !b) return { term: FAR, known: false };
  if (rel.kind === 'self') return { term: 'Tôi', known: true };
  if (rel.kind === 'blood') return bloodTerm(rel, g, b, region);

  if (rel.kind === 'spouseOf') {
    const x = g.person.get(rel.spouseId)!;
    const r = rel.rel;
    if (r.kind === 'self') return { term: pick(b.gender, 'Chồng', 'Vợ', 'Vợ/Chồng'), known: true };
    const dIn = (male: string, female: string) => ({ term: pick(b.gender, male, female, `${female}/${male}`), known: true });
    if (r.up === 0 && r.down === 1) return dIn('Con rể', 'Con dâu');
    if (r.up === 0 && r.down === 2) return dIn('Cháu rể', 'Cháu dâu');
    if (r.up === 1 && r.down === 1) {
      const s = r.senior ?? 'unknown';
      return x.gender === 'female' ? { term: either(s, 'Anh rể', 'Em rể'), known: true } : { term: either(s, 'Chị dâu', 'Em dâu'), known: true };
    }
    if (r.up === 2 && r.down === 1) return { term: uncleSpouseTerm(x.gender, r.side!, r.senior ?? 'unknown', region), known: true };
    if (r.down === r.up + 1 && r.up >= 1) return dIn('Cháu rể', 'Cháu dâu');
    return { term: FAR, known: false };
  }

  // ofSpouse: người nhà của vợ/chồng A.
  const s = g.person.get(rel.spouseId)!;
  const r = rel.rel;
  const suffix = s.gender === 'male' ? 'chồng' : s.gender === 'female' ? 'vợ' : 'chồng/vợ';
  if (r.up === 1 && r.down === 0) return { term: `${parentTerm(b.gender, region)} ${suffix}`, known: true };
  if (r.up === 1 && r.down === 1) {
    const sib = pick(b.gender, either(r.senior ?? 'unknown', 'Anh', 'Em'), either(r.senior ?? 'unknown', 'Chị', 'Em'), either(r.senior ?? 'unknown', 'Anh/Chị', 'Em'));
    return { term: `${sib} ${suffix}`, known: true };
  }
  return { term: FAR, known: false };
}

// ---------- Đường quan hệ bằng chữ ----------

const childWord = (g: Graph, parentId: string, childId: string) => {
  const kind = g.childKind.get(`${parentId}>${childId}`);
  const base = pick(g.person.get(childId)!.gender, 'con trai', 'con gái', 'con');
  return kind === 'adopted' ? `${base} nuôi` : kind === 'step' ? `${base} riêng` : base;
};
const parentWord = (step: 'father' | 'mother') => (step === 'father' ? 'cha' : 'mẹ');

function describeBlood(rel: Extract<Relation, { kind: 'blood' | 'self' }>, g: Graph, aId: string): string {
  if (rel.kind === 'self') return 'chính bạn';
  const { up, down, path } = rel;
  const lca = up === 0 ? aId : path.upIds[up - 1]!;
  const parentOf = (i: number) => (i === 0 ? lca : path.downIds[i - 1]!);
  // Đoạn từ A đi lên `n` bước, viết từ xa về gần: "cha của mẹ".
  const ups = (n: number) => path.upSteps.slice(0, n).map(parentWord).reverse().join(' của ');
  if (down === 0) return ups(up);
  // Đoạn đi xuống, viết từ B về gần (bỏ `skip` bước đầu dưới tổ chung).
  const downs = (skip: number) => {
    const w: string[] = [];
    for (let i = down - 1; i >= skip; i--) w.push(childWord(g, parentOf(i), path.downIds[i]!));
    return w;
  };
  if (up === 0) return downs(0).join(' của ');
  const b1 = g.person.get(path.downIds[0]!)!;
  const s = rel.senior ?? 'unknown';
  const sib = pick(b1.gender, s === 'older' ? 'anh trai' : s === 'younger' ? 'em trai' : 'anh/em trai', s === 'older' ? 'chị gái' : s === 'younger' ? 'em gái' : 'chị/em gái', 'anh chị em');
  return [...downs(1), up > 1 ? `${sib} của ${ups(up - 1)}` : sib].join(' của ');
}

/** Đường quan hệ của B với A bằng chữ, vd. "anh trai của cha", "vợ của em trai cha", "mẹ của chồng". */
export function describeRelation(doc: TreeDoc, rel: Relation | null, aId: string, bId: string): string {
  const g = graphOf(doc);
  if (!rel) return 'không tìm thấy quan hệ';
  if (rel.kind === 'self' || rel.kind === 'blood') return describeBlood(rel, g, aId);
  const b = g.person.get(bId)!;
  if (rel.kind === 'spouseOf') {
    const w = pick(b.gender, 'chồng', 'vợ', 'vợ/chồng');
    return rel.rel.kind === 'self' ? w : `${w} của ${describeBlood(rel.rel, g, aId)}`;
  }
  const s = g.person.get(rel.spouseId)!;
  return `${describeBlood(rel.rel, g, rel.spouseId)} của ${pick(s.gender, 'chồng', 'vợ', 'vợ/chồng')}`;
}

export type Kinship = { relation: Relation | null; term: Term; reverse: Term; description: string };

/** Quan hệ hai chiều giữa A và B: A gọi B, B gọi A, và đường quan hệ của B với A. */
export function kinship(doc: TreeDoc, aId: string, bId: string): Kinship {
  const relation = relationBetween(doc, aId, bId);
  return {
    relation,
    term: kinshipTerm(doc, relation, bId),
    reverse: kinshipTerm(doc, relationBetween(doc, bId, aId), aId),
    description: describeRelation(doc, relation, aId, bId),
  };
}

/** Từ A gọi mọi người trong cuốn (cho nhãn trên sơ đồ). */
export function termsFrom(doc: TreeDoc, aId: string): Map<string, Term> {
  const g = graphOf(doc);
  const out = new Map<string, Term>();
  for (const id of g.person.keys()) out.set(id, kinshipTerm(doc, relationBetween(doc, aId, id), id));
  return out;
}
