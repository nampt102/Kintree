import { admin, clientAs, createUser, latestOtp, makePlatformAdmin, must } from './backend.ts'
import { expect, login, test } from './fixtures.ts'

test.use({ viewport: { width: 1024, height: 768 } })

test.describe('quản trị nền tảng', () => {
  test('Người dùng thường không thấy lối vào quản trị nền tảng', async ({ page, world }) => {
    await login(page, world.admin)
    await page.goto('/')
    await expect(page.getByRole('button', { name: new RegExp(world.clanName) })).toBeVisible()
    await expect(page.getByRole('button', { name: /Quản trị nền tảng/ })).toHaveCount(0)
  })

  test('Quản trị nền tảng tạo dòng họ cho email đã có tài khoản: người ấy thấy dòng họ với vai trò Quản trị', async ({ page, world }) => {
    const ops = await makePlatformAdmin()
    await login(page, ops)
    await page.goto('/')
    await page.getByRole('button', { name: /Quản trị nền tảng/ }).click()
    const name = `Họ Mới ${Date.now()}`
    await page.getByLabel('Tên dòng họ').fill(name)
    await page.getByLabel('Email người quản trị đầu tiên').fill(world.admin.email)
    await page.getByRole('button', { name: 'Tạo dòng họ' }).click()
    const item = page.getByTestId('platform-clans').getByRole('listitem').filter({ hasText: name })
    await expect(item).toContainText(world.admin.email)

    const them = await clientAs(world.admin)
    const clans = must(await them.from('clans').select('id, name').eq('name', name))
    expect(clans!.length).toBe(1)
    must(await admin().from('clans').delete().eq('name', name))
    await admin().auth.admin.deleteUser(ops.id)
  })

  test('Email chưa có tài khoản: thành quản trị ngay khi đăng nhập lần đầu', async ({ page, browser }) => {
    const ops = await makePlatformAdmin()
    await login(page, ops)
    await page.goto('/')
    await page.getByRole('button', { name: /Quản trị nền tảng/ }).click()
    const name = `Họ Chờ ${Date.now()}`
    const email = `chua-co-${Date.now()}@example.com`
    await page.getByLabel('Tên dòng họ').fill(name)
    await page.getByLabel('Email người quản trị đầu tiên').fill(email)
    await page.getByRole('button', { name: 'Tạo dòng họ' }).click()
    await expect(page.getByTestId('platform-clans').getByRole('listitem').filter({ hasText: name })).toContainText(email)

    const ctx = await browser.newContext({ baseURL: 'http://localhost:5175' })
    const fresh = await ctx.newPage()
    await fresh.goto('/')
    await fresh.getByLabel('Email').fill(email)
    await fresh.getByRole('button', { name: 'Gửi mã đăng nhập' }).click()
    await fresh.getByLabel('Mã 6 số').fill(await latestOtp(email))
    await fresh.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(fresh.getByRole('button', { name: new RegExp(name) })).toBeVisible()
    await expect(fresh.getByRole('button', { name: new RegExp(name) })).toContainText('Quản trị')
    await ctx.close()

    must(await admin().from('clans').delete().eq('name', name))
    const created = must(await admin().auth.admin.listUsers({ perPage: 200 }) as never) as { users: { id: string; email: string }[] }
    for (const u of created.users.filter((x) => x.email === email)) await admin().auth.admin.deleteUser(u.id)
    await admin().auth.admin.deleteUser(ops.id)
  })

  test('Thiếu tên hoặc email sai: lỗi dưới ô tương ứng và không tạo gì', async ({ page }) => {
    const ops = await makePlatformAdmin()
    await login(page, ops)
    await page.goto('/')
    await page.getByRole('button', { name: /Quản trị nền tảng/ }).click()
    await page.getByRole('button', { name: 'Tạo dòng họ' }).click()
    await expect(page.getByLabel('Tên dòng họ')).toHaveAttribute('aria-invalid', 'true')
    await page.getByLabel('Tên dòng họ').fill('Họ Thử Lỗi')
    await page.getByLabel('Email người quản trị đầu tiên').fill('khong-phai-email')
    await page.getByRole('button', { name: 'Tạo dòng họ' }).click()
    await expect(page.getByLabel('Email người quản trị đầu tiên')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Email người quản trị đầu tiên')).toBeFocused()
    expect(must(await admin().from('clans').select('id').eq('name', 'Họ Thử Lỗi'))!.length).toBe(0)
    await admin().auth.admin.deleteUser(ops.id)
  })

  test('Trùng tên: cả hai dòng họ tạo được với địa chỉ ngắn riêng', async ({ page }) => {
    const ops = await makePlatformAdmin()
    const other = await createUser('qt')
    await login(page, ops)
    await page.goto('/')
    await page.getByRole('button', { name: /Quản trị nền tảng/ }).click()
    const name = `Họ Trùng ${Date.now()}`
    for (let i = 0; i < 2; i++) {
      await page.getByLabel('Tên dòng họ').fill(name)
      await page.getByLabel('Email người quản trị đầu tiên').fill(other.email)
      await page.getByRole('button', { name: 'Tạo dòng họ' }).click()
      await expect(page.getByTestId('platform-clans').getByRole('listitem').filter({ hasText: name })).toHaveCount(i + 1)
    }
    const slugs = must(await admin().from('clans').select('slug').eq('name', name))!.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(2)
    must(await admin().from('clans').delete().eq('name', name))
    await Promise.all([ops, other].map((u) => admin().auth.admin.deleteUser(u.id)))
  })

  test('Quản trị nền tảng không đọc được dữ liệu gia phả của khách', async ({ world }) => {
    const ops = await makePlatformAdmin()
    const c = await clientAs(ops)
    expect(((await c.from('persons').select('id').eq('tree_id', world.treeId!)).data ?? []).length).toBe(0)
    expect(((await c.from('trees').select('id')).data ?? []).length).toBe(0)
    const list = await c.rpc('platform_list_clans')
    expect((list.data as { id: string }[]).some((x) => x.id === world.clanId)).toBe(true)
    await admin().auth.admin.deleteUser(ops.id)
  })

  test('Tự cấp quyền quản trị nền tảng qua API: bị từ chối', async ({ world }) => {
    const c = await clientAs(world.admin)
    const r = await c.from('platform_admins').insert({ user_id: world.admin.id })
    expect(r.error?.code).toBe('42501')
  })
})
