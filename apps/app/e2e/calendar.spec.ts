import { addChild, addRoot, createTree, lunarToSolar, updatePerson, type Result, type TreeDoc } from '@kintree/core'
import type { Page } from '@playwright/test'
import { clientAs, createUser, seedTree, type World } from './backend.ts'
import { expect, expectNoHorizontalScroll, expectTouchTargets, openClan, test } from './fixtures.ts'

// Lịch ngày giỗ (change lunar-calendar-view). Hôm nay cố định 15/4/2026; cuốn mẫu có Nguyễn Văn Cả mất 5/3 âm 1968.

const ok = <T extends object>(r: Result<T>) => {
  if (!r.ok) throw new Error(r.error)
  return r
}
const CA = lunarToSolar({ year: 2026, month: 3, day: 5, leap: false })

/** Cuốn thứ hai: Bình mất 10/3 âm 2025 (giỗ đầu năm 2026); con là Khoa (chỉ biết năm mất) và Em (sinh 20/4/1975 dương). */
function secondDoc(): TreeDoc {
  const id = () => crypto.randomUUID()
  let doc = ok(createTree({ name: 'Chi thứ hai', region: 'north' }, id)).doc
  const root = ok(addRoot(doc, { fullName: 'Phạm Văn Bình', gender: 'male' }, id))
  doc = ok(updatePerson(root.doc, root.id, { death: { year: 2025, month: 3, day: 10, lunar: true } })).doc
  for (const [fullName, patch] of [
    ['Trần Văn Khoa', { death: { year: 1950, lunar: false } }],
    ['Phạm Văn Em', { birth: { year: 1975, month: 4, day: 20, lunar: false } }],
  ] as const) {
    const c = ok(addChild(doc, { parentId: root.id, person: { fullName, gender: 'male' }, kind: 'biological' }, id))
    doc = ok(updatePerson(c.doc, c.id, patch)).doc
  }
  return doc
}

async function openCalendar(page: Page, world: World, user = world.admin) {
  await page.clock.setFixedTime(new Date(2026, 3, 15, 9))
  await openClan(page, world, user)
  await page.getByRole('button', { name: 'Xem lịch' }).click()
  await expect(page.getByRole('heading', { name: 'Ngày giỗ' })).toBeVisible()
}

test.describe('lịch ngày giỗ', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('giỗ, sinh nhật đúng ô; lọc cuốn; chưa tính được giỗ; mở người từ sắp tới', async ({ page, world }) => {
    await seedTree(world.clanId, secondDoc())
    await openCalendar(page, world)
    await expect(page.getByText('Tháng 4, 2026')).toBeVisible()
    await expect(page.getByText('Tháng 2 – 3 âm lịch · năm Bính Ngọ')).toBeVisible()

    const caCell = page.getByTestId('calendar-grid').locator('div', { has: page.getByRole('button', { name: new RegExp(`^Ngày ${CA.day}/4,`) }) }).last()
    await expect(caCell.getByRole('button', { name: 'Nguyễn Văn Cả · Giỗ thường' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Phạm Văn Bình · Giỗ đầu' })).toBeVisible()
    const emCell = page.getByTestId('calendar-grid').locator('div', { has: page.getByRole('button', { name: /^Ngày 20\/4,/ }) }).last()
    await expect(emCell.getByRole('button', { name: 'Phạm Văn Em · Sinh nhật 51 tuổi' })).toBeVisible()

    // Lọc một cuốn.
    await page.getByRole('group', { name: 'Lọc theo cuốn' }).getByRole('button', { name: 'Chi thứ hai' }).click()
    await expect(page.getByRole('button', { name: 'Nguyễn Văn Cả · Giỗ thường' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Phạm Văn Bình · Giỗ đầu' })).toBeVisible()
    await page.getByRole('group', { name: 'Lọc theo cuốn' }).getByRole('button', { name: 'Tất cả' }).click()

    // Người chỉ biết năm mất.
    await page.getByText('Chưa tính được giỗ').click()
    const khoa = page.getByRole('listitem').filter({ hasText: 'Trần Văn Khoa' })
    await expect(khoa).toContainText('thiếu ngày/tháng mất')
    await expect(khoa.getByRole('button', { name: 'Bổ sung' })).toBeVisible()

    // Sắp tới: còn bao lâu, rồi mở người trong cây.
    const days = CA.day - 15
    const row = page.getByRole('complementary').getByRole('button', { name: /Nguyễn Văn Cả/ })
    await expect(row).toContainText(days === 0 ? 'hôm nay' : days === 1 ? 'ngày mai' : `còn ${days} ngày`)
    await row.click()
    await expect(page.getByRole('heading', { name: 'Nguyễn Văn Cả', level: 2 })).toBeVisible()
    // Quay lại thì về lịch.
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Ngày giỗ' })).toBeVisible()
  })

  test('người xem vào từ thanh bên, không có nút sửa; người ngoài không đọc được', async ({ page, world }) => {
    await seedTree(world.clanId, secondDoc())
    await page.clock.setFixedTime(new Date(2026, 3, 15, 9))
    await openClan(page, world, world.viewer)
    await page.getByRole('navigation').getByRole('button', { name: /Ngày giỗ/ }).click()
    await expect(page.getByRole('button', { name: 'Nguyễn Văn Cả · Giỗ thường' })).toBeVisible()
    await page.getByText('Chưa tính được giỗ').click()
    await expect(page.getByRole('listitem').filter({ hasText: 'Trần Văn Khoa' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Bổ sung' })).toHaveCount(0)

    const outsider = await clientAs(await createUser('outsider'))
    const { data } = await outsider.from('persons').select('id').eq('tree_id', world.treeId!)
    expect(data).toEqual([])
  })
})

test('lịch trên điện thoại: chạm ngày xem sự kiện, vùng chạm, không cuộn ngang', async ({ page, world }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openCalendar(page, world)
  await page.getByRole('button', { name: new RegExp(`^Ngày ${CA.day}/4,`) }).click()
  await expect(page.getByRole('region', { name: 'Sự kiện của ngày đã chọn' }).getByRole('button', { name: /Nguyễn Văn Cả/ })).toBeVisible()
  await expectNoHorizontalScroll(page)
  await expectTouchTargets(page)
  await page.setViewportSize({ width: 320, height: 700 })
  await expectNoHorizontalScroll(page)
})
