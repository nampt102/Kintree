import { admin, clientAs, createUser, must } from './backend.ts'
import { card, expect, login, openClan, openSampleTree, test } from './fixtures.ts'

test.use({ viewport: { width: 1024, height: 768 } })

const treeRow = (page: import('@playwright/test').Page) => page.getByRole('button', { name: /Chi trưởng họ Nguyễn/ }).first()

test.describe('dòng họ và quyền trên giao diện', () => {
  test('Thấy đúng dòng họ của mình, không có nút tạo dòng họ', async ({ page, world, worlds }) => {
    const other = await worlds.create(null)
    await login(page, world.admin)
    await page.goto('/')
    await expect(page.getByRole('button', { name: new RegExp(world.clanName) })).toBeVisible()
    await expect(page.getByText(other.clanName)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Tạo dòng họ/ })).toHaveCount(0)
    await expect(page.getByText('Chỉ xem')).toHaveCount(0)
  })

  test('Người xem: không có nút tạo cuốn; mở cuốn thì chỉ đọc', async ({ page, world }) => {
    await openClan(page, world, world.viewer)
    await expect(page.getByRole('button', { name: 'Tạo cuốn gia phả' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Thêm cho cuốn/ })).toHaveCount(0)
    await treeRow(page).click()
    await expect(page.locator('[data-person-id]').first()).toBeVisible()
    await card(page, 'Nguyễn Văn An').click()
    await expect(page.getByRole('complementary', { name: /Thông tin Nguyễn Văn An/ })).toBeVisible()
    for (const name of ['Sửa hồ sơ', 'Thêm con', 'Thêm vợ/chồng', 'Gỡ người này', 'Gỡ cả nhánh']) {
      await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0)
    }
    await expect(page.getByRole('button', { name: /^Thêm con cho/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Xem riêng nhánh này' })).toBeVisible()
    await page.getByRole('button', { name: 'Thêm' }).click()
    await expect(page.getByRole('menuitem', { name: 'Tải bản sao' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Xoá cuốn' })).toHaveCount(0)
    await expect(page.getByRole('menuitem', { name: 'Sửa thông tin cuốn' })).toHaveCount(0)
  })

  test('Người xem không sửa được qua API: bị từ chối, dữ liệu giữ nguyên', async ({ world }) => {
    const viewer = await clientAs(world.viewer)
    const person = world.doc!.persons[0]!
    const upd = await viewer.from('persons').update({ full_name: 'Bị đổi' }).eq('id', person.id).select('id')
    expect(upd.data ?? []).toEqual([])
    const ins = await viewer.from('persons').insert({ tree_id: world.treeId, full_name: 'Chui vào', gender: 'male' })
    expect(ins.error?.code).toBe('42501')
    const rpc = await viewer.rpc('apply_tree_changes', { p_tree: null, p_persons: [{ id: crypto.randomUUID(), tree_id: world.treeId, full_name: 'Chui vào', gender: 'male' }], p_parents: null, p_marriages: null })
    expect(rpc.error?.code).toBe('42501')
    const after = must(await admin().from('persons').select('full_name').eq('id', person.id).single())
    expect(after!.full_name).toBe(person.fullName)
  })

  test('Người dùng thường không tạo được dòng họ hay cuốn qua API', async ({ world }) => {
    const user = await clientAs(world.admin)
    const clan = await user.from('clans').insert({ name: 'Tự tạo', slug: `tu-tao-${Date.now()}` })
    expect(clan.error?.code).toBe('42501')
    const viewer = await clientAs(world.viewer)
    const tree = await viewer.rpc('create_tree', { p_clan: world.clanId, p_name: 'Cuốn lạ', p_region: 'north' })
    expect(tree.error?.code).toBe('42501')
    const clanFn = await user.rpc('platform_create_clan', { p_name: 'Họ lạ', p_admin_email: 'x@example.com' })
    expect(clanFn.error?.code).toBe('42501')
  })

  test('Cách ly: người ngoài không đọc được dòng họ, cuốn, người của dòng họ khác', async ({ world, worlds }) => {
    const other = await worlds.create(null)
    const outsider = await clientAs(other.admin)
    expect(((await outsider.from('clans').select('id').eq('id', world.clanId)).data ?? []).length).toBe(0)
    expect(((await outsider.from('trees').select('id').eq('id', world.treeId!)).data ?? []).length).toBe(0)
    expect(((await outsider.from('persons').select('id').eq('tree_id', world.treeId!)).data ?? []).length).toBe(0)
    const stranger = await createUser('la')
    const lone = await clientAs(stranger)
    expect(((await lone.from('clans').select('id')).data ?? []).length).toBe(0)
    await admin().auth.admin.deleteUser(stranger.id)
  })

  test('Người chỉ có quyền một cuốn: chỉ thấy đúng cuốn ấy', async ({ world, worlds }) => {
    const sibling = await worlds.create(null)
    void sibling
    const one = await createUser('mot-cuon')
    must(await admin().from('memberships').insert({ user_id: one.id, tree_id: world.treeId, role: 'viewer' }))
    const c = await clientAs(one)
    const trees = must(await c.from('trees').select('id'))
    expect(trees!.map((t) => t.id)).toEqual([world.treeId])
    expect(((await c.from('clans').select('id')).data ?? []).length).toBe(0)
    await admin().auth.admin.deleteUser(one.id)
  })

  test('Người chỉ có quyền một cuốn: thấy cuốn ở mục "Cuốn được chia sẻ" và mở được', async ({ page, world }) => {
    const one = await createUser('mot-cuon')
    must(await admin().from('memberships').insert({ user_id: one.id, tree_id: world.treeId, role: 'viewer' }))
    await login(page, one)
    await page.goto('/')
    await expect(page.getByText('Cuốn được chia sẻ')).toBeVisible()
    await treeRow(page).click()
    await expect(page.locator('[data-person-id]').first()).toBeVisible()
    await admin().auth.admin.deleteUser(one.id)
  })
})

test.describe('sửa thông tin và xoá cuốn', () => {
  test('Sửa tên cuốn: tên mới hiện ở danh sách và sau khi tải lại', async ({ page, world }) => {
    await openClan(page, world)
    await page.getByRole('button', { name: /Thêm cho cuốn Chi trưởng/ }).click()
    await page.getByRole('menuitem', { name: 'Sửa thông tin cuốn' }).click()
    await page.getByLabel('Tên cuốn').fill('Chi thứ hai họ Nguyễn')
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page.getByRole('button', { name: /Chi thứ hai họ Nguyễn/ }).first()).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: new RegExp(world.clanName) }).click()
    await expect(page.getByRole('button', { name: /Chi thứ hai họ Nguyễn/ }).first()).toBeVisible()
  })

  test('Xoá cuốn: gõ sai tên thì nút khoá; gõ đúng thì cuốn biến, dữ liệu vẫn còn trên máy chủ', async ({ page, world }) => {
    await openClan(page, world)
    await page.getByRole('button', { name: /Thêm cho cuốn Chi trưởng/ }).click()
    await page.getByRole('menuitem', { name: 'Xoá cuốn' }).click()
    const del = page.getByRole('button', { name: 'Xoá cuốn', exact: true })
    await page.getByLabel('Gõ lại tên cuốn để xác nhận').fill('Chi khác')
    await expect(del).toBeDisabled()
    await page.getByLabel('Gõ lại tên cuốn để xác nhận').fill('Chi trưởng họ Nguyễn')
    await expect(del).toBeEnabled()
    await del.click()
    await expect(page.getByText('Chưa có cuốn gia phả nào')).toBeVisible()

    const rows = must(await admin().from('trees').select('removed_at').eq('id', world.treeId!).single())
    expect(rows!.removed_at).not.toBeNull()
    expect(must(await admin().from('persons').select('id').eq('tree_id', world.treeId!))!.length).toBeGreaterThan(0)
    // Người trong cuốn đã xoá không đọc được, kể cả với quản trị.
    const adminClient = await clientAs(world.admin)
    expect(((await adminClient.from('persons').select('id').eq('tree_id', world.treeId!)).data ?? []).length).toBe(0)
    expect(((await adminClient.from('trees').select('id').eq('id', world.treeId!)).data ?? []).length).toBe(0)
  })

  test('Xoá cuốn từ màn cuốn: về danh sách và cuốn biến khỏi mọi thành viên', async ({ page, world }) => {
    await openSampleTree(page, world)
    await page.getByRole('button', { name: 'Thêm', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Xoá cuốn' }).click()
    await page.getByLabel('Gõ lại tên cuốn để xác nhận').fill('Chi trưởng họ Nguyễn')
    await page.getByRole('button', { name: 'Xoá cuốn', exact: true }).click()
    await expect(page.getByText('Chưa có cuốn gia phả nào')).toBeVisible()
    const viewer = await clientAs(world.viewer)
    expect(((await viewer.from('trees').select('id')).data ?? []).length).toBe(0)
  })

  test('Người xem muốn xoá cuốn qua API: bị từ chối, cuốn vẫn còn', async ({ world }) => {
    const viewer = await clientAs(world.viewer)
    const r = await viewer.from('trees').update({ removed_at: new Date().toISOString() }).eq('id', world.treeId!).select('id')
    expect(r.data ?? []).toEqual([])
    const row = must(await admin().from('trees').select('removed_at').eq('id', world.treeId!).single())
    expect(row!.removed_at).toBeNull()
  })

  test('Mở cuốn đã xoá (danh sách cũ còn trên màn hình): báo không tìm thấy cuốn', async ({ page, world }) => {
    await openClan(page, world)
    await expect(treeRow(page)).toBeVisible()
    must(await admin().from('trees').update({ removed_at: new Date().toISOString() }).eq('id', world.treeId!))
    await treeRow(page).click()
    await expect(page.getByText('Không tìm thấy cuốn gia phả này')).toBeVisible()
    await expect(page.locator('[data-person-id]')).toHaveCount(0)
  })
})

test.describe('điều hướng ba tầng', () => {
  test('Back đi lần lượt cuốn → các cuốn → dòng họ', async ({ page, world }) => {
    await openSampleTree(page, world)
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Các cuốn gia phả' })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Dòng họ của bạn' })).toBeVisible()
  })

  test('Nút về trên màn hình đi cùng đường', async ({ page, world }) => {
    await openSampleTree(page, world)
    await page.getByRole('button', { name: 'Về danh sách cuốn' }).click()
    await expect(page.getByRole('heading', { name: 'Các cuốn gia phả' })).toBeVisible()
    await page.getByRole('button', { name: 'Về danh sách dòng họ' }).click()
    await expect(page.getByRole('heading', { name: 'Dòng họ của bạn' })).toBeVisible()
  })
})
