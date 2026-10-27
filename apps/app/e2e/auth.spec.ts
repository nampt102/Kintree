import { createUser, latestOtp } from './backend.ts'
import { expect, login, test } from './fixtures.ts'

test.use({ viewport: { width: 1024, height: 768 } })

test.describe('cổng đăng nhập', () => {
  test('Mở app lần đầu: chỉ thấy màn đăng nhập và không tải dữ liệu nào', async ({ page }) => {
    const dataCalls: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/rest/v1/')) dataCalls.push(r.url())
    })
    await page.goto('/')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Gửi mã đăng nhập' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Google/ })).toHaveCount(0)
    await page.waitForTimeout(500)
    expect(dataCalls).toEqual([])
  })

  test('Phiên bị thu hồi lúc đang dùng: quay về màn đăng nhập, không còn dữ liệu cũ', async ({ page, world, context }) => {
    await login(page, world.admin)
    await page.goto('/')
    await expect(page.getByRole('button', { name: new RegExp(world.clanName) })).toBeVisible()
    // Đăng xuất ở thẻ khác: SDK báo SIGNED_OUT cho thẻ này (cùng đường đi với phiên hết hạn hoặc bị thu hồi).
    const other = await context.newPage()
    await other.goto('/')
    await other.getByRole('button', { name: 'Tài khoản' }).click()
    await other.getByRole('menuitem', { name: 'Đăng xuất' }).click()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByText(world.clanName)).toHaveCount(0)
  })
})

test.describe('đăng nhập bằng email và mã 6 số', () => {
  test('Đăng nhập thành công, tải lại vẫn ở trong app', async ({ page, world }) => {
    await page.goto('/')
    await page.getByLabel('Email').fill(world.admin.email)
    await page.getByRole('button', { name: 'Gửi mã đăng nhập' }).click()
    await page.getByLabel('Mã 6 số').fill(await latestOtp(world.admin.email))
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page.getByRole('button', { name: new RegExp(world.clanName) })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: new RegExp(world.clanName) })).toBeVisible()
  })

  test('Mã sai: lỗi dưới ô mã, con trỏ ở ô mã, email còn nguyên', async ({ page, world }) => {
    await page.goto('/')
    await page.getByLabel('Email').fill(world.admin.email)
    await page.getByRole('button', { name: 'Gửi mã đăng nhập' }).click()
    await page.getByLabel('Mã 6 số').fill('000000')
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    const code = page.getByLabel('Mã 6 số')
    await expect(code).toHaveAttribute('aria-invalid', 'true')
    await expect(code).toBeFocused()
    await expect(page.getByRole('alert')).toContainText('Mã không đúng')
    await expect(page.getByText(world.admin.email)).toBeVisible()
  })

  test('Email thiếu "@": lỗi dưới ô email và không gửi yêu cầu nào', async ({ page }) => {
    const otpCalls: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/auth/v1/otp')) otpCalls.push(r.url())
    })
    await page.goto('/')
    await page.getByLabel('Email').fill('khong-co-a-cong')
    await page.getByRole('button', { name: 'Gửi mã đăng nhập' }).click()
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('alert')).toContainText('Email chưa đúng')
    expect(otpCalls).toEqual([])
  })

  test('Gửi lại mã: nút khoá một lúc, mã mới dùng được, mã cũ thì không', async ({ page, world }) => {
    await page.clock.install()
    await page.goto('/')
    await page.getByLabel('Email').fill(world.admin.email)
    await page.getByRole('button', { name: 'Gửi mã đăng nhập' }).click()
    const first = await latestOtp(world.admin.email, 1)
    const resend = page.getByRole('button', { name: /Gửi lại mã/ })
    await expect(resend).toBeDisabled()
    await page.clock.fastForward(31_000)
    await page.waitForTimeout(1500) // Auth giới hạn tần suất gửi thư theo giờ thật (max_frequency)
    await expect(resend).toBeEnabled()
    await resend.click()
    const second = await latestOtp(world.admin.email, 2)
    expect(second).not.toBe(first)
    await page.getByLabel('Mã 6 số').fill(first)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page.getByLabel('Mã 6 số')).toHaveAttribute('aria-invalid', 'true')
    await page.getByLabel('Mã 6 số').fill(second)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page.getByRole('button', { name: new RegExp(world.clanName) })).toBeVisible()
  })

  test('Email mới: tự tạo tài khoản, thấy "chưa được cấp quyền", không có nút tạo dòng họ', async ({ page }) => {
    const stranger = await createUser('moi')
    // Người này đã được tạo (để dọn dẹp dễ), nhưng chưa thuộc dòng họ nào: giống tài khoản mới đăng ký.
    await page.goto('/')
    await page.getByLabel('Email').fill(stranger.email)
    await page.getByRole('button', { name: 'Gửi mã đăng nhập' }).click()
    await page.getByLabel('Mã 6 số').fill(await latestOtp(stranger.email))
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page.getByText('Bạn chưa được cấp quyền')).toBeVisible()
    await expect(page.getByRole('button', { name: /Tạo dòng họ|Tạo cuốn/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Quản trị nền tảng/ })).toHaveCount(0)
  })
})

test.describe('đăng xuất', () => {
  test('Menu tài khoản có email; đăng xuất rồi Back vẫn ở màn đăng nhập; không còn nội dung cuốn trên máy', async ({ page, world }) => {
    await login(page, world.admin)
    await page.goto('/')
    await page.getByRole('button', { name: new RegExp(world.clanName) }).click()
    await page.getByRole('button', { name: /Chi trưởng họ Nguyễn/ }).first().click()
    await expect(page.locator('[data-person-id]').first()).toBeVisible()
    await page.getByRole('button', { name: 'Về danh sách cuốn' }).click()
    await page.getByRole('button', { name: 'Về danh sách dòng họ' }).click()
    await page.getByRole('button', { name: 'Tài khoản' }).click()
    await expect(page.getByRole('menuitem', { name: world.admin.email })).toBeVisible()
    await page.getByRole('menuitem', { name: 'Đăng xuất' }).click()
    await expect(page.getByLabel('Email')).toBeVisible()
    const dump = await page.evaluate(async () => {
      const dbs = (await indexedDB.databases?.()) ?? []
      return JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage }, idb: dbs.map((d) => d.name) })
    })
    expect(dump).not.toContain('Nguyễn')
    expect(dump).not.toContain('Cụ')
    // Back có thể ra khỏi app hẳn; nếu còn ở trong app thì vẫn là màn đăng nhập. Dữ liệu dòng họ không hiện ở cả hai trường hợp.
    await page.goBack()
    if (page.url().startsWith('http')) await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByText(world.clanName)).toHaveCount(0)

  })
})
