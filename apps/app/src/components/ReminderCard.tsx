import { Bell, BellRing, Monitor, Share, Smartphone, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { messageFor, type StoreError } from '../lib/messages.ts'
import type { Device, ReminderState, ReminderStore } from '../lib/reminderStore.ts'
import { Button, cn, ErrorText, Switch } from '../ui/index.ts'

// Thẻ "Nhắc ngày giỗ" ở màn Ngày giỗ: bật/tắt theo dòng họ, thiết bị đang nhận (change anniversary-push, bản mẫu `mockup.html`).

function Header({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className={cn('grid size-10 shrink-0 place-items-center rounded-full', on ? 'bg-accent-soft text-accent' : 'bg-surface-muted text-ink-muted')}>
        {on ? <BellRing size={19} /> : <Bell size={19} />}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function Title({ sub }: { sub: string }) {
  return (
    <>
      <p className="font-semibold">Nhắc ngày giỗ</p>
      <p className="text-sm text-ink-muted">{sub}</p>
    </>
  )
}

export function ReminderCard({ store, clanId }: { store: ReminderStore; clanId: string }) {
  const [state, setState] = useState<ReminderState | null>(null)
  const [loadError, setLoadError] = useState<StoreError | null>(null)
  const [error, setError] = useState<StoreError | null>(null)
  const [busy, setBusy] = useState(false)
  const support = store.support()
  const denied = support === 'ok' && store.permission() === 'denied'

  const load = useCallback(async () => {
    const r = await store.load(clanId)
    if (r.ok) {
      setState(r.value)
      setLoadError(null)
    } else setLoadError(r.error)
  }, [store, clanId])

  useEffect(() => {
    // Đổi dòng họ: tải lại từ đầu.
    setState(null)
    setError(null)
    void load()
  }, [load])

  const act = async (fn: () => Promise<{ ok: true } | { ok: false; error: StoreError }>) => {
    setBusy(true)
    setError(null)
    const r = await fn()
    if (!r.ok) setError(r.error)
    await load()
    setBusy(false)
  }

  let body: ReactNode
  if (loadError) {
    body = (
      <div className="space-y-3">
        <ErrorText>{messageFor(loadError)}</ErrorText>
        <Button onClick={() => void load()}>Thử lại</Button>
      </div>
    )
  } else if (!state) {
    body = <div aria-busy="true" aria-label="Đang tải" className="h-16 animate-pulse rounded-xl bg-surface-muted" />
  } else if (support === 'ios-needs-install') {
    body = (
      <>
        <Header on={false}>
          <Title sub="iPhone cần thêm app vào Màn hình chính" />
        </Header>
        <ol className="mt-3 space-y-2 rounded-xl bg-surface-muted p-3 text-sm">
          <li className="flex gap-2">
            <b className="text-accent">1.</b>
            <span>
              Mở trang này bằng Safari, bấm <Share aria-hidden size={15} className="inline align-text-bottom" /> Chia sẻ.
            </span>
          </li>
          <li className="flex gap-2">
            <b className="text-accent">2.</b>Chọn “Thêm vào Màn hình chính”.
          </li>
          <li className="flex gap-2">
            <b className="text-accent">3.</b>Mở Kintree từ biểu tượng mới rồi bật nhắc ở đây.
          </li>
        </ol>
      </>
    )
  } else if (support === 'unsupported') {
    body = (
      <>
        <Header on={false}>
          <Title sub="Trình duyệt này không hỗ trợ thông báo" />
        </Header>
        <p className="mt-3 text-sm text-ink-muted">{messageFor('PUSH_UNSUPPORTED')}</p>
      </>
    )
  } else if (denied && !state.enabled) {
    body = (
      <>
        <Header on={false}>
          <Title sub="Trình duyệt đang chặn thông báo" />
        </Header>
        <p className="mt-3 flex gap-2 rounded-xl bg-warn-soft p-3 text-sm text-warn">
          <TriangleAlert aria-hidden size={16} className="mt-0.5 shrink-0" />
          <span>Hãy cho phép thông báo cho trang này: bấm biểu tượng ổ khoá cạnh địa chỉ, chọn Thông báo, chọn Cho phép, rồi tải lại trang và bật nhắc.</span>
        </p>
      </>
    )
  } else {
    const n = state.devices.length
    body = (
      <>
        <Header on={state.enabled}>
          <Switch
            label="Nhắc ngày giỗ"
            description={state.enabled ? `Đang bật · ${n} thiết bị` : 'Đang tắt cho dòng họ này'}
            checked={state.enabled}
            onChange={(on) => void act(() => (on ? store.enable(clanId) : store.disable(clanId)))}
          />
        </Header>
        {!state.enabled && <p className="mt-2 text-sm text-ink-muted">Nhận thông báo trên thiết bị này trước ngày giỗ 7 ngày, 1 ngày và đúng ngày.</p>}
        {state.enabled && (
          <>
            {!state.thisRegistered && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-surface-muted p-3 text-sm">
                <span className="min-w-0 flex-1">Thiết bị này chưa nhận nhắc.</span>
                <Button disabled={busy} onClick={() => void act(() => store.enable(clanId))}>
                  Nhận nhắc trên thiết bị này
                </Button>
              </div>
            )}
            {n > 0 && (
              <ul aria-label="Thiết bị đang nhận nhắc" className="mt-3 divide-y divide-line overflow-hidden rounded-xl ring-1 ring-line">
                {state.devices.map((d) => (
                  <DeviceRow key={d.id} device={d} busy={busy} onRemove={() => void act(() => store.removeDevice(d))} />
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink-muted">Nhắc trước 7 ngày, 1 ngày và đúng ngày, lúc 7:00 giờ Việt Nam. Chỉ nhắc giỗ.</p>
          </>
        )}
      </>
    )
  }

  return (
    <section aria-label="Nhắc ngày giỗ" className="rounded-2xl bg-surface p-4 shadow-1 ring-1 ring-line/60">
      {body}
      {error && (
        <div className="mt-3">
          <ErrorText>{messageFor(error)}</ErrorText>
        </div>
      )}
    </section>
  )
}

function DeviceRow({ device, busy, onRemove }: { device: Device; busy: boolean; onRemove: () => void }) {
  const phone = /iPhone|iPad|Android/.test(device.label)
  const Icon = phone ? Smartphone : Monitor
  return (
    <li className="flex min-h-14 items-center gap-3 px-3">
      <Icon aria-hidden size={18} className="shrink-0 text-ink-muted" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {device.label}
          {device.isThis && <span className="font-normal text-ink-muted"> (thiết bị này)</span>}
        </p>
        <p className="text-xs text-ink-muted">Bật {new Date(device.createdAt).toLocaleDateString('vi-VN')}</p>
      </div>
      <button
        type="button"
        disabled={busy}
        aria-label={`Gỡ thiết bị ${device.label}${device.isThis ? ' (thiết bị này)' : ''}`}
        onClick={onRemove}
        className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center px-2 text-sm font-semibold text-accent disabled:cursor-not-allowed disabled:opacity-45"
      >
        Gỡ
      </button>
    </li>
  )
}
