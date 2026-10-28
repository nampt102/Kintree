// AI chép phả từ ảnh qua giao diện, đi đường thật (change ai-image-proposals): đưa ảnh → function (bộ giả lập) → hàng chờ → nhận/gộp/bỏ → nguồn.
import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { admin, must, type World } from './backend.ts'
import { card, expect, expectNoHorizontalScroll, expectTouchTargets, login, openSampleTree, test } from './fixtures.ts'

test.use({ viewport: { width: 1440, height: 900 } })

// PNG 1×1 hợp lệ: app thu nhỏ bằng canvas rồi tải lên dạng JPEG.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

async function uploadImage(page: Page, title: string) {
  await page.getByRole('button', { name: 'Thêm', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Đưa ảnh vào' }).click()
  const dialog = page.getByRole('dialog', { name: 'Đưa ảnh vào' })
  await dialog.getByTestId('image-file').setInputFiles({ name: 'bia.png', mimeType: 'image/png', buffer: PNG })
  // `mock:` ở đầu: luôn dùng bộ giả lập, không gọi AI thật dù supabase/.env đã cấu hình nhà cung cấp.
  await dialog.getByLabel('Tên gọi (tuỳ chọn)').fill(title.startsWith('mock:') ? title : `mock:${title}`)
  await dialog.getByRole('button', { name: 'Đưa vào và đọc' }).click()
  await expect(dialog).toBeHidden()
}

/** Đưa ảnh vào và mở hàng chờ khi đã đọc xong. */
async function readAndReview(page: Page, title = 'Bia cụ Thử') {
  await uploadImage(page, title)
  const source = page.getByTestId('source-card').first()
  await expect(source).toHaveAttribute('data-status', 'done')
  await source.getByRole('button', { name: /Xem đề xuất/ }).click()
  await expect(page.getByTestId('review')).toBeVisible()
  await expect(page.getByTestId('proposal')).toBeVisible()
}

const peopleCount = async (world: World) => must(await admin().from('persons').select('id').eq('tree_id', world.treeId!))!.length

test.describe('đưa ảnh vào và hàng chờ', () => {
  test('Đưa ảnh vào: tư liệu "Đã đọc" 4 đề xuất, cây chưa đổi; nhận người kèm quan hệ thì người vào cây có nguồn', async ({ page, world }) => {
    await openSampleTree(page, world)
    await uploadImage(page, 'Bia cụ Thử')
    const source = page.getByTestId('source-card').first()
    await expect(source).toContainText('Bia cụ Thử')
    await expect(source).toHaveAttribute('data-status', 'done')
    await expect(source).toContainText('4 đề xuất')
    expect(await peopleCount(world)).toBe(7)
    await expect(page.getByText('Đang chạy bộ giả lập')).toBeVisible()

    await source.getByRole('button', { name: /Xem đề xuất/ }).click()
    const proposal = page.getByTestId('proposal')
    await expect(proposal).toContainText('Thêm người: Nguyễn Văn Thử')
    await expect(proposal).toContainText('AI đọc')
    await expect(proposal).toContainText('Kèm quan hệ')
    await expect(page.getByTestId('anchor-box')).toBeVisible()
    await proposal.getByRole('button', { name: 'Nhận', exact: true }).click()
    await expect(page.getByTestId('toast').filter({ hasText: 'Đã nhận đề xuất' })).toBeVisible()
    await expect.poll(() => peopleCount(world)).toBe(8)

    const rows = must(await admin().from('proposals').select('op, status, result_person_id').eq('tree_id', world.treeId!))!
    expect(rows.filter((r) => r.status === 'accepted').map((r) => r.op).sort()).toEqual(['add_person', 'add_relation'])
    const refs = must(await admin().from('field_sources').select('field, accepted').eq('person_id', rows.find((r) => r.op === 'add_person' && r.status === 'accepted')!.result_person_id!))!
    expect(refs.map((r) => r.field).sort()).toEqual(['birth', 'death', 'fullName', 'gender'])
    await page.getByRole('button', { name: 'Đóng hàng chờ duyệt' }).click()
    await expect(card(page, 'Nguyễn Văn Thử')).toBeVisible()
  })

  test('Người xem không thấy nút đề xuất; thấy dấu nguồn và mở được hộp nguồn', async ({ page, browser, world }) => {
    await openSampleTree(page, world)
    await readAndReview(page)
    await page.getByTestId('proposal').getByRole('button', { name: 'Nhận', exact: true }).click()
    await expect.poll(() => peopleCount(world)).toBe(8)

    const ctx = await browser.newContext({ baseURL: 'http://localhost:5175', viewport: { width: 1440, height: 900 } })
    const viewer = await ctx.newPage()
    await openSampleTree(viewer, world, world.viewer)
    await expect(viewer.getByRole('button', { name: /^Đề xuất/ })).toHaveCount(0)
    await card(viewer, 'Nguyễn Văn Thử').click()
    const chip = viewer.getByRole('button', { name: 'Nguồn của Ngày sinh' })
    await expect(chip).toBeVisible()
    await chip.click()
    const box = viewer.getByRole('dialog', { name: /Nguồn: Ngày sinh/ })
    await expect(box).toContainText('Được chọn')
    await expect(box.getByTestId('source-item')).toHaveCount(1)
    await ctx.close()
  })

  test('Bỏ đề xuất sửa trường kèm lý do: cây không đổi, nguồn không chọn vẫn được lưu', async ({ page, world }) => {
    await openSampleTree(page, world)
    await readAndReview(page)
    await page.getByRole('button', { name: /Chọn: Sửa nơi an táng/ }).click()
    await page.getByTestId('proposal').getByRole('button', { name: 'Bỏ', exact: true }).click()
    await page.getByLabel('Lý do (tuỳ chọn)').fill('đọc nhầm chữ')
    await page.getByRole('button', { name: 'Bỏ đề xuất' }).click()
    await expect(page.getByTestId('toast').filter({ hasText: 'Đã bỏ đề xuất' })).toBeVisible()
    const fs = must(await admin().from('field_sources').select('field, accepted, note, value'))!.filter((r) => r.field === 'burialPlace')
    expect(fs).toEqual([{ field: 'burialPlace', accepted: false, note: 'đọc nhầm chữ', value: 'Nghĩa trang làng' }])
    expect(must(await admin().from('persons').select('burial_place').eq('tree_id', world.treeId!).eq('is_root', true))![0]!.burial_place).toBeNull()
  })

  test('Người trùng: gợi ý gộp; gộp chỉ thêm trường trống, số người không đổi; "Thêm như người mới" cần chỗ gắn', async ({ page, world }) => {
    await openSampleTree(page, world)
    await readAndReview(page)
    // Bỏ đề xuất đầu (người mới) để tới đề xuất trùng thuỷ tổ.
    await page.getByTestId('proposal').getByRole('button', { name: 'Bỏ', exact: true }).click()
    await page.getByRole('button', { name: 'Bỏ đề xuất' }).click()
    await page.getByRole('button', { name: /Chọn: Thêm người: Nguyễn Văn Cả/ }).click()
    const hint = page.getByTestId('merge-hint')
    await expect(hint).toContainText('Có thể là Nguyễn Văn Cả đã có trong cuốn')
    await expect(hint).toContainText('Ghi nơi sinh "Làng Cổ"')
    await expect(page.getByTestId('proposal').getByRole('button', { name: 'Thêm như người mới' })).toBeDisabled()
    await expect(page.getByRole('alert')).toContainText('chưa gắn được vào cây')
    await page.getByTestId('proposal').getByRole('button', { name: 'Gộp vào Nguyễn Văn Cả' }).click()
    await expect(page.getByTestId('toast').filter({ hasText: 'Đã gộp' })).toBeVisible()
    await expect.poll(async () => must(await admin().from('persons').select('birth_place').eq('tree_id', world.treeId!).eq('is_root', true))![0]!.birth_place).toBe('Làng Cổ')
    expect(await peopleCount(world)).toBe(7)
  })

  test('Sửa rồi nhận: người không có quan hệ đi kèm chọn nơi gắn vào cây', async ({ page, world }) => {
    await openSampleTree(page, world)
    await readAndReview(page)
    await page.getByTestId('proposal').getByRole('button', { name: 'Bỏ', exact: true }).click()
    await page.getByRole('button', { name: 'Bỏ đề xuất' }).click()
    await page.getByRole('button', { name: /Chọn: Thêm người: Nguyễn Văn Cả/ }).click()
    await page.getByTestId('proposal').getByRole('button', { name: 'Sửa rồi nhận' }).click()
    const dialog = page.getByRole('dialog', { name: 'Sửa rồi nhận' })
    await dialog.getByLabel('Họ tên').fill('Nguyễn Văn Cả Con')
    await dialog.getByLabel('Người trong cây').click()
    await page.getByRole('option', { name: 'Nguyễn Văn An' }).click()
    await dialog.getByRole('button', { name: 'Lưu và nhận' }).click()
    await expect.poll(() => peopleCount(world)).toBe(8)
    const edited = must(await admin().from('proposals').select('edited, status').eq('tree_id', world.treeId!).eq('op', 'add_person').eq('status', 'accepted'))!
    expect(edited).toEqual([{ edited: true, status: 'accepted' }])
  })

  test('Quan hệ chờ người chưa nhận: không nhận riêng được; bỏ người thì quan hệ bỏ theo', async ({ page, world }) => {
    await openSampleTree(page, world)
    await readAndReview(page)
    await page.getByRole('button', { name: /Chọn: Quan hệ/ }).click()
    await expect(page.getByTestId('proposal').getByRole('button', { name: 'Nhận', exact: true })).toBeDisabled()
    await expect(page.getByRole('alert')).toContainText('Cần nhận người Nguyễn Văn Thử trước')
    await page.getByRole('button', { name: /Chọn: Thêm người: Nguyễn Văn Thử/ }).click()
    await page.getByTestId('proposal').getByRole('button', { name: 'Bỏ', exact: true }).click()
    await page.getByRole('button', { name: 'Bỏ đề xuất' }).click()
    await expect.poll(async () => must(await admin().from('proposals').select('review_note').eq('tree_id', world.treeId!).eq('op', 'add_relation'))![0]!.review_note).toBe('Người liên quan đã bị bỏ')
  })

  test('Kết quả sai schema: "Đọc lỗi" rồi đọc lại thành công', async ({ page, world }) => {
    await openSampleTree(page, world)
    await uploadImage(page, 'mock:fail bia thử')
    const source = page.getByTestId('source-card').first()
    await expect(source).toHaveAttribute('data-status', 'failed')
    await expect(source).toContainText('Đọc lỗi')
    must(await admin().from('sources').update({ title: 'mock:Bia thử' }).eq('tree_id', world.treeId!))
    await source.getByRole('button', { name: 'Đọc lại' }).click()
    await expect(source).toHaveAttribute('data-status', 'done')
    expect(must(await admin().from('proposals').select('id').eq('tree_id', world.treeId!))!.length).toBe(4)
  })

  test('Tệp không phải ảnh: báo lỗi và không tải gì lên', async ({ page, world }) => {
    await openSampleTree(page, world)
    await page.getByRole('button', { name: 'Thêm', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Đưa ảnh vào' }).click()
    const dialog = page.getByRole('dialog', { name: 'Đưa ảnh vào' })
    await dialog.getByTestId('image-file').setInputFiles({ name: 'ghi-chu.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
    await expect(dialog.getByRole('alert')).toContainText('Chỉ nhận ảnh JPEG, PNG hoặc WebP')
    await expect(dialog.getByRole('button', { name: 'Đưa vào và đọc' })).toBeDisabled()
    expect(must(await admin().from('sources').select('id').eq('tree_id', world.treeId!))!.length).toBe(0)
  })

  test('Hai nguồn cho cùng một trường: hộp nguồn hiện cả hai kèm ghi chú', async ({ page, world }) => {
    const root = must(await admin().from('persons').select('id').eq('tree_id', world.treeId!).eq('is_root', true))![0]!
    const mk = async (title: string) => {
      const id = randomUUID()
      must(await admin().from('sources').insert({ id, clan_id: world.clanId, tree_id: world.treeId, kind: 'image', image_kind: 'page', title, status: 'done', created_by: world.admin.id }))
      return id
    }
    const [a, b] = [await mk('Bia cụ Cả'), await mk('Phả trang 12')]
    must(
      await admin().from('field_sources').insert([
        { person_id: root.id, field: 'birth', source_id: a, value: { year: 1890, lunar: false }, accepted: true, note: 'bia mộ khắc rõ hơn' },
        { person_id: root.id, field: 'birth', source_id: b, value: { year: 1891, lunar: false }, accepted: false },
      ]),
    )
    await openSampleTree(page, world, world.viewer)
    await card(page, 'Nguyễn Văn Cả').click()
    const chip = page.getByRole('button', { name: 'Nguồn của Ngày sinh' })
    await expect(chip).toContainText('2 nguồn')
    await chip.click()
    const box = page.getByRole('dialog', { name: /Nguồn: Ngày sinh/ })
    const items = box.getByTestId('source-item')
    await expect(items).toHaveCount(2)
    await expect(items.first()).toContainText('Được chọn')
    await expect(items.first()).toContainText('1890')
    await expect(items.first()).toContainText('bia mộ khắc rõ hơn')
    await expect(items.last()).toContainText('Không chọn')
    await expect(items.last()).toContainText('1891')
  })
})

test.describe('điện thoại', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true })

  test('Hàng chờ: danh sách rồi chi tiết toàn màn, vùng chạm đủ lớn, không cuộn ngang', async ({ page, world }) => {
    await login(page, world.admin)
    await page.goto('/')
    await page.getByRole('button', { name: new RegExp(world.clanName) }).click()
    await page.getByRole('button', { name: /Chi trưởng họ Nguyễn/ }).first().click()
    await expect(page.locator('[data-person-id]').first()).toBeVisible()
    await uploadImage(page, 'Bia cụ Thử')
    const source = page.getByTestId('source-card').first()
    await expect(source).toHaveAttribute('data-status', 'done')
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)
    await source.getByRole('button', { name: /Xem đề xuất/ }).click()
    await expect(page.getByTestId('review')).toBeVisible()
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)
    await page.getByRole('button', { name: /Thêm người: Nguyễn Văn Thử/ }).click()
    await expect(page.getByTestId('proposal')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Đề xuất 1/4' })).toBeVisible()
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)
  })
})
