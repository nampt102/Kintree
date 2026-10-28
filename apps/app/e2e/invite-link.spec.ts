// Test cho change clan-invites: link mời xem (tạo, nhận, mã mời, hết hạn, thu hồi, mở khi chưa đăng nhập).
import type { Page } from '@playwright/test'
import { admin, clientAs, createUser, latestOtp, must, type TestUser } from './backend.ts'
import { card, expect, login, openClan, test } from './fixtures.ts'
import type { World } from './backend.ts'

test.use({ viewport: { width: 1024, height: 768 } })

/** Link tạo thẳng qua API của quản trị (như giao diện gọi). */
async function apiLink(world: World, code: string | null = null, treeId: string | null = null): Promise<string> {
  const c = await clientAs(world.admin)
  const token = must(await c.rpc('link_create', { p_clan: world.clanId, p_tree: treeId, p_days: 7, p_code: code })) as string
  return `/#invite=${token}`
}

async function openAs(page: Page, user: TestUser, url: string) {
  await login(page, user)
  await page.goto(url)
}

test.describe('link mời', () => {
  test('Quản trị tạo link trên giao diện, người khác nhận và vào dòng họ với vai trò xem', async ({ page, browser, world }) => {
    await openClan(page, world)
    await page.getByRole('button', { name: 'Xem danh sách thành viên' }).click()
    await page.getByRole('button', { name: /Link mời/ }).click()
    await page.getByRole('button', { name: 'Tạo link mời' }).click()
    await page.getByRole('button', { name: 'Tạo link', exact: true }).click()
    const url = new URL((await page.getByTestId('invite-url').textContent())!)
    await page.getByRole('button', { name: 'Xong' }).click()
    await expect(page.getByTestId('link-card')).toHaveCount(1)

    const other = await createUser('nhan')
    const ctx = await browser.newContext({ baseURL: 'http://localhost:5175' })
    const p2 = await ctx.newPage()
    await openAs(p2, other, url.pathname + url.hash)
    await expect(p2.getByRole('heading', { name: world.clanName })).toBeVisible()
    await p2.getByRole('button', { name: 'Nhận lời mời' }).click()
    await expect(p2.getByRole('heading', { level: 1, name: world.clanName })).toBeVisible()
    await expect(p2.getByText('Dòng họ của bạn · Chỉ xem')).toBeVisible()
    await ctx.close()
    await admin().auth.admin.deleteUser(other.id)
  })

  test('Mở link khi chưa đăng nhập: đăng nhập bằng mã email rồi vào màn nhận lời mời', async ({ page, world }) => {
    const url = await apiLink(world)
    const email = `link-${Date.now()}@example.com`
    await page.goto(url)
    await expect(page.getByTestId('invite-hint')).toBeVisible()
    await expect(page.getByTestId('invite-hint')).not.toContainText(world.clanName)
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Gửi mã đăng nhập' }).click()
    await page.getByLabel('Mã 6 số').fill(await latestOtp(email))
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page.getByRole('heading', { name: world.clanName })).toBeVisible()
    await page.getByRole('button', { name: 'Nhận lời mời' }).click()
    await expect(page.getByText('Dòng họ của bạn · Chỉ xem')).toBeVisible()
    const users = (await admin().auth.admin.listUsers({ perPage: 200 })).data.users
    for (const u of users.filter((x) => x.email === email)) await admin().auth.admin.deleteUser(u.id)
  })

  test('Link có mã mời: sai mã báo lỗi, đúng mã thì nhận được', async ({ page, world }) => {
    const url = await apiLink(world, '1945', world.treeId)
    const other = await createUser('ma')
    await openAs(page, other, url)
    await expect(page.getByText('Cuốn: Chi trưởng họ Nguyễn')).toBeVisible()
    await page.getByLabel('Mã mời').fill('1954')
    await page.getByRole('button', { name: 'Nhận lời mời' }).click()
    await expect(page.getByText('Mã mời không đúng.')).toBeVisible()
    await page.getByLabel('Mã mời').fill('1945')
    await page.getByRole('button', { name: 'Nhận lời mời' }).click()
    // Link của một cuốn: mở thẳng cuốn ấy.
    await expect(card(page, 'Nguyễn Văn Cả')).toBeVisible()
    await admin().auth.admin.deleteUser(other.id)
  })

  test('Link đã thu hồi hoặc hết hạn: không nhận được, có lời khuyên xin link mới', async ({ page, world }) => {
    const revoked = await apiLink(world)
    const expired = await apiLink(world)
    const c = await clientAs(world.admin)
    const links = must(await c.rpc('link_list', { p_clan: world.clanId })) as { id: string }[]
    must(await c.rpc('link_revoke', { p_link: links[1]!.id }))
    must(await admin().from('invite_links').update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq('id', links[0]!.id))
    // link_list xếp mới nhất trước: links[0] là `expired`, links[1] là `revoked`.
    const other = await createUser('het')
    await openAs(page, other, revoked)
    await expect(page.getByRole('heading', { name: 'Link đã bị thu hồi' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nhận lời mời' })).toHaveCount(0)
    // Dán link vào thẻ đang mở: chỉ đổi hash, không tải lại trang.
    await page.getByRole('button', { name: 'Về trang chính' }).click()
    await page.goto(expired)
    await expect(page.getByRole('heading', { name: 'Link đã hết hạn' })).toBeVisible()
    await expect(page.getByText('hãy xin quản trị dòng họ link mới')).toBeVisible()
    await page.getByRole('button', { name: 'Về trang chính' }).click()
    await expect(page.getByText('chưa được cấp quyền', { exact: false })).toBeVisible()
    await admin().auth.admin.deleteUser(other.id)
  })

  test('Thu hồi link trên giao diện', async ({ page, world }) => {
    await apiLink(world)
    page.on('dialog', (d) => void d.accept())
    await openClan(page, world)
    await page.getByRole('button', { name: 'Xem danh sách thành viên' }).click()
    await page.getByRole('button', { name: /Link mời/ }).click()
    await expect(page.getByTestId('link-card')).toHaveCount(1)
    await page.getByRole('button', { name: 'Thu hồi' }).click()
    await expect(page.getByTestId('link-card')).toHaveCount(0)
  })
})
