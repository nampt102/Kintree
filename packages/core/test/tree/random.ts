import { activeView, addChild, addRoot, addSpouse, createTree, marriagesOf, type TreeDoc } from '../../src/tree/index.ts';
import { counter, ok } from './helpers.ts';

/** Cây ngẫu nhiên với hạt giống cố định (mulberry32), dựng bằng chính các thao tác của core. */
export function randomTree(size: number, seed = 1): { doc: TreeDoc; newId: () => string } {
  let a = seed;
  const rnd = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const newId = counter();
  let doc = ok(createTree({ name: 'Ngẫu nhiên' }, newId)).doc;
  doc = ok(addRoot(doc, { fullName: 'Tổ', gender: 'male' }, newId)).doc;
  let n = 1;
  while (n < size) {
    const blood = activeView(doc).persons.filter((p) => !p.isOutsider);
    const p = blood[Math.floor(rnd() * blood.length)]!;
    if (rnd() < 0.3 && p.gender !== 'unknown' && marriagesOf(doc, p.id).length < 2) {
      const r = addSpouse(doc, { personId: p.id, person: { fullName: `Vợ chồng ${n}` } }, newId);
      if (r.ok) {
        doc = r.doc;
        n++;
      }
      continue;
    }
    const sp = marriagesOf(doc, p.id);
    const other = sp.length ? sp[Math.floor(rnd() * sp.length)]! : null;
    const otherId = other ? (other.husbandId === p.id ? other.wifeId : other.husbandId) : null;
    const r = addChild(
      doc,
      { parentId: p.id, other: otherId, kind: 'biological', person: { fullName: `Người ${n}`, gender: rnd() < 0.5 ? 'male' : 'female' } },
      newId,
    );
    if (r.ok) {
      doc = r.doc;
      n++;
    }
  }
  return { doc, newId };
}
