import type { Page } from '@playwright/test'
import { admin, must, type World } from './backend.ts'
import { expect, expectNoHorizontalScroll, expectTouchTargets, login, openClan, test } from './fixtures.ts'

// Thẻ "Nhắc ngày giỗ" (change anniversary-push). Trình duyệt thử không có dịch vụ push thật nên thay cổng push bằng bản giả
// (window.__KT_PUSH__); phần đăng ký thiết bị và bật nhắc đi qua cơ sở dữ liệu thật.

type Fake = { support?: 'ok' | 'unsupported' | 'ios-needs-install'; permission?: 'default' | 'granted' | 'denied'; grant?: boolean }

async function fakePush(page: Page, cfg: Fake = {}) {
  await page.addInitScript(
    (c) => {
      let perm = c.permission ?? 'default'
      const store = {
        get: () => localStorage.getItem('kt-fake-sub'),
        set: (v: string | null) => (v ? localStorage.setItem('kt-fake-sub', v) : localStorage.removeItem('kt-fake-sub')),
      }
      ;(window as unknown as { __KT_PUSH__: unknown }).__KT_PUSH__ = {
        support: () => c.support ?? 'ok',
        permission: () => perm,
        requestPermission: async () => (perm = c.grant === false ? 'denied' : 'granted'),
        current: async () => (store.get() ? { endpoint: store.get() } : null),
        subscribe: async () => {
          if (!store.get()) store.set(`https://push.test/${crypto.randomUUID()}`)
          return { endpoint: store.get(), p256dh: 'k', auth: 'a' }
        },
        unsubscribe: async () => store.set(null),
      }
    },
    cfg,
  )
}

async function openCalendar(page: Page, world: World, user = world.viewer) {
  await openClan(page, world, user)
  await page.getByRole('button', { name: 'Xem lịch' }).click()
  await expect(page.getByRole('heading', { name: 'Ngày giỗ' })).toBeVisible()
}

const card = (page: Page) => page.getByRole('region', { name: 'Nhắc ngày giỗ' })
const prefs = async (userId: string, clanId: string) => (await admin().from('reminder_prefs').select('enabled').eq('user_id', userId).eq('clan_id', clanId).maybeSingle()).data
const subs = async (userId: string) => must(await admin().from('push_subscriptions').select('id, user_agent').eq('user_id', userId))

test.describe('nhắc ngày giỗ', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('bật, tải lại vẫn bật, tắt thì gỡ thiết bị', async ({ page, world }) => {
    await fakePush(page)
    await openCalendar(page, world)
    await expect(card(page)).toContainText('Đang tắt cho dòng họ này')

    await card(page).getByRole('switch', { name: /Nhắc ngày giỗ/ }).click()
    await expect(card(page)).toContainText('Đang bật · 1 thiết bị')
    await expect(card(page).getByRole('list', { name: 'Thiết bị đang nhận nhắc' })).toContainText('(thiết bị này)')
    expect(await prefs(world.viewer.id, world.clanId)).toEqual({ enabled: true })
    expect(await subs(world.viewer.id)).toHaveLength(1)

    await page.reload()
    await page.getByRole('button', { name: new RegExp(world.clanName) }).click()
    await page.getByRole('button', { name: 'Xem lịch' }).click()
    await expect(card(page)).toContainText('Đang bật · 1 thiết bị')

    await card(page).getByRole('switch', { name: /Nhắc ngày giỗ/ }).click()
    await expect(card(page)).toContainText('Đang tắt cho dòng họ này')
    expect(await prefs(world.viewer.id, world.clanId)).toEqual({ enabled: false })
    expect(await subs(world.viewer.id)).toHaveLength(0)
  })

  test('thiết bị khác: thấy và gỡ được; thiết bị này chưa nhận thì có nút nhận', async ({ page, world }) => {
    must(await admin().from('push_subscriptions').insert({ user_id: world.viewer.id, endpoint: 'https://push.test/other', p256dh: 'k', auth: 'a', user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0' }))
    must(await admin().from('reminder_prefs').insert({ user_id: world.viewer.id, clan_id: world.clanId, enabled: true }))
    await fakePush(page)
    await openCalendar(page, world)
    await expect(card(page)).toContainText('Đang bật · 1 thiết bị')
    await expect(card(page)).toContainText('Thiết bị này chưa nhận nhắc')
    await expect(card(page).getByRole('list', { name: 'Thiết bị đang nhận nhắc' })).toContainText('Firefox · Windows')

    await card(page).getByRole('button', { name: 'Nhận nhắc trên thiết bị này' }).click()
    await expect(card(page)).toContainText('Đang bật · 2 thiết bị')

    await card(page).getByRole('button', { name: 'Gỡ thiết bị Firefox · Windows' }).click()
    await expect(card(page)).toContainText('Đang bật · 1 thiết bị')
    const left = (await subs(world.viewer.id))!
    expect(left).toHaveLength(1)
    expect(left.some((s) => /Firefox/.test(s.user_agent ?? ''))).toBe(false)
  })

  test('bị từ chối quyền: hướng dẫn cấp lại, nhắc vẫn tắt', async ({ page, world }) => {
    await fakePush(page, { permission: 'denied' })
    await openCalendar(page, world)
    await expect(card(page)).toContainText('Trình duyệt đang chặn thông báo')
    await expect(card(page).getByRole('switch')).toHaveCount(0)
    expect(await prefs(world.viewer.id, world.clanId)).toBeNull()
  })

  test('xin quyền rồi người dùng từ chối: báo lỗi, nhắc vẫn tắt', async ({ page, world }) => {
    await fakePush(page, { permission: 'default', grant: false })
    await openCalendar(page, world)
    await card(page).getByRole('switch', { name: /Nhắc ngày giỗ/ }).click()
    await expect(card(page)).toContainText('Trình duyệt đang chặn thông báo của trang này')
    expect(await prefs(world.viewer.id, world.clanId)).toBeNull()
    expect(await subs(world.viewer.id)).toHaveLength(0)
  })

  test('iPhone chưa thêm vào Màn hình chính: hướng dẫn thay cho công tắc', async ({ page, world }) => {
    await fakePush(page, { support: 'ios-needs-install' })
    await openCalendar(page, world)
    await expect(card(page)).toContainText('iPhone cần thêm app vào Màn hình chính')
    await expect(card(page)).toContainText('Thêm vào Màn hình chính')
    await expect(card(page).getByRole('switch')).toHaveCount(0)
  })

  test('mở màn Ngày giỗ từ thông báo (#calendar/<dòng họ>)', async ({ page, world }) => {
    await fakePush(page)
    await login(page, world.viewer)
    await page.goto(`/#calendar/${world.clanId}`)
    await expect(page.getByRole('heading', { name: 'Ngày giỗ' })).toBeVisible()
    await expect(card(page)).toBeVisible()
    expect(page.url()).not.toContain('#calendar')
  })
})

test('điện thoại: thẻ nhắc gọn, vùng chạm ≥ 44 px, không cuộn ngang', async ({ page, world }) => {
  must(await admin().from('push_subscriptions').insert({ user_id: world.viewer.id, endpoint: 'https://push.test/other', p256dh: 'k', auth: 'a', user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1' }))
  must(await admin().from('reminder_prefs').insert({ user_id: world.viewer.id, clan_id: world.clanId, enabled: true }))
  await fakePush(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await openCalendar(page, world)
  await expect(card(page)).toContainText('Đang bật')
  await expectNoHorizontalScroll(page)
  await expectTouchTargets(page)
  await page.setViewportSize({ width: 320, height: 700 })
  await expectNoHorizontalScroll(page)
})
