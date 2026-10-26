import { addChild, addRoot, addSpouse, createTree, serialize, updatePerson, type Result, type TreeDoc } from '@kintree/core'
import { expect, type Page } from '@playwright/test'

const ok = <T extends object>(r: Result<T>) => {
  if (!r.ok) throw new Error(r.error)
  return r
}

/** Cuốn mẫu 3 đời: Cả + Bình; con An (vợ Dâu, con Cháu), Hoa, Nuôi (con nuôi, tên dài). */
export function sampleDoc(): TreeDoc {
  let n = 0
  const id = () => `p${++n}`
  let doc = ok(createTree({ name: 'Chi trưởng họ Nguyễn', region: 'north' }, id)).doc
  const root = ok(addRoot(doc, { fullName: 'Nguyễn Văn Cả', gender: 'male' }, id))
  doc = ok(updatePerson(root.doc, root.id, { birth: { year: 1890, lunar: false }, death: { year: 1968, month: 3, day: 5, lunar: true } })).doc
  doc = ok(addSpouse(doc, { personId: root.id, person: { fullName: 'Trần Thị Bình' } }, id)).doc
  const an = ok(addChild(doc, { parentId: root.id, person: { fullName: 'Nguyễn Văn An', gender: 'male' }, kind: 'biological' }, id))
  doc = an.doc
  doc = ok(addChild(doc, { parentId: root.id, person: { fullName: 'Nguyễn Thị Hoa', gender: 'female' }, kind: 'biological' }, id)).doc
  doc = ok(addChild(doc, { parentId: root.id, person: { fullName: 'Nguyễn Văn Nuôi Có Tên Rất Dài Để Thử Xuống Dòng', gender: 'male' }, kind: 'adopted' }, id)).doc
  doc = ok(addSpouse(doc, { personId: an.id, person: { fullName: 'Lê Thị Dâu' } }, id)).doc
  doc = ok(addChild(doc, { parentId: an.id, person: { fullName: 'Nguyễn Văn Cháu', gender: 'male' }, kind: 'biological' }, id)).doc
  return doc
}

/** Ghi các cuốn vào localStorage trước khi trang chạy (chỉ lần đầu trong mỗi trang, để tải lại không xoá thay đổi). */
export async function seed(page: Page, docs: TreeDoc[] = [sampleDoc()]) {
  const entries = docs.map((d) => [`kintree:doc:${d.meta.id}`, serialize(d)] as const)
  const index = JSON.stringify(docs.map((d) => ({ id: d.meta.id, name: d.meta.name, region: d.meta.region, updatedAt: '2026-10-26T00:00:00.000Z' })))
  await page.addInitScript(
    ({ entries, index }) => {
      if (sessionStorage.getItem('kt-seeded')) return
      localStorage.clear()
      for (const [k, v] of entries) localStorage.setItem(k, v)
      localStorage.setItem('kintree:index', index)
      sessionStorage.setItem('kt-seeded', '1')
    },
    { entries, index },
  )
}

export async function openSampleTree(page: Page) {
  await seed(page)
  await page.goto('/')
  await page.getByRole('button', { name: /Chi trưởng họ Nguyễn/ }).click()
  await expect(page.locator('[data-person-id]').first()).toBeVisible()
  await diagramSettled(page)
}

/** Chờ hoạt ảnh căn khung của sơ đồ dừng hẳn (thuộc tính data-fit của TreeDiagram). */
export async function diagramSettled(page: Page) {
  await expect(page.locator('.react-flow')).toHaveAttribute('data-fit', 'done')
}

export const card = (page: Page, name: string) => page.locator('[data-person-id]', { hasText: name })

/** Không có thanh cuộn ngang ở cấp trang. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, 'trang bị cuộn ngang').toBeLessThanOrEqual(0)
}

/** Mọi phần tử bấm được đang hiện có vùng chạm ≥ 44 × 44 px. */
export async function expectTouchTargets(page: Page) {
  const small = await page.evaluate(() => {
    const sel = 'button, input:not([type=checkbox]):not([type=hidden]), select, textarea, a[href], [role="button"], [role="menuitem"]'
    return [...document.querySelectorAll<HTMLElement>(sel)]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') return false
        if (el.closest('.react-flow__minimap')) return false
        return r.width < 43.5 || r.height < 43.5
      })
      .map((el) => `${el.tagName} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`)
  })
  expect(small, 'phần tử có vùng chạm < 44 px').toEqual([])
}
