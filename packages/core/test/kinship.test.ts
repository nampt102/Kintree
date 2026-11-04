import { describe, expect, it } from 'vitest';
import { FAR, kinship, termsFrom } from '../src/kinship.ts';
import type { Gender } from '../src/integrity.ts';
import type { Region, TreeDoc } from '../src/tree/model.ts';

// Cây thử viết tay (không qua các thao tác sửa cây) để đủ mọi ca quan hệ.
// Bên nội: ông bà nội có 5 con theo thứ tự: bác trai, cô cả, cha, cô út, chú út. Bên ngoại: cậu cả, mẹ, dì út, cậu út.
type Spec = [id: string, gender: Gender, order?: number, born?: number];
const P: Spec[] = [
  ['cuOng', 'male'], ['ongNoi', 'male'], ['baNoi', 'female'], ['ongNgoai', 'male'], ['baNgoai', 'female'],
  ['bacTrai', 'male', 1], ['coCa', 'female', 2], ['cha', 'male', 3], ['coUt', 'female', 4], ['chuUt', 'male', 5],
  ['bacGai', 'female'], ['chongCoCa', 'male'], ['chongCoUt', 'male'], ['thim', 'female'],
  ['cauCa', 'male', 1], ['me', 'female', 2], ['diUt', 'female', 3], ['cauUt', 'male', 4],
  ['moCa', 'female'], ['mo', 'female'], ['chongDi', 'male'],
  ['toi', 'male', 1, 1990], ['em', 'female', 2, 1993], ['conNuoi', 'male', 3], ['emRe', 'male'],
  ['conBac', 'male', 1, 1995], ['conChu', 'female', 1, 1985],
  ['vo', 'female', 2], ['anhVo', 'male', 1], ['boVo', 'male'], ['meVo', 'female'], ['voAnhVo', 'female'],
  ['conToi', 'male', 1], ['conDau', 'female'], ['chau', 'male', 1], ['chat', 'female', 1],
  ['chauEm', 'male', 1], ['chauGaiBac', 'female', 1],
  ['bacOng', 'male', 1], ['ongNoiOrder', 'male', 2],
];
const PARENTS: [string, string, ('adopted' | 'step')?][] = [
  ['cuOng', 'ongNoi'],
  ...['bacTrai', 'coCa', 'cha', 'coUt', 'chuUt'].flatMap((c) => [['ongNoi', c], ['baNoi', c]] as [string, string][]),
  ...['cauCa', 'me', 'diUt', 'cauUt'].flatMap((c) => [['ongNgoai', c], ['baNgoai', c]] as [string, string][]),
  ['cha', 'toi'], ['me', 'toi'], ['cha', 'em'], ['me', 'em'], ['cha', 'conNuoi', 'adopted'],
  ['bacTrai', 'conBac'], ['bacGai', 'conBac'], ['chuUt', 'conChu'], ['thim', 'conChu'],
  ['boVo', 'vo'], ['meVo', 'vo'], ['boVo', 'anhVo'], ['meVo', 'anhVo'],
  ['toi', 'conToi'], ['vo', 'conToi'], ['conToi', 'chau'], ['conDau', 'chau'], ['chau', 'chat'],
  ['em', 'chauEm'], ['conBac', 'chauGaiBac'],
];
const MARRIAGES: [string, string][] = [
  ['ongNoi', 'baNoi'], ['ongNgoai', 'baNgoai'], ['cha', 'me'], ['bacTrai', 'bacGai'], ['chongCoCa', 'coCa'], ['chongCoUt', 'coUt'],
  ['chuUt', 'thim'], ['cauCa', 'moCa'], ['cauUt', 'mo'], ['chongDi', 'diUt'], ['toi', 'vo'], ['emRe', 'em'], ['conToi', 'conDau'], ['anhVo', 'voAnhVo'],
];

function makeDoc(region: Region, extra: Partial<TreeDoc> = {}): TreeDoc {
  const father = new Set(P.filter(([, g]) => g === 'male').map(([id]) => id));
  return {
    version: 1,
    meta: { id: 't', name: 'Thử', region },
    persons: P.map(([id, gender, order, born]) => ({ id, fullName: id, gender, isOutsider: false, isRoot: id === 'cuOng', siblingOrder: order ?? 1, ...(born ? { birth: { year: born, lunar: false } } : {}) })),
    parents: PARENTS.map(([p, c, kind]) => ({ parentId: p, childId: c, role: father.has(p) ? 'father' : 'mother', kind: kind ?? 'biological' })),
    marriages: MARRIAGES.map(([h, w], i) => ({ id: `m${i}`, husbandId: h, wifeId: w, wifeOrder: 1 })),
    ...extra,
  };
}
const N = makeDoc('north');
const C = makeDoc('central');
const S = makeDoc('south');
const term = (doc: TreeDoc, b: string, a = 'toi') => kinship(doc, a, b).term.term;
const three = (b: string, a = 'toi') => [term(N, b, a), term(C, b, a), term(S, b, a)];

describe('từ gọi theo miền (A = "toi")', () => {
  it.each([
    ['cha', ['Bố', 'Ba', 'Ba']],
    ['me', ['Mẹ', 'Mạ', 'Má']],
    ['ongNoi', ['Ông nội', 'Ông nội', 'Ông nội']],
    ['baNgoai', ['Bà ngoại', 'Bà ngoại', 'Bà ngoại']],
    ['cuOng', ['Cụ ông', 'Cố ông', 'Ông cố']],
    ['bacTrai', ['Bác', 'Bác', 'Bác']],
    ['bacGai', ['Bác', 'Bác', 'Bác']],
    ['chuUt', ['Chú', 'Chú', 'Chú']],
    ['thim', ['Thím', 'Thím', 'Thím']],
    ['coCa', ['Bác', 'O', 'Cô']],
    ['chongCoCa', ['Bác', 'Dượng', 'Dượng']],
    ['coUt', ['Cô', 'O', 'Cô']],
    ['chongCoUt', ['Chú', 'Dượng', 'Dượng']],
    ['cauCa', ['Bác', 'Cậu', 'Cậu']],
    ['moCa', ['Bác', 'Mợ', 'Mợ']],
    ['cauUt', ['Cậu', 'Cậu', 'Cậu']],
    ['mo', ['Mợ', 'Mợ', 'Mợ']],
    ['diUt', ['Dì', 'Dì', 'Dì']],
    ['chongDi', ['Chú', 'Dượng', 'Dượng']],
  ])('%s', (b, want) => {
    expect(three(b as string)).toEqual(want);
  });

  it('anh chị em, con cháu, vợ chồng, thông gia', () => {
    expect(term(N, 'em')).toBe('Em');
    expect(term(N, 'toi', 'em')).toBe('Anh');
    expect(term(N, 'conToi')).toBe('Con');
    expect(term(N, 'chau')).toBe('Cháu');
    expect(term(N, 'chat')).toBe('Chắt');
    expect(term(N, 'chauEm')).toBe('Cháu');
    expect(term(N, 'vo')).toBe('Vợ');
    expect(term(N, 'toi', 'vo')).toBe('Chồng');
    expect(term(N, 'conDau')).toBe('Con dâu');
    expect(term(N, 'emRe')).toBe('Em rể');
    expect(three('boVo')).toEqual(['Bố vợ', 'Ba vợ', 'Ba vợ']);
    expect(term(S, 'meVo')).toBe('Má vợ');
    expect(term(N, 'anhVo')).toBe('Anh vợ');
    expect(term(N, 'boVo', 'vo')).toBe('Bố');
  });

  it('con chú con bác: vai theo nhánh, không theo tuổi', () => {
    // conBac sinh 1995 (nhỏ hơn toi 1990) nhưng là con của bác → Anh họ; conChu sinh 1985 nhưng là con của chú → Em họ.
    expect(term(N, 'conBac')).toBe('Anh họ');
    expect(term(N, 'conChu')).toBe('Em họ');
    expect(term(N, 'toi', 'conBac')).toBe('Em họ');
    expect(term(N, 'chauGaiBac')).toBe('Cháu');
  });

  it('con nuôi gọi như con ruột; đường quan hệ ghi "con nuôi"', () => {
    expect(term(N, 'conNuoi')).toBe('Em');
    expect(kinship(N, 'toi', 'conNuoi').description).toBe('em trai');
    expect(kinship(N, 'cha', 'conNuoi').description).toBe('con trai nuôi');
  });
});

describe('chiều ngược và đường quan hệ', () => {
  it('bảng người hai chiều: em trai của cha', () => {
    const k = kinship(N, 'toi', 'chuUt');
    expect(k.term.term).toBe('Chú');
    expect(k.reverse.term).toBe('Cháu');
    expect(k.description).toBe('em trai của cha');
  });

  it('ông nội ↔ cháu, miền Nam', () => {
    const k = kinship(S, 'toi', 'ongNoi');
    expect([k.term.term, k.reverse.term, k.description]).toEqual(['Ông nội', 'Cháu', 'cha của cha']);
  });

  it('thông gia và vợ chồng của họ hàng', () => {
    expect(kinship(N, 'toi', 'thim').description).toBe('vợ của em trai của cha');
    expect(kinship(N, 'toi', 'meVo').description).toBe('mẹ của vợ');
    expect(kinship(N, 'toi', 'conBac').description).toBe('con trai của anh trai của cha');
    expect(kinship(N, 'toi', 'chat').description).toBe('con gái của con trai của con trai');
  });
});

describe('không rõ, xa, đã gỡ', () => {
  it('không rõ vai: từ trung tính', () => {
    // Hai anh em cùng cha, cùng thứ tự, không năm sinh.
    const doc = makeDoc('north');
    doc.persons = doc.persons.map((p) => (p.id === 'chuUt' ? { ...p, siblingOrder: 3 } : p));
    expect(term(doc, 'chuUt')).toBe('Bác/Chú');
    expect(term(doc, 'thim')).toBe('Bác/Thím');
  });

  it('giới tính chưa rõ: từ trung tính', () => {
    const doc = makeDoc('north');
    doc.persons = doc.persons.map((p) => (p.id === 'em' ? { ...p, gender: 'unknown' } : p.id === 'ongNoi' ? { ...p, gender: 'unknown' } : p));
    expect(term(doc, 'ongNoi')).toBe('Ông/Bà nội');
  });

  it('hai lần vợ chồng: họ hàng xa, không đoán', () => {
    const k = kinship(N, 'toi', 'voAnhVo');
    expect(k.term).toEqual({ term: FAR, known: false });
  });

  it('người đã gỡ không tính; người không có đường: họ hàng xa', () => {
    const doc = makeDoc('north');
    doc.persons = doc.persons.map((p) => (p.id === 'cha' ? { ...p, removedAt: '2026-01-01' } : p));
    // Mất cha thì toi chỉ còn nối tới ông bà nội qua… không có đường nào khác: xa.
    expect(kinship(doc, 'toi', 'chuUt').term.known).toBe(false);
    expect(kinship(N, 'toi', 'toi').term.term).toBe('Tôi');
  });

  it('termsFrom: một người tới mọi người', () => {
    const m = termsFrom(C, 'toi');
    expect(m.get('coCa')?.term).toBe('O');
    expect(m.get('toi')?.term).toBe('Tôi');
    expect(m.size).toBe(P.length);
  });

  it('anh chị em của ông bà', () => {
    const doc = makeDoc('north', {});
    doc.persons.push({ id: 'ongBac', fullName: 'ongBac', gender: 'male', isOutsider: false, isRoot: false, siblingOrder: 0 });
    doc.parents.push({ parentId: 'cuOng', childId: 'ongBac', role: 'father', kind: 'biological' });
    // ongNoi có siblingOrder 1, ongBac 0 → ongBac là anh của ông nội.
    expect(term(doc, 'ongBac')).toBe('Ông bác');
  });
});
