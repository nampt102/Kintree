import type { PartialDate, TreePerson } from '@kintree/core'

const yearOf = (d?: PartialDate) => (d ? String(d.year) : '')

/** "1890 – 1968", "1915 –" (chưa mất), "– 1968", hoặc rỗng. */
export function lifespan(p: Pick<TreePerson, 'birth' | 'death'>): string {
  const b = yearOf(p.birth)
  const d = yearOf(p.death)
  if (!b && !d) return ''
  if (!d) return `${b} –`
  return `${b} – ${d}`.trim()
}

/** "17/9/1942", "9/1942", "1942", kèm "âm" khi là ngày âm. */
export function formatPartialDate(d?: PartialDate): string {
  if (!d) return ''
  const parts = [d.day, d.month, d.year].filter((x) => x !== undefined)
  const text = parts.join('/')
  if (!d.lunar) return text
  return `${text}${d.leap ? ' (nhuận)' : ''} âm lịch`
}
