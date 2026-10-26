import { expect, test } from '@playwright/test'
import { seed } from './fixtures.ts'

test('mở trang danh sách cuốn', async ({ page }) => {
  await seed(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Kintree' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Chi trưởng họ Nguyễn/ })).toBeVisible()
})
