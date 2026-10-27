import { addChild, addRoot, addSpouse, createTree, updatePerson, type Result, type TreeDoc } from '@kintree/core'
import { test as base, expect, type Page } from '@playwright/test'
import { makeWorld, sessionKey, signIn, type TestUser, type World } from './backend.ts'

const ok = <T extends object>(r: Result<T>) => {
  if (!r.ok) throw new Error(r.error)
  return r
}

/** Cuốn mẫu 3 đời: Cả + Bình; con An (vợ Dâu, con Cháu), Hoa, Nuôi (con nuôi, tên dài). Mã là UUID mới mỗi lần gọi. */
export function sampleDoc(): TreeDoc {
  const id = () => crypto.randomUUID()
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

type Worlds = { create: (doc: TreeDoc | null) => Promise<World> }

/** `world`: dòng họ riêng của test với cuốn mẫu, một quản trị, một người xem. `worlds`: tạo thêm dòng họ (vd. không có cuốn). */
export const test = base.extend<{ world: World; worlds: Worlds }>({
  worlds: async ({}, use) => {
    const made: World[] = []
    await use({
      create: async (doc) => {
        const w = await makeWorld(doc)
        made.push(w)
        return w
      },
    })
    await Promise.all(made.map((w) => w.dispose()))
  },
  world: async ({ worlds }, use) => {
    await use(await worlds.create(sampleDoc()))
  },
})
export { expect }

/** Đưa một phiên đăng nhập mới vào trình duyệt trước khi trang chạy (chỉ lần đầu mỗi thẻ, để tải lại không dùng lại token đã xoay vòng). */
export async function login(page: Page, user: TestUser) {
  const session = await signIn(user)
  await page.addInitScript(
    ({ key, value }) => {
      if (sessionStorage.getItem('kt-session')) return
      localStorage.setItem(key, value)
      sessionStorage.setItem('kt-session', '1')
    },
    { key: sessionKey(), value: JSON.stringify(session) },
  )
}

/** Đăng nhập rồi vào dòng họ của test (màn các cuốn). */
export async function openClan(page: Page, world: World, user: TestUser = world.admin) {
  await login(page, user)
  await page.goto('/')
  await page.getByRole('button', { name: new RegExp(world.clanName) }).click()
}

export async function openSampleTree(page: Page, world: World, user: TestUser = world.admin) {
  await openClan(page, world, user)
  await page.getByRole('button', { name: /Chi trưởng họ Nguyễn/ }).first().click()
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
