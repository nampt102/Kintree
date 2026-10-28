// Bộ giả lập AI đọc ảnh (design D4): tất định, không gọi mạng, dựa trên người của cuốn nên chạy với mọi cuốn.
import type { PersonInfo } from './schema.ts'

/** Tiêu đề tư liệu bắt đầu bằng `mock:` thì luôn dùng bộ giả lập, kể cả khi đã cấu hình AI thật (để e2e không gọi AI thật). */
export const MOCK_PREFIX = 'mock:'
/** Tiêu đề bắt đầu bằng mốc này thì bộ giả lập trả kết quả sai schema (để thử "Đọc lỗi"). */
export const MOCK_FAIL_MARK = 'mock:fail'

export function mockExtract(people: readonly PersonInfo[], hint?: string | null): unknown {
  if (hint?.startsWith(MOCK_FAIL_MARK)) return { items: [{ op: 'add_person', fullName: 'Thiếu vùng ảnh' }] }
  const root = people.find((p) => p.isRoot) ?? people[0]
  if (!root) return { items: [] }
  const surname = root.fullName.trim().split(/\s+/)[0] ?? 'Nguyễn'
  const box = (x: number, y: number) => ({ x, y, w: 0.36, h: 0.08 })
  return {
    items: [
      {
        op: 'add_person',
        ref: 'p1',
        fullName: `${surname} Văn Thử`,
        gender: 'male',
        birth: { year: 1901, lunar: false },
        death: { year: 1953, month: 3, day: 5, lunar: true },
        anchor: box(0.1, 0.12),
        quote: `${surname} Văn Thử, sinh 1901, mất ngày 5 tháng 3 năm Quý Tỵ`,
      },
      {
        op: 'add_relation',
        type: 'parent',
        from: { personId: root.id },
        to: { ref: 'p1' },
        role: root.gender === 'female' ? 'mother' : 'father',
        anchor: box(0.1, 0.24),
        quote: `con của ${root.fullName}`,
      },
      { op: 'update_field', personId: root.id, field: 'burialPlace', value: 'Nghĩa trang làng', anchor: box(0.5, 0.12), quote: 'an táng tại nghĩa trang làng' },
      // Trùng người đã có (cùng họ tên, cùng năm sinh): để thử gợi ý gộp.
      {
        op: 'add_person',
        ref: 'p2',
        fullName: root.fullName,
        gender: root.gender,
        ...(root.birthYear ? { birth: { year: root.birthYear, lunar: false } } : {}),
        birthPlace: 'Làng Cổ',
        anchor: box(0.5, 0.24),
        quote: `${root.fullName}, quê Làng Cổ`,
      },
    ],
  }
}
