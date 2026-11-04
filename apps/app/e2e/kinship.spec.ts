import { addChild, addRoot, createTree, type Result, type TreeDoc } from '@kintree/core'
import type { Page } from '@playwright/test'
import { admin, must, type World } from './backend.ts'
import { card, diagramSettled, expect, expectNoHorizontalScroll, expectTouchTargets, openClan, test } from './fixtures.ts'

// "Tôi là ai" và xưng hô (change kinship-terms). Cây: Ông có ba con theo thứ tự Bác, Cô Cả, Cha; Cha có con Tôi.
// Với Tôi: Cô Cả là chị gái của cha → "Bác" (Bắc), "O" (Trung), "Cô" (Nam).

const ok = <T extends object>(r: Result<T>) => {
  if (!r.ok) throw new Error(r.error)
  return r
}

function family(): TreeDoc {
  const id = () => crypto.randomUUID()
  let doc = ok(createTree({ name: 'Chi xưng hô', region: 'north' }, id)).doc
  const ong = ok(addRoot(doc, { fullName: 'Nguyễn Văn Ông', gender: 'male' }, id))
  doc = ong.doc
  const kid = (parentId: string, fullName: string, gender: 'male' | 'female') => {
    const r = ok(addChild(doc, { parentId, person: { fullName, gender }, kind: 'biological' }, id))
    doc = r.doc
    return r.id
  }
  kid(ong.id, 'Nguyễn Văn Bác', 'male')
  kid(ong.id, 'Nguyễn Thị Cô Cả', 'female')
  const cha = kid(ong.id, 'Nguyễn Văn Cha', 'male')
  kid(cha, 'Nguyễn Văn Tôi', 'male')
  return doc
}

async function openTree(page: Page, world: World, user = world.viewer) {
  await openClan(page, world, user)
  await page.getByRole('button', { name: /Chi xưng hô/ }).first().click()
  await expect(page.locator('[data-person-id]').first()).toBeVisible()
  await diagramSettled(page)
}

/** Chọn "Tôi là ai" bằng thẻ nhắc: tìm tên rồi chọn. */
async function chooseMe(page: Page, name = 'Nguyễn Văn Tôi') {
  await page.getByRole('button', { name: 'Chọn tên của tôi' }).click()
  const dialog = page.getByRole('dialog', { name: 'Bạn là ai?' })
  await dialog.getByLabel('Tên của bạn').fill(name.split(' ').at(-1)!)
  await dialog.getByRole('button', { name: new RegExp(name) }).click()
  await dialog.getByRole('button', { name: 'Chọn', exact: true }).click()
  await expect(dialog).toBeHidden()
}

const term = (page: Page, name: string) => card(page, name).getByTestId('kin-term')

test.describe('xưng hô', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('người xem chọn "Tôi là ai": nhãn đúng trên cây và lưu ở cơ sở dữ liệu', async ({ page, worlds }) => {
    const w = await worlds.create(family())
    await openTree(page, w)
    await expect(page.getByRole('region', { name: 'Bạn là ai trong cây này?' })).toBeVisible()
    await expect(page.getByTestId('kin-term')).toHaveCount(0)

    await chooseMe(page)
    await expect(page.getByRole('region', { name: 'Bạn là ai trong cây này?' })).toHaveCount(0)
    await expect(term(page, 'Nguyễn Văn Tôi')).toHaveText('Tôi')
    await expect(term(page, 'Nguyễn Văn Cha')).toHaveText('Bố')
    await expect(term(page, 'Nguyễn Văn Ông')).toHaveText('Ông nội')
    await expect(term(page, 'Nguyễn Văn Bác')).toHaveText('Bác')
    await expect(term(page, 'Nguyễn Thị Cô Cả')).toHaveText('Bác')

    const row = must(await admin().from('tree_self').select('person_id').eq('user_id', w.viewer.id).eq('tree_id', w.treeId!).maybeSingle())
    expect(row).not.toBeNull()
    // Quản trị cùng cuốn không thấy lựa chọn của người xem.
    expect(must(await admin().from('tree_self').select('user_id').eq('user_id', w.admin.id))).toEqual([])
  })

  test('bảng người: bạn gọi, người ấy gọi bạn, đường quan hệ; đổi miền thì nhãn đổi', async ({ page, worlds }) => {
    const w = await worlds.create(family())
    await openTree(page, w)
    await chooseMe(page)

    await card(page, 'Nguyễn Thị Cô Cả').click()
    const info = page.getByRole('complementary', { name: /Thông tin Nguyễn Thị Cô Cả/ })
    const kin = info.getByRole('region', { name: 'Xưng hô' })
    await expect(kin).toContainText('Bạn gọi')
    await expect(kin.getByText('Bác', { exact: true })).toBeVisible()
    await expect(kin).toContainText('Người ấy gọi bạn')
    await expect(kin.getByText('Cháu', { exact: true })).toBeVisible()
    await expect(kin).toContainText('chị gái của cha')

    // Quản trị đổi vùng miền sang Nam: cùng người, từ gọi là "Cô".
    must(await admin().from('trees').update({ region: 'south' }).eq('id', w.treeId!))
    await page.reload()
    await page.getByRole('button', { name: new RegExp(w.clanName) }).click()
    await page.getByRole('button', { name: /Chi xưng hô/ }).first().click()
    await diagramSettled(page)
    await expect(term(page, 'Nguyễn Thị Cô Cả')).toHaveText('Cô')
    await expect(term(page, 'Nguyễn Văn Cha')).toHaveText('Ba')
  })

  test('đổi và bỏ "Tôi là ai"; ẩn nhãn bằng menu', async ({ page, worlds }) => {
    const w = await worlds.create(family())
    await openTree(page, w)
    await chooseMe(page)

    await page.getByRole('button', { name: 'Thêm' }).click()
    await page.getByRole('menuitem', { name: 'Ẩn cách gọi trên cây' }).click()
    await expect(page.getByTestId('kin-term')).toHaveCount(0)
    await page.getByRole('button', { name: 'Thêm' }).click()
    await page.getByRole('menuitem', { name: 'Hiện cách gọi trên cây' }).click()
    await expect(term(page, 'Nguyễn Văn Cha')).toHaveText('Bố')

    await page.getByRole('button', { name: 'Thêm' }).click()
    await page.getByRole('menuitem', { name: 'Đổi người "Tôi là ai"' }).click()
    const dialog = page.getByRole('dialog', { name: 'Bạn là ai?' })
    await dialog.getByRole('button', { name: 'Bỏ lựa chọn' }).click()
    await expect(page.getByTestId('kin-term')).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Bạn là ai trong cây này?' })).toBeVisible()
    expect(must(await admin().from('tree_self').select('user_id').eq('user_id', w.viewer.id))).toEqual([])
  })

  test('"Để sau" ẩn thẻ nhắc; tra quan hệ không cần chọn "Tôi là ai"', async ({ page, worlds }) => {
    const w = await worlds.create(family())
    await openTree(page, w)
    await page.getByRole('button', { name: 'Để sau' }).click()
    await expect(page.getByRole('region', { name: 'Bạn là ai trong cây này?' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Thêm' }).click()
    await page.getByRole('menuitem', { name: 'Tra quan hệ' }).click()
    const dialog = page.getByRole('dialog', { name: 'Tra quan hệ' })
    await dialog.getByLabel('Người thứ nhất').fill('Tôi')
    await dialog.getByRole('button', { name: /Nguyễn Văn Tôi/ }).click()
    await dialog.getByLabel('Người thứ hai').fill('Cô Cả')
    await dialog.getByRole('button', { name: /Nguyễn Thị Cô Cả/ }).click()
    const result = dialog.getByTestId('kinship-result')
    await expect(result).toContainText('chị gái của cha')
    await expect(result).toContainText('Bác')
    await expect(result).toContainText('Cháu')

    // Hai người không có quan hệ trong cuốn thì nói rõ, không đoán.
    await dialog.getByRole('button', { name: 'Đổi người thứ hai' }).click()
    await dialog.getByLabel('Người thứ hai').fill('Ông')
    await dialog.getByRole('button', { name: /Nguyễn Văn Ông/ }).click()
    await expect(result).toContainText('cha của cha')
  })
})

test('điện thoại: thẻ nhắc, hộp chọn, vùng chạm, không cuộn ngang', async ({ page, worlds }) => {
  const w = await worlds.create(family())
  await page.setViewportSize({ width: 390, height: 844 })
  await openTree(page, w)
  await expect(page.getByRole('region', { name: 'Bạn là ai trong cây này?' })).toBeVisible()
  await expectNoHorizontalScroll(page)
  await expectTouchTargets(page)
  await chooseMe(page)
  await page.getByRole('button', { name: 'Thêm' }).click()
  await page.getByRole('menuitem', { name: 'Tra quan hệ' }).click()
  await expect(page.getByRole('dialog', { name: 'Tra quan hệ' })).toBeVisible()
  await expectTouchTargets(page)
})
