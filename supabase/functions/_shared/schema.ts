// Schema và kiểm tra kết quả AI đọc ảnh (change ai-image-proposals, design D3–D5).
// File thuần TypeScript, không dùng API của Deno: Edge Function và Vitest của app dùng chung (bare `zod` ánh xạ qua deno.json).
import { z } from 'zod'

/** Trường của một người mà đề xuất được sửa; cũng là khoá `field_sources.field` và giao diện. */
export const FIELDS = ['fullName', 'gender', 'birth', 'death', 'birthPlace', 'burialPlace', 'biography'] as const
export type Field = (typeof FIELDS)[number]

export const MAX_ITEMS = 50

const Anchor = z
  .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().gt(0).max(1), h: z.number().gt(0).max(1) })
  .refine((a) => a.x + a.w <= 1.0001 && a.y + a.h <= 1.0001, 'Vùng ảnh vượt ra ngoài ảnh')

/** Giống `PartialDate` của `packages/core`. */
const PartialDate = z.object({
  year: z.number().int().min(1800).max(2199),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
  lunar: z.boolean().default(false),
  leap: z.boolean().optional(),
})
export type AiDate = z.infer<typeof PartialDate>

const Gender = z.enum(['male', 'female', 'unknown'])
const Text = z.string().trim().min(1).max(2000)
const Quote = z.string().trim().max(300).default('')
const Ref = z.union([z.object({ personId: z.string().uuid() }).strict(), z.object({ ref: z.string().min(1).max(20) }).strict()])
export type AiRef = z.infer<typeof Ref>

const AddPerson = z.object({
  op: z.literal('add_person'),
  ref: z.string().min(1).max(20),
  fullName: z.string().trim().min(1).max(200),
  gender: Gender,
  isOutsider: z.boolean().optional(),
  birth: PartialDate.optional(),
  death: PartialDate.optional(),
  birthPlace: Text.optional(),
  burialPlace: Text.optional(),
  biography: Text.optional(),
  anchor: Anchor,
  quote: Quote,
})

// Giá trị: ngày (birth/death) hoặc chữ (các trường còn lại, gồm giới tính). Không dùng z.unknown(): schema rỗng `{}` bị Anthropic từ chối. Đúng kiểu theo từng trường kiểm ở `validateOutput`.
const UpdateField = z.object({ op: z.literal('update_field'), personId: z.string().uuid(), field: z.enum(FIELDS), value: z.union([PartialDate, z.string()]), anchor: Anchor, quote: Quote })

/** Giá trị đúng kiểu của một trường. */
export function fieldValueOk(field: Field, value: unknown): boolean {
  if (field === 'gender') return Gender.safeParse(value).success
  if (field === 'birth' || field === 'death') return PartialDate.safeParse(value).success
  if (field === 'fullName') return z.string().trim().min(1).max(200).safeParse(value).success
  return Text.safeParse(value).success
}

const AddRelation = z.object({
  op: z.literal('add_relation'),
  type: z.enum(['parent', 'spouse']),
  /** cha/mẹ (type parent) hoặc chồng (type spouse). */
  from: Ref,
  /** con (type parent) hoặc vợ (type spouse). */
  to: Ref,
  role: z.enum(['father', 'mother']).optional(),
  anchor: Anchor,
  quote: Quote,
})

const Item = z.discriminatedUnion('op', [AddPerson, UpdateField, AddRelation])
export const AiOutput = z.object({ items: z.array(Item).max(MAX_ITEMS) })
export type AiItem = z.infer<typeof Item>
export type AiOutputType = z.infer<typeof AiOutput>

/** Người của cuốn gửi kèm cho AI, và danh sách trắng cho phép tham chiếu. */
export type PersonInfo = { id: string; fullName: string; gender: 'male' | 'female' | 'unknown'; birthYear?: number; deathYear?: number; isRoot?: boolean }

/** Dòng ghi vào `proposals` (qua `ingest_proposals`). */
export type ProposalRow = { op: AiItem['op']; payload: Record<string, unknown>; anchor: unknown; ref: string | null; quote: string }

export type ValidateResult = { ok: true; rows: ProposalRow[] } | { ok: false; error: string }

const fail = (error: string): ValidateResult => ({ ok: false, error })

/**
 * Coi kết quả AI là dữ liệu không tin cậy: từ chối **cả lần đọc** nếu có một chỗ sai (design D5).
 * Ngoài schema: mọi `personId` phải thuộc cuốn này, mọi `ref` phải có trong lô và không trùng.
 */
export function validateOutput(raw: unknown, people: readonly PersonInfo[]): ValidateResult {
  const parsed = AiOutput.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return fail(`Kết quả AI sai schema: ${issue?.path.join('.') ?? ''} ${issue?.message ?? ''}`.trim())
  }
  const known = new Set(people.map((p) => p.id))
  const refs = new Set<string>()
  for (const it of parsed.data.items) {
    if (it.op === 'add_person') {
      if (refs.has(it.ref)) return fail(`Mã tạm ${it.ref} bị trùng`)
      refs.add(it.ref)
    }
  }
  const checkRef = (r: AiRef): string | null => {
    if ('personId' in r) return known.has(r.personId) ? null : 'Người không thuộc cuốn này'
    return refs.has(r.ref) ? null : `Mã tạm ${r.ref} không có trong lô`
  }
  for (const it of parsed.data.items) {
    if (it.op === 'update_field') {
      if (!known.has(it.personId)) return fail('Người không thuộc cuốn này')
      if (!fieldValueOk(it.field, it.value)) return fail(`Giá trị không hợp lệ cho trường ${it.field}`)
    }
    if (it.op === 'add_relation') {
      const bad = checkRef(it.from) ?? checkRef(it.to)
      if (bad) return fail(bad)
    }
  }
  // Chỉ đề xuất thông tin rút ra từ ảnh: quan hệ giữa hai người đã có trong cây thì bỏ (không nối người sẵn có với nhau);
  // chỉ giữ quan hệ có một đầu là người mới trong lô, để gắn người mới vào cây khi nhận.
  const kept = parsed.data.items.filter((it) => it.op !== 'add_relation' || 'ref' in it.from || 'ref' in it.to)
  const rows = kept.map((it): ProposalRow => {
    const { op, anchor, quote, ...payload } = it
    return { op, payload, anchor, ref: it.op === 'add_person' ? it.ref : null, quote }
  })
  return { ok: true, rows }
}
