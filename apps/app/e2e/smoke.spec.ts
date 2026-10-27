import { expect, login, test } from './fixtures.ts'

test('đăng nhập rồi thấy danh sách dòng họ', async ({ page, world }) => {
  await login(page, world.admin)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Kintree' })).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(world.clanName) })).toBeVisible()
})
