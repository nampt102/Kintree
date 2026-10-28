// Chụp 6 màn × 2 cỡ để duyệt giao diện bằng mắt (không so điểm ảnh: phông và khử răng cưa khác máy).
// Ảnh ở test-results/visual/<VISUAL_TAG>-<cỡ>-<màn>.png; VISUAL_TAG mặc định "after".
import { card, expect, login, test } from './fixtures.ts'

const tag = process.env.VISUAL_TAG ?? 'after'
const out = (name: string) => `test-results/visual/${tag}-${name}.png`

for (const [size, viewport] of [
  ['390', { width: 390, height: 844 }],
  ['1280', { width: 1280, height: 800 }],
] as const) {
  test.describe(`ảnh ${size}`, () => {
    test.use({ viewport })

    test(`các màn chính ở ${size}`, async ({ page, world }) => {
      await page.goto('/')
      await expect(page.getByLabel('Email')).toBeVisible()
      await page.screenshot({ path: out(`${size}-1-dang-nhap`) })

      await login(page, world.admin)
      await page.goto('/')
      const clan = page.getByRole('button', { name: new RegExp(world.clanName) })
      await expect(clan).toBeVisible()
      await page.screenshot({ path: out(`${size}-2-dong-ho`) })

      await clan.click()
      await expect(page.getByRole('heading', { name: 'Các cuốn gia phả' })).toBeVisible()
      await page.screenshot({ path: out(`${size}-3-cac-cuon`) })

      await page.getByRole('button', { name: /Chi trưởng họ Nguyễn/ }).first().click()
      await expect(page.locator('.react-flow')).toHaveAttribute('data-fit', 'done')
      await page.screenshot({ path: out(`${size}-4-cay`) })

      await card(page, 'Nguyễn Văn An').click()
      await expect(page.getByRole('button', { name: 'Sửa hồ sơ' })).toBeVisible()
      await page.waitForTimeout(400)
      await page.screenshot({ path: out(`${size}-5-thong-tin`) })

      await page.getByRole('button', { name: 'Sửa hồ sơ' }).click()
      await expect(page.getByRole('dialog', { name: /Hồ sơ/ })).toBeVisible()
      await page.waitForTimeout(300)
      await page.screenshot({ path: out(`${size}-6-ho-so`) })
    })

    test(`thành viên và lời mời ở ${size}`, async ({ page, world }) => {
      await login(page, world.admin)
      await page.goto('/')
      await page.getByRole('button', { name: new RegExp(world.clanName) }).click()
      await page.getByRole('button', { name: 'Xem danh sách thành viên' }).click()
      await expect(page.getByTestId('member-row').first()).toBeVisible()
      await page.screenshot({ path: out(`${size}-7-thanh-vien`) })

      await page.getByRole('button', { name: 'Mời người' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.waitForTimeout(300)
      await page.screenshot({ path: out(`${size}-8-moi`) })
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: /Link mời/ }).click()
      await page.getByRole('button', { name: 'Tạo link mời' }).click()
      await page.getByRole('button', { name: 'Tạo link', exact: true }).click()
      const url = new URL((await page.getByTestId('invite-url').textContent())!)
      await page.waitForTimeout(300)
      await page.screenshot({ path: out(`${size}-9-link`) })

      await page.goto(url.pathname + url.hash)
      await expect(page.getByRole('button', { name: 'Nhận lời mời' })).toBeVisible()
      await page.screenshot({ path: out(`${size}-10-nhan-loi-moi`) })
    })
  })
}
