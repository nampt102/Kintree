import { expect, test } from 'vitest';
import { childrenOf, deserialize, removeBranch, serialize } from '../../src/tree/index.ts';
import { ok, sample } from './helpers.ts';

test('ghi rồi đọc giữ nội dung, thứ tự và dấu đã gỡ', () => {
  const { doc, ids, newId } = sample();
  const after = ok(removeBranch(doc, ids.cha!, '2026-10-26T00:00:00.000Z', newId)).doc;
  const r = deserialize(serialize(after));
  expect(r.ok && r.doc).toEqual(after);
  expect(r.ok && childrenOf(r.doc, ids.ong!).map((c) => c.id)).toEqual([ids.chu]);
});

test.each([
  ['không phải JSON', '{{{'],
  ['null', 'null'],
  ['thiếu version', '{"meta":{}}'],
  ['thiếu meta', '{"version":1,"persons":[],"parents":[],"marriages":[]}'],
  ['persons không phải mảng', '{"version":1,"meta":{"id":"a","name":"b"},"persons":{},"parents":[],"marriages":[]}'],
])('dữ liệu hỏng: %s', (_n, text) => {
  expect(deserialize(text)).toEqual({ ok: false, error: 'CORRUPT' });
});

test('phiên bản lạ', () => {
  expect(deserialize('{"version":99}')).toEqual({ ok: false, error: 'UNSUPPORTED_VERSION' });
});
