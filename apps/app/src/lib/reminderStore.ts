import type { SupabaseClient } from '@supabase/supabase-js'
import { mapError, type Outcome } from './cloudStore.ts'
import type { StoreError } from './messages.ts'

// Bật nhắc giỗ qua Web Push và quản lý thiết bị (change anniversary-push, design D4).
// Phần trình duyệt nằm sau `PushPort` để test thay bằng bản giả (trình duyệt thử không có dịch vụ push thật).

export type PushSupport = 'ok' | 'unsupported' | 'ios-needs-install'
export type PushKeys = { endpoint: string; p256dh: string; auth: string }
export type PushPort = {
  support(): PushSupport
  permission(): NotificationPermission
  requestPermission(): Promise<NotificationPermission>
  /** Đăng ký hiện có của trình duyệt này (nếu có). */
  current(): Promise<{ endpoint: string } | null>
  /** Đăng ký (hoặc lấy lại) với khoá công khai VAPID; ném 'NO_KEY' khi chưa có khoá. */
  subscribe(vapidPublicKey: string): Promise<PushKeys>
  unsubscribe(): Promise<void>
}

export type Device = { id: string; label: string; createdAt: string; isThis: boolean }
export type ReminderState = { enabled: boolean; devices: Device[]; thisRegistered: boolean }

const b64url = (buf: ArrayBuffer | null) => (buf ? btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '')
const keyBytes = (key: string) => Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(key.length / 4) * 4, '=')), (c) => c.charCodeAt(0))

/** "Chrome · Windows" từ chuỗi user-agent đã lưu. */
export function deviceLabel(ua: string | null): string {
  if (!ua) return 'Thiết bị không rõ'
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Trình duyệt'
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : ''
  return os ? `${browser} · ${os}` : browser
}

type TestWindow = { __KT_PUSH__?: PushPort }

/** Cổng thật của trình duyệt; e2e đặt `window.__KT_PUSH__` để thay (chỉ có tác dụng khi được đặt). */
export function browserPort(): PushPort {
  const test = (globalThis as unknown as TestWindow).__KT_PUSH__
  if (test) return test
  return {
    support() {
      const ua = navigator.userAgent
      const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
      const installed = (navigator as unknown as { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches
      if (ios && !installed) return 'ios-needs-install'
      return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window ? 'ok' : 'unsupported'
    },
    permission: () => Notification.permission,
    requestPermission: () => Notification.requestPermission(),
    async current() {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
      return sub ? { endpoint: sub.endpoint } : null
    },
    async subscribe(vapidPublicKey) {
      if (!vapidPublicKey) throw new Error('NO_KEY')
      const reg = await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidPublicKey) }))
      return { endpoint: sub.endpoint, p256dh: b64url(sub.getKey('p256dh')), auth: b64url(sub.getKey('auth')) }
    },
    async unsubscribe() {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
      await sub?.unsubscribe()
    },
  }
}

const netError = (e: unknown) => ({ message: e instanceof Error ? e.message : 'network' })

export function reminderStore(client: SupabaseClient, userId: string, port: PushPort = browserPort(), vapidPublicKey: string = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '') {
  const guard = async <T>(fn: () => Promise<Outcome<T>>, fallback: StoreError): Promise<Outcome<T>> => {
    try {
      return await fn()
    } catch (e) {
      return { ok: false, error: mapError(netError(e), fallback) }
    }
  }
  const dbFail = (e: Parameters<typeof mapError>[0], fallback: StoreError = 'SAVE_FAILED') => ({ ok: false as const, error: mapError(e, fallback) })

  return {
    support: () => port.support(),
    permission: () => port.permission(),

    /** Trạng thái nhắc của dòng họ và các thiết bị của mình. */
    load: (clanId: string): Promise<Outcome<ReminderState>> =>
      guard(async () => {
        const [prefs, subs] = await Promise.all([
          client.from('reminder_prefs').select('enabled').eq('user_id', userId).eq('clan_id', clanId).maybeSingle(),
          client.from('push_subscriptions').select('id, endpoint, user_agent, created_at').order('created_at', { ascending: false }),
        ])
        if (prefs.error) return dbFail(prefs.error, 'LOAD_FAILED')
        if (subs.error) return dbFail(subs.error, 'LOAD_FAILED')
        const here = port.support() === 'ok' ? await port.current() : null
        const devices = (subs.data ?? []).map((s) => ({ id: s.id as string, label: deviceLabel(s.user_agent as string | null), createdAt: s.created_at as string, isThis: !!here && s.endpoint === here.endpoint }))
        return { ok: true, value: { enabled: prefs.data?.enabled === true, devices, thisRegistered: devices.some((d) => d.isThis) } }
      }, 'LOAD_FAILED'),

    /** Xin quyền, đăng ký thiết bị này rồi bật nhắc cho dòng họ. */
    enable: (clanId: string): Promise<Outcome<void>> =>
      guard(async () => {
        if (port.support() !== 'ok') return { ok: false, error: 'PUSH_UNSUPPORTED' }
        let perm = port.permission()
        if (perm === 'default') perm = await port.requestPermission()
        if (perm !== 'granted') return { ok: false, error: 'PUSH_DENIED' }
        let keys: PushKeys
        try {
          keys = await port.subscribe(vapidPublicKey)
        } catch (e) {
          return { ok: false, error: e instanceof Error && e.message === 'NO_KEY' ? 'PUSH_NOT_CONFIGURED' : 'PUSH_FAILED' }
        }
        const reg = await client.rpc('register_push', { p_endpoint: keys.endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth, p_user_agent: navigator.userAgent })
        if (reg.error) return dbFail(reg.error, 'PUSH_FAILED')
        const pref = await client.from('reminder_prefs').upsert({ user_id: userId, clan_id: clanId, enabled: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id,clan_id' })
        if (pref.error) return dbFail(pref.error)
        return { ok: true, value: undefined }
      }, 'PUSH_FAILED'),

    /** Tắt nhắc của dòng họ; hết dòng họ nào bật thì gỡ luôn thiết bị này. */
    disable: (clanId: string): Promise<Outcome<void>> =>
      guard(async () => {
        const off = await client.from('reminder_prefs').update({ enabled: false, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('clan_id', clanId)
        if (off.error) return dbFail(off.error)
        const left = await client.from('reminder_prefs').select('clan_id', { count: 'exact', head: true }).eq('user_id', userId).eq('enabled', true)
        if (left.error) return dbFail(left.error)
        if ((left.count ?? 0) === 0 && port.support() === 'ok') {
          const here = await port.current()
          if (here) await client.from('push_subscriptions').delete().eq('endpoint', here.endpoint)
          await port.unsubscribe()
        }
        return { ok: true, value: undefined }
      }, 'SAVE_FAILED'),

    /** Gỡ một thiết bị (kể cả thiết bị khác). */
    removeDevice: (device: Device): Promise<Outcome<void>> =>
      guard(async () => {
        const r = await client.from('push_subscriptions').delete().eq('id', device.id)
        if (r.error) return dbFail(r.error)
        if (device.isThis && port.support() === 'ok') await port.unsubscribe()
        return { ok: true, value: undefined }
      }, 'SAVE_FAILED'),
  }
}

export type ReminderStore = ReturnType<typeof reminderStore>
