// Test cho change clan-invites: màn Thành viên, mời bằng email, đổi vai trò, gỡ, giữ quản trị cuối.
import { admin, clientAs, createUser, must } from './backend.ts'
import { expect, login, openClan, test } from './fixtures.ts'
import type { Page } from '@playwright/test'

test.use({ viewport: { width: 1024, height: 768 } })

async function openMembers(page: Page) {
  await page.getByRole('button', { name: 'Xem danh sách thành viên' }).click()
  await expect(page.getByRole('heading', { name: 'Thành viên' })).toBeVisible()
}

const row = (page: Page, email: string) => page.getByTestId('member-row').filter({ hasText: email })

test.describe('màn thành viên', () => {
  test.beforeEach(({ page }) => page.on('dialog', (d) => void d.accept()))

  test('Người xem không thấy lối vào "Thành viên"', async ({ page, world }) => {
    await openClan(page, world, world.viewer)
    await expect(page.getByRole('heading', { name: world.clanName })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Xem danh sách thành viên' })).toHaveCount(0)
  })

  test('Danh sách có quản trị (bạn) và người xem của dòng họ', async ({ page, world }) => {
    await openClan(page, world)
    await openMembers(page)
    await expect(row(page, world.admin.email)).toContainText('(bạn)')
    await expect(row(page, world.admin.email)).toContainText('Quản trị')
    await expect(row(page, world.viewer.email)).toContainText('Người xem')
  })

  test('Mời email đã có tài khoản: có quyền ngay', async ({ page, world }) => {
    const other = await createUser('moi')
    await openClan(page, world)
    await openMembers(page)
    await page.getByRole('button', { name: 'Mời người' }).click()
    await page.getByLabel('Email').fill(other.email.toUpperCase())
    await page.getByRole('button', { name: 'Mời', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Đã thêm vào dòng họ' })).toBeVisible()
    await page.getByRole('button', { name: 'Xong' }).click()
    await expect(row(page, other.email)).toContainText('Người xem')
    const them = await clientAs(other)
    expect(must(await them.from('clans').select('id').eq('id', world.clanId))!.length).toBe(1)
    await admin().auth.admin.deleteUser(other.id)
  })

  test('Mời email chưa có tài khoản vào một cuốn: lời mời chờ, huỷ được', async ({ page, world }) => {
    const email = `chua-co-${Date.now()}@example.com`
    await openClan(page, world)
    await openMembers(page)
    await page.getByRole('button', { name: 'Mời người' }).click()
    await page.getByLabel('Email').fill(email)
    await page.getByRole('dialog').getByText('Quản trị', { exact: true }).click()
    await page.getByLabel('Phạm vi').click()
    await page.getByRole('option', { name: 'Chi trưởng họ Nguyễn' }).click()
    await page.getByRole('button', { name: 'Mời', exact: true }).click()
    await expect(page.getByTestId('invite-result')).toContainText('chưa có tài khoản')
    await page.getByRole('button', { name: 'Xong' }).click()
    const pending = row(page, email)
    await expect(pending).toContainText('Chờ đăng nhập')
    await expect(page.getByRole('region', { name: 'Chi trưởng họ Nguyễn' })).toContainText(email)
    await pending.getByRole('button', { name: `Thao tác với ${email}` }).click()
    await page.getByRole('menuitem', { name: 'Huỷ lời mời' }).click()
    await expect(pending).toHaveCount(0)
  })

  test('Email sai: lỗi dưới ô, không tạo gì', async ({ page, world }) => {
    await openClan(page, world)
    await openMembers(page)
    await page.getByRole('button', { name: 'Mời người' }).click()
    await page.getByLabel('Email').fill('khong-phai-email')
    await page.getByRole('button', { name: 'Mời', exact: true }).click()
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  test('Đổi người xem thành quản trị rồi gỡ', async ({ page, world }) => {
    await openClan(page, world)
    await openMembers(page)
    const v = row(page, world.viewer.email)
    await v.getByRole('button', { name: `Thao tác với ${world.viewer.email}` }).click()
    await page.getByRole('menuitem', { name: 'Đổi thành quản trị' }).click()
    await expect(v).toContainText('Quản trị')
    await v.getByRole('button', { name: `Thao tác với ${world.viewer.email}` }).click()
    await page.getByRole('menuitem', { name: 'Gỡ khỏi dòng họ' }).click()
    await expect(v).toHaveCount(0)
    const them = await clientAs(world.viewer)
    expect(must(await them.from('clans').select('id'))!.length).toBe(0)
  })

  test('Quản trị duy nhất tự hạ quyền: bị từ chối, vai trò không đổi', async ({ page, world }) => {
    await openClan(page, world)
    await openMembers(page)
    const me = row(page, world.admin.email)
    await me.getByRole('button', { name: `Thao tác với ${world.admin.email}` }).click()
    await page.getByRole('menuitem', { name: 'Đổi thành người xem' }).click()
    await expect(page.getByTestId('toast')).toContainText('phải còn ít nhất một quản trị')
    await expect(me).toContainText('Quản trị')
  })

  test('Thanh bên 1440 px có mục "Thành viên"', async ({ page, world }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, world.admin)
    await page.goto('/')
    await page.getByRole('button', { name: new RegExp(world.clanName) }).click()
    const rail = page.getByRole('navigation', { name: 'Điều hướng dòng họ' })
    await rail.getByRole('button', { name: /Thành viên/ }).click()
    await expect(rail.getByRole('button', { name: /Thành viên/ })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { name: 'Thành viên' })).toBeVisible()
  })
})
