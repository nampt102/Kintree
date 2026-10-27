// Test cho change ui-polish: phân cấp thao tác, khung người, thẻ thông tin, thanh bên, số liệu trang nhà.
import { addRoot, createTree, type Result } from '@kintree/core'
import { seedTree } from './backend.ts'
import { card, expect, openClan, openSampleTree, test } from './fixtures.ts'

const ok = <T extends object>(r: Result<T>) => {
  if (!r.ok) throw new Error(r.error)
  return r
}

test.describe('trang nhà dòng họ', () => {
  test.use({ viewport: { width: 1024, height: 768 } })

  test('Trang nhà hiện số người và số cuốn', async ({ page, world }) => {
    await openClan(page, world)
    const hero = page.locator('section').first()
    await expect(hero).toContainText('7người')
    await expect(hero).toContainText('1cuốn gia phả')
    await expect(page.getByRole('button', { name: /Chi trưởng họ Nguyễn/ }).first()).toContainText('7 người')
  })

  test('Danh sách cuốn: chỉ "Tạo cuốn gia phả" là nút chính', async ({ page, world }) => {
    await openClan(page, world)
    const primary = page.locator('main [data-variant="primary"]')
    await expect(primary).toHaveCount(1)
    await expect(primary).toHaveText(/Tạo cuốn gia phả/)
  })

  test('Người xem không thấy số thành viên', async ({ page, world }) => {
    await openClan(page, world, world.viewer)
    await expect(page.locator('section').first()).not.toContainText('thành viên')
  })
})

test.describe('khung người', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('Giới tính không chỉ bằng màu', async ({ page, world }) => {
    await openSampleTree(page, world)
    await expect(card(page, 'Nguyễn Văn An')).toContainText('Nam')
    await expect(card(page, 'Nguyễn Thị Hoa')).toContainText('Nữ')
  })

  test('Thuỷ tổ có biểu tượng và chữ "Thuỷ tổ"', async ({ page, world }) => {
    await openSampleTree(page, world)
    await expect(card(page, 'Nguyễn Văn Cả')).toContainText('Thuỷ tổ')
    await expect(card(page, 'Nguyễn Văn An')).not.toContainText('Thuỷ tổ')
  })
})

test.describe('bảng thông tin một người', () => {
  test.use({ viewport: { width: 1024, height: 768 } })

  test('Một nút chính "Sửa hồ sơ"; "Gỡ" ở cuối bảng', async ({ page, world }) => {
    await openSampleTree(page, world)
    await card(page, 'Nguyễn Văn An').click()
    const pane = page.getByRole('complementary', { name: /Thông tin Nguyễn Văn An/ })
    const primary = pane.locator('[data-variant="primary"]')
    await expect(primary).toHaveCount(1)
    await expect(primary).toHaveText(/Sửa hồ sơ/)
    const names = await pane.getByRole('button').allInnerTexts()
    expect(names.at(-1)).toMatch(/^Gỡ/)
  })

  test('Người xem: không có nút chính, vẫn xem riêng nhánh được', async ({ page, world }) => {
    await openSampleTree(page, world, world.viewer)
    await card(page, 'Nguyễn Văn An').click()
    const pane = page.getByRole('complementary', { name: /Thông tin Nguyễn Văn An/ })
    await expect(pane.locator('[data-variant="primary"]')).toHaveCount(0)
    await expect(pane.getByRole('button', { name: 'Xem riêng nhánh này' })).toBeVisible()
  })
})

test.describe('cỡ gọn', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true })

  test('Chạm một người: thẻ gọn; kéo lên thì xem đủ thông tin', async ({ page, world }) => {
    await openSampleTree(page, world)
    await card(page, 'Nguyễn Văn Cả').click()
    const sheet = page.getByRole('dialog', { name: /Thông tin Nguyễn Văn Cả/ })
    await expect(sheet).toHaveAttribute('data-snap', 'peek')
    await expect(sheet.getByRole('button', { name: 'Sửa hồ sơ' })).toBeVisible()
    await expect(sheet.getByText('Ngày mất')).toHaveCount(0)
    await page.getByTestId('sheet-handle').click()
    await expect(sheet).toHaveAttribute('data-snap', 'full')
    await expect(sheet.getByText('Ngày mất')).toBeVisible()
  })
})

test.describe('thanh bên', () => {
  test('Chuyển cuốn trên máy tính 1440 px', async ({ page, world }) => {
    const id = () => crypto.randomUUID()
    const second = ok(addRoot(ok(createTree({ name: 'Chi thứ hai', region: 'south' }, id)).doc, { fullName: 'Trần Văn Hai', gender: 'male' }, id)).doc
    await seedTree(world.clanId, second)
    await page.setViewportSize({ width: 1440, height: 900 })
    await openSampleTree(page, world)
    const rail = page.getByRole('navigation', { name: 'Điều hướng dòng họ' })
    await expect(rail.getByRole('button', { name: /Chi trưởng họ Nguyễn/ })).toHaveAttribute('aria-current', 'page')
    await rail.getByRole('button', { name: /Chi thứ hai/ }).click()
    await expect(card(page, 'Trần Văn Hai')).toBeVisible()
    await expect(rail.getByRole('button', { name: /Chi thứ hai/ })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('button', { name: 'Về danh sách cuốn' })).toHaveCount(0)
  })

  test('Máy tính bảng 1024 px: không có thanh bên, vẫn có nút quay lại', async ({ page, world }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await openSampleTree(page, world)
    await expect(page.getByRole('navigation', { name: 'Điều hướng dòng họ' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Về danh sách cuốn' })).toBeVisible()
  })
})
