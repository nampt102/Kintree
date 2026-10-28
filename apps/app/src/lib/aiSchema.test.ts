// Kiểm schema và luật D5 của Edge Function chạy trên chính file dùng chung (supabase/functions/_shared).
import { describe, expect, it } from 'vitest'
import { mockExtract } from '../../../../supabase/functions/_shared/mock.ts'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { AiOutput, MAX_ITEMS, validateOutput, type PersonInfo } from '../../../../supabase/functions/_shared/schema.ts'

const ROOT = '00000000-0000-0000-0000-000000000001'
const CHA = '00000000-0000-0000-0000-000000000002'
const people: PersonInfo[] = [
  { id: ROOT, fullName: 'Nguyễn Văn Cả', gender: 'male', birthYear: 1890, isRoot: true },
  { id: CHA, fullName: 'Nguyễn Văn An', gender: 'male', birthYear: 1915 },
]
const anchor = { x: 0.1, y: 0.1, w: 0.3, h: 0.1 }
const person = (extra: object = {}) => ({ op: 'add_person', ref: 'p1', fullName: 'Con Thử', gender: 'male', anchor, ...extra })

describe('bộ giả lập', () => {
  it('trả kết quả hợp lệ với mọi cuốn và bốn đề xuất', () => {
    const r = validateOutput(mockExtract(people), people)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.rows.map((x) => x.op)).toEqual(['add_person', 'add_relation', 'update_field', 'add_person'])
  })

  it('dựa trên thuỷ tổ của cuốn: họ, người cha trong quan hệ', () => {
    const r = validateOutput(mockExtract([{ id: ROOT, fullName: 'Trần Văn Đạt', gender: 'male', isRoot: true }]), [{ id: ROOT, fullName: 'Trần Văn Đạt', gender: 'male' }])
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.rows[0]!.payload.fullName).toBe('Trần Văn Thử')
      expect(r.rows[1]!.payload.from).toEqual({ personId: ROOT })
    }
  })

  it('cuốn trống thì không có đề xuất', () => {
    expect(mockExtract([])).toEqual({ items: [] })
  })

  it('chế độ lỗi trả kết quả sai schema', () => {
    const r = validateOutput(mockExtract(people, 'mock:fail bia'), people)
    expect(r.ok).toBe(false)
  })
})

describe('kết quả AI là dữ liệu không tin cậy (design D5)', () => {
  const bad = (items: unknown[]) => validateOutput({ items }, people)

  it('chấp nhận một người có ngày âm lịch', () => {
    expect(bad([person({ death: { year: 1953, month: 3, day: 5, lunar: true } })]).ok).toBe(true)
  })

  it('từ chối người không thuộc cuốn', () => {
    const r = bad([{ op: 'update_field', personId: '00000000-0000-0000-0000-0000000000ff', field: 'birthPlace', value: 'X', anchor }])
    expect(r).toEqual({ ok: false, error: 'Người không thuộc cuốn này' })
  })

  it('bỏ quan hệ giữa hai người đã có (chỉ gợi ý thông tin từ ảnh), vẫn giữ phần còn lại', () => {
    const r = bad([person(), { op: 'add_relation', type: 'spouse', from: { personId: CHA }, to: { personId: ROOT }, anchor }])
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.rows.map((x) => x.op)).toEqual(['add_person'])
  })

  it('từ chối quan hệ trỏ tới người lạ', () => {
    expect(bad([{ op: 'add_relation', type: 'parent', from: { personId: '00000000-0000-0000-0000-0000000000ff' }, to: { personId: CHA }, anchor }]).ok).toBe(false)
  })

  it('từ chối mã tạm treo hoặc trùng', () => {
    expect(bad([{ op: 'add_relation', type: 'parent', from: { personId: ROOT }, to: { ref: 'zz' }, anchor }]).ok).toBe(false)
    expect(bad([person(), person()]).ok).toBe(false)
  })

  it('từ chối vùng ảnh ngoài 0–1 hoặc vượt khung', () => {
    expect(bad([person({ anchor: { x: 0, y: 0, w: 1.2, h: 0.1 } })]).ok).toBe(false)
    expect(bad([person({ anchor: { x: 0.8, y: 0, w: 0.5, h: 0.1 } })]).ok).toBe(false)
    expect(bad([person({ anchor: undefined })]).ok).toBe(false)
  })

  it('từ chối trường ngoài danh sách và giá trị sai kiểu', () => {
    expect(bad([{ op: 'update_field', personId: ROOT, field: 'isRoot', value: true, anchor }]).ok).toBe(false)
    expect(bad([{ op: 'update_field', personId: ROOT, field: 'birth', value: 'năm 1890', anchor }]).ok).toBe(false)
    expect(bad([{ op: 'update_field', personId: ROOT, field: 'gender', value: 'robot', anchor }]).ok).toBe(false)
  })

  it('từ chối ngày không hợp lệ', () => {
    expect(bad([person({ birth: { year: 1700, lunar: false } })]).ok).toBe(false)
    expect(bad([person({ birth: { year: 1901, month: 13, lunar: false } })]).ok).toBe(false)
  })

  it('từ chối quá nhiều đề xuất một ảnh', () => {
    const many = Array.from({ length: MAX_ITEMS + 1 }, (_, i) => person({ ref: `p${i}` }))
    expect(bad(many).ok).toBe(false)
  })

  it('từ chối loại đề xuất lạ (ví dụ AI cố xoá người)', () => {
    expect(bad([{ op: 'remove_person', personId: ROOT, anchor }]).ok).toBe(false)
  })
})

describe('schema gửi cho nhà cung cấp AI', () => {
  // Nhà cung cấp (vd. Anthropic) từ chối schema rỗng `{}` ("chấp nhận mọi JSON"): mọi nhánh phải có kiểu cụ thể.
  it('không có nhánh nào là schema rỗng', () => {
    const empties: string[] = []
    const walk = (node: unknown, path: string) => {
      if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}[${i}]`))
      if (!node || typeof node !== 'object') return
      const o = node as Record<string, unknown>
      if (path !== '' && Object.keys(o).length === 0) empties.push(path)
      for (const [k, v] of Object.entries(o)) if (k !== 'required' && k !== 'enum') walk(v, `${path}.${k}`)
    }
    walk(zodToJsonSchema(AiOutput), '')
    expect(empties).toEqual([])
  })
})
