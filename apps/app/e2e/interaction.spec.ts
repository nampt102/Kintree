import { expect, test } from '@playwright/test'
import { card, openSampleTree, seed } from './fixtures.ts'

test.use({ viewport: { width: 1280, height: 800 } })

test('Mở rồi đóng hộp thoại bằng bàn phím: con trỏ trở về nút đã mở', async ({ page }) => {
  await openSampleTree(page)
  await card(page, 'Nguyễn Văn An').click()
  const opener = page.getByRole('button', { name: 'Thêm con', exact: true })
  await opener.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: /Thêm con/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: /Thêm con/ })).toBeHidden()
  await expect(opener).toBeFocused()
})

test('Đóng khi đã nhập tên: hỏi trước; chỉ đóng khi xác nhận', async ({ page }) => {
  await openSampleTree(page)
  await card(page, 'Nguyễn Văn An').click()
  await page.getByRole('button', { name: 'Thêm con', exact: true }).click()
  await page.getByLabel('Họ tên').fill('Nguyễn Văn Bình')
  const prompts: string[] = []
  page.once('dialog', (d) => {
    prompts.push(d.message())
    void d.dismiss()
  })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: /Thêm con/ })).toBeVisible()
  expect(prompts).toEqual(['Bỏ những gì vừa nhập?'])
  page.once('dialog', (d) => void d.accept())
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: /Thêm con/ })).toBeHidden()
})

test('Đóng khi chưa nhập gì: đóng ngay, không hỏi', async ({ page }) => {
  await openSampleTree(page)
  await card(page, 'Nguyễn Văn An').click()
  await page.getByRole('button', { name: 'Thêm con', exact: true }).click()
  let asked = false
  page.on('dialog', (d) => {
    asked = true
    void d.dismiss()
  })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: /Thêm con/ })).toBeHidden()
  expect(asked).toBe(false)
})

test('Thêm con thành công: thông báo rồi tự ẩn, khung mới được làm nổi', async ({ page }) => {
  await openSampleTree(page)
  await card(page, 'Nguyễn Văn An').click()
  await page.getByRole('button', { name: 'Thêm con', exact: true }).click()
  await page.getByLabel('Họ tên').fill('Nguyễn Văn Bình')
  await page.getByLabel('Giới tính').selectOption('male')
  await page.getByRole('button', { name: 'Thêm con' }).last().click()
  const toast = page.getByTestId('toast').filter({ hasText: 'Đã thêm Nguyễn Văn Bình' })
  await expect(toast).toBeVisible()
  await expect(card(page, 'Nguyễn Văn Bình')).toHaveClass(/kt-glow/)
  await expect(toast).toBeHidden({ timeout: 6000 })
})

test('Thêm bị từ chối: lỗi dưới ô giới tính, con trỏ tới đó, giữ họ tên', async ({ page }) => {
  await openSampleTree(page)
  await card(page, 'Nguyễn Văn An').click()
  await page.getByRole('button', { name: 'Thêm con', exact: true }).click()
  await page.getByLabel('Họ tên').fill('Nguyễn Văn Bình')
  await page.getByRole('button', { name: 'Thêm con' }).last().click()
  const gender = page.getByLabel('Giới tính')
  await expect(gender).toBeFocused()
  await expect(gender).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('alert')).toContainText('Vui lòng chọn giới tính')
  await expect(page.getByLabel('Họ tên')).toHaveValue('Nguyễn Văn Bình')
})

test('Gỡ người: thông báo và người biến khỏi sơ đồ', async ({ page }) => {
  await openSampleTree(page)
  await card(page, 'Nguyễn Thị Hoa').click()
  await page.getByRole('button', { name: 'Gỡ người này' }).click()
  await page.getByRole('button', { name: 'Gỡ', exact: true }).click()
  await expect(page.getByTestId('toast')).toContainText('Đã gỡ Nguyễn Thị Hoa')
  await expect(card(page, 'Nguyễn Thị Hoa')).toHaveCount(0)
})

test('Trình đọc màn hình: nút quanh khung đọc ra việc và tên người', async ({ page }) => {
  await openSampleTree(page)
  for (const name of ['Thêm con cho Nguyễn Văn An', 'Thêm vợ/chồng cho Nguyễn Văn An', 'Thu gọn nhánh của Nguyễn Văn An']) {
    await expect(page.getByRole('button', { name })).toHaveCount(1)
  }
})

test.describe('giảm chuyển động', () => {
  test('Làm nổi khi chưa bật giảm chuyển động: chạy 2 nhịp rồi dừng', async ({ page }) => {
    await openSampleTree(page)
    await page.getByLabel('Tìm người').fill('chau')
    await page.getByRole('button', { name: 'Nguyễn Văn Cháu', exact: true }).click()
    const anim = await card(page, 'Nguyễn Văn Cháu').evaluate((el) => getComputedStyle(el).animationIterationCount)
    expect(anim).toBe('2')
  })

  test('Tìm một người khi bật giảm chuyển động: nhảy thẳng, viền tĩnh', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openSampleTree(page)
    await page.getByLabel('Tìm người').fill('chau')
    await page.getByRole('button', { name: 'Nguyễn Văn Cháu', exact: true }).click()
    const style = await card(page, 'Nguyễn Văn Cháu').evaluate((el) => {
      const cs = getComputedStyle(el)
      return { duration: parseFloat(cs.animationDuration), shadow: cs.boxShadow }
    })
    expect(style.duration).toBeLessThan(0.001)
    expect(style.shadow).not.toBe('none')
  })
})

test('Cuốn chưa có ai: một câu và một nút "Thêm thuỷ tổ"', async ({ page }) => {
  await seed(page, [])
  await page.goto('/')
  await expect(page.getByText('Chưa có cuốn gia phả nào')).toBeVisible()
  await page.getByRole('button', { name: 'Tạo cuốn gia phả' }).click()
  await page.getByLabel('Tên cuốn').fill('Chi hai')
  await page.getByRole('button', { name: 'Tạo cuốn', exact: true }).click()
  await expect(page.getByText('Cuốn này chưa có ai')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Thêm thuỷ tổ' })).toHaveCount(1)
})

test('Chế độ danh sách: lọc "Đã mất"', async ({ page }) => {
  await openSampleTree(page)
  await page.getByRole('button', { name: 'Danh sách', exact: true }).click()
  await page.getByRole('button', { name: 'Đã mất' }).click()
  await expect(page.getByText('1 người')).toBeVisible()
  await expect(page.getByRole('button', { name: /Nguyễn Văn Cả/ })).toBeVisible()
})

test('Back của trình duyệt đóng tấm trượt / hộp thoại rồi về danh sách cuốn', async ({ page }) => {
  await openSampleTree(page)
  await card(page, 'Nguyễn Văn An').click()
  await page.getByRole('button', { name: 'Sửa hồ sơ' }).click()
  await expect(page.getByRole('dialog', { name: /Hồ sơ/ })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('dialog', { name: /Hồ sơ/ })).toBeHidden()
  await expect(page.getByRole('complementary', { name: /Thông tin Nguyễn Văn An/ })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('button', { name: /Chi trưởng họ Nguyễn/ })).toBeVisible()
})
