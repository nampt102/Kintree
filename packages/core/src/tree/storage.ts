import type { TreeDoc } from './model.ts';

export const DOC_VERSION = 1;

export type ParseResult = { ok: true; doc: TreeDoc } | { ok: false; error: 'CORRUPT' | 'UNSUPPORTED_VERSION' };

export const serialize = (doc: TreeDoc): string => JSON.stringify(doc);

/** Đọc dữ liệu lưu; không bao giờ ném lỗi. Định dạng cũ hơn sẽ được nâng ở đây khi có phiên bản 2. */
export function deserialize(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'CORRUPT' };
  }
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'CORRUPT' };
  const d = raw as Record<string, unknown>;
  if (typeof d.version !== 'number') return { ok: false, error: 'CORRUPT' };
  if (d.version !== DOC_VERSION) return { ok: false, error: 'UNSUPPORTED_VERSION' };
  const meta = d.meta as Record<string, unknown> | undefined;
  if (!meta || typeof meta.id !== 'string' || typeof meta.name !== 'string') return { ok: false, error: 'CORRUPT' };
  if (!Array.isArray(d.persons) || !Array.isArray(d.parents) || !Array.isArray(d.marriages)) {
    return { ok: false, error: 'CORRUPT' };
  }
  return { ok: true, doc: raw as TreeDoc };
}
