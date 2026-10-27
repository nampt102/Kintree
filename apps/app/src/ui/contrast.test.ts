import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

// Đọc token thật trong index.css rồi tính tỉ lệ tương phản WCAG 2.x.
const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')
const tokens = Object.fromEntries([...css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]))

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

const t = (name: string) => {
  const v = tokens[name]
  if (!v) throw new Error(`thiếu token --color-${name}`)
  return v
}

// [chữ/viền, nền, mức tối thiểu] cho mọi cặp được dùng thật trong giao diện.
const PAIRS: [string, string, number][] = [
  ['ink', 'surface', 4.5],
  ['ink', 'canvas', 4.5],
  ['ink', 'surface-muted', 4.5],
  ['ink-muted', 'surface', 4.5],
  ['ink-muted', 'canvas', 4.5],
  ['ink-muted', 'surface-muted', 4.5],
  ['white', 'accent', 4.5],
  ['white', 'accent-hover', 4.5],
  ['accent', 'surface', 4.5],
  ['accent', 'canvas', 4.5],
  ['accent', 'accent-soft', 4.5],
  ['danger', 'surface', 4.5],
  ['danger', 'danger-soft', 4.5],
  ['white', 'danger', 4.5],
  ['focus', 'surface', 3],
  ['focus', 'canvas', 3],
  ['line-input', 'surface', 3],
  ['line-input', 'canvas', 3],
  ['line-input', 'surface-muted', 3],
  ['male', 'surface', 4.5],
  ['female', 'surface', 4.5],
  ['male', 'male-soft', 4.5],
  ['female', 'female-soft', 4.5],
  ['ink-muted', 'rail', 4.5],
  ['ink', 'rail', 4.5],
]

test.each(PAIRS)('%s trên %s ≥ %d:1', (fg, bg, min) => {
  expect(contrast(t(fg), t(bg))).toBeGreaterThanOrEqual(min)
})

test('tính tương phản đúng với giá trị chuẩn', () => {
  expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1)
  expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 1)
})
