import { removeBranch } from '@kintree/core'
import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { admin, must } from './backend.ts'
import { card, expect, login, openSampleTree, sampleDoc, test } from './fixtures.ts'


test.use({ viewport: { width: 1280, height: 800 } })

const isSave = (url: string) => url.includes('/rpc/apply_tree_changes')
const saveRoute = (u: URL) => isSave(u.href)
const saved = (page: Page) => page.waitForResponse((r) => isSave(r.url()))

async function addChild(page: Page, parent: string, name: string) {
  await card(page, parent).click()
  await page.getByRole('button', { name: 'Thêm con', exact: true }).click()
  await page.getByLabel('Họ tên').fill(name)
  await page.getByLabel('Giới tính').selectOption('male')
  await page.getByRole('button', { name: 'Thêm con' }).last().click()
}

const personsNamed = async (treeId: string, name: string) => must(await admin().from('persons').select('id, full_name').eq('tree_id', treeId).eq('full_name', name))!

test.describe('lưu trên máy chủ', () => {
  test('Mở trên thiết bị khác: thấy đúng thay đổi vừa sửa', async ({ page, world, browser }) => {
    await openSampleTree(page, world)
    const done = saved(page)
    await addChild(page, 'Nguyễn Văn An', 'Nguyễn Văn Bình')
    await done

    const ctx = await browser.newContext({ baseURL: 'http://localhost:5175', viewport: { width: 1280, height: 800 } })
    const other = await ctx.newPage()
    await openSampleTree(other, world)
    await expect(card(other, 'Nguyễn Văn Bình')).toBeVisible()
    await ctx.close()
  })

  test('Cuốn đã gỡ người: không hiện trên sơ đồ nhưng có trong bản sao tải về', async ({ page, worlds }) => {
    const base = sampleDoc()
    const chau = base.persons.find((p) => p.fullName === 'Nguyễn Văn Cháu')!
    const r = removeBranch(base, chau.id, '2026-10-26T01:02:03.000Z', () => crypto.randomUUID())
    if (!r.ok) throw new Error(r.error)
    const world = await worlds.create(r.doc)
    await openSampleTree(page, world)
    await expect(card(page, 'Nguyễn Văn Cháu')).toHaveCount(0)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Thêm', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Tải bản sao' }).click()
    const file = await (await download).path()
    const doc = JSON.parse(readFileSync(file, 'utf8')) as { persons: { fullName: string; removedAt?: string }[] }
    expect(doc.persons.find((p) => p.fullName === 'Nguyễn Văn Cháu')?.removedAt).toBe('2026-10-26T01:02:03.000Z')
  })

  test('Sửa một người: chỉ dòng của người ấy được gửi và ghi', async ({ page, world }) => {
    await openSampleTree(page, world)
    const bodies: { p_persons: { id: string }[]; p_parents: unknown[]; p_marriages: unknown[] }[] = []
    page.on('request', (req) => isSave(req.url()) && bodies.push(req.postDataJSON()))
    await card(page, 'Nguyễn Văn An').click()
    await page.getByRole('button', { name: 'Sửa hồ sơ' }).click()
    await page.getByLabel('Họ tên').fill('Nguyễn Văn An Đổi')
    const done = saved(page)
    await page.getByRole('button', { name: 'Lưu hồ sơ' }).click()
    await done
    expect(bodies).toHaveLength(1)
    expect(bodies[0]!.p_persons).toHaveLength(1)
    expect(bodies[0]!.p_parents).toEqual([])
    expect(bodies[0]!.p_marriages).toEqual([])
    expect((await personsNamed(world.treeId!, 'Nguyễn Văn An Đổi')).length).toBe(1)
    expect((await personsNamed(world.treeId!, 'Nguyễn Thị Hoa')).length).toBe(1)
  })

  test('Thêm con kèm quan hệ: máy chủ có đủ người và quan hệ', async ({ page, world }) => {
    await openSampleTree(page, world)
    const done = saved(page)
    await addChild(page, 'Nguyễn Văn An', 'Nguyễn Văn Bình')
    const res = await done
    expect(res.status()).toBeLessThan(300)
    const kid = (await personsNamed(world.treeId!, 'Nguyễn Văn Bình'))[0]!
    const links = must(await admin().from('parent_child').select('parent_id').eq('child_id', kid.id))!
    expect(links.length).toBeGreaterThanOrEqual(1)
  })

  test('Hai thao tác liền nhau: cả hai được ghi, người con có cha/mẹ đúng', async ({ page, world }) => {
    await openSampleTree(page, world)
    let n = 0
    page.on('response', (r) => isSave(r.url()) && n++)
    await addChild(page, 'Nguyễn Văn An', 'Con Một')
    // Người mới được chọn ngay: thêm con cho chính họ mà không chờ lần ghi đầu xong.
    await page.getByRole('button', { name: 'Thêm con', exact: true }).click()
    await page.getByLabel('Họ tên').fill('Cháu Một')
    await page.getByLabel('Giới tính').selectOption('male')
    await page.getByRole('button', { name: 'Thêm con' }).last().click()
    await expect.poll(() => n).toBe(2)
    const [con] = await personsNamed(world.treeId!, 'Con Một')
    const [chau] = await personsNamed(world.treeId!, 'Cháu Một')
    expect(con && chau).toBeTruthy()
    const link = must(await admin().from('parent_child').select('parent_id').eq('child_id', chau!.id))!
    expect(link.map((l) => l.parent_id)).toContain(con!.id)
  })

  test('Hai thiết bị, hai người: cả hai thay đổi đều còn sau khi tải lại', async ({ page, world, browser }) => {
    await openSampleTree(page, world)
    const ctx = await browser.newContext({ baseURL: 'http://localhost:5175', viewport: { width: 1280, height: 800 } })
    const other = await ctx.newPage()
    await openSampleTree(other, world)

    const rename = async (p: Page, from: string, to: string) => {
      await card(p, from).click()
      await p.getByRole('button', { name: 'Sửa hồ sơ' }).click()
      await p.getByLabel('Họ tên').fill(to)
      const done = saved(p)
      await p.getByRole('button', { name: 'Lưu hồ sơ' }).click()
      await done
    }
    await rename(page, 'Nguyễn Văn An', 'An Từ Thiết Bị A')
    await rename(other, 'Nguyễn Thị Hoa', 'Hoa Từ Thiết Bị B')

    for (const p of [page, other]) {
      await p.reload()
      await p.getByRole('button', { name: new RegExp(world.clanName) }).click()
      await p.getByRole('button', { name: /Chi trưởng/ }).first().click()
      await expect(card(p, 'An Từ Thiết Bị A')).toBeVisible()
      await expect(card(p, 'Hoa Từ Thiết Bị B')).toBeVisible()
    }
    await ctx.close()
  })
})

test.describe('ghi lỗi thì hoàn lại', () => {
  test('Mất mạng khi sửa: người vừa thêm biến khỏi sơ đồ, có thông báo, máy chủ không đổi', async ({ page, world }) => {
    await openSampleTree(page, world)
    await page.route(saveRoute, (route) => route.abort('failed'))
    await addChild(page, 'Nguyễn Văn An', 'Người Mất Mạng')
    await expect(page.getByRole('alert').filter({ hasText: 'Không kết nối được máy chủ' })).toBeVisible()
    await expect(card(page, 'Người Mất Mạng')).toHaveCount(0)
    expect((await personsNamed(world.treeId!, 'Người Mất Mạng')).length).toBe(0)
  })

  test('Bị từ chối vì quyền: sửa bị hoàn lại và có thông báo không đủ quyền', async ({ page, world }) => {
    await openSampleTree(page, world)
    // Quyền của người dùng bị hạ xuống chỉ xem trong lúc đang mở cuốn.
    must(await admin().from('memberships').update({ role: 'viewer' }).eq('user_id', world.admin.id))
    await addChild(page, 'Nguyễn Văn An', 'Người Bị Chặn')
    await expect(page.getByRole('alert').filter({ hasText: 'không có quyền' })).toBeVisible()
    await expect(card(page, 'Người Bị Chặn')).toHaveCount(0)
    expect((await personsNamed(world.treeId!, 'Người Bị Chặn')).length).toBe(0)
  })

  test('Sau một lần ghi lỗi, thao tác kế tiếp vẫn ghi được trên nền đúng', async ({ page, world }) => {
    await openSampleTree(page, world)
    let fail = true
    await page.route(saveRoute, (route) => (fail ? route.abort('failed') : route.continue()))
    await addChild(page, 'Nguyễn Văn An', 'Con Lỗi')
    await expect(page.getByRole('alert').filter({ hasText: 'Không kết nối được máy chủ' })).toBeVisible()
    fail = false
    const done = saved(page)
    await addChild(page, 'Nguyễn Văn An', 'Con Được')
    await done
    expect((await personsNamed(world.treeId!, 'Con Được')).length).toBe(1)
    expect((await personsNamed(world.treeId!, 'Con Lỗi')).length).toBe(0)
  })
})

test('Không lưu cuốn trên thiết bị: bộ nhớ trình duyệt không chứa tên người', async ({ page, world }) => {
  await login(page, world.admin)
  await page.goto('/')
  await page.getByRole('button', { name: new RegExp(world.clanName) }).click()
  await page.getByRole('button', { name: /Chi trưởng/ }).first().click()
  await expect(card(page, 'Nguyễn Văn An')).toBeVisible()
  const dump = await page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? []
    return JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage }, idb: dbs.map((d) => d.name) })
  })
  expect(dump).not.toContain('Nguyễn Văn')
  expect(dump).not.toContain('Cháu')
})
