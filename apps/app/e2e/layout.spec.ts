import { card, expect, expectNoHorizontalScroll, expectTouchTargets, openClan, openSampleTree, test } from './fixtures.ts'

const SIZES = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
  { width: 600, height: 900 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
]

for (const size of SIZES) {
  test.describe(`${size.width} × ${size.height}`, () => {
    test.use({ viewport: size })

    test('không cuộn ngang, vùng chạm ≥ 44 px ở mọi màn', async ({ page, world }) => {
      await openClan(page, world)
      await expect(page.getByRole('button', { name: /Chi trưởng họ Nguyễn/ }).first()).toBeVisible()
      await expectNoHorizontalScroll(page)
      await expectTouchTargets(page)

      // Hộp thoại tạo cuốn
      await page.getByRole('button', { name: 'Tạo cuốn gia phả' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expectNoHorizontalScroll(page)
      await expectTouchTargets(page)
      await page.keyboard.press('Escape')

      // Màn cây, bảng thông tin, hồ sơ
      await page.getByRole('button', { name: /Chi trưởng họ Nguyễn/ }).first().click()
      await card(page, 'Nguyễn Văn An').click()
      await expect(page.getByRole('button', { name: 'Sửa hồ sơ' })).toBeVisible()
      await expectNoHorizontalScroll(page)
      await expectTouchTargets(page)
      await page.getByRole('button', { name: 'Sửa hồ sơ' }).click()
      await expect(page.getByRole('dialog', { name: /Hồ sơ/ })).toBeVisible()
      await expectNoHorizontalScroll(page)
      await expectTouchTargets(page)
      await page.getByRole('button', { name: 'Huỷ' }).click()

      // Chế độ danh sách
      await page.getByRole('button', { name: /^(Danh sách|Xem dạng danh sách)$/ }).click()
      await expect(page.getByText(/^\d+ người$/)).toBeVisible()
      await expectNoHorizontalScroll(page)
      await expectTouchTargets(page)
    })
  })
}

test.describe('cỡ gọn 375 × 812', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true })

  test('Mở một cuốn trên điện thoại: thanh công cụ một hàng, sơ đồ ≥ 70%', async ({ page, world }) => {
    await openSampleTree(page, world)
    const bar = await page.locator('header').first().boundingBox()
    const diagram = await page.getByTestId('diagram').boundingBox()
    expect(bar!.height).toBeLessThan(70)
    expect(diagram!.height / 812).toBeGreaterThanOrEqual(0.7)
    // tên khung đọc được: không thu nhỏ dưới 80%
    const scale = await page.locator('.react-flow__viewport').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)
    expect(scale).toBeGreaterThanOrEqual(0.79)
  })

  test('Kéo tấm trượt xuống để đóng', async ({ page, world }) => {
    await openSampleTree(page, world)
    await card(page, 'Nguyễn Văn An').click()
    const sheet = page.getByRole('dialog', { name: /Thông tin Nguyễn Văn An/ })
    await expect(sheet).toBeVisible()
    const handle = await page.getByTestId('sheet-handle').boundingBox()
    const x = handle!.x + handle!.width / 2
    const y = handle!.y + handle!.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y + 60, { steps: 4 })
    await page.mouse.move(x, y + 180, { steps: 6 })
    await page.mouse.up()
    await expect(sheet).toBeHidden()
  })

  test('Hộp thoại phủ toàn màn và nút chính nằm trên bàn phím ảo', async ({ page, world }) => {
    await openSampleTree(page, world)
    await card(page, 'Nguyễn Văn An').click()
    await page.getByRole('button', { name: 'Thêm con' }).click()
    const dialog = page.getByRole('dialog', { name: /Thêm con/ })
    const box = await dialog.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(374)
    // Giả bàn phím ảo: vùng nhìn thấp xuống còn 420 px.
    await page.setViewportSize({ width: 375, height: 420 })
    await page.getByLabel('Họ tên').fill('Nguyễn Văn Bình')
    const submit = await page.getByRole('button', { name: 'Thêm con' }).last().boundingBox()
    const input = await page.getByLabel('Họ tên').boundingBox()
    expect(submit!.y + submit!.height).toBeLessThanOrEqual(420)
    expect(input!.y + input!.height).toBeLessThanOrEqual(420)
  })

  test('Xoay điện thoại giữ người đang chọn và nhánh thu gọn', async ({ page, world }) => {
    await openSampleTree(page, world)
    await page.getByRole('button', { name: 'Thu gọn nhánh của Nguyễn Văn An' }).click()
    await expect(card(page, 'Nguyễn Văn Cháu')).toHaveCount(0)
    await card(page, 'Nguyễn Thị Hoa').click()
    await expect(page.getByRole('heading', { name: 'Nguyễn Thị Hoa' })).toBeVisible()
    await page.setViewportSize({ width: 812, height: 375 })
    await expect(page.getByRole('heading', { name: 'Nguyễn Thị Hoa' })).toBeVisible()
    await expect(card(page, 'Nguyễn Văn Cháu')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Mở nhánh của Nguyễn Văn An' })).toBeVisible()
  })

  test('Phóng chữ 200% không cuộn ngang', async ({ page, world }) => {
    await openSampleTree(page, world)
    await page.evaluate(() => (document.documentElement.style.fontSize = '225%'))
    await page.getByRole('button', { name: /Xem dạng danh sách/ }).click()
    await expectNoHorizontalScroll(page)
    await page.getByRole('button', { name: /Nguyễn Văn An/ }).first().click()
    await expect(page.getByRole('dialog', { name: /Hồ sơ/ })).toBeVisible()
    await expectNoHorizontalScroll(page)
    await page.getByRole('button', { name: 'Huỷ' }).click()
    await page.getByRole('button', { name: 'Về danh sách cuốn' }).click()
    await expectNoHorizontalScroll(page)
  })
})

test.describe('cỡ vừa và rộng', () => {
  test.use({ viewport: { width: 1024, height: 768 } })

  test('Máy tính bảng ngang: ngăn bên phải, khung không dịch', async ({ page, world }) => {
    await openSampleTree(page, world)
    const target = card(page, 'Nguyễn Văn Cả')
    const before = await target.boundingBox()
    await target.click()
    const pane = page.getByRole('complementary', { name: /Thông tin Nguyễn Văn Cả/ })
    await expect(pane).toBeVisible()
    const after = await target.boundingBox()
    expect(Math.abs(after!.x - before!.x)).toBeLessThan(1)
    expect(Math.abs(after!.y - before!.y)).toBeLessThan(1)
    const paneBox = await pane.boundingBox()
    expect(paneBox!.x + paneBox!.width).toBeGreaterThan(1000)
  })

  test('Trình duyệt không báo đoạn vùng nhìn: dùng bố cục theo bề rộng', async ({ page, world }) => {
    await openSampleTree(page, world)
    await card(page, 'Nguyễn Văn An').click()
    await expect(page.getByRole('complementary', { name: /Thông tin Nguyễn Văn An/ })).toBeVisible()
    await expect(page.getByTestId('hinge')).toHaveCount(0)
  })
})

test.describe('máy gập', () => {
  test.use({ viewport: { width: 1240, height: 840 } })

  test('Mở rộng máy gập: sơ đồ và bảng thông tin ở hai bên nếp gập', async ({ page, world }) => {
    const cdp = await page.context().newCDPSession(page)
    // Nếp gập dọc ở giữa, rộng 40 px (giả lập của Chromium DevTools).
    await cdp.send('Emulation.setDisplayFeaturesOverride' as never, { features: [{ orientation: 'vertical', offset: 600, maskLength: 40 }] } as never)
    await openSampleTree(page, world)
    const supported = await page.evaluate(() => {
      const v = (window as unknown as { viewport?: { segments?: unknown[] } }).viewport
      return !!v?.segments && v.segments.length === 2
    })
    test.skip(!supported, 'Trình duyệt này không báo Viewport Segments khi giả nếp gập')
    await card(page, 'Nguyễn Văn An').click()
    const hinge = await page.getByTestId('hinge').boundingBox()
    const diagram = await page.getByTestId('diagram').boundingBox()
    const pane = await page.getByRole('complementary', { name: /Thông tin Nguyễn Văn An/ }).boundingBox()
    expect(diagram!.x + diagram!.width).toBeLessThanOrEqual(hinge!.x + 1)
    expect(pane!.x).toBeGreaterThanOrEqual(hinge!.x + hinge!.width - 1)
    // Không phần tử bấm được hay chữ nào nằm vắt qua nếp gập.
    const crossing = await page.evaluate(([a, b]) => {
      return [...document.querySelectorAll<HTMLElement>('button, input, select, h1, h2, p, [data-person-id]')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.left < b && r.right > a
        })
        .map((el) => el.textContent?.slice(0, 30))
    }, [hinge!.x + 1, hinge!.x + hinge!.width - 1])
    expect(crossing).toEqual([])
  })
})

test.describe('vùng an toàn', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('iPhone có Dynamic Island: thanh trên và tấm trượt lùi vào vùng an toàn', async ({ page, world }) => {
    const cdp = await page.context().newCDPSession(page)
    try {
      await cdp.send('Emulation.setSafeAreaInsetsOverride' as never, { insets: { top: 59, bottom: 34, left: 0, right: 0 } } as never)
    } catch {
      test.skip(true, 'Chrome này không hỗ trợ giả vùng an toàn qua CDP')
    }
    await openSampleTree(page, world)
    const back = await page.getByRole('button', { name: 'Về danh sách cuốn' }).boundingBox()
    expect(back!.y).toBeGreaterThanOrEqual(59)
    await card(page, 'Nguyễn Văn An').click()
    const lastButton = page.getByRole('button', { name: 'Xem riêng nhánh này' })
    await lastButton.scrollIntoViewIfNeeded()
    const zoomOut = await page.getByRole('button', { name: 'Vừa khung' }).boundingBox()
    expect(zoomOut!.y + zoomOut!.height).toBeLessThanOrEqual(844 - 34)
  })
})
