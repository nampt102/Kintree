// Test cho change ui-components: ô chọn theo tông ứng dụng, nhóm nút chọn một, form hồ sơ chia nhóm, khung người nổi khi trỏ.
import { card, expect, expectNoHorizontalScroll, expectTouchTargets, openClan, openSampleTree, test } from './fixtures.ts'

test.describe('ô chọn', () => {
  test.use({ viewport: { width: 1024, height: 768 } })

  test('Chọn bằng bàn phím và danh sách theo tông ứng dụng', async ({ page, world }) => {
    await openClan(page, world)
    await page.getByRole('button', { name: 'Xem danh sách thành viên' }).click()
    await page.getByRole('button', { name: 'Mời người' }).click()
    const scope = page.getByLabel('Phạm vi')
    await scope.focus()
    await page.keyboard.press('Enter')
    const list = page.getByRole('listbox')
    await expect(list).toBeVisible()
    // Danh sách tự vẽ: nền trắng, bo góc (không phải danh sách của hệ điều hành).
    const style = await list.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, radius: getComputedStyle(el).borderTopLeftRadius }))
    expect(style.bg).toBe('rgb(255, 255, 255)')
    expect(parseFloat(style.radius)).toBeGreaterThanOrEqual(12)
    for (const o of await page.getByRole('option').all()) expect((await o.boundingBox())!.height).toBeGreaterThanOrEqual(43.5)
    // Radix đưa con trỏ vào mục đang chọn khi mở; chờ xong rồi mới bấm mũi tên (tránh bấm trước khi danh sách nhận phím).
    await expect(page.getByRole('option', { name: 'Cả dòng họ (mọi cuốn)' })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('option', { name: 'Chi trưởng họ Nguyễn' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(list).toBeHidden()
    await expect(scope).toContainText('Chi trưởng họ Nguyễn')
    await expect(scope).toBeFocused()
  })
})

test.describe('nhóm nút chọn một', () => {
  test.use({ viewport: { width: 1024, height: 768 } })

  test('Giới tính trong hồ sơ: ba nút, nút đang chọn đọc được bằng trình đọc màn hình', async ({ page, world }) => {
    await openSampleTree(page, world)
    await card(page, 'Nguyễn Thị Hoa').click()
    await page.getByRole('button', { name: 'Sửa hồ sơ' }).click()
    const radios = page.getByRole('dialog', { name: /Hồ sơ/ }).getByRole('radiogroup', { name: 'Giới tính' }).getByRole('radio')
    await expect(radios).toHaveCount(3)
    await expect(page.getByRole('radio', { name: 'Nữ' })).toBeChecked()
    await expect(page.getByRole('radio', { name: 'Nam' })).not.toBeChecked()
    await page.getByRole('radio', { name: 'Chưa rõ' }).click()
    await expect(page.getByRole('radio', { name: 'Chưa rõ' })).toBeChecked()
  })

  test('Chọn âm lịch hiện công tắc "Tháng nhuận"', async ({ page, world }) => {
    await openSampleTree(page, world)
    await card(page, 'Nguyễn Văn Cả').click()
    await page.getByRole('button', { name: 'Sửa hồ sơ' }).click()
    // Ngày mất của thuỷ tổ trong cuốn mẫu là ngày âm: có công tắc nhuận.
    await expect(page.getByRole('switch', { name: /Tháng nhuận/ })).toBeVisible()
    await page.getByRole('radio', { name: 'Dương lịch' }).first().click()
  })
})

test.describe('form hồ sơ trên điện thoại', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true })

  test('Bốn nhóm có tiêu đề và nút Lưu luôn nhìn thấy ở chân khi cuộn', async ({ page, world }) => {
    await openSampleTree(page, world)
    await card(page, 'Nguyễn Văn An').click()
    await page.getByRole('button', { name: 'Sửa hồ sơ' }).click()
    const dialog = page.getByRole('dialog', { name: /Hồ sơ/ })
    for (const g of ['Thông tin chung', 'Ngày sinh – ngày mất', 'Nơi chốn', 'Tiểu sử']) await expect(dialog.getByRole('region', { name: g })).toHaveCount(1)
    await dialog.getByLabel('Ghi chú riêng').scrollIntoViewIfNeeded()
    await expect(dialog.getByRole('button', { name: 'Lưu hồ sơ' })).toBeInViewport()
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)
  })
})

test.describe('khung người trên sơ đồ', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('Khung đang trỏ chuột nổi lên trên khung bên cạnh để nút quanh khung không bị che', async ({ page, world }) => {
    await openSampleTree(page, world)
    const node = page.locator('.react-flow__node', { has: card(page, 'Nguyễn Văn An') })
    await card(page, 'Nguyễn Văn An').hover()
    await expect.poll(() => node.evaluate((el) => getComputedStyle(el).zIndex)).toBe('1000')
  })
})
